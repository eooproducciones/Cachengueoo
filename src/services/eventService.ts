import { ClubEvent, ValidationMode } from '../types';
import { getSupabaseClient } from './supabaseClient';

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

export const eventService = {
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
    // NUNCA devolver un evento pasado ni un evento de la semana que viene como si fuera de hoy
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
  },

  getEventById(id: string): ClubEvent | undefined {
    return this.getEvents().find((e) => e.id === id);
  },

  updateEventValidationMode(eventId: string, mode: ValidationMode): void {
    const events = this.getEvents();
    const updated = events.map((e) => (e.id === eventId ? { ...e, validationMode: mode } : e));
    this.saveEvents(updated);
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
    const events = this.getEvents();
    const isToday = isEventToday({ ...newEvent, id: '' } as ClubEvent);
    const eventId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `evt_${Date.now()}`;

    const created: ClubEvent = {
      ...newEvent,
      id: eventId,
      isActiveTonight: isToday,
    };
    this.saveEvents([created, ...events]);

    // Sincronizar creación en Supabase
    const supabase = getSupabaseClient();
    if (supabase) {
      Promise.resolve(
        supabase
          .from('events')
          .insert({
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
    const events = this.getEvents();
    const index = events.findIndex((e) => e.id === eventId);
    if (index === -1) return null;

    const current = events[index];
    const isToday = updates.dateIso ? isEventToday({ ...current, ...updates } as ClubEvent) : current.isActiveTonight;

    const updated: ClubEvent = {
      ...current,
      ...updates,
      isActiveTonight: isToday,
    };
    events[index] = updated;
    this.saveEvents([...events]);

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

      Promise.resolve(
        supabase.from('events').update(dbRecord).eq('id', eventId)
      ).catch((err) => {
        console.warn('Error updating event in Supabase:', err);
      });
    }

    return updated;
  },

  deleteEvent(eventId: string): void {
    const events = this.getEvents();
    const toDelete = events.find((e) => e.id === eventId);
    const updated = events.filter((e) => e.id !== eventId);
    this.saveEvents(updated);

    // Borrar de forma estricta en Supabase
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
   * Sincronizar eventos con Supabase al abrir la aplicación y entre pestañas
   */
  async syncEventsFromSupabase(): Promise<ClubEvent[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return this.getEvents();

    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date_iso', { ascending: true });

      if (!error && Array.isArray(data)) {
        if (data.length === 0) {
          // Si en la base de datos no hay eventos (fueron borrados en admin), limpiar localStorage para no revivirlos
          this.saveEvents([]);
          return [];
        }

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
          validationMode: d.validation_mode || 'GPS_OR_QR',
          djs: Array.isArray(d.djs) ? d.djs : [],
          passlineUrl: d.passline_url || 'https://www.passline.com',
          ticketTypes: [],
        }));

        const clean = mapped.filter((e) => !isEventPast(e));
        this.saveEvents(clean);
        return clean;
      }
    } catch {
      // Usar cache local
    }
    return this.getEvents();
  },
};
