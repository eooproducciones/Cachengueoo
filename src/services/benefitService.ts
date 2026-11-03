import { ClubBenefit } from '../types';
import { getSupabaseClient } from './supabaseClient';
import { db } from './firebaseClient';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

const BENEFITS_STORAGE_KEY = 'cachengueoo_benefits_list';

let lastBenefitsSyncTime = 0;
const BENEFITS_SYNC_COOLDOWN_MS = 10 * 1000;
let realtimeBenefitsChannel: any = null;

/**
 * Guarda o actualiza un beneficio en Supabase con auto-recuperación de ID
 */
async function syncSingleBenefitToSupabase(ben: ClubBenefit): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const payload: Record<string, any> = {
    title: ben.title,
    description: ben.description || '',
    condition: ben.condition || 'Válido presentando la app',
    expiry_time: ben.expiryTime || null,
    tag: ben.tag || 'BARRA',
    only_members: Boolean(ben.onlyMembers),
    active: ben.active ?? true,
    action_label: ben.actionLabel || 'Obtener beneficio',
    highlight_badge: ben.highlightBadge || 'PROMO',
    action_url: ben.actionUrl || '',
    promo_code: ben.promoCode || null,
  };

  if (ben.partnerName) payload.partner_name = ben.partnerName;
  if (ben.category) payload.category = ben.category;
  if (ben.imageUrl) payload.image_url = ben.imageUrl;
  if (ben.actionType) payload.action_type = ben.actionType;

  if (ben.id) {
    payload.id = ben.id;
  }

  try {
    const { data, error } = await supabase
      .from('benefits')
      .upsert(payload, { onConflict: 'id' })
      .select('*');

    if (error) {
      console.warn('Upsert benefit con ID falló en Supabase, reintentando inserción sin ID custom:', error.message);
      delete payload.id;
      const res2 = await supabase.from('benefits').insert(payload).select('*');
      if (res2.data && res2.data[0]) {
        return String(res2.data[0].id);
      }
    } else if (data && data[0]) {
      return String(data[0].id);
    }
  } catch (err) {
    console.warn('Error al guardar beneficio en Supabase:', err);
  }
  return null;
}

