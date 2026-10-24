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

    const created: ClubEvent = {
      ...newEvent,
      id: `evt_${Date.now()}`,
      isActiveTonight: isToday,
    };
    this.saveEvents([created, ...events]);

    // Sincronizar creación en Supabase
    const supabase = getSupabaseClient();
    if (supabase) {
      supabase
        .from('events')
        .insert({
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
        })
        .then(() => {}, () => {});
    }

    return created;
  },

  deleteEvent(eventId: string): void {
    const events = this.getEvents();
    const updated = events.filter((e) => e.id !== eventId);
    this.saveEvents(updated);

    // Borrar también en Supabase si está disponible
    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('events').delete().eq('id', eventId).then(() => {}, () => {});
    }
  },

  /**
   * Sincronizar eventos con Supabase al abrir la aplicación
   */
  async syncEventsFromSupabase(): Promise<ClubEvent[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return this.getEvents();

    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date_iso', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped: ClubEvent[] = data.map((d: any) => ({
          id: d.id,
          title: d.title,
          subtitle: d.subtitle || '',
          dateStr: d.date_str,
          dateIso: d.date_iso,
          timeRange: d.time_range,
          locationName: d.location_name,
          description: d.description || '',
          flyerUrl: d.flyer_url || '',
          isActiveTonight: d.is_active_tonight,
          validationMode: d.validation_mode || 'GPS_OR_QR',
          djs: d.djs || [],
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
