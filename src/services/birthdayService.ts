import { BirthdayRequest } from '../types';

const BIRTHDAYS_STORAGE_KEY = 'cachengueoo_birthday_requests';

const INITIAL_REQUESTS: BirthdayRequest[] = [];

export const birthdayService = {
  getRequests(): BirthdayRequest[] {
    try {
      const saved = localStorage.getItem(BIRTHDAYS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  },

  submitRequest(
    userId: string,
    data: {
      name: string;
      email: string;
      phone?: string;
      instagram?: string;
      date: string;
      guestCount: number;
    }
  ): BirthdayRequest {
    const newReq: BirthdayRequest = {
      id: `bday_${Date.now()}`,
      userId,
      name: data.name,
      email: data.email,
      phone: data.phone || '',
      instagram: data.instagram || '',
      date: data.date,
      guestCount: data.guestCount,
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };

    const list = this.getRequests();
    const updated = [newReq, ...list];
    localStorage.setItem(BIRTHDAYS_STORAGE_KEY, JSON.stringify(updated));

    return newReq;
  },

  updateRequestStatus(id: string, status: 'pending' | 'approved' | 'contacted'): void {
    const list = this.getRequests();
    const updated = list.map((r) => (r.id === id ? { ...r, status } : r));
    localStorage.setItem(BIRTHDAYS_STORAGE_KEY, JSON.stringify(updated));
  },
};
