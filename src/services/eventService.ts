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
  // Un evento solo se considera pasado si finalizó hace más de 7 días
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const cutoffIso = sevenDaysAgo.toISOString().split('T')[0];

  return event.dateIso < cutoffIso;
}

/**
 * Determina si un evento está expirado para auto-borrado
 */
export function isEventExpired(event: ClubEvent): boolean {
  if (event.expiresAtIso) {
    return Date.now() > new Date(event.expiresAtIso).getTime();
  }
  return false;
}

let lastEventsSyncTime = 0;
const EVENTS_SYNC_COOLDOWN_MS = 10 * 1000;
let realtimeChannel: any = null;

/**
 * Guarda o actualiza de manera segura un evento en Supabase con auto-recuperación de ID y fallback de columnas
 */
async function syncSingleEventToSupabase(event: ClubEvent): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  // Metadata pack para garantizar compatibilidad total aunque las columnas aún no existan en Supabase
  const metaTag = `[CACHE_META:passline=${encodeURIComponent(event.passlineUrl || '')};feat=${event.isFeatured ? '1' : '0'};rp=${event.isAvailableForRp !== false ? '1' : '0'}]`;
  const cleanDescription = (event.description || '').replace(/\[CACHE_META:[^\]]+\]/g, '').trim();
  const packedDescription = cleanDescription ? `${cleanDescription}\n${metaTag}` : metaTag;

  const fullPayload: Record<string, any> = {
    title: event.title,
    subtitle: event.subtitle || '',
    date_str: event.dateStr,
    date_iso: event.dateIso,
    time_range: event.timeRange,
    location_name: event.locationName,
    description: packedDescription,
    flyer_url: event.flyerUrl || null,
    is_active_tonight: event.isActiveTonight,
    validation_mode: event.validationMode || 'GPS_OR_QR',
    djs: event.djs || [],
    passline_url: event.passlineUrl || 'https://www.passline.com',
    is_featured: Boolean(event.isFeatured),
    is_available_for_rp: event.isAvailableForRp !== false,
  };

  if (event.id) {
    fullPayload.id = event.id;
  }

  // Columnas base mínimas que sabemos que existen siempre en Supabase
  const basePayload: Record<string, any> = {
    title: event.title,
    subtitle: event.subtitle || '',
    date_str: event.dateStr,
    date_iso: event.dateIso,
    time_range: event.timeRange,
    location_name: event.locationName,
    description: packedDescription,
    flyer_url: event.flyerUrl || null,
    is_active_tonight: event.isActiveTonight,
    validation_mode: event.validationMode || 'GPS_OR_QR',
    djs: event.djs || [],
  };
  if (event.id) {
    basePayload.id = event.id;
  }

  try {
    // 1. Intentar con todas las columnas
    const { data, error } = await supabase
      .from('events')
      .upsert(fullPayload, { onConflict: 'id' })
      .select('*');

    if (!error && data && data[0]) {
      return String(data[0].id);
    }

    // 2. Si falló por columnas faltantes (PGRST204), usar basePayload resiliente
    const fallbackRes = await supabase
      .from('events')
      .upsert(basePayload, { onConflict: 'id' })
      .select('*');

    if (!fallbackRes.error && fallbackRes.data && fallbackRes.data[0]) {
      return String(fallbackRes.data[0].id);
    }

    // 3. Si upsert con ID falla, reintentar inserción directa
    delete basePayload.id;
    const res3 = await supabase.from('events').insert(basePayload).select('*');
    if (res3.data && res3.data[0]) {
      return String(res3.data[0].id);
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

    // Conservar todos los eventos registrados y ordenarlos cronológicamente
    return list
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
      console.warn('Notice saving events to localStorage (retrying lightweight):', e);
      try {
        // Fallback contra QuotaExceededError en Safari iOS
        const lightweight = events.map((ev) => ({
          ...ev,
          flyerUrl: ev.flyerUrl && ev.flyerUrl.length > 50000 ? '' : ev.flyerUrl,
        }));
        localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(lightweight));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('cachengueoo_events_updated', { detail: events }));
        }
      } catch (innerErr) {
        console.error('Critical localStorage save failure:', innerErr);
      }
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
          const remoteEvents: ClubEvent[] = data.map((d: any) => {
            let passlineUrl = d.passline_url || d.passlineUrl || '';
            let isFeatured = d.is_featured !== undefined ? Boolean(d.is_featured) : Boolean(d.isFeatured);
            let isAvailableForRp = d.is_available_for_rp !== undefined ? (d.is_available_for_rp !== false) : true;
            let rawDesc = d.description || '';

            // Desempaquetar tag de metadata si existe en la descripción
            const metaMatch = rawDesc.match(/\[CACHE_META:([^\]]+)\]/);
            if (metaMatch) {
              const metaStr = metaMatch[1];
              metaStr.split(';').forEach((part: string) => {
                const [k, v] = part.split('=');
                if (k === 'passline' && v && !passlineUrl) passlineUrl = decodeURIComponent(v);
                if (k === 'feat' && d.is_featured === undefined) isFeatured = v === '1';
                if (k === 'rp' && d.is_available_for_rp === undefined) isAvailableForRp = v === '1';
              });
              rawDesc = rawDesc.replace(metaMatch[0], '').trim();
            }

            return {
              id: String(d.id),
              title: d.title,
              subtitle: d.subtitle || '',
              dateStr: d.date_str || d.dateStr || '',
              dateIso: d.date_iso || d.dateIso || '',
              timeRange: d.time_range || d.timeRange || '23:00 — 06:00 hs',
              locationName: d.location_name || d.locationName || 'Cachengueoo Boliche · Mendoza',
              description: rawDesc,
              flyerUrl: d.flyer_url || d.flyerUrl || '',
              isActiveTonight: isEventToday({ ...d, dateIso: d.date_iso || d.dateIso } as any),
              isFeatured,
              validationMode: d.validation_mode || d.validationMode || 'GPS_OR_QR',
              djs: Array.isArray(d.djs) ? d.djs : [],
              passlineUrl: passlineUrl || 'https://www.passline.com',
              ticketTypes: [],
              isAvailableForRp,
            };
          });

          // Supabase es la fuente de verdad definitiva en la nube:
          // Si el administrador eliminó un evento, este no vuelve a reaparecer.
          this.saveEvents(remoteEvents);
          return remoteEvents;
        }
      } catch (err) {
        console.warn('Notice querying Supabase events:', err);
      }
    }

    return localEvents;
  },
};
