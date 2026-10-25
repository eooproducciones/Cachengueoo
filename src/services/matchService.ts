import { INITIAL_MATCHES, MOCK_MATCH_PROFILES } from '../data/mockData';
import { ChatMessage, LikeAction, MatchPair, MatchProfile } from '../types';
import { getSupabaseClient } from './supabaseClient';
import { unpackProfileInterests } from '../utils/profileMetadata';

const MATCHES_STORAGE_KEY = 'cachengueoo_user_matches';
const LIKES_STORAGE_KEY = 'cachengueoo_user_likes';
const MESSAGES_STORAGE_KEY = 'cachengueoo_chat_messages';
const DISMISSED_STORAGE_KEY = 'cachengueoo_dismissed_profiles';

const INITIAL_MESSAGES: Record<string, ChatMessage[]> = {};

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

  getMatches(): MatchPair[] {
    try {
      const saved = localStorage.getItem(MATCHES_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  },

  saveMatches(matches: MatchPair[]): void {
    try {
      localStorage.setItem(MATCHES_STORAGE_KEY, JSON.stringify(matches));
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
    eventId: string
  ): Promise<{ isMatch: boolean; newMatch?: MatchPair }> {
    this.addDismissedProfileId(targetProfile.userId, fromUserId);

    if (action === 'pass') {
      await this.recordPass(fromUserId, targetProfile.userId);
      return { isMatch: false };
    }

    // 1. Guardar el like en caché local
    const likes: LikeAction[] = JSON.parse(localStorage.getItem(LIKES_STORAGE_KEY) || '[]');
    likes.push({
      id: `like_${Date.now()}`,
      fromUserId,
      toUserId: targetProfile.userId,
      eventId,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(likes));

    // 2. Registrar like en base de datos Supabase
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('likes').insert({
          from_user_id: fromUserId,
          to_user_id: targetProfile.userId,
          event_id: eventId,
        });
      } catch (e) {
        console.warn('Error al insertar like en Supabase:', e);
      }
    }

    // 3. Verificar si el otro usuario ya le había dado corazón a fromUserId (COINCIDENCIA RECÍPROCA)
    let hasReciprocalLike = false;

    if (client) {
      try {
        const { data } = await client
          .from('likes')
          .select('id')
          .eq('from_user_id', targetProfile.userId)
          .eq('to_user_id', fromUserId)
          .limit(1);

        if (data && data.length > 0) {
          hasReciprocalLike = true;
        }
      } catch {}
    }

    if (!hasReciprocalLike) {
      hasReciprocalLike = likes.some(
        (l) => l.fromUserId === targetProfile.userId && l.toUserId === fromUserId
      );
    }

    // 4. ÚNICAMENTE SI AMBOS SE DIERON CORAZÓN MUTUAMENTE SE GENERA EL MATCH
    if (hasReciprocalLike) {
      const pairKey = [fromUserId, targetProfile.userId].sort().join('_');
      const deterministicMatchId = `match_${pairKey}`;

      const matches = this.getMatches();
      const existing = matches.find(
        (m) => m.id === deterministicMatchId || m.userBId === targetProfile.userId
      );
      if (existing) {
        return { isMatch: true, newMatch: existing };
      }

      const newMatch: MatchPair = {
        id: deterministicMatchId,
        userAId: fromUserId,
        userBId: targetProfile.userId,
        eventId,
        eventTitle: 'CACHENGUEOO NIGHT',
        matchedAt: new Date().toISOString(),
        lastMessageSnippet: '¡Hicieron Match!',
        lastMessageAt: 'Recién',
        partnerProfile: targetProfile,
      };

      const updatedMatches = [newMatch, ...matches];
      this.saveMatches(updatedMatches);

      if (client) {
        try {
          await client.from('matches').insert({
            id: deterministicMatchId,
            user_a_id: fromUserId,
            user_b_id: targetProfile.userId,
            event_id: eventId,
            last_message: '¡Hicieron Match!',
          });
        } catch {}
      }

      return { isMatch: true, newMatch };
    }

    // Si aún no hay corazón recíproco, no se habilita el Match (el receptor lo verá en Conectá)
    return { isMatch: false };
  },

  async fetchIncomingLikes(currentUserId: string): Promise<MatchProfile[]> {
    if (!currentUserId) return [];
    const client = getSupabaseClient();
    const matches = this.getMatches();
    const matchedUserIds = new Set(
      matches.map((m) => (m.userAId === currentUserId ? m.userBId : m.userAId))
    );

    let blockedList: string[] = [];
    try {
      blockedList = JSON.parse(localStorage.getItem('cachengueoo_blocked_match_users') || '[]');
    } catch {}

    const passedIds = this.getPassedUserIds(currentUserId);
    let senderIds: string[] = [];

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
    const localMatches = this.getMatches();
    const client = getSupabaseClient();
    if (client && currentUserId) {
      try {
        const { data, error } = await client
          .from('matches')
          .select('*')
          .or(`user_a_id.eq.${currentUserId},user_b_id.eq.${currentUserId}`)
          .order('created_at', { ascending: false });

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

          const remoteMatches: MatchPair[] = data.map((m: any) => {
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

            return {
              id: m.id,
              userAId: m.user_a_id,
              userBId: m.user_b_id,
              eventId: m.event_id || 'evt_01',
              eventTitle: 'CACHENGUEOO NIGHT',
              matchedAt: m.created_at || new Date().toISOString(),
              lastMessageSnippet: m.last_message || '¡Hicieron Match!',
              lastMessageAt: 'Recién',
              partnerProfile,
            };
          });

          const map = new Map<string, MatchPair>();
          remoteMatches.forEach((m) => map.set(m.id, m));
          localMatches.forEach((m) => {
            if (!map.has(m.id)) map.set(m.id, m);
          });
          const merged = Array.from(map.values());
          this.saveMatches(merged);
          return merged;
        }
      } catch (e) {
        console.warn('Error fetching matches from Supabase:', e);
      }
    }
    return localMatches;
  },

  getMessages(matchId: string): ChatMessage[] {
    try {
      const stored = localStorage.getItem(MESSAGES_STORAGE_KEY);
      const all: Record<string, ChatMessage[]> = stored ? JSON.parse(stored) : INITIAL_MESSAGES;
      return all[matchId] || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  async fetchMessages(matchId: string): Promise<ChatMessage[]> {
    const localMsgs = this.getMessages(matchId);
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('chat_messages')
          .select('*')
          .eq('match_id', matchId)
          .order('created_at', { ascending: true });

        if (!error && Array.isArray(data)) {
          const remoteMsgs: ChatMessage[] = data.map((row: any) => ({
            id: String(row.id),
            matchId: row.match_id,
            senderId: row.sender_id,
            receiverId: row.receiver_id,
            text: row.text,
            createdAt: row.created_at,
            read: Boolean(row.read),
          }));

          // Mezclar sin duplicados
          const map = new Map<string, ChatMessage>();
          remoteMsgs.forEach((m) => map.set(m.id, m));
          localMsgs.forEach((m) => {
            if (!map.has(m.id)) {
              map.set(m.id, m);
            }
          });

          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );

          // Actualizar caché local
          const stored = localStorage.getItem(MESSAGES_STORAGE_KEY);
          const all: Record<string, ChatMessage[]> = stored ? JSON.parse(stored) : {};
          all[matchId] = merged;
          localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(all));

          return merged;
        }
      } catch (e) {
        console.warn('Error fetching messages from Supabase:', e);
      }
    }
    return localMsgs;
  },

  async sendMessage(
    matchId: string,
    senderId: string,
    receiverId: string,
    text: string
  ): Promise<ChatMessage> {
    const stored = localStorage.getItem(MESSAGES_STORAGE_KEY);
    const all: Record<string, ChatMessage[]> = stored ? JSON.parse(stored) : INITIAL_MESSAGES;

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      matchId,
      senderId,
      receiverId,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      read: false,
    };

    const currentList = all[matchId] || [];
    all[matchId] = [...currentList, newMsg];
    localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(all));

    // Actualizar snippet en la lista de matches
    const matches = this.getMatches();
    const updatedMatches = matches.map((m) => {
      if (m.id === matchId) {
        return {
          ...m,
          lastMessageSnippet: text.trim(),
          lastMessageAt: 'Ahora',
        };
      }
      return m;
    });
    this.saveMatches(updatedMatches);

    // Enviar a Supabase para sincronización real entre dispositivos
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('chat_messages').insert({
          id: newMsg.id,
          match_id: matchId,
          sender_id: senderId,
          receiver_id: receiverId,
          text: text.trim(),
          created_at: newMsg.createdAt,
          read: false,
        });
      } catch (e) {
        console.warn('Error inserting message to Supabase:', e);
      }
    }

    return newMsg;
  },

  subscribeToMessages(
    matchId: string,
    onNewMessage: (msg: ChatMessage) => void
  ): () => void {
    const client = getSupabaseClient();
    let channel: any = null;

    if (client) {
      try {
        channel = client
          .channel(`chat_room_${matchId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'chat_messages',
              filter: `match_id=eq.${matchId}`,
            },
            (payload) => {
              if (payload.new) {
                const row = payload.new;
                const newMsg: ChatMessage = {
                  id: String(row.id),
                  matchId: row.match_id,
                  senderId: row.sender_id,
                  receiverId: row.receiver_id,
                  text: row.text,
                  createdAt: row.created_at,
                  read: Boolean(row.read),
                };
                onNewMessage(newMsg);
              }
            }
          )
          .subscribe();
      } catch (e) {
        console.warn('Realtime subscription error:', e);
      }
    }

    // Polling de respaldo cada 2.5s para sincronizar en vivo si Realtime no está activo
    const interval = setInterval(async () => {
      const fresh = await this.fetchMessages(matchId);
      fresh.forEach((m) => onNewMessage(m));
    }, 2500);

    return () => {
      if (channel && client) {
        client.removeChannel(channel).then();
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
