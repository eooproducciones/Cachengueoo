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
  getDismissedProfileIds(): string[] {
    try {
      const saved = localStorage.getItem(DISMISSED_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  },

  addDismissedProfileId(id: string): void {
    const list = this.getDismissedProfileIds();
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(list));
    }
  },

  getAvailableProfiles(): MatchProfile[] {
    return [];
  },

  async fetchAvailableProfiles(currentUserId?: string): Promise<MatchProfile[]> {
    const dismissed = this.getDismissedProfileIds();
    const client = getSupabaseClient();
    if (client) {
      try {
        let query = client.from('profiles').select('*');
        if (currentUserId) {
          query = query.neq('id', currentUserId);
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          const mapped: MatchProfile[] = data
            .filter((row) => !dismissed.includes(row.id))
            .map((row) => {
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

              return {
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
              };
            });
          if (mapped.length > 0) {
            return mapped;
          }
        }
      } catch (e) {
        console.warn('Error fetching profiles from Supabase:', e);
      }
    }
    return [];
  },

  resetSwipes(): void {
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

  registerSwipe(
    fromUserId: string,
    targetProfile: MatchProfile,
    action: 'like' | 'pass' | 'superlike',
    eventId: string
  ): { isMatch: boolean; newMatch?: MatchPair } {
    this.addDismissedProfileId(targetProfile.userId);

    if (action === 'pass') {
      return { isMatch: false };
    }

    // Guardar el like
    const likes: LikeAction[] = JSON.parse(localStorage.getItem(LIKES_STORAGE_KEY) || '[]');
    likes.push({
      id: `like_${Date.now()}`,
      fromUserId,
      toUserId: targetProfile.userId,
      eventId,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(likes));

    // En la noche de Cachengueoo, para simular la experiencia vibrante del boliche,
    // creamos un Match instantáneo (o probabilístico si es un like regular)
    const isMatch = true; // Permite probar el flujo de Match y Chat inmediatamente

    if (isMatch) {
      const matches = this.getMatches();
      const existing = matches.find((m) => m.userBId === targetProfile.userId);
      if (existing) {
        return { isMatch: true, newMatch: existing };
      }

      const newMatch: MatchPair = {
        id: `match_${Date.now()}`,
        userAId: fromUserId,
        userBId: targetProfile.userId,
        eventId,
        eventTitle: 'CACHENGUEOO NIGHT',
        matchedAt: new Date().toISOString(),
        lastMessageSnippet: '¡Hicieron Match! Rompé el hielo con un trago 🍸',
        lastMessageAt: 'Recién',
        partnerProfile: targetProfile,
      };

      const updatedMatches = [newMatch, ...matches];
      this.saveMatches(updatedMatches);
      return { isMatch: true, newMatch };
    }

    return { isMatch: false };
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

  sendMessage(matchId: string, senderId: string, receiverId: string, text: string): ChatMessage {
    const stored = localStorage.getItem(MESSAGES_STORAGE_KEY);
    const all: Record<string, ChatMessage[]> = stored ? JSON.parse(stored) : INITIAL_MESSAGES;

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
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
          lastMessageSnippet: text,
          lastMessageAt: 'Ahora',
        };
      }
      return m;
    });
    this.saveMatches(updatedMatches);

    return newMsg;
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
