import { INITIAL_MATCHES, MOCK_MATCH_PROFILES } from '../data/mockData';
import { ChatMessage, LikeAction, MatchPair, MatchProfile } from '../types';
import { getSupabaseClient } from './supabaseClient';
import { unpackProfileInterests } from '../utils/profileMetadata';
import { db } from './firebaseClient';
import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';

const MATCHES_STORAGE_KEY = 'cachengueoo_user_matches';
const LIKES_STORAGE_KEY = 'cachengueoo_user_likes';
const MESSAGES_STORAGE_KEY = 'cachengueoo_chat_messages';
const DISMISSED_STORAGE_KEY = 'cachengueoo_dismissed_profiles';

const INITIAL_MESSAGES: Record<string, ChatMessage[]> = {};

export const isValidUuid = (id?: string | null): boolean =>
  typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export const getChatChannelId = (u1: string, u2: string, fallbackMatchId?: string): string => {
  const cleanU1 = (u1 || '').trim();
  const cleanU2 = (u2 || '').trim();
  if (cleanU1 && cleanU2) {
    return [cleanU1, cleanU2].sort().join('___').replace(/[^a-zA-Z0-9_-]/g, '_');
  }
  return (fallbackMatchId || 'chat_general').replace(/[^a-zA-Z0-9_-]/g, '_');
};

