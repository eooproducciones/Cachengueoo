import { UserProfile } from '../types';
import { getSupabaseClient } from './supabaseClient';
import { buildUserProfileFromSources, packProfileInterests } from '../utils/profileMetadata';
import { presenceService } from './presenceService';
import { db } from './firebaseClient';
import { doc, setDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';

const USER_STORAGE_KEY = 'cachengueoo_current_user';
const USERS_LIST_STORAGE_KEY = 'cachengueoo_registered_users';

export function notifyAuthChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cachengueoo_auth_change'));
  }
}

// 1. Cuenta de administrador de emergencia para Cachengueoo
export const DEFAULT_ADMIN_USER: UserProfile = {
  id: 'usr_admin_01',
  email: 'admin@cachengueoo.com',
  fullName: 'Administrador Cachengueoo',
  nickname: 'Staff Admin',
  birthDate: '1995-01-01',
  age: 31,
  avatarUrl:
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
  photos: [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
  ],
  gender: 'otro',
  preference: 'todos',
  interests: ['Gestión', 'Eventos', 'Beneficios'],
  bio: 'Administración Cachengueoo Mendoza',
  drinkFavorite: 'Fernet & Skyy',
  drinks: ['Fernet', 'Skyy'],
  createdAt: '2026-01-01T00:00:00Z',
  isAdmin: true,
  role: 'admin',
};

