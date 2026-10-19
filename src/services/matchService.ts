import { INITIAL_MATCHES, MOCK_MATCH_PROFILES } from '../data/mockData';
import { ChatMessage, LikeAction, MatchPair, MatchProfile } from '../types';

const MATCHES_STORAGE_KEY = 'cachengueoo_user_matches';
const LIKES_STORAGE_KEY = 'cachengueoo_user_likes';
const MESSAGES_STORAGE_KEY = 'cachengueoo_chat_messages';
const DISMISSED_STORAGE_KEY = 'cachengueoo_dismissed_profiles';

const INITIAL_MESSAGES: Record<string, ChatMessage[]> = {
  match_01: [
    {
      id: 'msg_01_1',
      matchId: 'match_01',
      senderId: 'usr_me_01',
      receiverId: 'usr_match_01',
      text: '¡Hola Valen! Qué temazo acaba de meter el DJ 🔥',
      createdAt: '2026-10-09T01:16:00Z',
      read: true,
    },
    {
      id: 'msg_01_2',
      matchId: 'match_01',
      senderId: 'usr_match_01',
      receiverId: 'usr_me_01',
      text: '¡Totalmente! Estoy por la barra VIP con mis amigas, ¿estás por acá?',
      createdAt: '2026-10-09T01:19:00Z',
      read: true,
    },
    {
      id: 'msg_01_3',
      matchId: 'match_01',
      senderId: 'usr_match_01',
      receiverId: 'usr_me_01',
      text: '¡Nos vemos en la barra VIP! Tengo un Fernet esperándote 😉',
      createdAt: '2026-10-09T01:25:00Z',
      read: true,
    },
  ],
  match_02: [
    {
      id: 'msg_02_1',
      matchId: 'match_02',
      senderId: 'usr_match_02',
      receiverId: 'usr_me_01',
      text: '¡Hola Mateo! ¿Estás cerca del escenario?',
      createdAt: '2026-10-09T01:48:00Z',
      read: false,
    },
  ],
};

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
    const dismissed = this.getDismissedProfileIds();
    // En una aplicación real con Supabase:
    // SELECT * FROM profiles WHERE is_verified_in_venue = true AND id NOT IN (dismissed)
    return MOCK_MATCH_PROFILES.filter((p) => !dismissed.includes(p.userId));
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
    return INITIAL_MATCHES;
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
