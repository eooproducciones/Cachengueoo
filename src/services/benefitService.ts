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
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ben_${Date.now()}`;
    const newBen: ClubBenefit = {
      ...benefit,
      id,
    };
    this.saveBenefits([newBen, ...list]);

    // Sincronizar en Supabase si está disponible
    const supabase = getSupabaseClient();
    if (supabase) {
      Promise.resolve(
        supabase
          .from('benefits')
          .insert({
            id: newBen.id,
            title: newBen.title,
            description: newBen.description,
            condition: newBen.condition,
            expiry_time: newBen.expiryTime || null,
            tag: newBen.tag || 'BARRA',
            only_members: Boolean(newBen.onlyMembers),
            active: newBen.active ?? true,
            action_label: newBen.actionLabel || 'Obtener beneficio',
            highlight_badge: newBen.highlightBadge || 'PROMO',
            action_url: newBen.actionUrl || '',
            promo_code: newBen.promoCode || null,
          })
      ).catch(() => {});
    }

    return newBen;
  },

  updateBenefit(id: string, updatedData: Partial<ClubBenefit>): void {
    const list = this.getBenefits();
    const updated = list.map((b) => (b.id === id ? { ...b, ...updatedData } : b));
    this.saveBenefits(updated);

    const supabase = getSupabaseClient();
    if (supabase) {
      const dbRecord: Record<string, any> = {};
      if (updatedData.title !== undefined) dbRecord.title = updatedData.title;
      if (updatedData.description !== undefined) dbRecord.description = updatedData.description;
      if (updatedData.condition !== undefined) dbRecord.condition = updatedData.condition;
      if (updatedData.expiryTime !== undefined) dbRecord.expiry_time = updatedData.expiryTime;
      if (updatedData.tag !== undefined) dbRecord.tag = updatedData.tag;
      if (updatedData.onlyMembers !== undefined) dbRecord.only_members = updatedData.onlyMembers;
      if (updatedData.active !== undefined) dbRecord.active = updatedData.active;
      if (updatedData.highlightBadge !== undefined) dbRecord.highlight_badge = updatedData.highlightBadge;
      if (updatedData.actionUrl !== undefined) dbRecord.action_url = updatedData.actionUrl;
      if (updatedData.promoCode !== undefined) dbRecord.promo_code = updatedData.promoCode;

      Promise.resolve(supabase.from('benefits').update(dbRecord).eq('id', id)).catch(() => {});
    }
  },

  deleteBenefit(id: string): void {
    const list = this.getBenefits();
    const toDelete = list.find((b) => b.id === id);
    const updated = list.filter((b) => b.id !== id);
    this.saveBenefits(updated);

    // Borrar también en Supabase si está disponible
    const supabase = getSupabaseClient();
    if (supabase) {
      Promise.resolve(supabase.from('benefits').delete().eq('id', id)).catch(() => {});
      if (toDelete) {
        Promise.resolve(
          supabase.from('benefits').delete().eq('title', toDelete.title)
        ).catch(() => {});
      }
    }
  },

  async syncBenefitsFromSupabase(): Promise<ClubBenefit[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return this.getBenefits();

    try {
      const { data, error } = await supabase.from('benefits').select('*');
      if (!error && Array.isArray(data)) {
        if (data.length === 0) {
          this.saveBenefits([]);
          return [];
        }

        const mapped: ClubBenefit[] = data.map((d: any) => ({
          id: String(d.id),
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
          promoCode: d.promo_code,
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
