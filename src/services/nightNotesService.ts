import { NightStory } from '../types';
import { getSupabaseClient } from './supabaseClient';
import { db } from './firebaseClient';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';

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

// Duración máxima de una instantánea o notita (6 horas exactas como solicitado)
const NIGHT_MAX_AGE_MS = 6 * 60 * 60 * 1000;

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
        // Filtrar automáticamente las que ya expiraron (duración máxima 6 horas)
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

  // Suscripción en tiempo real a Instantáneas (Historias) con Firestore onSnapshot
  subscribeToLiveStories(callback: (stories: NightStory[]) => void): () => void {
    const qStories = query(collection(db, 'night_stories'), orderBy('createdAt', 'desc'));
    return onSnapshot(
      qStories,
      (snapshot) => {
        const stories: NightStory[] = [];
        const seenIds = new Set<string>();
        const now = Date.now();

        snapshot.docs.forEach((d) => {
          const s = d.data() as any;
          const createdMs = new Date(s.createdAt || s.created_at || new Date()).getTime();
          if (now - createdMs <= NIGHT_MAX_AGE_MS) {
            if (!seenIds.has(d.id)) {
              seenIds.add(d.id);
              stories.push({
                id: d.id,
                userId: s.userId || s.user_id,
                userName: s.userName || s.user_name || 'Cachenguero',
                userAvatar: s.userAvatar || s.user_avatar || '',
                mediaUrl: s.mediaUrl || s.media_url,
                mediaType: s.mediaType || s.media_type || 'image',
                createdAt: s.createdAt || s.created_at,
                expiresAt: s.expiresAt || s.expires_at || new Date(createdMs + NIGHT_MAX_AGE_MS).toISOString(),
                isLiveInstant: true,
                hearts: Number(s.hearts) || 0,
              });
            }
          }
        });

        localStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(stories));
        callback(stories);
      },
      (error) => {
        console.warn('Error listening to night stories onSnapshot:', error);
      }
    );
  },

  async fetchStories(): Promise<NightStory[]> {
    const localStories = this.getStoredStories();
    const cutoffMs = Date.now() - NIGHT_MAX_AGE_MS;
    const cutoff = new Date(cutoffMs).toISOString();
    const remoteStories: NightStory[] = [];
    const seenIds = new Set<string>();

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        // 1. Borrar de la base de datos historias antiguas que superaron las 6 horas
        Promise.resolve(
          supabase.from('night_stories').delete().lt('created_at', cutoff)
        ).catch(() => {});

        // 2. Traer historias vigentes de las últimas 6 horas desde Supabase
        const { data, error } = await supabase
          .from('night_stories')
          .select('*')
          .gte('created_at', cutoff)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          data.forEach((d: any) => {
            seenIds.add(String(d.id));
            remoteStories.push({
              id: String(d.id),
              userId: d.user_id,
              userName: d.user_name || 'Cachenguero',
              userAvatar: d.user_avatar || '',
              mediaUrl: d.media_url,
              mediaType: d.media_type || 'image',
              createdAt: d.created_at,
              expiresAt: d.expires_at || new Date(new Date(d.created_at).getTime() + NIGHT_MAX_AGE_MS).toISOString(),
              isLiveInstant: true,
              hearts: Number(d.hearts) || 0,
            });
          });
        }
      } catch (e) {
        console.warn('Error fetching night stories from Supabase:', e);
      }
    }

    // 3. Traer historias vigentes desde Firebase Firestore (garantiza entrega multiplataforma)
    try {
      const qStories = query(collection(db, 'night_stories'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(qStories);
      snap.forEach((d) => {
        const s = d.data() as any;
        const createdMs = new Date(s.createdAt || s.created_at || new Date()).getTime();
        if (Date.now() - createdMs <= NIGHT_MAX_AGE_MS) {
          if (!seenIds.has(d.id)) {
            seenIds.add(d.id);
            remoteStories.push({
              id: d.id,
              userId: s.userId || s.user_id,
              userName: s.userName || s.user_name || 'Cachenguero',
              userAvatar: s.userAvatar || s.user_avatar || '',
              mediaUrl: s.mediaUrl || s.media_url,
              mediaType: s.mediaType || s.media_type || 'image',
              createdAt: s.createdAt || s.created_at,
              expiresAt: s.expiresAt || s.expires_at || new Date(createdMs + NIGHT_MAX_AGE_MS).toISOString(),
              isLiveInstant: true,
              hearts: Number(s.hearts) || 0,
            });
          }
        } else {
          // Limpiar automáticamente expiradas de Firestore
          deleteDoc(doc(db, 'night_stories', d.id)).catch(() => {});
        }
      });
    } catch (e) {
      console.warn('Error fetching night stories from Firestore:', e);
    }

    if (remoteStories.length > 0) {
      remoteStories.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      localStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(remoteStories));
      return remoteStories;
    }

    return localStories;
  },

  async publishStory(story: NightStory): Promise<void> {
    const list = this.getStoredStories();
    const updated = [story, ...list.filter((s) => s.id !== story.id)];
    localStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(updated));

    // 1. Guardar en Firestore
    try {
      await setDoc(doc(db, 'night_stories', story.id), {
        id: story.id,
        userId: story.userId,
        userName: story.userName,
        userAvatar: story.userAvatar,
        mediaUrl: story.mediaUrl,
        mediaType: story.mediaType,
        createdAt: story.createdAt,
        expiresAt: story.expiresAt,
        hearts: story.hearts || 0,
      });
    } catch (e) {
      console.warn('Error inserting story in Firestore:', e);
    }

    // 2. Guardar en Supabase
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

    // 1. Borrar de Firestore
    try {
      await deleteDoc(doc(db, 'night_stories', storyId));
    } catch (e) {
      console.warn('Error deleting story in Firestore:', e);
    }

    // 2. Borrar de Supabase
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
    const story = updated.find((s) => s.id === storyId);

    // 1. Actualizar en Firestore
    try {
      if (story) {
        await updateDoc(doc(db, 'night_stories', storyId), { hearts: story.hearts || 0 });
      }
    } catch (e) {}

    // 2. Actualizar en Supabase
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
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
  // NOTITAS DE LA NOCHE (6 HORAS MÁXIMO)
  // ==========================================

  async fetchNotes(): Promise<NightNoteRecord[]> {
    const supabase = getSupabaseClient();
    const cutoff = new Date(Date.now() - NIGHT_MAX_AGE_MS).toISOString();
    const notesMap = new Map<string, NightNoteRecord>();

    if (supabase) {
      // 1. Obtener desde la tabla night_notes si existe
      try {
        Promise.resolve(
          supabase.from('night_notes').delete().lt('created_at', cutoff)
        ).catch(() => {});

        const { data, error } = await supabase
          .from('night_notes')
          .select('*')
          .gte('created_at', cutoff)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          data.forEach((d: any) => {
            notesMap.set(d.user_id, {
              id: String(d.id),
              userId: d.user_id,
              userName: d.user_name || 'Cachenguero',
              userAvatar: d.user_avatar || '',
              text: d.text,
              createdAt: d.created_at,
              hearts: Number(d.hearts) || 0,
            });
          });
        }
      } catch (e) {
        console.warn('Error fetching night_notes:', e);
      }

      // 2. Obtener también notitas activas sincronizadas en la tabla profiles
      try {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, nickname, avatar_url, interests');

        if (Array.isArray(profilesData)) {
          profilesData.forEach((p: any) => {
            if (Array.isArray(p.interests)) {
              for (const it of p.interests) {
                if (typeof it === 'string' && it.startsWith('note:')) {
                  try {
                    const parsed = JSON.parse(decodeURIComponent(it.slice(5)));
                    if (parsed && parsed.text) {
                      const createdMs = new Date(parsed.createdAt || new Date()).getTime();
                      if (Date.now() - createdMs <= NIGHT_MAX_AGE_MS) {
                        if (!notesMap.has(p.id)) {
                          notesMap.set(p.id, {
                            id: `note_${p.id}`,
                            userId: p.id,
                            userName: p.nickname || p.full_name || 'Cachenguero',
                            userAvatar: p.avatar_url || '',
                            text: parsed.text,
                            createdAt: parsed.createdAt,
                            hearts: Number(parsed.hearts) || 0,
                          });
                        }
                      }
                    }
                  } catch {}
                }
              }
            }
          });
        }
      } catch (e) {
        console.warn('Error fetching profile notes:', e);
      }
    }

    // 3. Obtener notitas activas desde Firebase Firestore (garantiza entrega multiplataforma universal)
    try {
      const qNotes = query(collection(db, 'night_notes'));
      const snap = await getDocs(qNotes);
      snap.forEach((d) => {
        const data = d.data();
        if (data && data.text) {
          const createdMs = new Date(data.createdAt || data.created_at || new Date()).getTime();
          if (Date.now() - createdMs <= NIGHT_MAX_AGE_MS) {
            notesMap.set(data.userId, {
              id: d.id,
              userId: data.userId,
              userName: data.userName || 'Cachenguero',
              userAvatar: data.userAvatar || '',
              text: data.text,
              createdAt: data.createdAt || data.created_at || new Date().toISOString(),
              hearts: Number(data.hearts) || 0,
            });
          } else {
            deleteDoc(doc(db, 'night_notes', d.id)).catch(() => {});
          }
        }
      });
    } catch (e) {
      console.warn('Error fetching Firestore night notes:', e);
    }

    return Array.from(notesMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  // Suscripción en tiempo real a Notitas con Firestore onSnapshot
  subscribeToLiveNotes(callback: (notes: NightNoteRecord[]) => void): () => void {
    const qNotes = query(collection(db, 'night_notes'));
    return onSnapshot(
      qNotes,
      (snapshot) => {
        const notesMap = new Map<string, NightNoteRecord>();
        const now = Date.now();

        snapshot.docs.forEach((d) => {
          const data = d.data() as any;
          if (data && data.text) {
            const createdMs = new Date(data.createdAt || data.created_at || new Date()).getTime();
            if (now - createdMs <= NIGHT_MAX_AGE_MS) {
              notesMap.set(data.userId, {
                id: d.id,
                userId: data.userId,
                userName: data.userName || data.user_name || 'Cachenguero',
                userAvatar: data.userAvatar || data.user_avatar || '',
                text: data.text,
                createdAt: data.createdAt || data.created_at || new Date().toISOString(),
                hearts: Number(data.hearts) || 0,
              });
            }
          }
        });

        const sorted = Array.from(notesMap.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        callback(sorted);
      },
      (error) => {
        console.warn('Error listening to night notes onSnapshot:', error);
      }
    );
  },

  async publishNote(
    userId: string,
    userName: string,
    userAvatar: string,
    text: string
  ): Promise<void> {
    const cleanText = text.trim();
    const nowIso = new Date().toISOString();

    // 1. Guardar en Firebase Firestore (visibilidad en tiempo real para todos)
    try {
      await setDoc(doc(db, 'night_notes', `note_${userId}`), {
        id: `note_${userId}`,
        userId,
        userName,
        userAvatar: userAvatar || '',
        text: cleanText,
        hearts: 0,
        createdAt: nowIso,
      });
    } catch (e) {
      console.warn('Error saving note in Firestore:', e);
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      // 2. Guardar en night_notes en Supabase
      try {
        await supabase.from('night_notes').delete().eq('user_id', userId);

        const newRecord = {
          id: `note_${userId}`,
          user_id: userId,
          user_name: userName,
          user_avatar: userAvatar || '',
          text: cleanText,
          hearts: 0,
          created_at: nowIso,
        };

        await supabase.from('night_notes').insert(newRecord);
      } catch (e) {
        console.warn('Error saving note in night_notes table:', e);
      }

      // 3. Sincronizar en profiles.interests para visibilidad 100% garantizada
      try {
        const { data: profileRow } = await supabase
          .from('profiles')
          .select('interests')
          .eq('id', userId)
          .maybeSingle();

        const currentInterests: string[] = Array.isArray(profileRow?.interests)
          ? profileRow.interests.filter((i: string) => !i.startsWith('note:'))
          : [];

        const noteEncoded = `note:${encodeURIComponent(
          JSON.stringify({
            text: cleanText,
            createdAt: nowIso,
            hearts: 0,
          })
        )}`;
        currentInterests.push(noteEncoded);

        await supabase
          .from('profiles')
          .update({
            interests: currentInterests,
            updated_at: nowIso,
          })
          .eq('id', userId);
      } catch (e) {
        console.warn('Error syncing note to profile in Supabase:', e);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cachengueoo_notes_updated'));
    }
  },

  async heartNote(noteId: string, count: number, userId?: string): Promise<void> {
    // 1. Actualizar en Firestore
    try {
      const fsNoteId = noteId.startsWith('note_') ? noteId : `note_${noteId}`;
      await updateDoc(doc(db, 'night_notes', fsNoteId), { hearts: count });
    } catch (e) {}

    // 2. Actualizar en Supabase
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase
          .from('night_notes')
          .update({ hearts: count })
          .eq('id', noteId);
      } catch {}

      // Sincronizar también en profiles si tenemos el userId
      const targetUserId = userId || (noteId.startsWith('note_') ? noteId.replace('note_', '') : null);
      if (targetUserId) {
        try {
          const { data: profileRow } = await supabase
            .from('profiles')
            .select('interests')
            .eq('id', targetUserId)
            .maybeSingle();

          if (profileRow && Array.isArray(profileRow.interests)) {
            const updatedInterests = profileRow.interests.map((it: string) => {
              if (it.startsWith('note:')) {
                try {
                  const parsed = JSON.parse(decodeURIComponent(it.slice(5)));
                  parsed.hearts = count;
                  return `note:${encodeURIComponent(JSON.stringify(parsed))}`;
                } catch {
                  return it;
                }
              }
              return it;
            });

            await supabase
              .from('profiles')
              .update({ interests: updatedInterests })
              .eq('id', targetUserId);
          }
        } catch {}
      }
    }
  },

  async deleteNote(userId: string): Promise<void> {
    // 1. Borrar de Firestore
    try {
      await deleteDoc(doc(db, 'night_notes', `note_${userId}`));
    } catch (e) {
      console.warn('Error deleting note in Firestore:', e);
    }

    // 2. Borrar de Supabase
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('night_notes').delete().eq('user_id', userId);
      } catch (e) {
        console.warn('Error deleting note in Supabase:', e);
      }

      // Borrar de profiles.interests
      try {
        const { data: profileRow } = await supabase
          .from('profiles')
          .select('interests')
          .eq('id', userId)
          .maybeSingle();

        if (profileRow && Array.isArray(profileRow.interests)) {
          const cleaned = profileRow.interests.filter((i: string) => !i.startsWith('note:'));
          await supabase
            .from('profiles')
            .update({
              interests: cleaned,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);
        }
      } catch (e) {
        console.warn('Error deleting note from profile in Supabase:', e);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cachengueoo_notes_updated'));
    }
  },
};
