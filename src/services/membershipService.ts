import { MOCK_MEMBERSHIP_PLANS } from '../data/mockData';
import { MembershipPlan, UserMembership } from '../types';

const MEMBERSHIP_STORAGE_KEY = 'cachengueoo_user_membership';

export const membershipService = {
  getPlans(): MembershipPlan[] {
    return MOCK_MEMBERSHIP_PLANS;
  },

  getUserMembership(userId: string): UserMembership {
    try {
      const saved = localStorage.getItem(MEMBERSHIP_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    // Membresía activa por defecto para el usuario principal demo
    return {
      id: 'memb_01',
      userId,
      planId: 'plan_vip',
      planName: 'CLUB VIP MENDOZA',
      status: 'active',
      startDate: '2026-09-01T00:00:00Z',
      renewsAt: '2026-11-01T00:00:00Z',
    };
  },

  subscribeToPlan(userId: string, plan: MembershipPlan): UserMembership {
    const renewDate = new Date();
    renewDate.setDate(renewDate.getDate() + 30);

    const membership: UserMembership = {
      id: `memb_${Date.now()}`,
      userId,
      planId: plan.id,
      planName: plan.name,
      status: 'active',
      startDate: new Date().toISOString(),
      renewsAt: renewDate.toISOString(),
    };

    localStorage.setItem(MEMBERSHIP_STORAGE_KEY, JSON.stringify(membership));
    return membership;
  },

  cancelMembership(): void {
    const current = this.getUserMembership('usr_me_01');
    const updated: UserMembership = {
      ...current,
      status: 'expired',
    };
    localStorage.setItem(MEMBERSHIP_STORAGE_KEY, JSON.stringify(updated));
  },
};
