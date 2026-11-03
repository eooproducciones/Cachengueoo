import { ClubEvent, ValidationMode } from '../types';
import { getSupabaseClient } from './supabaseClient';
import { db } from './firebaseClient';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

const EVENTS_STORAGE_KEY = 'cachengueoo_events_list';

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
const EVENTS_SYNC_COOLDOWN_MS = 10 * 1000;
let realtimeChannel: any = null;

/**
 * Guarda o actualiza de manera segura un evento en Supabase con auto-recuperación de ID
 */
async function syncSingleEventToSupabase(event: ClubEvent): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const payload: Record<string, any> = {
    title: event.title,
    subtitle: event.subtitle || '',
    date_str: event.dateStr,
    date_iso: event.dateIso,
    time_range: event.timeRange,
    location_name: event.locationName,
    description: event.description || '',
    flyer_url: event.flyerUrl || null,
    is_active_tonight: event.isActiveTonight,
    validation_mode: event.validationMode || 'GPS_OR_QR',
    djs: event.djs || [],
    passline_url: event.passlineUrl || 'https://www.passline.com',
  };

  if (event.isFeatured !== undefined) payload.is_featured = Boolean(event.isFeatured);
  if (event.isAvailableForRp !== undefined) payload.is_available_for_rp = event.isAvailableForRp;

  if (event.id) {
    payload.id = event.id;
  }

  try {
    const { data, error } = await supabase
      .from('events')
      .upsert(payload, { onConflict: 'id' })
      .select('*');

    if (error) {
      console.warn('Upsert event con ID falló en Supabase, reintentando inserción directa:', error.message);
      delete payload.id;
      const res2 = await supabase.from('events').insert(payload).select('*');
      if (res2.data && res2.data[0]) {
        return String(res2.data[0].id);
      }
    } else if (data && data[0]) {
      return String(data[0].id);
    }
  } catch (err) {
    console.warn('Error al guardar evento en Supabase:', err);
  }
  return null;
}

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
    
    // Guardar inmediatamente de forma síncrona en local para 0ms de respuesta visual
    this.saveEvents([created, ...events]);

    // 1. Guardar de forma autoritativa en Supabase
    syncSingleEventToSupabase(created).then((assignedId) => {
      if (assignedId && assignedId !== created.id) {
        // Actualizar el ID asignado por la base de datos si fue serial
        const currentList = this.getEvents();
        const updatedList = currentList.map((e) =>
          e.id === created.id ? { ...e, id: assignedId } : e
        );
        this.saveEvents(updatedList);
      }
    });

    // 2. Respaldo silencioso en Firestore
    try {
      setDoc(doc(db, 'events', created.id), {
        ...created,
        createdAt: new Date().toISOString(),
      }, { merge: true }).catch(() => {});
    } catch {}

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

    // Sincronizar en Supabase
    syncSingleEventToSupabase(updated);

    // Respaldo silencioso en Firestore
    try {
      setDoc(doc(db, 'events', eventId), {
        ...updates,
        updatedAt: new Date().toISOString(),
      }, { merge: true }).catch(() => {});
    } catch {}

    return updated;
  },

  deleteEvent(eventId: string): void {
    this.invalidateSyncCache();
    const events = this.getEvents();
    const toDelete = events.find((e) => e.id === eventId);
    const updated = events.filter((e) => e.id !== eventId);
    this.saveEvents(updated);

    // 1. Borrar en Supabase
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

    // 2. Borrar en Firestore
    try {
      deleteDoc(doc(db, 'events', eventId)).catch(() => {});
    } catch {}
  },

  /**
   * Suscribe en tiempo real a los cambios de Supabase
   */
  subscribeToEvents(callback?: (events: ClubEvent[]) => void): () => void {
    const supabase = getSupabaseClient();
    if (!supabase) return () => {};

    if (realtimeChannel) {
      return () => {};
    }

    try {
      realtimeChannel = supabase
        .channel('realtime:events')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'events' },
          () => {
            this.syncEventsFromCloud(true).then((evts) => {
              if (callback) callback(evts);
            });
          }
        )
        .subscribe();

      return () => {
        if (realtimeChannel && supabase) {
          supabase.removeChannel(realtimeChannel);
          realtimeChannel = null;
        }
      };
    } catch (e) {
      console.warn('Notice setting up Supabase realtime channel for events:', e);
      return () => {};
    }
  },

  /**
   * Sincroniza eventos desde Supabase con MERGE NO-DESTRUCTIVO:
   * Los eventos creados localmente que aún no estén en la nube NUNCA se borran,
   * sino que se preservan y se suben a Supabase.
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

    // Asegurar suscripción a cambios en tiempo real
    if (!realtimeChannel && typeof window !== 'undefined') {
      this.subscribeToEvents();
    }

    const localEvents = this.getEvents();
    const supabase = getSupabaseClient();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .order('date_iso', { ascending: true });

        if (!error && Array.isArray(data)) {
          const remoteEvents: ClubEvent[] = data.map((d: any) => ({
            id: String(d.id),
            title: d.title,
            subtitle: d.subtitle || '',
            dateStr: d.date_str || d.dateStr || '',
            dateIso: d.date_iso || d.dateIso || '',
            timeRange: d.time_range || d.timeRange || '23:00 — 06:00 hs',
            locationName: d.location_name || d.locationName || 'Cachengueoo Boliche · Mendoza',
            description: d.description || '',
            flyerUrl: d.flyer_url || d.flyerUrl || '',
            isActiveTonight: isEventToday({ ...d, dateIso: d.date_iso || d.dateIso } as any),
            isFeatured: Boolean(d.is_featured ?? d.isFeatured),
            validationMode: d.validation_mode || d.validationMode || 'GPS_OR_QR',
            djs: Array.isArray(d.djs) ? d.djs : [],
            passlineUrl: d.passline_url || d.passlineUrl || 'https://www.passline.com',
            ticketTypes: [],
            isAvailableForRp: d.is_available_for_rp !== false && d.isAvailableForRp !== false,
          }));

          // MERGE INTELIGENTE NO DESTRUCTIVO:
          const mergedMap = new Map<string, ClubEvent>();

          // 1. Añadir eventos remotos de Supabase
          remoteEvents.forEach((re) => {
            mergedMap.set(re.id, re);
            if (re.title && re.dateIso) {
              mergedMap.set(`${re.title.trim().toLowerCase()}_${re.dateIso}`, re);
            }
          });

          // 2. Preservar eventos locales que no hayan pasado y subirlos si faltan
          localEvents.forEach((localEv) => {
            const compositeKey = `${localEv.title.trim().toLowerCase()}_${localEv.dateIso}`;
            const existsInRemote = mergedMap.has(localEv.id) || (compositeKey && mergedMap.has(compositeKey));

            if (!existsInRemote && !isEventPast(localEv) && !isEventExpired(localEv)) {
              // Mantener en el estado local para que JAMÁS se borre
              mergedMap.set(localEv.id, localEv);
              // Ponerlo en Supabase para persistirlo en la nube
              syncSingleEventToSupabase(localEv);
            }
          });

          const finalEvents = Array.from(mergedMap.values())
            .filter((e, idx, arr) => arr.findIndex((x) => x.id === e.id) === idx)
            .filter((e) => !isEventPast(e) && !isEventExpired(e));

          this.saveEvents(finalEvents);
          return finalEvents;
        }
      } catch (err) {
        console.warn('Notice querying Supabase events:', err);
      }
    }

    return localEvents;
  },
};