export const authService = {
  // Sesión persistente: si el usuario ya inició sesión, no se cierra a menos que haga click en "Cerrar sesión"
  getCurrentUser(): UserProfile | null {
    try {
      const saved = localStorage.getItem(USER_STORAGE_KEY) || sessionStorage.getItem(USER_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return null;
  },

  getAllUsers(): UserProfile[] {
    try {
      const saved = localStorage.getItem(USERS_LIST_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  },

  async updateProfile(profile: Partial<UserProfile>): Promise<UserProfile | null> {
    const current = this.getCurrentUser();
    
    let resolvedId = current?.id || profile.id;
    let resolvedEmail = current?.email || profile.email;

    const client = getSupabaseClient();
    if (!resolvedId && client) {
      try {
        const { data } = await client.auth.getUser();
        if (data?.user) {
          resolvedId = data.user.id;
          if (!resolvedEmail) resolvedEmail = data.user.email;
        }
      } catch {}
    }

    if (!resolvedId) {
      resolvedId = `usr_${Date.now()}`;
    }

    const fallbackUser: UserProfile = {
      id: resolvedId,
      email: resolvedEmail || '',
      fullName: profile.fullName || 'Usuario Cachengueoo',
      nickname: profile.nickname || profile.fullName || 'Amigo',
      birthDate: profile.birthDate || '2001-01-01',
      age: profile.age || 23,
      avatarUrl: profile.avatarUrl || '',
      photos: profile.photos || [],
      gender: profile.gender || 'hombre',
      preference: profile.preference || 'todos',
      interests: profile.interests || [],
      bio: profile.bio || '',
      drinkFavorite: profile.drinkFavorite || 'Fernet con Coca',
      drinks: profile.drinks || ['Fernet'],
      zodiacSign: profile.zodiacSign,
      musicPreferences: profile.musicPreferences || [],
      instagram: profile.instagram,
      createdAt: new Date().toISOString(),
    };

    const base = current || fallbackUser;

    const updated: UserProfile = {
      ...base,
      ...profile,
      id: resolvedId,
      email: resolvedEmail || base.email,
      avatarUrl: profile.avatarUrl || (profile.photos && profile.photos[0]) || base.avatarUrl,
      photos:
        profile.photos && profile.photos.length > 0 ? profile.photos : base.photos,
      drinks: profile.drinks && profile.drinks.length > 0 ? profile.drinks : base.drinks,
      musicPreferences:
        profile.musicPreferences && profile.musicPreferences.length > 0
          ? profile.musicPreferences
          : base.musicPreferences,
      zodiacSign: profile.zodiacSign || base.zodiacSign,
    };

    // Guardar inmediatamente en localStorage y sessionStorage
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));

    // Update in all users list
    const all = this.getAllUsers();
    const existingIdx = all.findIndex((u) => u.id === resolvedId || (u.email && u.email === resolvedEmail));
    if (existingIdx >= 0) {
      all[existingIdx] = updated;
    } else {
      all.unshift(updated);
    }
    localStorage.setItem(USERS_LIST_STORAGE_KEY, JSON.stringify(all));

    const computedDrinks = updated.drinks && updated.drinks.length > 0 ? updated.drinks : [];
    const computedDrinkFavorite =
      computedDrinks.length > 0
        ? computedDrinks.join(' & ')
        : updated.drinkFavorite || 'Fernet con Coca';

    // 2. Guardar en public.profiles con TODAS las columnas
    const validDbRecord: Record<string, unknown> = {
      full_name: updated.fullName,
      nickname: updated.nickname || updated.fullName,
      birth_date: updated.birthDate,
      age: updated.age,
      avatar_url: updated.avatarUrl || '',
      photos:
        updated.photos && updated.photos.length > 0
          ? updated.photos
          : [updated.avatarUrl].filter(Boolean),
      gender: updated.gender || 'hombre',
      preference: updated.preference || 'todos',
      bio: updated.bio || '',
      drink_favorite: computedDrinkFavorite,
      drinks: computedDrinks,
      zodiac_sign: updated.zodiacSign || null,
      music_preferences: updated.musicPreferences || [],
      instagram: updated.instagram || '',
      interests: packProfileInterests({
        ...updated,
        drinks: computedDrinks,
      }),
      updated_at: new Date().toISOString(),
    };

    // Sincronizar en Firestore
    try {
      if (resolvedId) {
        await setDoc(
          doc(db, 'profiles', resolvedId),
          {
            id: resolvedId,
            email: resolvedEmail || updated.email,
            ...validDbRecord,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }
    } catch (fsErr) {
      console.warn('Notice syncing profile to Firestore:', fsErr);
    }

    // Si Supabase está conectado, sincronizar en Auth y en tabla profiles
    if (client) {
      // 1. Guardar metadatos completos en Supabase Auth
      try {
        await client.auth.updateUser({
          data: {
            full_name: updated.fullName,
            nickname: updated.nickname,
            birth_date: updated.birthDate,
            age: updated.age,
            avatar_url: updated.avatarUrl,
            photos: validDbRecord.photos,
            gender: updated.gender,
            preference: updated.preference,
            bio: updated.bio,
            drink_favorite: computedDrinkFavorite,
            drinks: computedDrinks,
            zodiac_sign: updated.zodiacSign,
            music_preferences: updated.musicPreferences,
            instagram: updated.instagram,
          },
        });
      } catch (e) {
        console.warn('Nota: Supabase auth.updateUser omitido o sin sesión activa:', e);
      }

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedId);

      try {
        if (isUuid) {
          const { error: upsertErr } = await client
            .from('profiles')
            .upsert(
              {
                id: resolvedId,
                email: resolvedEmail || updated.email,
                ...validDbRecord,
              },
              { onConflict: 'id' }
            );

          if (upsertErr) {
            console.warn('Upsert notice on profiles, updating by id:', upsertErr.message);
            await client.from('profiles').update(validDbRecord).eq('id', resolvedId);
          }
        }
        if (resolvedEmail || updated.email) {
          await client
            .from('profiles')
            .update(validDbRecord)
            .eq('email', (resolvedEmail || updated.email).toLowerCase());
        }
      } catch (e) {
        console.warn('Advertencia al sincronizar perfil en Supabase:', e);
      }
    }

    notifyAuthChange();
    return updated;
  },

  async loginWithCredentials(
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: UserProfile; message?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // 1. Acceso de administrador de emergencia Cachengueoo
    if (cleanEmail === 'admin@cachengueoo.com' || cleanEmail === 'admin@cachuengueoo.com') {
      if (cleanPassword === 'river??2??') {
        const u = { ...DEFAULT_ADMIN_USER, email: cleanEmail };
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
        sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
        notifyAuthChange();
        return { success: true, user: u };
      }
      return {
        success: false,
        message: 'Contraseña incorrecta para cuenta de administrador.',
      };
    }

    // 2. Supabase Auth REAL en producción
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (error) {
        let errMessage = error.message;
        if (error.message.includes('Invalid login credentials')) {
          errMessage = 'Email o contraseña incorrectos en Cachengueoo.';
        } else if (error.message.includes('Email not confirmed')) {
          errMessage = 'Debés confirmar tu correo para ingresar (o desactivar "Confirm email" en Supabase Auth Settings).';
        }
        return { success: false, message: errMessage };
      }

      if (data?.user) {
        // Consultar el perfil real desde la tabla public.profiles de Supabase
        const { data: profileData } = await client
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        const currentLocal = this.getCurrentUser();
        const u: UserProfile = buildUserProfileFromSources(
          data.user,
          profileData,
          currentLocal?.id === data.user.id ? currentLocal : null
        );

        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
        sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
        notifyAuthChange();
        return { success: true, user: u };
      }
    }

    // Si no se pudo iniciar con Supabase o no hay conexión, verificar usuarios registrados localmente
    const matchedLocal = this.getAllUsers().find(
      (u) => u.email.toLowerCase() === cleanEmail
    );
    if (matchedLocal) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(matchedLocal));
      sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(matchedLocal));
      notifyAuthChange();
      return { success: true, user: matchedLocal };
    }

    return {
      success: false,
      message: 'No se encontró el usuario. Por favor creá tu Cache ID o corroborá tu email y contraseña.',
    };
  },

  async registerUser(
    newUser: UserProfile,
    password?: string
  ): Promise<{ success: boolean; message?: string; user?: UserProfile }> {
    const client = getSupabaseClient();

    if (client && password) {
      const metaData = {
        full_name: newUser.fullName,
        nickname: newUser.nickname,
        birth_date: newUser.birthDate,
        age: newUser.age,
        avatar_url: newUser.avatarUrl,
        photos: newUser.photos,
        gender: newUser.gender,
        preference: newUser.preference,
        bio: newUser.bio,
        drink_favorite: newUser.drinkFavorite,
        drinks: newUser.drinks,
        zodiac_sign: newUser.zodiacSign,
        music_preferences: newUser.musicPreferences,
        instagram: newUser.instagram,
      };

      // 1. Crear el usuario en Supabase Auth enviando toda su metadata
      const { data, error } = await client.auth.signUp({
        email: newUser.email,
        password,
        options: {
          data: metaData,
        },
      });

      let userId = data?.user?.id;

      // Si el usuario ya existe en Supabase Auth, iniciar sesión y actualizar metadata
      if (error && error.message.toLowerCase().includes('already registered')) {
        const signInRes = await client.auth.signInWithPassword({
          email: newUser.email,
          password,
        });
        if (!signInRes.error && signInRes.data?.user) {
          userId = signInRes.data.user.id;
          await client.auth.updateUser({ data: metaData });
        } else {
          return {
            success: false,
            message: 'Este correo ya está registrado en Cachengueoo. Podés ingresar en "Iniciar sesión" con tu contraseña o con el botón de Google si usás Gmail.',
          };
        }
      } else if (error) {
        return { success: false, message: error.message };
      }

      if (userId) {
        const computedDrinks = newUser.drinks && newUser.drinks.length > 0 ? newUser.drinks : [];
        const computedDrinkFavorite =
          computedDrinks.length > 0
            ? computedDrinks.join(' & ')
            : newUser.drinkFavorite || 'Fernet con Coca';

        // 2. Guardar en public.profiles con todas las columnas
        const validDbRecord = {
          id: userId,
          email: newUser.email,
          full_name: newUser.fullName,
          nickname: newUser.nickname || newUser.fullName,
          birth_date: newUser.birthDate,
          age: newUser.age,
          avatar_url: newUser.avatarUrl || '',
          photos:
            newUser.photos && newUser.photos.length > 0
              ? newUser.photos
              : [newUser.avatarUrl].filter(Boolean),
          gender: newUser.gender || 'hombre',
          preference: newUser.preference || 'todos',
          bio: newUser.bio || '',
          drink_favorite: computedDrinkFavorite,
          drinks: computedDrinks,
          zodiac_sign: newUser.zodiacSign || null,
          music_preferences: newUser.musicPreferences || [],
          instagram: newUser.instagram || '',
          interests: packProfileInterests({
            ...newUser,
            drinks: computedDrinks,
          }),
          is_verified_in_venue: false,
          updated_at: new Date().toISOString(),
        };

        // Sincronizar en Firestore
        try {
          await setDoc(
            doc(db, 'profiles', userId),
            {
              ...validDbRecord,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (fsErr) {
          console.warn('Notice syncing registered profile to Firestore:', fsErr);
        }

        const { error: upsertErr } = await client.from('profiles').upsert(
          validDbRecord,
          { onConflict: 'id' }
        );

        if (upsertErr) {
          console.warn('Advertencia al sincronizar perfil en Supabase, intentando update:', upsertErr.message);
          await client.from('profiles').update(validDbRecord).eq('id', userId);
        }

        const registeredProfile: UserProfile = {
          ...newUser,
          id: userId,
          drinks: computedDrinks,
          drinkFavorite: computedDrinkFavorite,
          photos: validDbRecord.photos,
          isAdmin: newUser.email.includes('admin'),
          role: newUser.email.includes('admin') ? 'admin' : 'user',
        };

        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(registeredProfile));
        sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(registeredProfile));

        const allUsers = this.getAllUsers().filter((u) => u.id !== registeredProfile.id && u.email !== registeredProfile.email);
        allUsers.unshift(registeredProfile);
        localStorage.setItem(USERS_LIST_STORAGE_KEY, JSON.stringify(allUsers));

        notifyAuthChange();

        return { success: true, user: registeredProfile };
      }
    }

    // Guardado local de contingencia
    const localUser: UserProfile = {
      ...newUser,
      isAdmin: newUser.email.includes('admin'),
      role: newUser.email.includes('admin') ? 'admin' : 'user',
    };
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(localUser));
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(localUser));

    const allUsers = this.getAllUsers().filter((u) => u.id !== localUser.id && u.email !== localUser.email);
    allUsers.unshift(localUser);
    localStorage.setItem(USERS_LIST_STORAGE_KEY, JSON.stringify(allUsers));

    notifyAuthChange();

    return { success: true, user: localUser };
  },

  async checkEmailExists(
    email: string,
    excludeUserId?: string
  ): Promise<{
    exists: boolean;
    provider?: string;
    profile?: UserProfile;
    isConfigured?: boolean;
  }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return { exists: false, isConfigured: false };

    const isPlaceholderAvatar = (url?: string | null) => {
      if (!url) return true;
      if (url.includes('images.unsplash.com')) return true;
      return false;
    };

    const isPlaceholderBirthDate = (date?: string | null) => {
      if (!date) return true;
      if (date === '2001-01-01' || date === '2000-01-01') return true;
      return false;
    };

    // 1. Consultar en Supabase profiles
    const client = getSupabaseClient();
    if (client) {
      try {
        let queryBuilder = client.from('profiles').select('*').eq('email', cleanEmail);
        if (excludeUserId) {
          queryBuilder = queryBuilder.neq('id', excludeUserId);
        }
        const { data } = await queryBuilder.maybeSingle();

        if (data) {
          if (excludeUserId && data.id === excludeUserId) {
            return { exists: false, isConfigured: false };
          }

          const isConfigured = Boolean(
            data.full_name &&
            !isPlaceholderBirthDate(data.birth_date) &&
            !isPlaceholderAvatar(data.avatar_url) &&
            (
              (Array.isArray(data.drinks) && data.drinks.length > 0) ||
              data.zodiac_sign ||
              (Array.isArray(data.interests) && data.interests.length > 0)
            )
          );

          const profile: UserProfile = {
            id: data.id,
            email: data.email,
            fullName: data.full_name || '',
            nickname: data.nickname || data.full_name || '',
            birthDate: data.birth_date || '2001-01-01',
            age: Number(data.age) || 23,
            avatarUrl: data.avatar_url || '',
            photos: Array.isArray(data.photos) ? data.photos : (data.avatar_url ? [data.avatar_url] : []),
            gender: data.gender || 'hombre',
            preference: data.preference || 'todos',
            interests: Array.isArray(data.interests) ? data.interests : [],
            bio: data.bio || '',
            drinkFavorite: data.drink_favorite || 'Fernet con Coca',
            instagram: data.instagram || undefined,
            createdAt: data.created_at || new Date().toISOString(),
          };
          return { exists: true, profile, isConfigured };
        }
      } catch (err) {
        console.warn('Error verificando email en Supabase profiles:', err);
      }
    }

    // 2. Consultar en Firestore profiles
    try {
      const q = query(collection(db, 'profiles'), where('email', '==', cleanEmail), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docData = snap.docs[0].data();
        const docId = snap.docs[0].id;
        if (!excludeUserId || docId !== excludeUserId) {
          const isConfigured = Boolean(
            docData.full_name &&
            !isPlaceholderBirthDate(docData.birth_date) &&
            !isPlaceholderAvatar(docData.avatar_url)
          );
          const fsProfile: UserProfile = {
            id: docId,
            email: docData.email || cleanEmail,
            fullName: docData.full_name || '',
            nickname: docData.nickname || docData.full_name || '',
            birthDate: docData.birth_date || '2001-01-01',
            age: Number(docData.age) || 23,
            avatarUrl: docData.avatar_url || '',
            photos: Array.isArray(docData.photos) ? docData.photos : (docData.avatar_url ? [docData.avatar_url] : []),
            gender: docData.gender || 'hombre',
            preference: docData.preference || 'todos',
            interests: Array.isArray(docData.interests) ? docData.interests : [],
            bio: docData.bio || '',
            drinkFavorite: docData.drink_favorite || 'Fernet con Coca',
            instagram: docData.instagram || undefined,
            createdAt: docData.created_at || new Date().toISOString(),
          };
          return { exists: true, profile: fsProfile, isConfigured };
        }
      }
    } catch {}

    // 3. Consultar en usuarios registrados locales
    const local = this.getAllUsers().find(
      (u) =>
        u.email?.toLowerCase() === cleanEmail &&
        (!excludeUserId || u.id !== excludeUserId)
    );
    if (local) {
      const isConfigured = Boolean(
        local.fullName &&
        !isPlaceholderBirthDate(local.birthDate) &&
        !isPlaceholderAvatar(local.avatarUrl)
      );
      return { exists: true, profile: local, isConfigured };
    }

    return { exists: false, isConfigured: false };
  },

  async signInWithGoogle(): Promise<{ success: boolean; message?: string }> {
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, message: 'No hay conexión activa con la base de datos de Supabase.' };
    }
    try {
      // 1. Limpiar sesión previa si se está intentando cambiar de cuenta
      try {
        await client.auth.signOut({ scope: 'local' });
      } catch {}

      // Limpiar datos de sesión local de usuario previo
      localStorage.removeItem(USER_STORAGE_KEY);
      sessionStorage.removeItem(USER_STORAGE_KEY);

      // Usar la URL exacta limpia actual para el callback
      const redirectUrl = typeof window !== 'undefined'
        ? window.location.href.split('#')[0].split('?')[0]
        : '';

      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        return { success: false, message: error.message };
      }

      // Si Supabase devuelve la URL directamente, forzar redirección de inmediato
      if (data?.url && typeof window !== 'undefined') {
        window.location.href = data.url;
      }

      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Error al conectar con Google',
      };
    }
  },

  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    const client = getSupabaseClient();
    if (client) {
      const { error } = await client.auth.resetPasswordForEmail(email);
      if (error) {
        return { success: false, message: error.message };
      }
    }
    return {
      success: true,
      message: `Te enviamos un correo electrónico a ${email} con el enlace para restablecer tu contraseña. Revisá tu bandeja de entrada o spam.`,
    };
  },

  logout(): void {
    const client = getSupabaseClient();
    if (client) {
      client.auth.signOut().then(() => {}, () => {});
    }
    sessionStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    sessionStorage.removeItem('cachengueoo_flow_intent');
    localStorage.removeItem('cachengueoo_flow_intent');
    localStorage.removeItem('cachengueoo_cache_id_created');
    presenceService.clearPresence();
    notifyAuthChange();
  },

  async deleteUser(userId: string, userEmail?: string): Promise<{ success: boolean; message: string }> {
    // 1. Delete from local users list
    const all = this.getAllUsers().filter(
      (u) => u.id !== userId && (!userEmail || u.email?.toLowerCase() !== userEmail.toLowerCase())
    );
    localStorage.setItem(USERS_LIST_STORAGE_KEY, JSON.stringify(all));

    // If current session is this user, log out
    const current = this.getCurrentUser();
    if (current && (current.id === userId || (userEmail && current.email?.toLowerCase() === userEmail.toLowerCase()))) {
      sessionStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      notifyAuthChange();
    }

    // 2. Also remove from blocked list if present
    try {
      const blocked = JSON.parse(localStorage.getItem('cachengueoo_blocked_match_users') || '[]');
      const filteredBlocked = blocked.filter(
        (id: string) => id !== userId && (!userEmail || id !== userEmail.toLowerCase())
      );
      localStorage.setItem('cachengueoo_blocked_match_users', JSON.stringify(filteredBlocked));
    } catch {}

    // 3. Delete from Supabase profiles table
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('profiles').delete().eq('id', userId);
        if (userEmail) {
          await client.from('profiles').delete().eq('email', userEmail);
        }
      } catch (e) {
        console.warn('Error deleting user from Supabase profiles:', e);
      }
    }

    notifyAuthChange();
    return { success: true, message: 'Usuario eliminado permanentemente' };
  },

  loginDemo(role: 'user' | 'admin' | 'valen'): UserProfile {
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(DEFAULT_ADMIN_USER));
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(DEFAULT_ADMIN_USER));
    notifyAuthChange();
    return DEFAULT_ADMIN_USER;
  },
};
