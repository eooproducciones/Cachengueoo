import { NightStory } from '../types';
import { getSupabaseClient } from './supabaseClient';

const STORIES_STORAGE_KEY = 'cachengueoo_night_stories';
const USER_HEARTS_PREFIX = 'cachengueoo_user_hearts_';

export interface NightNoteRecord {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: string;
  hearts: number;
}

// Duración máxima de una instantánea o notita (12 horas = toda la noche y madrugada)
const NIGHT_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export const nightNotesService = {
  // ==========================================
  // INSTANTÁNEAS (HISTORIAS EN VIVO)
  // ==========================================

  getStoredStories(): NightStory[] {
    try {
      const stored = localStorage.getItem(STORIES_STORAGE_KEY);
      if (stored) {
        const parsed: NightStory[] = JSON.parse(stored);
        const now = Date.now();
        // Filtrar automáticamente las que ya expiraron o pasaron de la noche
        const valid = parsed.filter((s) => {
          const createdMs = new Date(s.createdAt).getTime();
          if (now - createdMs > NIGHT_MAX_AGE_MS) return false;
          if (s.expiresAt && now > new Date(s.expiresAt).getTime()) return false;
          return true;
        });
        if (valid.length !== parsed.length) {
          localStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(valid));
        }
        return valid;
      }
    } catch (e) {
      console.error('Error reading stories from storage', e);
    }
    return [];
  },

  async fetchStories(): Promise<NightStory[]> {
    const localStories = this.getStoredStories();
    const supabase = getSupabaseClient();
    if (!supabase) return localStories;

    try {
      const cutoff = new Date(Date.now() - NIGHT_MAX_AGE_MS).toISOString();

      // 1. Borrar de la base de datos historias antiguas pasada la noche
      Promise.resolve(
        supabase.from('night_stories').delete().lt('created_at', cutoff)
      ).catch(() => {});

      // 2. Traer historias vigentes
      const { data, error } = await supabase
        .from('night_stories')
        .select('*')
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const remoteStories: NightStory[] = data.map((d: any) => ({
          id: String(d.id),
          userId: d.user_id,
          userName: d.user_name || 'Cachenguero',
          userAvatar: d.user_avatar || '',
          mediaUrl: d.media_url,
          mediaType: d.media_type || 'image',
          createdAt: d.created_at,
          expiresAt: d.expires_at || new Date(new Date(d.created_at).getTime() + 60 * 60 * 1000).toISOString(),
          isLiveInstant: true,
          hearts: Number(d.hearts) || 0,
        }));

        // Guardar en cache local
        localStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(remoteStories));
        return remoteStories;
      }
    } catch (e) {
      console.warn('Error fetching night stories from Supabase:', e);
    }

    return localStories;
  },

  async publishStory(story: NightStory): Promise<void> {
    const list = this.getStoredStories();
    const updated = [story, ...list.filter((s) => s.id !== story.id)];
    localStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(updated));

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('night_stories').insert({
          id: story.id,
          user_id: story.userId,
          user_name: story.userName,
          user_avatar: story.userAvatar,
          media_url: story.mediaUrl,
          media_type: story.mediaType,
          created_at: story.createdAt,
          expires_at: story.expiresAt,
          hearts: story.hearts || 0,
        });
      } catch (e) {
        console.warn('Error inserting story in Supabase:', e);
      }
    }
  },

  async deleteStory(storyId: string): Promise<void> {
    const list = this.getStoredStories();
    const updated = list.filter((s) => s.id !== storyId);
    localStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(updated));

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('night_stories').delete().eq('id', storyId);
      } catch (e) {
        console.warn('Error deleting story in Supabase:', e);
      }
    }
  },

  async heartStory(storyId: string): Promise<void> {
    const list = this.getStoredStories();
    const updated = list.map((s) => (s.id === storyId ? { ...s, hearts: (s.hearts || 0) + 1 } : s));
    localStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(updated));

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const story = updated.find((s) => s.id === storyId);
        if (story) {
          await supabase
            .from('night_stories')
            .update({ hearts: story.hearts })
            .eq('id', storyId);
        }
      } catch (e) {
        console.warn('Error updating story hearts in Supabase:', e);
      }
    }
  },

  // ==========================================
  // NOTITAS DE LA NOCHE
  // ==========================================

  async fetchNotes(): Promise<NightNoteRecord[]> {
    const supabase = getSupabaseClient();
    const cutoff = new Date(Date.now() - NIGHT_MAX_AGE_MS).toISOString();

    if (supabase) {
      try {
        // Borrar de la base de datos las notitas que ya pasaron de la noche (> 12 horas)
        Promise.resolve(
          supabase.from('night_notes').delete().lt('created_at', cutoff)
        ).catch(() => {});

        const { data, error } = await supabase
          .from('night_notes')
          .select('*')
          .gte('created_at', cutoff)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          return data.map((d: any) => ({
            id: String(d.id),
            userId: d.user_id,
            userName: d.user_name || 'Cachenguero',
            userAvatar: d.user_avatar || '',
            text: d.text,
            createdAt: d.created_at,
            hearts: Number(d.hearts) || 0,
          }));
        }
      } catch (e) {
        console.warn('Error fetching night notes from Supabase:', e);
      }
    }

    return [];
  },

  async publishNote(
    userId: string,
    userName: string,
    userAvatar: string,
    text: string
  ): Promise<void> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        // 1. Eliminar cualquier notita anterior del usuario para que solo tenga 1 activa
        await supabase.from('night_notes').delete().eq('user_id', userId);

        // 2. Insertar la nueva notita
        const newRecord = {
          id: `note_${userId}`,
          user_id: userId,
          user_name: userName,
          user_avatar: userAvatar || '',
          text: text.trim(),
          hearts: 0,
          created_at: new Date().toISOString(),
        };

        const { error: insertError } = await supabase.from('night_notes').insert(newRecord);
        if (insertError) {
          console.warn('Error inserting night note in Supabase:', insertError.message);
        }
      } catch (e) {
        console.warn('Error saving note in Supabase:', e);
      }
    }
  },

  async heartNote(noteId: string, count: number): Promise<void> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase
          .from('night_notes')
          .update({ hearts: count })
          .eq('id', noteId);
      } catch (e) {
        console.warn('Error updating note hearts in Supabase:', e);
      }
    }
  },

  async deleteNote(userId: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('night_notes').delete().eq('user_id', userId);
      } catch (e) {
        console.warn('Error deleting note in Supabase:', e);
      }
    }
  },
};
