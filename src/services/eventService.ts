import { ClubEvent, ValidationMode } from '../types';
import { getSupabaseClient } from './supabaseClient';
import { db, auth } from './firebaseClient';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';

const EVENTS_STORAGE_KEY = 'cachengueoo_events_list';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Event Error:', JSON.stringify(errInfo));
}

/**
 * Determina si el evento corresponde a la noche actual (hoy o madrugada en curso).
 * En la vida nocturna, si son las 04:00 AM del Sábado, la fiesta del Viernes sigue siendo la noche en curso (hasta las 08:00 AM).
 */
export function isEventToday(event: ClubEvent): boolean {
  if (!event || !event.dateIso) return false;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const currentDay = String(now.getDate()).padStart(2, '0');
  const todayIso = `${currentYear}-${currentMonth}-${currentDay}`;

  // Si coincide exactamente con la fecha de hoy
  if (event.dateIso === todayIso) {
    return true;
  }

  // Si son entre las 00:00 y las 08:00 AM, verificar si el evento fue ayer a la noche
  if (now.getHours() < 8) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yYear = yesterday.getFullYear();
    const yMonth = String(yesterday.getMonth() + 1).padStart(2, '0');
    const yDay = String(yesterday.getDate()).padStart(2, '0');
    const yesterdayIso = `${yYear}-${yMonth}-${yDay}`;
    if (event.dateIso === yesterdayIso) {
      return true;
    }
  }

  return false;
}

/**
 * Determina si un evento ya finalizó (está en el pasado).
 * Si no es la fiesta de hoy ni la fiesta en curso de la madrugada (< 08:00 AM),
 * y la fecha dateIso es anterior a la fecha de hoy, EL EVENTO YA PASÓ.
 */
export function isEventPast(event: ClubEvent): boolean {
  if (!event || !event.dateIso) return false;
  if (isEventToday(event)) return false;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const currentDay = String(now.getDate()).padStart(2, '0');
  const todayIso = `${currentYear}-${currentMonth}-${currentDay}`;

  return event.dateIso < todayIso;
}

/**
 * Determina si un evento está expirado para auto-borrado
 */
export function isEventExpired(event: ClubEvent): boolean {
  if (event.expiresAtIso) {
    return Date.now() > new Date(event.expiresAtIso).getTime();
  }
  return isEventPast(event);
}

let lastEventsSyncTime = 0;
const EVENTS_SYNC_COOLDOWN_MS = 15 * 1000; // 15 segundos de cooldown entre llamadas forzadas
let isSubscribedToFirestore = false;

