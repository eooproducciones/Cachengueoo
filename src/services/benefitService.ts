import { MOCK_BENEFITS } from '../data/mockData';
import { ClubBenefit } from '../types';

const BENEFITS_STORAGE_KEY = 'cachengueoo_benefits_list';

export const benefitService = {
  getBenefits(): ClubBenefit[] {
    try {
      const saved = localStorage.getItem(BENEFITS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((b: ClubBenefit) => ({
            ...b,
            actionLabel: b.actionLabel || 'Obtener beneficio',
            promoCode:
              b.promoCode && b.promoCode.trim().length > 0
                ? b.promoCode.trim().toUpperCase()
                : undefined,
          }));
        }
      }
    } catch (e) {
      console.error('Error reading benefits from storage', e);
    }
    return [];
  },

  saveBenefits(benefits: ClubBenefit[]): void {
    try {
      localStorage.setItem(BENEFITS_STORAGE_KEY, JSON.stringify(benefits));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cachengueoo_benefits_updated', { detail: benefits }));
      }
    } catch (e) {
      console.error('Error saving benefits', e);
    }
  },

  toggleBenefit(id: string): void {
    const list = this.getBenefits();
    const updated = list.map((b) => (b.id === id ? { ...b, active: !b.active } : b));
    this.saveBenefits(updated);
  },

  addBenefit(benefit: Omit<ClubBenefit, 'id'>): ClubBenefit {
    const list = this.getBenefits();
    const newBen: ClubBenefit = {
      ...benefit,
      id: `ben_${Date.now()}`,
    };
    this.saveBenefits([newBen, ...list]);
    return newBen;
  },

  updateBenefit(id: string, updatedData: Partial<ClubBenefit>): void {
    const list = this.getBenefits();
    const updated = list.map((b) => (b.id === id ? { ...b, ...updatedData } : b));
    this.saveBenefits(updated);
  },

  deleteBenefit(id: string): void {
    const list = this.getBenefits();
    const updated = list.filter((b) => b.id !== id);
    this.saveBenefits(updated);
  },
};
