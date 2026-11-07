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

  // Metadata pack para garantizar persistencia aunque las columnas dedicadas no existan aún en Supabase
  const metaTag = `[CACHE_BEN_META:partner=${encodeURIComponent(ben.partnerName || '')};badge=${encodeURIComponent(ben.highlightBadge || '')};url=${encodeURIComponent(ben.actionUrl || '')};type=${ben.actionType || 'whatsapp'};lbl=${encodeURIComponent(ben.actionLabel || '')};cat=${encodeURIComponent(ben.category || '')};code=${encodeURIComponent(ben.promoCode || '')}]`;
  const cleanDescription = (ben.description || '').replace(/\[CACHE_BEN_META:[^\]]+\]/g, '').trim();
  const packedDescription = cleanDescription ? `${cleanDescription}\n${metaTag}` : metaTag;

  const fullPayload: Record<string, any> = {
    title: ben.title,
    description: packedDescription,
    condition: ben.condition || 'Válido presentando la app',
    expiry_time: ben.expiryTime || null,
    tag: ben.tag || 'BARRA',
    only_members: Boolean(ben.onlyMembers),
    active: ben.active ?? true,
    action_label: ben.actionLabel || 'Obtener beneficio',
    highlight_badge: ben.highlightBadge || 'PROMO',
    action_url: ben.actionUrl || '',
    promo_code: ben.promoCode || null,
    partner_name: ben.partnerName || ben.title,
    category: ben.category || 'Gimnasio & Salud',
    image_url: ben.imageUrl || '',
    action_type: ben.actionType || 'whatsapp',
  };

  if (ben.id) {
    fullPayload.id = ben.id;
  }

  // Columnas base mínimas existentes en Supabase
  const basePayload: Record<string, any> = {
    title: ben.title,
    description: packedDescription,
    image_url: ben.imageUrl || '',
  };
  if (ben.id) {
    basePayload.id = ben.id;
  }

  try {
    // 1. Intentar con todas las columnas
    const { data, error } = await supabase
      .from('benefits')
      .upsert(fullPayload, { onConflict: 'id' })
      .select('*');

    if (!error && data && data[0]) {
      return String(data[0].id);
    }

    // 2. Si falló por columnas faltantes, usar basePayload
    const fallbackRes = await supabase
      .from('benefits')
      .upsert(basePayload, { onConflict: 'id' })
      .select('*');

    if (!fallbackRes.error && fallbackRes.data && fallbackRes.data[0]) {
      return String(fallbackRes.data[0].id);
    }

    delete basePayload.id;
    const res2 = await supabase.from('benefits').insert(basePayload).select('*');
    if (res2.data && res2.data[0]) {
      return String(res2.data[0].id);
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
      console.warn('Notice saving benefits to storage (retrying lightweight):', e);
      try {
        const lightweight = benefits.map((b) => ({
          ...b,
          imageUrl: b.imageUrl && b.imageUrl.length > 50000 ? '' : b.imageUrl,
        }));
        localStorage.setItem(BENEFITS_STORAGE_KEY, JSON.stringify(lightweight));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('cachengueoo_benefits_updated', { detail: benefits }));
        }
      } catch (innerErr) {
        console.error('Critical localStorage save failure in benefits:', innerErr);
      }
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
          const remoteBenefits: ClubBenefit[] = data.map((d: any) => {
            let partnerName = d.partner_name || d.partnerName || '';
            let highlightBadge = d.highlight_badge || d.highlightBadge || 'PROMO';
            let actionUrl = d.action_url || d.actionUrl || '';
            let actionLabel = d.action_label || d.actionLabel || 'Obtener beneficio';
            let actionType = d.action_type || d.actionType || 'whatsapp';
            let category = d.category || 'Gimnasio & Salud';
            let promoCode = d.promo_code || d.promoCode;
            let rawDesc = d.description || '';

            const metaMatch = rawDesc.match(/\[CACHE_BEN_META:([^\]]+)\]/);
            if (metaMatch) {
              const metaStr = metaMatch[1];
              metaStr.split(';').forEach((part: string) => {
                const [k, v] = part.split('=');
                if (k === 'partner' && v && !partnerName) partnerName = decodeURIComponent(v);
                if (k === 'badge' && v) highlightBadge = decodeURIComponent(v);
                if (k === 'url' && v && !actionUrl) actionUrl = decodeURIComponent(v);
                if (k === 'type' && v) actionType = v as any;
                if (k === 'lbl' && v) actionLabel = decodeURIComponent(v);
                if (k === 'cat' && v) category = decodeURIComponent(v);
                if (k === 'code' && v && !promoCode) promoCode = decodeURIComponent(v);
              });
              rawDesc = rawDesc.replace(metaMatch[0], '').trim();
            }

            return {
              id: String(d.id),
              title: d.title,
              partnerName: partnerName || d.title,
              highlightBadge,
              description: rawDesc,
              condition: d.condition || 'Válido presentando la app',
              expiryTime: d.expiry_time || d.expiryTime,
              tag: d.tag || 'BARRA',
              onlyMembers: Boolean(d.only_members ?? d.onlyMembers),
              active: d.active ?? true,
              actionUrl,
              actionLabel,
              actionType,
              category,
              imageUrl: d.image_url || d.imageUrl || '',
              promoCode,
            };
          });

          // Supabase es la fuente de verdad definitiva de beneficios:
          this.saveBenefits(remoteBenefits);
          return remoteBenefits;
        }
      } catch (err) {
        console.warn('Notice querying Supabase benefits:', err);
      }
    }

    return localBenefits;
  },
};
