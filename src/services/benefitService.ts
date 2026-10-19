import { MOCK_BENEFITS } from '../data/mockData';
import { ClubBenefit } from '../types';

const BENEFITS_STORAGE_KEY = 'cachengueoo_benefits_list';

export const benefitService = {
  getBenefits(): ClubBenefit[] {
    try {
      const saved = localStorage.getItem(BENEFITS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return MOCK_BENEFITS;
  },

  saveBenefits(benefits: ClubBenefit[]): void {
    try {
      localStorage.setItem(BENEFITS_STORAGE_KEY, JSON.stringify(benefits));
    } catch (e) {
      console.error(e);
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
};
