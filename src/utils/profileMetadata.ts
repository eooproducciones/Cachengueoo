import { UserProfile, UserGender, PreferenceGender } from '../types';

/**
 * Empaqueta campos extendidos (signo, gustos musicales, tragos y fotos secundarias)
 * dentro del campo `interests` (text[]) de la tabla `profiles` de Supabase,
 * garantizando compatibilidad total con la base de datos sin errores de columnas faltantes.
 */
export function packProfileInterests(profile: {
  interests?: string[];
  drinks?: string[];
  musicPreferences?: string[];
  zodiacSign?: string;
  photos?: string[];
  nightNote?: { text: string; createdAt: string; hearts?: number };
}): string[] {
  const result: string[] = [];

  // 1. Signo zodiacal
  if (profile.zodiacSign) {
    result.push(`sign:${profile.zodiacSign}`);
  }

  // 2. Gustos musicales
  if (Array.isArray(profile.musicPreferences)) {
    profile.musicPreferences.forEach((m) => {
      if (m && !result.includes(`music:${m}`)) {
        result.push(`music:${m}`);
      }
    });
  }

  // 3. Tragos
  if (Array.isArray(profile.drinks)) {
    profile.drinks.forEach((d) => {
      if (d && !result.includes(`drink:${d}`)) {
        result.push(`drink:${d}`);
      }
    });
  }

  // 4. Fotos secundarias (foto 2 y foto 3; foto 1 va en avatar_url)
  if (Array.isArray(profile.photos) && profile.photos.length > 1) {
    if (profile.photos[1]) result.push(`photo2:${profile.photos[1]}`);
    if (profile.photos[2]) result.push(`photo3:${profile.photos[2]}`);
  }

  // 5. Notita activa de la noche (duración máxima de 6 horas)
  if (profile.nightNote && profile.nightNote.text) {
    const createdMs = new Date(profile.nightNote.createdAt || new Date()).getTime();
    if (Date.now() - createdMs <= 6 * 60 * 60 * 1000) {
      result.push(`note:${encodeURIComponent(JSON.stringify(profile.nightNote))}`);
    }
  }

  // 6. Intereses estándar
  if (Array.isArray(profile.interests)) {
    profile.interests.forEach((item) => {
      if (
        item &&
        !item.startsWith('sign:') &&
        !item.startsWith('music:') &&
        !item.startsWith('drink:') &&
        !item.startsWith('photo2:') &&
        !item.startsWith('photo3:') &&
        !item.startsWith('note:') &&
        !result.includes(item)
      ) {
        result.push(item);
      }
    });
  }

  return result;
}

/**
 * Desempaqueta campos extendidos a partir del array `interests` de Supabase
 */
export function unpackProfileInterests(interestsList?: string[] | null): {
  zodiacSign?: string;
  musicPreferences: string[];
  drinks: string[];
  extraPhotos: string[];
  plainInterests: string[];
  nightNote?: { text: string; createdAt: string; hearts?: number };
} {
  const musicPreferences: string[] = [];
  const drinks: string[] = [];
  const extraPhotos: string[] = [];
  const plainInterests: string[] = [];
  let zodiacSign: string | undefined = undefined;
  let nightNote: { text: string; createdAt: string; hearts?: number } | undefined = undefined;

  if (Array.isArray(interestsList)) {
    for (const item of interestsList) {
      if (typeof item !== 'string') continue;
      if (item.startsWith('sign:')) {
        zodiacSign = item.slice(5).trim();
      } else if (item.startsWith('music:')) {
        musicPreferences.push(item.slice(6).trim());
      } else if (item.startsWith('drink:')) {
        drinks.push(item.slice(6).trim());
      } else if (item.startsWith('photo2:')) {
        extraPhotos[0] = item.slice(7).trim();
      } else if (item.startsWith('photo3:')) {
        extraPhotos[1] = item.slice(7).trim();
      } else if (item.startsWith('note:')) {
        try {
          const parsed = JSON.parse(decodeURIComponent(item.slice(5)));
          if (parsed && parsed.text) {
            const createdMs = new Date(parsed.createdAt || new Date()).getTime();
            // Duración exacta de 6 horas
            if (Date.now() - createdMs <= 6 * 60 * 60 * 1000) {
              nightNote = parsed;
            }
          }
        } catch {}
      } else {
        plainInterests.push(item);
      }
    }
  }

  return {
    zodiacSign,
    musicPreferences,
    drinks,
    extraPhotos: extraPhotos.filter(Boolean),
    plainInterests,
    nightNote,
  };
}

/**
 * Fusiona de forma segura los datos de Supabase Auth (user_metadata),
 * la tabla pública `profiles` y el estado local en localStorage.
 * NINGÚN campo existente es sobreescrito por valores vacíos o nulos.
 */
