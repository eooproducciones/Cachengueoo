import { ClubBenefit } from '../types';
import { getSupabaseClient } from './supabaseClient';

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

    // Sincronizar en Supabase si está disponible
    const supabase = getSupabaseClient();
    if (supabase) {
      supabase
        .from('benefits')
        .insert({
          title: newBen.title,
          description: newBen.description,
          condition: newBen.condition,
          expiry_time: newBen.expiryTime || null,
          tag: newBen.tag || 'BARRA',
          only_members: Boolean(newBen.onlyMembers),
          active: newBen.active ?? true,
        })
        .then(() => {}, () => {});
    }

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

    // Borrar también en Supabase si está disponible
    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('benefits').delete().eq('id', id).then(() => {}, () => {});
    }
  },

  async syncBenefitsFromSupabase(): Promise<ClubBenefit[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return this.getBenefits();

    try {
      const { data, error } = await supabase.from('benefits').select('*');
      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped: ClubBenefit[] = data.map((d: any) => ({
          id: d.id,
          title: d.title,
          description: d.description,
          condition: d.condition,
          expiryTime: d.expiry_time,
          tag: d.tag,
          onlyMembers: d.only_members,
          active: d.active,
          actionLabel: d.action_label || 'Obtener beneficio',
          highlightBadge: d.highlight_badge || 'PROMO',
          actionUrl: d.action_url || '',
        }));
        this.saveBenefits(mapped);
        return mapped;
      }
    } catch {
      // Usar cache local
    }
    return this.getBenefits();
  },
};