export const matchService = {
  getDismissedProfileIds(currentUserId?: string): string[] {
    try {
      const key = currentUserId ? `${DISMISSED_STORAGE_KEY}_${currentUserId}` : DISMISSED_STORAGE_KEY;
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  },

  addDismissedProfileId(id: string, currentUserId?: string): void {
    const list = this.getDismissedProfileIds(currentUserId);
    if (!list.includes(id)) {
      list.push(id);
      const key = currentUserId ? `${DISMISSED_STORAGE_KEY}_${currentUserId}` : DISMISSED_STORAGE_KEY;
      localStorage.setItem(key, JSON.stringify(list));
      // Guardar también en fallback global si no hay userId
      if (!currentUserId) {
        localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(list));
      }
    }
  },

  getAvailableProfiles(): MatchProfile[] {
    return [];
  },

  async fetchAvailableProfiles(currentUserId?: string): Promise<MatchProfile[]> {
    const dismissed = this.getDismissedProfileIds(currentUserId);
    let blockedList: string[] = [];
    try {
      blockedList = JSON.parse(localStorage.getItem('cachengueoo_blocked_match_users') || '[]');
    } catch {}

    const client = getSupabaseClient();
    const loadedProfiles: MatchProfile[] = [];
    const seenUserIds = new Set<string>();

    if (currentUserId) {
      seenUserIds.add(currentUserId);
    }

    // 1. Cargar desde la base de datos Supabase
    if (client) {
      try {
        let query = client.from('profiles').select('*');
        if (currentUserId) {
          query = query.neq('id', currentUserId);
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          data.forEach((row) => {
            if (row.id === currentUserId) return;
            if (dismissed.includes(row.id)) return;
            if (blockedList.includes(row.id)) return;
            if (row.email && blockedList.includes(row.email.toLowerCase())) return;

            seenUserIds.add(row.id);
            if (row.email) seenUserIds.add(row.email.toLowerCase());

            const unpacked = unpackProfileInterests(row.interests);
            const avatar =
              row.avatar_url ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80';
            const photos =
              Array.isArray(row.photos) && row.photos.length > 0
                ? row.photos
                : [avatar, ...unpacked.extraPhotos].slice(0, 3);
            const drinks =
              unpacked.drinks.length > 0
                ? unpacked.drinks
                : row.drink_favorite
                ? [row.drink_favorite]
                : ['Fernet', 'Skyy'];
            const musicPreferences =
              unpacked.musicPreferences.length > 0
                ? unpacked.musicPreferences
                : ['Reggaeton', 'Cumbia', 'Cuarteto'];
            const zodiacSign = unpacked.zodiacSign || row.zodiac_sign || undefined;

            // Vigencia en Match de 8 horas:
            // Si el perfil fue actualizado o verificado en las últimas 8 horas (o si no tiene fecha aún),
            // se considera activo en la fiesta
            const updatedAtMs = row.updated_at ? new Date(row.updated_at).getTime() : Date.now();
            const isWithin8Hours = Date.now() - updatedAtMs <= 8 * 60 * 60 * 1000;
            const isVerified = row.is_verified_in_venue === true || isWithin8Hours;

            loadedProfiles.push({
              userId: row.id,
              fullName: row.full_name || row.nickname || 'Cachenguero',
              nickname: row.nickname || row.full_name || 'Cachenguero',
              age: Number(row.age) || 23,
              avatarUrl: avatar,
              photos,
              bio: row.bio || '¡Disfrutando de la noche en Cachengueoo!',
              interests: unpacked.plainInterests.length > 0 ? unpacked.plainInterests : drinks,
              drinkFavorite: row.drink_favorite || drinks.join(' & '),
              drinks,
              zodiacSign,
              musicPreferences,
              verifiedInVenue: Boolean(isVerified),
              lastPresenceCheck: row.updated_at || new Date().toISOString(),
              instagram: row.instagram || undefined,
              gender: row.gender || undefined,
              nightNote: unpacked.nightNote,
            });
          });
        }
      } catch (e) {
        console.warn('Error fetching profiles from Supabase:', e);
      }
    }

    // 2. Fusionar con perfiles registrados localmente para garantizar que usuarios creados
    // recientemente en la fiesta aparezcan de inmediato durante al menos 8 horas
    try {
      const savedUsers = localStorage.getItem('cachengueoo_registered_users');
      if (savedUsers) {
        const localUsers = JSON.parse(savedUsers);
        if (Array.isArray(localUsers)) {
          for (const u of localUsers) {
            if (!u.id || u.id === currentUserId) continue;
            if (seenUserIds.has(u.id)) continue;
            if (u.email && seenUserIds.has(u.email.toLowerCase())) continue;
            if (dismissed.includes(u.id)) continue;
            if (blockedList.includes(u.id)) continue;
            if (u.email && blockedList.includes(u.email.toLowerCase())) continue;
            if (u.isAdmin || u.role === 'admin') continue;

            seenUserIds.add(u.id);
            if (u.email) seenUserIds.add(u.email.toLowerCase());

            const avatar =
              u.avatarUrl ||
              (u.photos && u.photos[0]) ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80';
            const photos =
              Array.isArray(u.photos) && u.photos.length > 0
                ? u.photos.slice(0, 3)
                : [avatar];
            const drinks =
              u.drinks && u.drinks.length > 0
                ? u.drinks
                : u.drinkFavorite
                ? [u.drinkFavorite]
                : ['Fernet', 'Skyy'];
            const musicPreferences =
              u.musicPreferences && u.musicPreferences.length > 0
                ? u.musicPreferences
                : ['Reggaeton', 'Cumbia', 'Cuarteto'];

            loadedProfiles.push({
              userId: u.id,
              fullName: u.fullName || u.nickname || 'Cachenguero',
              nickname: u.nickname || u.fullName || 'Cachenguero',
              age: Number(u.age) || 23,
              avatarUrl: avatar,
              photos,
              bio: u.bio || '¡Disfrutando de la noche en Cachengueoo!',
              interests: u.interests && u.interests.length > 0 ? u.interests : drinks,
              drinkFavorite: u.drinkFavorite || drinks.join(' & '),
              drinks,
              zodiacSign: u.zodiacSign,
              musicPreferences,
              verifiedInVenue: true,
              lastPresenceCheck: new Date().toISOString(),
              instagram: u.instagram,
              gender: u.gender,
              nightNote: u.nightNote,
            });
          }
        }
      }
    } catch (e) {
      console.warn('Error reading local registered users for match:', e);
    }

    return loadedProfiles;
  },

  resetSwipes(currentUserId?: string): void {
    if (currentUserId) {
      localStorage.removeItem(`${DISMISSED_STORAGE_KEY}_${currentUserId}`);
    }
    localStorage.removeItem(DISMISSED_STORAGE_KEY);
  },

  getMatches(currentUserId?: string): MatchPair[] {
    try {
      if (!currentUserId) return [];
      const key = `${MATCHES_STORAGE_KEY}_${currentUserId}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed: MatchPair[] = JSON.parse(saved);
        return parsed.filter((m) => m.userAId === currentUserId || m.userBId === currentUserId);
      }
      // Migración desde legacy storage key (únicamente si pertenece al usuario)
      const legacy = localStorage.getItem(MATCHES_STORAGE_KEY);
      if (legacy) {
        const parsed: MatchPair[] = JSON.parse(legacy);
        const filtered = parsed.filter((m) => m.userAId === currentUserId || m.userBId === currentUserId);
        if (filtered.length > 0) {
          localStorage.setItem(key, JSON.stringify(filtered));
        }
        return filtered;
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  },

  saveMatches(matches: MatchPair[], currentUserId?: string): void {
    try {
      if (currentUserId) {
        const key = `${MATCHES_STORAGE_KEY}_${currentUserId}`;
        const filtered = matches.filter((m) => m.userAId === currentUserId || m.userBId === currentUserId);
        localStorage.setItem(key, JSON.stringify(filtered));
      }
    } catch (e) {
      console.error(e);
    }
  },

  getPassedUserIds(currentUserId: string): string[] {
    try {
      const stored = localStorage.getItem(`cachengueoo_passes_${currentUserId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  async recordPass(userId: string, targetUserId: string): Promise<void> {
    const list = this.getPassedUserIds(userId);
    if (!list.includes(targetUserId)) {
      list.push(targetUserId);
      localStorage.setItem(`cachengueoo_passes_${userId}`, JSON.stringify(list));
    }

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('user_passes').insert({
          user_id: userId,
          target_user_id: targetUserId,
        });
      } catch {}
    }
  },

  async registerSwipe(
    fromUserId: string,
    targetProfile: MatchProfile,
    action: 'like' | 'pass' | 'superlike',
    eventId?: string
  ): Promise<{ isMatch: boolean; newMatch?: MatchPair }> {
    this.addDismissedProfileId(targetProfile.userId, fromUserId);

    if (action === 'pass') {
      await this.recordPass(fromUserId, targetProfile.userId);
      return { isMatch: false };
    }

    const safeEventId = eventId && isValidUuid(eventId) ? eventId : null;

    // 1. Guardar el like en caché local
    const likes: LikeAction[] = JSON.parse(localStorage.getItem(LIKES_STORAGE_KEY) || '[]');
    likes.push({
      id: `like_${Date.now()}`,
      fromUserId,
      toUserId: targetProfile.userId,
      eventId: safeEventId || 'evt_tonight',
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(likes));

    // 2. Registrar like en base de datos Supabase (con UUIDs válidos)
    const client = getSupabaseClient();
    if (client && isValidUuid(fromUserId) && isValidUuid(targetProfile.userId)) {
      try {
        const { error: insertErr } = await client.from('likes').insert({
          from_user_id: fromUserId,
          to_user_id: targetProfile.userId,
          event_id: safeEventId,
        });
        if (insertErr && !insertErr.message.includes('duplicate')) {
          console.warn('Advertencia al insertar like en Supabase:', insertErr.message);
        }
      } catch (e) {
        console.warn('Error al insertar like en Supabase:', e);
      }
    }

    // 3. Registrar like en Firebase Firestore (garantiza sincronización universal entre cualquier cuenta/dispositivo)
    try {
      const firestoreLikeId = `${fromUserId}___${targetProfile.userId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      await setDoc(doc(db, 'likes', firestoreLikeId), {
        fromUserId,
        toUserId: targetProfile.userId,
        eventId: safeEventId || 'evt_tonight',
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Error guardando like en Firestore:', e);
    }

    // 4. Verificar si el otro usuario ya le había dado corazón a fromUserId (COINCIDENCIA RECÍPROCA)
    let hasReciprocalLike = false;

    if (client && isValidUuid(fromUserId) && isValidUuid(targetProfile.userId)) {
      try {
        const { data, error } = await client
          .from('likes')
          .select('id')
          .eq('from_user_id', targetProfile.userId)
          .eq('to_user_id', fromUserId)
          .limit(1);

        if (!error && data && data.length > 0) {
          hasReciprocalLike = true;
        }
      } catch (e) {
        console.warn('Error verificando like recíproco en Supabase:', e);
      }
    }

    if (!hasReciprocalLike) {
      hasReciprocalLike = likes.some(
        (l) => l.fromUserId === targetProfile.userId && l.toUserId === fromUserId
      );
    }

    if (!hasReciprocalLike) {
      try {
        const reciprocalLikeDocId = `${targetProfile.userId}___${fromUserId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
        const reciprocalSnap = await getDoc(doc(db, 'likes', reciprocalLikeDocId));
        if (reciprocalSnap.exists()) {
          hasReciprocalLike = true;
        }
      } catch (e) {
        console.warn('Error verificando like recíproco en Firestore:', e);
      }
    }

    // 5. ÚNICAMENTE SI AMBOS SE DIERON CORAZÓN MUTUAMENTE SE GENERA EL MATCH
    if (hasReciprocalLike) {
      const pairKey = [fromUserId, targetProfile.userId].sort().join('_');
      let finalMatchId = `match_${pairKey}`;

      if (client && isValidUuid(fromUserId) && isValidUuid(targetProfile.userId)) {
        try {
          // Verificar si el match ya fue registrado previamente en Supabase
          const { data: existingDbMatch } = await client
            .from('matches')
            .select('id')
            .or(`and(user_a_id.eq.${fromUserId},user_b_id.eq.${targetProfile.userId}),and(user_a_id.eq.${targetProfile.userId},user_b_id.eq.${fromUserId})`)
            .maybeSingle();

          if (existingDbMatch?.id) {
            finalMatchId = existingDbMatch.id;
          } else {
            const { data: newDbMatch, error: matchErr } = await client
              .from('matches')
              .insert({
                user_a_id: fromUserId,
                user_b_id: targetProfile.userId,
                event_id: safeEventId,
              })
              .select('id')
              .maybeSingle();

            if (!matchErr && newDbMatch?.id) {
              finalMatchId = newDbMatch.id;
            }
          }
        } catch (e) {
          console.warn('Error al sincronizar match en Supabase:', e);
        }
      }

      // Sincronizar en Firestore para persistencia en la nube
      try {
        const fsMatchId = `match_${[fromUserId, targetProfile.userId].sort().join('___')}`.replace(/[^a-zA-Z0-9_-]/g, '_');
        await setDoc(
          doc(db, 'matches', fsMatchId),
          {
            id: fsMatchId,
            userAId: fromUserId,
            userBId: targetProfile.userId,
            eventId: safeEventId || 'evt_tonight',
            eventTitle: 'CACHENGUEOO NIGHT',
            matchedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (e) {
        console.warn('Error guardando match en Firestore:', e);
      }

      const matches = this.getMatches(fromUserId);
      const existing = matches.find(
        (m) =>
          m.id === finalMatchId ||
          (m.userAId === fromUserId && m.userBId === targetProfile.userId) ||
          (m.userAId === targetProfile.userId && m.userBId === fromUserId)
      );
      if (existing) {
        return { isMatch: true, newMatch: existing };
      }

      const newMatch: MatchPair = {
        id: finalMatchId,
        userAId: fromUserId,
        userBId: targetProfile.userId,
        eventId: safeEventId || 'evt_tonight',
        eventTitle: 'CACHENGUEOO NIGHT',
        matchedAt: new Date().toISOString(),
        lastMessageSnippet: '¡Hicieron Match!',
        lastMessageAt: 'Recién',
        partnerProfile: targetProfile,
      };

      const updatedMatches = [newMatch, ...matches.filter((m) => m.id !== finalMatchId)];
      this.saveMatches(updatedMatches, fromUserId);

      return { isMatch: true, newMatch };
    }

    // Si aún no hay corazón recíproco, no se habilita el Match (el receptor lo verá en Conectá)
    return { isMatch: false };
  },

  async fetchIncomingLikes(currentUserId: string): Promise<MatchProfile[]> {
    if (!currentUserId) return [];
    const client = getSupabaseClient();
    const matches = this.getMatches(currentUserId);
    const matchedUserIds = new Set(
      matches.map((m) => (m.userAId === currentUserId ? m.userBId : m.userAId))
    );

    let blockedList: string[] = [];
    try {
      blockedList = JSON.parse(localStorage.getItem('cachengueoo_blocked_match_users') || '[]');
    } catch {}

    const passedIds = this.getPassedUserIds(currentUserId);
    let senderIds: string[] = [];

    // 1. Likes de Supabase
    if (client) {
      try {
        const { data, error } = await client
          .from('likes')
          .select('from_user_id, created_at')
          .eq('to_user_id', currentUserId)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          senderIds = data
            .map((r: any) => r.from_user_id)
            .filter((id: string) => Boolean(id) && id !== currentUserId);
        }
      } catch (e) {
        console.warn('Error fetching likes from Supabase:', e);
      }
    }

    // 2. Likes de Firestore (garantiza recibir Me Gusta de cualquier usuario en tiempo real)
    try {
      const qLikes = query(collection(db, 'likes'), where('toUserId', '==', currentUserId));
      const snap = await getDocs(qLikes);
      snap.forEach((d) => {
        const data = d.data();
        if (data.fromUserId && data.fromUserId !== currentUserId && !senderIds.includes(data.fromUserId)) {
          senderIds.push(data.fromUserId);
        }
      });
    } catch (e) {
      console.warn('Error fetching Firestore likes:', e);
    }

    // 3. Likes locales
    try {
      const localLikes: LikeAction[] = JSON.parse(
        localStorage.getItem(LIKES_STORAGE_KEY) || '[]'
      );
      localLikes
        .filter((l) => l.toUserId === currentUserId && l.fromUserId !== currentUserId)
        .forEach((l) => {
          if (!senderIds.includes(l.fromUserId)) {
            senderIds.push(l.fromUserId);
          }
        });
    } catch {}

    const pendingSenderIds = senderIds.filter((id) => {
      if (matchedUserIds.has(id)) return false;
      if (blockedList.includes(id)) return false;
      if (passedIds.includes(id)) return false;
      return true;
    });

    if (pendingSenderIds.length === 0) return [];

    const profiles: MatchProfile[] = [];
    if (client) {
      try {
        const { data, error } = await client
          .from('profiles')
          .select('*')
          .in('id', pendingSenderIds);

        if (!error && Array.isArray(data)) {
          data.forEach((row: any) => {
            const unpacked = unpackProfileInterests(row.interests);
            const avatar =
              row.avatar_url ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80';
            const photos =
              Array.isArray(row.photos) && row.photos.length > 0
                ? row.photos
                : [avatar, ...unpacked.extraPhotos].slice(0, 3);
            const drinks =
              unpacked.drinks.length > 0
                ? unpacked.drinks
                : row.drink_favorite
                ? [row.drink_favorite]
                : ['Fernet', 'Skyy'];
            const musicPreferences =
              unpacked.musicPreferences.length > 0
                ? unpacked.musicPreferences
                : ['Reggaeton', 'Cumbia', 'Cuarteto'];
            const zodiacSign = unpacked.zodiacSign || row.zodiac_sign || undefined;

            profiles.push({
              userId: row.id,
              fullName: row.full_name || row.nickname || 'Cachenguero',
              nickname: row.nickname || row.full_name || 'Cachenguero',
              age: Number(row.age) || 23,
              avatarUrl: avatar,
              photos,
              bio: row.bio || '¡Disfrutando de la noche en Cachengueoo!',
              interests: unpacked.plainInterests.length > 0 ? unpacked.plainInterests : drinks,
              drinkFavorite: row.drink_favorite || drinks.join(' & '),
              drinks,
              zodiacSign,
              musicPreferences,
              verifiedInVenue: Boolean(row.is_verified_in_venue ?? true),
              lastPresenceCheck: row.updated_at || new Date().toISOString(),
              instagram: row.instagram || undefined,
              gender: row.gender || undefined,
            });
          });
        }
      } catch (e) {
        console.warn('Error fetching profiles for incoming likes:', e);
      }
    }

    return profiles;
  },

  async fetchUserMatches(currentUserId: string): Promise<MatchPair[]> {
    if (!currentUserId) return [];
    const localMatches = this.getMatches(currentUserId);
    const client = getSupabaseClient();
    const map = new Map<string, MatchPair>();

    // Cargar primero los locales del usuario
    localMatches
      .filter((m) => m.userAId === currentUserId || m.userBId === currentUserId)
      .forEach((m) => map.set(m.id, m));

    // 1. Matches de Supabase
    if (client && currentUserId) {
      try {
        const { data, error } = await client
          .from('matches')
          .select('*')
          .or(`user_a_id.eq.${currentUserId},user_b_id.eq.${currentUserId}`)
          .order('matched_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          const partnerIds = data.map((m: any) =>
            m.user_a_id === currentUserId ? m.user_b_id : m.user_a_id
          );

          const { data: profilesData } = await client
            .from('profiles')
            .select('*')
            .in('id', partnerIds);

          const profilesMap = new Map<string, any>();
          if (profilesData) {
            profilesData.forEach((p: any) => profilesMap.set(p.id, p));
          }

          data.forEach((m: any) => {
            const partnerId = m.user_a_id === currentUserId ? m.user_b_id : m.user_a_id;
            const p = profilesMap.get(partnerId);
            const avatar =
              p?.avatar_url ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80';
            const photos =
              Array.isArray(p?.photos) && p.photos.length > 0 ? p.photos : [avatar];
            const partnerProfile: MatchProfile = {
              userId: partnerId,
              fullName: p?.full_name || p?.nickname || 'Cachenguero',
              nickname: p?.nickname || p?.full_name || 'Cachenguero',
              age: Number(p?.age) || 23,
              avatarUrl: avatar,
              photos,
              bio: p?.bio || '',
              interests: [],
              drinkFavorite: p?.drink_favorite || 'Fernet',
              instagram: p?.instagram || undefined,
              verifiedInVenue: true,
              lastPresenceCheck: new Date().toISOString(),
            };

            const existingLocal = map.get(m.id);
            map.set(m.id, {
              id: m.id,
              userAId: m.user_a_id,
              userBId: m.user_b_id,
              eventId: m.event_id || 'evt_01',
              eventTitle: 'CACHENGUEOO NIGHT',
              matchedAt: m.matched_at || m.created_at || new Date().toISOString(),
              lastMessageSnippet: existingLocal?.lastMessageSnippet || '¡Hicieron Match!',
              lastMessageAt: existingLocal?.lastMessageAt || 'Recién',
              partnerProfile: existingLocal?.partnerProfile || partnerProfile,
            });
          });
        }
      } catch (e) {
        console.warn('Error fetching matches from Supabase:', e);
      }
    }

    // 2. Matches de Firestore
    try {
      const qA = query(collection(db, 'matches'), where('userAId', '==', currentUserId));
      const qB = query(collection(db, 'matches'), where('userBId', '==', currentUserId));
      const [snapA, snapB] = await Promise.all([getDocs(qA), getDocs(qB)]);
      const fsMatches = [...snapA.docs, ...snapB.docs];

      for (const d of fsMatches) {
        const m = d.data();
        if (!map.has(d.id)) {
          const partnerId = m.userAId === currentUserId ? m.userBId : m.userAId;
          const partnerProfile: MatchProfile = {
            userId: partnerId,
            fullName: 'Cachenguero',
            nickname: 'Cachenguero',
            age: 23,
            avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
            photos: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80'],
            bio: '',
            interests: [],
            drinkFavorite: 'Fernet',
            verifiedInVenue: true,
            lastPresenceCheck: new Date().toISOString(),
          };

          map.set(d.id, {
            id: d.id,
            userAId: m.userAId,
            userBId: m.userBId,
            eventId: m.eventId || 'evt_tonight',
            eventTitle: m.eventTitle || 'CACHENGUEOO NIGHT',
            matchedAt: m.matchedAt || new Date().toISOString(),
            lastMessageSnippet: '¡Hicieron Match!',
            lastMessageAt: 'Recién',
            partnerProfile,
          });
        }
      }
    } catch (e) {
      console.warn('Error fetching matches from Firestore:', e);
    }

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.matchedAt).getTime() - new Date(a.matchedAt).getTime()
    );
    this.saveMatches(merged, currentUserId);
    return merged;
  },

  getMessages(matchId: string, currentUserId?: string, partnerId?: string): ChatMessage[] {
    try {
      const stored = localStorage.getItem(MESSAGES_STORAGE_KEY);
      const all: Record<string, ChatMessage[]> = stored ? JSON.parse(stored) : INITIAL_MESSAGES;
      let msgs: ChatMessage[] = all[matchId] || [];

      if (currentUserId && partnerId) {
        const pairKey = [currentUserId, partnerId].sort().join('_');
        if (all[pairKey] && all[pairKey].length > msgs.length) {
          msgs = all[pairKey];
        }
      }

      // Filtrar estrictamente a esta conversación para que nunca se filtren mensajes a terceros
      if (currentUserId && partnerId) {
        return msgs.filter(
          (m) =>
            (m.senderId === currentUserId && m.receiverId === partnerId) ||
            (m.senderId === partnerId && m.receiverId === currentUserId) ||
            m.matchId === matchId
        );
      }

      return msgs;
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  async fetchMessages(
    matchId: string,
    currentUserId?: string,
    partnerId?: string
  ): Promise<ChatMessage[]> {
    const localMsgs = this.getMessages(matchId, currentUserId, partnerId);
    const map = new Map<string, ChatMessage>();
    localMsgs.forEach((m) => map.set(m.id || `${m.senderId}_${m.createdAt}`, m));

    // 1. Mensajes desde Firebase Firestore (en vivo y multiplataforma)
    try {
      const channelId = getChatChannelId(currentUserId || '', partnerId || '', matchId);
      const messagesRef = collection(db, 'chats', channelId, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'asc'));
      const snap = await getDocs(q);

      if (!snap.empty) {
        snap.docs.forEach((docSnap) => {
          const d = docSnap.data();
          const msg: ChatMessage = {
            id: docSnap.id,
            matchId: d.matchId || matchId,
            senderId: d.senderId,
            receiverId: d.receiverId,
            text: d.text,
            createdAt: d.createdAt,
            read: Boolean(d.read),
          };
          map.set(msg.id, msg);
        });
      }
    } catch (e) {
      console.warn('Error fetching Firestore chat messages:', e);
    }

    // 2. Mensajes desde Supabase si existe
    const client = getSupabaseClient();
    if (client) {
      try {
        let querySupabase = client.from('chat_messages').select('*');

        if (currentUserId && partnerId) {
          querySupabase = querySupabase.or(
            `match_id.eq.${matchId},and(sender_id.eq.${currentUserId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${currentUserId})`
          );
        } else {
          querySupabase = querySupabase.eq('match_id', matchId);
        }

        const { data, error } = await querySupabase.order('created_at', { ascending: true });

        if (!error && Array.isArray(data)) {
          data.forEach((row: any) => {
            const msg: ChatMessage = {
              id: String(row.id),
              matchId: row.match_id || matchId,
              senderId: row.sender_id,
              receiverId: row.receiver_id,
              text: row.text,
              createdAt: row.created_at,
              read: Boolean(row.read),
            };
            map.set(msg.id, msg);
          });
        }
      } catch (e) {
        console.warn('Error fetching messages from Supabase:', e);
      }
    }

    const sorted = Array.from(map.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Deduplicación estricta por ID y semántica (senderId + texto + timestamp cercano)
    const deduplicated: ChatMessage[] = [];
    for (const msg of sorted) {
      const isDup = deduplicated.some(
        (existing) =>
          existing.id === msg.id ||
          (existing.senderId === msg.senderId &&
            existing.text.trim() === msg.text.trim() &&
            Math.abs(new Date(existing.createdAt).getTime() - new Date(msg.createdAt).getTime()) < 3000)
      );
      if (!isDup) {
        deduplicated.push(msg);
      }
    }

    // Actualizar caché local limpia
    try {
      const stored = localStorage.getItem(MESSAGES_STORAGE_KEY);
      const all: Record<string, ChatMessage[]> = stored ? JSON.parse(stored) : {};
      all[matchId] = deduplicated;
      if (currentUserId && partnerId) {
        const pairKey = [currentUserId, partnerId].sort().join('_');
        all[pairKey] = deduplicated;
      }
      localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(all));
    } catch {}

    return deduplicated;
  },

  async sendMessage(
    matchId: string,
    senderId: string,
    receiverId: string,
    text: string
  ): Promise<ChatMessage> {
    const cleanText = text.trim();
    const nowIso = new Date().toISOString();
    const pairKey = [senderId, receiverId].sort().join('_');
    const channelId = getChatChannelId(senderId, receiverId, matchId);

    // Generar ID único de Firestore de inmediato (estable y único para todos los oyentes)
    const messagesCol = collection(db, 'chats', channelId, 'messages');
    const messageDocRef = doc(messagesCol);
    const stableMessageId = messageDocRef.id;

    const newMsg: ChatMessage = {
      id: stableMessageId,
      matchId,
      senderId,
      receiverId,
      text: cleanText,
      createdAt: nowIso,
      read: false,
    };

    // 1. Guardar en almacenamiento local evitando duplicados
    try {
      const stored = localStorage.getItem(MESSAGES_STORAGE_KEY);
      const all: Record<string, ChatMessage[]> = stored ? JSON.parse(stored) : INITIAL_MESSAGES;
      const currentList = all[matchId] || [];
      const alreadyInLocal = currentList.some(
        (m) =>
          m.id === stableMessageId ||
          (m.senderId === senderId &&
            m.text.trim() === cleanText &&
            Math.abs(new Date(m.createdAt).getTime() - new Date(nowIso).getTime()) < 3000)
      );
      if (!alreadyInLocal) {
        all[matchId] = [...currentList, newMsg];
        all[pairKey] = [...(all[pairKey] || []), newMsg];
        localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(all));
      }
    } catch {}

    // 2. Transmitir entre pestañas distintas del navegador vía BroadcastChannel
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('cachengueoo_chat_bus');
        bc.postMessage({ type: 'new_message', message: newMsg, pairKey, matchId, channelId });
        bc.close();
      }
    } catch {}

    // 3. ENVIAR A FIREBASE FIRESTORE CON EL ID ESTABLE
    try {
      await setDoc(messageDocRef, {
        matchId,
        senderId,
        receiverId,
        text: cleanText,
        createdAt: nowIso,
        read: false,
      });
    } catch (e) {
      console.warn('Error enviando mensaje a Firestore:', e);
    }

    // 4. Actualizar snippet en la lista de matches para ambos usuarios
    [senderId, receiverId].forEach((uid) => {
      const userMatches = this.getMatches(uid);
      const updated = userMatches.map((m) => {
        if (
          m.id === matchId ||
          (m.userAId === senderId && m.userBId === receiverId) ||
          (m.userAId === receiverId && m.userBId === senderId)
        ) {
          return {
            ...m,
            lastMessageSnippet: cleanText,
            lastMessageAt: 'Ahora',
          };
        }
        return m;
      });
      this.saveMatches(updated, uid);
    });

    // 5. Enviar a Supabase como respaldo adicional
    const client = getSupabaseClient();
    if (client) {
      try {
        const payload: Record<string, any> = {
          sender_id: senderId,
          receiver_id: receiverId,
          text: cleanText,
          created_at: nowIso,
          read: false,
        };
        if (isValidUuid(matchId)) {
          payload.match_id = matchId;
        } else if (isValidUuid(senderId) && isValidUuid(receiverId)) {
          const { data: dbMatch } = await client
            .from('matches')
            .select('id')
            .or(`and(user_a_id.eq.${senderId},user_b_id.eq.${receiverId}),and(user_a_id.eq.${receiverId},user_b_id.eq.${senderId})`)
            .maybeSingle();
          if (dbMatch?.id) {
            payload.match_id = dbMatch.id;
          }
        }
        if (isValidUuid(stableMessageId)) {
          payload.id = stableMessageId;
        }

        const { error: insertErr } = await client.from('chat_messages').insert(payload);
        if (insertErr) {
          console.warn('Nota chat_messages Supabase insert:', insertErr.message);
        }
      } catch (e) {
        console.warn('Error sincronizando mensaje en Supabase:', e);
      }
    }

    return newMsg;
  },

  subscribeToMessages(
    matchId: string,
    arg2: ((msg: ChatMessage) => void) | string,
    arg3?: string | ((msg: ChatMessage) => void),
    arg4?: ((msg: ChatMessage) => void) | string
  ): () => void {
    let onNewMessage: (msg: ChatMessage) => void;
    let currentUserId = '';
    let partnerId = '';

    if (typeof arg2 === 'function') {
      onNewMessage = arg2;
      currentUserId = typeof arg3 === 'string' ? arg3 : '';
      partnerId = typeof arg4 === 'string' ? arg4 : '';
    } else {
      currentUserId = arg2 || '';
      partnerId = typeof arg3 === 'string' ? arg3 : '';
      onNewMessage = typeof arg4 === 'function' ? arg4 : () => {};
    }

    const pairKey = [currentUserId, partnerId].filter(Boolean).sort().join('_') || matchId;
    const channelId = getChatChannelId(currentUserId, partnerId, matchId);
    const seenMsgIds = new Set<string>();

    const emitUniqueMessage = (msg: ChatMessage) => {
      const timeBucket = Math.floor(new Date(msg.createdAt).getTime() / 2500);
      const contentKey = `${msg.senderId}_${msg.text.trim()}_${timeBucket}`;

      if (seenMsgIds.has(msg.id) || seenMsgIds.has(contentKey)) {
        return;
      }
      seenMsgIds.add(msg.id);
      seenMsgIds.add(contentKey);

      if (
        (msg.senderId === currentUserId && msg.receiverId === partnerId) ||
        (msg.senderId === partnerId && msg.receiverId === currentUserId) ||
        (!partnerId && msg.matchId === matchId)
      ) {
        onNewMessage(msg);
      }
    };

    // 1. ESCUCHADOR EN VIVO DE FIREBASE FIRESTORE (onSnapshot)
    let unsubscribeFirestore: (() => void) | null = null;
    try {
      const messagesRef = collection(db, 'chats', channelId, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'asc'));
      unsubscribeFirestore = onSnapshot(
        q,
        (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              const newMsg: ChatMessage = {
                id: change.doc.id,
                matchId: data.matchId || matchId,
                senderId: data.senderId,
                receiverId: data.receiverId,
                text: data.text,
                createdAt: data.createdAt,
                read: Boolean(data.read),
              };
              emitUniqueMessage(newMsg);
            }
          });
        },
        (err) => {
          console.warn('Firestore live chat listener warning:', err);
        }
      );
    } catch (e) {
      console.warn('Error attaching Firestore chat listener:', e);
    }

    // 2. Canales de Supabase como redundancia
    const client = getSupabaseClient();
    let channel: any = null;

    if (client) {
      try {
        channel = client
          .channel(`chat_${pairKey}`)
          .on('broadcast', { event: 'new_message' }, (payload: any) => {
            if (payload.payload) {
              emitUniqueMessage(payload.payload);
            }
          })
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'chat_messages',
            },
            (payload) => {
              if (payload.new) {
                const row = payload.new;
                const newMsg: ChatMessage = {
                  id: String(row.id),
                  matchId: row.match_id || matchId,
                  senderId: row.sender_id,
                  receiverId: row.receiver_id,
                  text: row.text,
                  createdAt: row.created_at,
                  read: Boolean(row.read),
                };
                emitUniqueMessage(newMsg);
              }
            }
          )
          .subscribe();
      } catch (e) {
        console.warn('Realtime subscription error:', e);
      }
    }

    // 3. Bus local de BroadcastChannel para pruebas multipestaña en el mismo navegador
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('cachengueoo_chat_bus');
        bc.onmessage = (event) => {
          if (event.data?.type === 'new_message' && event.data.message) {
            emitUniqueMessage(event.data.message);
          }
        };
      }
    } catch {}

    // 4. Polling de respaldo cada 3 segundos
    const interval = setInterval(async () => {
      const fresh = await this.fetchMessages(matchId, currentUserId, partnerId);
      fresh.forEach((m) => {
        emitUniqueMessage(m);
      });
    }, 3000);

    return () => {
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
      if (channel && client) {
        client.removeChannel(channel).then();
      }
      if (bc) {
        bc.close();
      }
      clearInterval(interval);
    };
  },

  blockUser(matchId: string): void {
    const matches = this.getMatches().filter((m) => m.id !== matchId);
    this.saveMatches(matches);
  },

  reportUser(matchId: string, reason: string): void {
    console.warn(`User in match ${matchId} reported. Reason: ${reason}`);
    this.blockUser(matchId);
  },
};
