import { ClubBenefit } from '../types';
import { getSupabaseClient } from './supabaseClient';
import { db, auth } from './firebaseClient';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';

const BENEFITS_STORAGE_KEY = 'cachengueoo_benefits_list';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Benefit Error:', JSON.stringify(errInfo));
}

let lastBenefitsSyncTime = 0;
const BENEFITS_SYNC_COOLDOWN_MS = 15 * 1000;
let isSubscribedToBenefits = false;

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
    const list = this.getBenefits();
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `ben_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newBen: ClubBenefit = {
      ...benefit,
      id,
    };
    this.saveBenefits([newBen, ...list]);

    // 1. Sincronizar en Firebase Firestore
    try {
      setDoc(doc(db, 'benefits', newBen.id), {
        ...newBen,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).catch((err) => {
        handleFirestoreError(err, OperationType.CREATE, `benefits/${newBen.id}`);
      });
    } catch (e) {
      console.warn('Firestore benefit add notice:', e);
    }

    // 2. Sincronizar en Supabase si está disponible
    const supabase = getSupabaseClient();
    if (supabase) {
      Promise.resolve(
        supabase.from('benefits').insert({
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

    // 1. Sincronizar en Firebase Firestore
    try {
      setDoc(
        doc(db, 'benefits', id),
        {
          ...updatedData,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, `benefits/${id}`);
      });
    } catch (e) {
      console.warn('Firestore benefit update notice:', e);
    }

    // 2. Sincronizar en Supabase
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

    // 1. Borrar en Firebase Firestore
    try {
      deleteDoc(doc(db, 'benefits', id)).catch((err) => {
        handleFirestoreError(err, OperationType.DELETE, `benefits/${id}`);
      });
    } catch (e) {
      console.warn('Firestore benefit delete notice:', e);
    }

    // 2. Borrar en Supabase si está disponible
    const supabase = getSupabaseClient();
    if (supabase) {
      Promise.resolve(supabase.from('benefits').delete().eq('id', id)).catch(() => {});
      if (toDelete) {
        Promise.resolve(
          supabase
            .from('benefits')
            .delete()
            .eq('title', toDelete.title)
        ).catch(() => {});
      }
    }
  },

  subscribeToBenefits(callback?: (benefits: ClubBenefit[]) => void): () => void {
    try {
      const unsub = onSnapshot(
        collection(db, 'benefits'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: ClubBenefit[] = [];
            snapshot.docs.forEach((docSnap) => {
              const d = docSnap.data();
              if (d && d.title) {
                list.push({
                  id: d.id || docSnap.id,
                  title: d.title,
                  partnerName: d.partnerName || d.partner_name || d.title,
                  highlightBadge: d.highlightBadge || d.highlight_badge || 'PROMO',
                  description: d.description || '',
                  condition: d.condition || 'Válido presentando la app',
                  expiryTime: d.expiryTime || d.expiry_time,
                  tag: d.tag || 'BARRA',
                  onlyMembers: Boolean(d.onlyMembers ?? d.only_members),
                  active: d.active ?? true,
                  actionUrl: d.actionUrl || d.action_url || '',
                  actionLabel: d.actionLabel || d.action_label || 'Obtener beneficio',
                  actionType: d.actionType || d.action_type || 'whatsapp',
                  category: d.category || 'Gimnasio & Salud',
                  imageUrl: d.imageUrl || d.image_url || '',
                  promoCode: d.promoCode || d.promo_code,
                });
              }
            });
            this.saveBenefits(list);
            if (callback) callback(list);
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'benefits');
        }
      );
      isSubscribedToBenefits = true;
      return unsub;
    } catch (e) {
      console.warn('Could not subscribe to benefits onSnapshot:', e);
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

    if (!isSubscribedToBenefits && typeof window !== 'undefined') {
      this.subscribeToBenefits();
    }

    // 1. Intentar Firebase Firestore
    try {
      const snap = await getDocs(collection(db, 'benefits'));
      if (!snap.empty) {
        const list: ClubBenefit[] = [];
        snap.docs.forEach((docSnap) => {
          const d = docSnap.data();
          if (d && d.title) {
            list.push({
              id: d.id || docSnap.id,
              title: d.title,
              partnerName: d.partnerName || d.partner_name || d.title,
              highlightBadge: d.highlightBadge || d.highlight_badge || 'PROMO',
              description: d.description || '',
              condition: d.condition || 'Válido presentando la app',
              expiryTime: d.expiryTime || d.expiry_time,
              tag: d.tag || 'BARRA',
              onlyMembers: Boolean(d.onlyMembers ?? d.only_members),
              active: d.active ?? true,
              actionUrl: d.actionUrl || d.action_url || '',
              actionLabel: d.actionLabel || d.action_label || 'Obtener beneficio',
              actionType: d.actionType || d.action_type || 'whatsapp',
              category: d.category || 'Gimnasio & Salud',
              imageUrl: d.imageUrl || d.image_url || '',
              promoCode: d.promoCode || d.promo_code,
            });
          }
        });
        if (list.length > 0) {
          this.saveBenefits(list);
          return list;
        }
      } else {
        // Auto-upload de beneficios locales a Firestore si está vacío
        const localList = this.getBenefits();
        if (localList.length > 0) {
          for (const ben of localList) {
            setDoc(doc(db, 'benefits', ben.id), {
              ...ben,
              createdAt: new Date().toISOString(),
            }).catch(() => {});
          }
          return localList;
        }
      }
    } catch (e) {
      console.warn('Firestore benefits fetch notice:', e);
    }

    // 2. Supabase como respaldo
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('benefits')
          .select('*')
          .order('id', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          const mapped: ClubBenefit[] = data.map((d: any) => ({
            id: String(d.id),
            title: d.title,
            partnerName: d.partner_name || d.title,
            highlightBadge: d.highlight_badge || 'PROMO',
            description: d.description || '',
            condition: d.condition || 'Válido presentando la app',
            expiryTime: d.expiry_time,
            tag: d.tag || 'BARRA',
            onlyMembers: Boolean(d.only_members),
            active: d.active ?? true,
            actionUrl: d.action_url || '',
            actionLabel: d.action_label || 'Obtener beneficio',
            actionType: d.action_type || 'whatsapp',
            category: d.category || 'Gimnasio & Salud',
            imageUrl: d.image_url || '',
            promoCode: d.promo_code,
          }));

          this.saveBenefits(mapped);

          // Subir a Firestore
          for (const ben of mapped) {
            setDoc(doc(db, 'benefits', ben.id), {
              ...ben,
              createdAt: new Date().toISOString(),
            }).catch(() => {});
          }

          return mapped;
        }
      } catch {
        // Usar cache local
      }
    }

    return this.getBenefits();
  },
};
