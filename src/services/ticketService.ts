import { MOCK_USER_TICKETS } from '../data/mockData';
import { ClubEvent, TicketType, UserTicket } from '../types';

const TICKETS_STORAGE_KEY = 'cachengueoo_user_tickets';

export const ticketService = {
  getUserTickets(): UserTicket[] {
    try {
      const saved = localStorage.getItem(TICKETS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return MOCK_USER_TICKETS;
  },

  saveUserTickets(tickets: UserTicket[]): void {
    try {
      localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(tickets));
    } catch (e) {
      console.error(e);
    }
  },

  /**
   * Compra mock de entrada preparada para integrarse con Passline o MercadoPago
   */
  purchaseTicket(
    event: ClubEvent,
    ticketType: TicketType,
    userName: string,
    userEmail: string
  ): UserTicket {
    const timestamp = Date.now();
    const qrCode = `CACHE-TKT-${ticketType.name.includes('VIP') ? 'VIP' : 'GEN'}-${timestamp.toString().slice(-6)}`;

    const newTicket: UserTicket = {
      id: `tkt_${timestamp}`,
      eventId: event.id,
      ticketTypeId: ticketType.id,
      ticketTypeName: ticketType.name,
      eventTitle: event.title,
      eventDate: `${event.dateStr} · ${event.timeRange}`,
      qrCode,
      holderName: userName,
      holderEmail: userEmail,
      price: ticketType.price,
      purchasedAt: new Date().toISOString(),
      status: 'valid',
    };

    const tickets = this.getUserTickets();
    const updated = [newTicket, ...tickets];
    this.saveUserTickets(updated);

    return newTicket;
  },

  /**
   * Validación de entrada en puerta (para personal de seguridad y boletería)
   */
  validateTicketQr(qrCode: string): { success: boolean; ticket?: UserTicket; message: string } {
    const tickets = this.getUserTickets();
    const found = tickets.find((t) => t.qrCode === qrCode.trim());

    if (!found) {
      return {
        success: false,
        message: 'Entrada no encontrada en el sistema.',
      };
    }

    if (found.status === 'used') {
      return {
        success: false,
        ticket: found,
        message: '¡Atención! Esta entrada ya fue utilizada previamente.',
      };
    }

    // Marcar como utilizada
    found.status = 'used';
    this.saveUserTickets(tickets);

    return {
      success: true,
      ticket: found,
      message: `Entrada válida: ${found.holderName} (${found.ticketTypeName}). ¡Adelante!`,
    };
  },
};