export const eventService = {
  invalidateSyncCache(): void {
    lastEventsSyncTime = 0;
  },

  getEvents(): ClubEvent[] {
    let list: ClubEvent[] = [];
    try {
      const saved = localStorage.getItem(EVENTS_STORAGE_KEY);
      if (saved) {
        list = JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error reading events', e);
    }

    if (!Array.isArray(list)) {
      list = [];
    }

    // Auto-borrado estricto: eliminar automáticamente cualquier evento que ya haya pasado
    const activeEvents = list.filter((event) => !isEventPast(event) && !isEventExpired(event));

    // Si se eliminaron eventos pasados, persistir inmediatamente la lista depurada
    if (activeEvents.length !== list.length) {
      this.saveEvents(activeEvents);
    }

    return activeEvents
      .map((evt) => ({
        ...evt,
        isActiveTonight: isEventToday(evt),
      }))
      .sort((a, b) => {
        const aIsToday = isEventToday(a);
        const bIsToday = isEventToday(b);

        if (aIsToday && !bIsToday) return -1;
        if (!aIsToday && bIsToday) return 1;

        // Orden cronológico por fecha ascendente
        const timeA = a.dateIso ? new Date(a.dateIso).getTime() : Infinity;
        const timeB = b.dateIso ? new Date(b.dateIso).getTime() : Infinity;

        if (timeA !== timeB) {
          return timeA - timeB;
        }

        return (a.dateIso || '').localeCompare(b.dateIso || '');
      });
  },

  saveEvents(events: ClubEvent[]): void {
    try {
      localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cachengueoo_events_updated', { detail: events }));
      }
    } catch (e) {
      console.error('Error saving events', e);
    }
  },

  getActiveTonightEvent(): ClubEvent | null {
    const events = this.getEvents();
    if (!events || events.length === 0) return null;
    const todayEvent = events.find((e) => isEventToday(e));
    return todayEvent || null;
  },

  getFeaturedEvents(): ClubEvent[] {
    const events = this.getEvents();
    const featured = events.filter((e) => e.isFeatured && !isEventPast(e));
    if (featured.length > 0) {
      return [...featured].sort((a, b) => {
        const aIsToday = isEventToday(a);
        const bIsToday = isEventToday(b);
        if (aIsToday && !bIsToday) return -1;
        if (!aIsToday && bIsToday) return 1;
        return (a.dateIso || '').localeCompare(b.dateIso || '');
      });
    }

    const tonight = events.find((e) => isEventToday(e));
    return tonight ? [tonight] : events.slice(0, 3);
  },

  toggleFeatured(eventId: string): void {
    const events = this.getEvents();
    const updated = events.map((e) =>
      e.id === eventId ? { ...e, isFeatured: !e.isFeatured } : e
    );
    this.saveEvents(updated);
    this.updateEvent(eventId, { isFeatured: !events.find((e) => e.id === eventId)?.isFeatured });
  },

  getEventById(id: string): ClubEvent | undefined {
    return this.getEvents().find((e) => e.id === id);
  },

  updateEventValidationMode(eventId: string, mode: ValidationMode): void {
    const events = this.getEvents();
    const updated = events.map((e) => (e.id === eventId ? { ...e, validationMode: mode } : e));
    this.saveEvents(updated);
    this.updateEvent(eventId, { validationMode: mode });
  },

  setActiveTonightEvent(eventId: string): void {
    const events = this.getEvents();
    const updated = events.map((e) => ({
      ...e,
      isActiveTonight: e.id === eventId,
    }));
    this.saveEvents(updated);
  },

  createEvent(newEvent: Omit<ClubEvent, 'id'>): ClubEvent {
    this.invalidateSyncCache();
    const events = this.getEvents();
    const isToday = isEventToday({ ...newEvent, id: '' } as ClubEvent);
    const eventId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const created: ClubEvent = {
      ...newEvent,
      id: eventId,
      isActiveTonight: isToday,
    };
    this.saveEvents([created, ...events]);

    // 1. Sincronizar en Firebase Firestore (Permanente y en tiempo real)
    try {
      const payload = {
        id: created.id,
        title: created.title,
        subtitle: created.subtitle || '',
        dateStr: created.dateStr,
        dateIso: created.dateIso,
        timeRange: created.timeRange,
        locationName: created.locationName,
        description: created.description || '',
        flyerUrl: created.flyerUrl || '',
        isActiveTonight: created.isActiveTonight,
        isFeatured: Boolean(created.isFeatured),
        validationMode: created.validationMode || 'GPS_OR_QR',
        djs: created.djs || [],
        passlineUrl: created.passlineUrl || 'https://www.passline.com',
        isAvailableForRp: created.isAvailableForRp ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setDoc(doc(db, 'events', created.id), payload).catch((err) => {
        handleFirestoreError(err, OperationType.CREATE, `events/${created.id}`);
      });
    } catch (e) {
      console.warn('Firestore setDoc exception:', e);
    }

    // 2. Sincronizar creación en Supabase (Respaldo)
    const supabase = getSupabaseClient();
    if (supabase) {
      Promise.resolve(
        supabase.from('events').insert({
          id: created.id,
          title: created.title,
          subtitle: created.subtitle || '',
          date_str: created.dateStr,
          date_iso: created.dateIso,
          time_range: created.timeRange,
          location_name: created.locationName,
          description: created.description || '',
          flyer_url: created.flyerUrl || null,
          is_active_tonight: created.isActiveTonight,
          validation_mode: created.validationMode || 'GPS_OR_QR',
          djs: created.djs || [],
          passline_url: created.passlineUrl || 'https://www.passline.com',
        })
      ).catch((err) => {
        console.warn('Error syncing created event to Supabase:', err);
      });
    }

    return created;
  },

  updateEvent(eventId: string, updates: Partial<ClubEvent>): ClubEvent | null {
    this.invalidateSyncCache();
    const events = this.getEvents();
    const index = events.findIndex((e) => e.id === eventId);
    if (index === -1) return null;

    const current = events[index];
    const isToday = updates.dateIso
      ? isEventToday({ ...current, ...updates } as ClubEvent)
      : current.isActiveTonight;

    const updated: ClubEvent = {
      ...current,
      ...updates,
      isActiveTonight: isToday,
    };
    events[index] = updated;
    this.saveEvents([...events]);

    // 1. Sincronizar en Firebase Firestore
    try {
      const firestoreUpdates: Record<string, any> = {
        updatedAt: new Date().toISOString(),
      };
      if (updates.title !== undefined) firestoreUpdates.title = updates.title;
      if (updates.subtitle !== undefined) firestoreUpdates.subtitle = updates.subtitle;
      if (updates.dateStr !== undefined) firestoreUpdates.dateStr = updates.dateStr;
      if (updates.dateIso !== undefined) firestoreUpdates.dateIso = updates.dateIso;
      if (updates.timeRange !== undefined) firestoreUpdates.timeRange = updates.timeRange;
      if (updates.locationName !== undefined) firestoreUpdates.locationName = updates.locationName;
      if (updates.description !== undefined) firestoreUpdates.description = updates.description;
      if (updates.flyerUrl !== undefined) firestoreUpdates.flyerUrl = updates.flyerUrl;
      if (updates.validationMode !== undefined) firestoreUpdates.validationMode = updates.validationMode;
      if (updates.djs !== undefined) firestoreUpdates.djs = updates.djs;
      if (updates.passlineUrl !== undefined) firestoreUpdates.passlineUrl = updates.passlineUrl;
      if (updates.isFeatured !== undefined) firestoreUpdates.isFeatured = updates.isFeatured;
      if (updates.isAvailableForRp !== undefined) firestoreUpdates.isAvailableForRp = updates.isAvailableForRp;

      setDoc(doc(db, 'events', eventId), firestoreUpdates, { merge: true }).catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, `events/${eventId}`);
      });
    } catch (e) {
      console.warn('Firestore updateDoc exception:', e);
    }

    // 2. Sincronizar en Supabase
    const supabase = getSupabaseClient();
    if (supabase) {
      const dbRecord: Record<string, any> = {};
      if (updates.title !== undefined) dbRecord.title = updates.title;
      if (updates.subtitle !== undefined) dbRecord.subtitle = updates.subtitle;
      if (updates.dateStr !== undefined) dbRecord.date_str = updates.dateStr;
      if (updates.dateIso !== undefined) dbRecord.date_iso = updates.dateIso;
      if (updates.timeRange !== undefined) dbRecord.time_range = updates.timeRange;
      if (updates.locationName !== undefined) dbRecord.location_name = updates.locationName;
      if (updates.description !== undefined) dbRecord.description = updates.description;
      if (updates.flyerUrl !== undefined) dbRecord.flyer_url = updates.flyerUrl;
      if (updates.validationMode !== undefined) dbRecord.validation_mode = updates.validationMode;
      if (updates.djs !== undefined) dbRecord.djs = updates.djs;
      if (updates.passlineUrl !== undefined) dbRecord.passline_url = updates.passlineUrl;

      Promise.resolve(supabase.from('events').update(dbRecord).eq('id', eventId)).catch((err) => {
        console.warn('Error updating event in Supabase:', err);
      });
    }

    return updated;
  },

  deleteEvent(eventId: string): void {
    this.invalidateSyncCache();
    const events = this.getEvents();
    const toDelete = events.find((e) => e.id === eventId);
    const updated = events.filter((e) => e.id !== eventId);
    this.saveEvents(updated);

    // 1. Borrar en Firebase Firestore
    try {
      deleteDoc(doc(db, 'events', eventId)).catch((err) => {
        handleFirestoreError(err, OperationType.DELETE, `events/${eventId}`);
      });
    } catch (e) {
      console.warn('Firestore deleteDoc exception:', e);
    }

    // 2. Borrar en Supabase
    const supabase = getSupabaseClient();
    if (supabase) {
      Promise.resolve(supabase.from('events').delete().eq('id', eventId)).catch(() => {});
      if (toDelete) {
        Promise.resolve(
          supabase
            .from('events')
            .delete()
            .eq('title', toDelete.title)
            .eq('date_iso', toDelete.dateIso)
        ).catch(() => {});
      }
    }
  },

  /**
   * Suscribe en tiempo real a la colección de eventos de Firestore
   */
  subscribeToEvents(callback?: (events: ClubEvent[]) => void): () => void {
    try {
      const unsub = onSnapshot(
        collection(db, 'events'),
        (snapshot) => {
          if (!snapshot.empty) {
            const firestoreEvents: ClubEvent[] = [];
            snapshot.docs.forEach((docSnap) => {
              const d = docSnap.data();
              if (d && d.title && d.dateIso) {
                firestoreEvents.push({
                  id: d.id || docSnap.id,
                  title: d.title,
                  subtitle: d.subtitle || '',
                  dateStr: d.dateStr || d.date_str || '',
                  dateIso: d.dateIso || d.date_iso || '',
                  timeRange: d.timeRange || d.time_range || '23:00 — 06:00 hs',
                  locationName: d.locationName || d.location_name || 'Cachengueoo Boliche · Mendoza',
                  description: d.description || '',
                  flyerUrl: d.flyerUrl || d.flyer_url || '',
                  isActiveTonight: isEventToday({ ...d, dateIso: d.dateIso || d.date_iso } as any),
                  isFeatured: Boolean(d.isFeatured),
                  validationMode: d.validationMode || d.validation_mode || 'GPS_OR_QR',
                  djs: Array.isArray(d.djs) ? d.djs : [],
                  passlineUrl: d.passlineUrl || d.passline_url || 'https://www.passline.com',
                  ticketTypes: [],
                  isAvailableForRp: d.isAvailableForRp !== false,
                });
              }
            });

            const clean = firestoreEvents.filter((e) => !isEventPast(e));
            this.saveEvents(clean);
            if (callback) callback(clean);
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'events');
        }
      );
      isSubscribedToFirestore = true;
      return unsub;
    } catch (e) {
      console.warn('Could not subscribe to events onSnapshot:', e);
      return () => {};
    }
  },

  /**
   * Sincronizar eventos con la nube (Firestore primero, con Supabase como respaldo)
   * Mantiene compatibilidad con la función anterior syncEventsFromSupabase
   */
  async syncEventsFromSupabase(force = false): Promise<ClubEvent[]> {
    return this.syncEventsFromCloud(force);
  },

  async syncEventsFromCloud(force = false): Promise<ClubEvent[]> {
    const now = Date.now();
    if (!force && now - lastEventsSyncTime < EVENTS_SYNC_COOLDOWN_MS) {
      return this.getEvents();
    }
    lastEventsSyncTime = now;

    // Conectar suscripción en tiempo real si aún no está activa
    if (!isSubscribedToFirestore && typeof window !== 'undefined') {
      this.subscribeToEvents();
    }

    // 1. Intentar Firestore primero (Base de datos principal)
    try {
      const snap = await getDocs(collection(db, 'events'));
      if (!snap.empty) {
        const firestoreEvents: ClubEvent[] = [];
        snap.docs.forEach((docSnap) => {
          const d = docSnap.data();
          if (d && d.title && d.dateIso) {
            firestoreEvents.push({
              id: d.id || docSnap.id,
              title: d.title,
              subtitle: d.subtitle || '',
              dateStr: d.dateStr || d.date_str || '',
              dateIso: d.dateIso || d.date_iso || '',
              timeRange: d.timeRange || d.time_range || '23:00 — 06:00 hs',
              locationName: d.locationName || d.location_name || 'Cachengueoo Boliche · Mendoza',
              description: d.description || '',
              flyerUrl: d.flyerUrl || d.flyer_url || '',
              isActiveTonight: isEventToday({ ...d, dateIso: d.dateIso || d.date_iso } as any),
              isFeatured: Boolean(d.isFeatured),
              validationMode: d.validationMode || d.validation_mode || 'GPS_OR_QR',
              djs: Array.isArray(d.djs) ? d.djs : [],
              passlineUrl: d.passlineUrl || d.passline_url || 'https://www.passline.com',
              ticketTypes: [],
              isAvailableForRp: d.isAvailableForRp !== false,
            });
          }
        });

        if (firestoreEvents.length > 0) {
          const clean = firestoreEvents.filter((e) => !isEventPast(e));
          this.saveEvents(clean);
          return clean;
        }
      } else {
        // Si Firestore está vacío pero este dispositivo tiene eventos locales
        // (por ejemplo, el evento recién cargado por el admin en la macbook),
        // subirlo a Firestore para que esté disponible de inmediato en todos los celulares!
        const localList = this.getEvents();
        if (localList.length > 0) {
          for (const ev of localList) {
            setDoc(doc(db, 'events', ev.id), {
              ...ev,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }).catch(() => {});
          }
          return localList;
        }
      }
    } catch (e) {
      console.warn('Firestore events fetch notice:', e);
    }

    // 2. Respaldo secundario: Supabase
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .order('date_iso', { ascending: true });

        if (!error && Array.isArray(data) && data.length > 0) {
          const mapped: ClubEvent[] = data.map((d: any) => ({
            id: String(d.id),
            title: d.title,
            subtitle: d.subtitle || '',
            dateStr: d.date_str,
            dateIso: d.date_iso,
            timeRange: d.time_range,
            locationName: d.location_name,
            description: d.description || '',
            flyerUrl: d.flyer_url || '',
            isActiveTonight: isEventToday({ ...d, dateIso: d.date_iso } as any),
            isFeatured: Boolean(d.is_featured),
            validationMode: d.validation_mode || 'GPS_OR_QR',
            djs: Array.isArray(d.djs) ? d.djs : [],
            passlineUrl: d.passline_url || 'https://www.passline.com',
            ticketTypes: [],
            isAvailableForRp: d.is_available_for_rp !== false,
          }));

          const clean = mapped.filter((e) => !isEventPast(e));
          this.saveEvents(clean);

          // Subir a Firestore como espejo si estaba vacío
          for (const ev of clean) {
            setDoc(doc(db, 'events', ev.id), {
              ...ev,
              createdAt: new Date().toISOString(),
            }).catch(() => {});
          }

          return clean;
        }
      } catch {
        // Fallback a almacenamiento local
      }
    }

    return this.getEvents();
  },
};
