import { MOCK_EVENTS } from '../data/mockData';
import { ClubEvent, ValidationMode } from '../types';

const EVENTS_STORAGE_KEY = 'cachengueoo_events_list';

/**
 * Calcula la fecha y hora de expiración: 12 horas después de la finalización del evento.
 * Si el evento es en dateIso y el horario es "23:00 a 06:00", el evento termina a las 06:00 del día siguiente.
 * Pasadas 12 horas de esa hora de cierre (a las 18:00), debe borrarse automáticamente.
 */
export function calculateEventExpiration(dateIso: string, timeRange: string): string {
  try {
    const [year, month, day] = dateIso.split('-').map(Number);
    let endHour = 6;
    let endMinute = 0;

    const timeMatches = (timeRange || '').match(/(\d{1,2}):(\d{2})/g);
    if (timeMatches && timeMatches.length >= 2) {
      const [h, m] = timeMatches[timeMatches.length - 1].split(':').map(Number);
      endHour = h;
      endMinute = m;
    } else if (timeMatches && timeMatches.length === 1) {
      const [h, m] = timeMatches[0].split(':').map(Number);
      if (h >= 18) {
        endHour = 6;
        endMinute = 0;
      } else {
        endHour = h;
        endMinute = m;
      }
    }

    const endDate = new Date(year, month - 1, day);
    // Si la hora de cierre es de madrugada (<= 12 hs), corresponde al día siguiente de la fecha del evento
    if (endHour <= 12) {
      endDate.setDate(endDate.getDate() + 1);
    }
    endDate.setHours(endHour, endMinute, 0, 0);

    // 12 horas después de la finalización del evento
    const expirationDate = new Date(endDate.getTime() + 12 * 60 * 60 * 1000);
    return expirationDate.toISOString();
  } catch {
    return new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString();
  }
}

export function isEventExpired(event: ClubEvent): boolean {
  try {
    const now = Date.now();
    if (event.expiresAtIso) {
      return now > new Date(event.expiresAtIso).getTime();
    }
    if (event.dateIso) {
      const exp = calculateEventExpiration(event.dateIso, event.timeRange || '00:00 — 06:00');
      return now > new Date(exp).getTime();
    }
  } catch (e) {
    console.error('Error evaluating event expiration', e);
  }
  return false;
}

/**
 * Determina si el evento corresponde a la noche actual (hoy o madrugada en curso).
 * En la vida nocturna, si son las 04:00 AM del Sábado, la fiesta del Viernes sigue siendo la noche en curso.
 */
export function isEventToday(event: ClubEvent): boolean {
  if (!event.dateIso) return false;

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

const DEFAULT_EVENT_FALLBACK: ClubEvent = {
  id: 'evt_cachengueoo_night',
  title: 'CACHENGUEOO NIGHT',
  dateStr: 'Esta noche',
  dateIso: new Date().toISOString().split('T')[0],
  timeRange: '23:00 — 06:00 hs',
  locationName: 'Cachengueoo Boliche · Mendoza',
  description: 'Noche en Cachengueoo Mendoza',
  flyerUrl:
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
  isActiveTonight: true,
  validationMode: 'GPS_OR_QR',
  djs: [],
  ticketTypes: [],
};

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

    // Auto-borrado: filtrar automáticamente eventos pasados 12 horas de su fecha y hora
    const activeEvents = list.filter((event) => !isEventExpired(event));

    // Si se eliminaron eventos expirados, persistir inmediatamente la lista depurada
    if (activeEvents.length !== list.length) {
      this.saveEvents(activeEvents);
    }

    const finalList = activeEvents;

    // Actualizar automáticamente isActiveTonight según la fecha actual y ordenar:
    // 1. El evento de hoy aparece PRIMERO automáticamente
    // 2. Los demás eventos se ordenan cronológicamente por fecha ascendente
    return finalList
      .map((evt) => ({
        ...evt,
        isActiveTonight: isEventToday(evt),
      }))
      .sort((a, b) => {
        const aIsToday = isEventToday(a);
        const bIsToday = isEventToday(b);

        if (aIsToday && !bIsToday) return -1;
        if (!aIsToday && bIsToday) return 1;

        // Orden cronológico por fecha: del más próximo al más lejano
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
    } catch (e) {
      console.error('Error saving events', e);
    }
  },

  getActiveTonightEvent(): ClubEvent {
    const events = this.getEvents();
    const todayEvent = events.find((e) => isEventToday(e));
    return todayEvent || events[0] || DEFAULT_EVENT_FALLBACK;
  },

  getFeaturedEvents(): ClubEvent[] {
    const events = this.getEvents();
    const featured = events.filter((e) => e.isFeatured);
    if (featured.length > 0) {
      // Ordenar con el evento de hoy primero (si está destacado) y luego por fecha
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
    const expiresAt =
      newEvent.expiresAtIso || calculateEventExpiration(newEvent.dateIso, newEvent.timeRange);

    const isToday = isEventToday({ ...newEvent, id: '' } as ClubEvent);

    const created: ClubEvent = {
      ...newEvent,
      id: `evt_${Date.now()}`,
      isActiveTonight: isToday,
      expiresAtIso: expiresAt,
    };
    this.saveEvents([created, ...events]);
    return created;
  },

  deleteEvent(eventId: string): void {
    const events = this.getEvents();
    const updated = events.filter((e) => e.id !== eventId);
    this.saveEvents(updated);
  },
};