export const benefitService = {
  invalidateSyncCache(): void {
    lastBenefitsSyncTime = 0;
  },

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

    const target = updated.find((b) => b.id === id);
    if (target) {
      this.updateBenefit(id, { active: target.active });
    }
  },

  addBenefit(benefit: Omit<ClubBenefit, 'id'>): ClubBenefit {
    this.invalidateSyncCache();
    const list = this.getBenefits();
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `ben_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    
    const newBen: ClubBenefit = {
      ...benefit,
      id,
    };
    
    // Guardar inmediatamente en memoria local para respuesta visual instantánea (0ms)
    this.saveBenefits([newBen, ...list]);

    // 1. Persistir de forma autoritativa en Supabase
    syncSingleBenefitToSupabase(newBen).then((assignedId) => {
      if (assignedId && assignedId !== newBen.id) {
        const currentList = this.getBenefits();
        const updatedList = currentList.map((b) =>
          b.id === newBen.id ? { ...b, id: assignedId } : b
        );
        this.saveBenefits(updatedList);
      }
    });

    // 2. Respaldo silencioso en Firestore
    try {
      setDoc(doc(db, 'benefits', newBen.id), {
        ...newBen,
        createdAt: new Date().toISOString(),
      }, { merge: true }).catch(() => {});
    } catch {}

    return newBen;
  },

  updateBenefit(id: string, updatedData: Partial<ClubBenefit>): void {
    this.invalidateSyncCache();
    const list = this.getBenefits();
    const updated = list.map((b) => (b.id === id ? { ...b, ...updatedData } : b));
    this.saveBenefits(updated);

    const target = updated.find((b) => b.id === id);
    if (target) {
      syncSingleBenefitToSupabase(target);
    }

    try {
      setDoc(doc(db, 'benefits', id), {
        ...updatedData,
        updatedAt: new Date().toISOString(),
      }, { merge: true }).catch(() => {});
    } catch {}
  },

  deleteBenefit(id: string): void {
    this.invalidateSyncCache();
    const list = this.getBenefits();
    const toDelete = list.find((b) => b.id === id);
    const updated = list.filter((b) => b.id !== id);
    this.saveBenefits(updated);

    // 1. Borrar en Supabase
    const supabase = getSupabaseClient();
    if (supabase) {
      Promise.resolve(supabase.from('benefits').delete().eq('id', id)).catch(() => {});
      if (toDelete) {
        Promise.resolve(
          supabase.from('benefits').delete().eq('title', toDelete.title)
        ).catch(() => {});
      }
    }

    // 2. Borrar en Firestore
    try {
      deleteDoc(doc(db, 'benefits', id)).catch(() => {});
    } catch {}
  },

  /**
   * Suscribe en tiempo real a los cambios en la tabla benefits de Supabase
   */
  subscribeToBenefits(callback?: (benefits: ClubBenefit[]) => void): () => void {
    const supabase = getSupabaseClient();
    if (!supabase) return () => {};

    if (realtimeBenefitsChannel) {
      return () => {};
    }

    try {
      realtimeBenefitsChannel = supabase
        .channel('realtime:benefits')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'benefits' },
          () => {
            this.syncBenefitsFromCloud(true).then((bens) => {
              if (callback) callback(bens);
            });
          }
        )
        .subscribe();

      return () => {
        if (realtimeBenefitsChannel && supabase) {
          supabase.removeChannel(realtimeBenefitsChannel);
          realtimeBenefitsChannel = null;
        }
      };
    } catch (e) {
      console.warn('Notice setting up Supabase realtime channel for benefits:', e);
      return () => {};
    }
  },

  async syncBenefitsFromSupabase(force = false): Promise<ClubBenefit[]> {
    return this.syncBenefitsFromCloud(force);
  },

  async syncBenefitsFromCloud(force = false): Promise<ClubBenefit[]> {
    const now = Date.now();
    if (!force && now - lastBenefitsSyncTime < BENEFITS_SYNC_COOLDOWN_MS) {
      return this.getBenefits();
    }
    lastBenefitsSyncTime = now;

    if (!realtimeBenefitsChannel && typeof window !== 'undefined') {
      this.subscribeToBenefits();
    }

    const localBenefits = this.getBenefits();
    const supabase = getSupabaseClient();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('benefits')
          .select('*')
          .order('id', { ascending: false });

        if (!error && Array.isArray(data)) {
          const remoteBenefits: ClubBenefit[] = data.map((d: any) => ({
            id: String(d.id),
            title: d.title,
            partnerName: d.partner_name || d.partnerName || d.title,
            highlightBadge: d.highlight_badge || d.highlightBadge || 'PROMO',
            description: d.description || '',
            condition: d.condition || 'Válido presentando la app',
            expiryTime: d.expiry_time || d.expiryTime,
            tag: d.tag || 'BARRA',
            onlyMembers: Boolean(d.only_members ?? d.onlyMembers),
            active: d.active ?? true,
            actionUrl: d.action_url || d.actionUrl || '',
            actionLabel: d.action_label || d.actionLabel || 'Obtener beneficio',
            actionType: d.action_type || d.actionType || 'whatsapp',
            category: d.category || 'Gimnasio & Salud',
            imageUrl: d.image_url || d.imageUrl || '',
            promoCode: d.promo_code || d.promoCode,
          }));

          // MERGE INTELIGENTE NO DESTRUCTIVO:
          const mergedMap = new Map<string, ClubBenefit>();

          // 1. Agregar beneficios remotos de Supabase
          remoteBenefits.forEach((rb) => {
            mergedMap.set(rb.id, rb);
            if (rb.title) {
              mergedMap.set(rb.title.trim().toLowerCase(), rb);
            }
          });

          // 2. Preservar beneficios locales activos que aún no estén en Supabase y subirlos
          localBenefits.forEach((localBen) => {
            const titleKey = localBen.title.trim().toLowerCase();
            const existsInRemote = mergedMap.has(localBen.id) || (titleKey && mergedMap.has(titleKey));

            if (!existsInRemote) {
              mergedMap.set(localBen.id, localBen);
              // Ponerlo en Supabase para persistirlo en la nube
              syncSingleBenefitToSupabase(localBen);
            }
          });

          const finalBenefits = Array.from(mergedMap.values())
            .filter((b, idx, arr) => arr.findIndex((x) => x.id === b.id) === idx);

          this.saveBenefits(finalBenefits);
          return finalBenefits;
        }
      } catch (err) {
        console.warn('Notice querying Supabase benefits:', err);
      }
    }

    return localBenefits;
  },
};