export function buildUserProfileFromSources(
  supabaseUser: { id: string; email?: string | null; user_metadata?: Record<string, any> } | null,
  profileRow: Record<string, any> | null,
  localUser: UserProfile | null
): UserProfile {
  const meta = supabaseUser?.user_metadata || {};
  const unpacked = unpackProfileInterests(profileRow?.interests);

  const id = supabaseUser?.id || profileRow?.id || localUser?.id || `usr_${Date.now()}`;
  const email =
    profileRow?.email ||
    supabaseUser?.email ||
    meta.email ||
    localUser?.email ||
    '';

  // Nombre completo y apodo: Supabase (profileRow) es la fuente de verdad prioritaria
  const fullName =
    profileRow?.full_name ||
    meta.full_name ||
    localUser?.fullName ||
    (email ? email.split('@')[0] : 'Cachenguero');

  const nickname =
    profileRow?.nickname ||
    meta.nickname ||
    localUser?.nickname ||
    fullName;

  // Fecha de nacimiento y edad
  const birthDate =
    profileRow?.birth_date ||
    meta.birth_date ||
    localUser?.birthDate ||
    '2001-01-01';

  const age = Number(profileRow?.age || meta.age || localUser?.age || 23);

  // Fotos (priorizar fotos reales)
  let photos: string[] = [];
  if (Array.isArray(profileRow?.photos) && profileRow.photos.length > 0) {
    photos = profileRow.photos.filter((p: string) => p && !p.includes('images.unsplash.com'));
  }
  if (
    photos.length === 0 &&
    (unpacked.extraPhotos.length > 0 ||
      (profileRow?.avatar_url && !profileRow.avatar_url.includes('images.unsplash.com')))
  ) {
    photos = [
      profileRow?.avatar_url || meta.avatar_url,
      ...unpacked.extraPhotos,
    ].filter((p) => p && !p.includes('images.unsplash.com')) as string[];
  }
  if (photos.length === 0 && Array.isArray(localUser?.photos) && localUser!.photos.length > 0) {
    photos = localUser!.photos.filter((p) => p && !p.includes('images.unsplash.com'));
  }

  // Avatar principal
  const avatarUrl =
    (profileRow?.avatar_url && !profileRow.avatar_url.includes('images.unsplash.com')
      ? profileRow.avatar_url
      : null) ||
    photos[0] ||
    (localUser?.avatarUrl && !localUser.avatarUrl.includes('images.unsplash.com')
      ? localUser.avatarUrl
      : null) ||
    (meta.avatar_url && !meta.avatar_url.includes('images.unsplash.com')
      ? meta.avatar_url
      : null) ||
    '';

  if (photos.length === 0 && avatarUrl) {
    photos = [avatarUrl];
  }

  // Género y preferencia
  const gender: UserGender =
    profileRow?.gender || meta.gender || localUser?.gender || 'hombre';
  const preference: PreferenceGender =
    profileRow?.preference || meta.preference || localUser?.preference || 'todos';

  // Signo zodiacal
  const zodiacSign =
    profileRow?.zodiac_sign ||
    unpacked.zodiacSign ||
    meta.zodiac_sign ||
    meta.zodiacSign ||
    localUser?.zodiacSign ||
    undefined;

  // Gustos musicales
  let musicPreferences: string[] = [];
  if (Array.isArray(profileRow?.music_preferences) && profileRow.music_preferences.length > 0) {
    musicPreferences = profileRow.music_preferences;
  } else if (unpacked.musicPreferences.length > 0) {
    musicPreferences = unpacked.musicPreferences;
  } else if (Array.isArray(meta.music_preferences) && meta.music_preferences.length > 0) {
    musicPreferences = meta.music_preferences;
  } else if (Array.isArray(localUser?.musicPreferences) && localUser!.musicPreferences.length > 0) {
    musicPreferences = localUser!.musicPreferences;
  } else {
    musicPreferences = ['Reggaeton', 'Cumbia', 'Cuarteto'];
  }

  // Tragos: Si el usuario seleccionó tragos, NUNCA sobreescribirlos con el default 'Fernet con Coca'
  let drinks: string[] = [];
  if (Array.isArray(profileRow?.drinks) && profileRow.drinks.length > 0) {
    drinks = profileRow.drinks;
  } else if (unpacked.drinks.length > 0) {
    drinks = unpacked.drinks;
  } else if (Array.isArray(meta.drinks) && meta.drinks.length > 0) {
    drinks = meta.drinks;
  } else if (Array.isArray(localUser?.drinks) && localUser!.drinks.length > 0) {
    drinks = localUser!.drinks;
  } else if (profileRow?.drink_favorite && profileRow.drink_favorite !== 'Fernet con Coca') {
    drinks = [profileRow.drink_favorite];
  } else {
    drinks = [];
  }

  const drinkFavorite =
    (drinks.length > 0 ? drinks.join(' & ') : null) ||
    (profileRow?.drink_favorite && profileRow.drink_favorite !== 'Fernet con Coca'
      ? profileRow.drink_favorite
      : null) ||
    meta.drink_favorite ||
    localUser?.drinkFavorite ||
    'Fernet con Coca';

  // Instagram
  const instagram =
    profileRow?.instagram ||
    meta.instagram ||
    localUser?.instagram ||
    undefined;

  // Bio
  const bio =
    profileRow?.bio !== undefined && profileRow?.bio !== null && profileRow?.bio !== ''
      ? profileRow.bio
      : meta.bio !== undefined && meta.bio !== null && meta.bio !== ''
      ? meta.bio
      : localUser?.bio !== undefined && localUser?.bio !== ''
      ? localUser.bio
      : '¡Listo para romper la pista en Cachengueoo!';

  // Intereses consolidados
  const interests = [
    ...drinks,
    ...musicPreferences.slice(0, 2),
    ...unpacked.plainInterests,
  ];

  const isAdmin = email.includes('admin') || Boolean(profileRow?.is_admin || meta.is_admin);

  return {
    id,
    email,
    fullName,
    nickname,
    birthDate,
    age,
    avatarUrl,
    photos,
    gender,
    preference,
    interests,
    bio,
    drinkFavorite,
    drinks,
    zodiacSign,
    musicPreferences,
    instagram: instagram && instagram.trim().length > 0 ? instagram.trim() : undefined,
    nightNote: unpacked.nightNote || localUser?.nightNote,
    createdAt: profileRow?.created_at || meta.created_at || localUser?.createdAt || new Date().toISOString(),
    isAdmin,
    role: isAdmin ? 'admin' : 'user',
  };
}
