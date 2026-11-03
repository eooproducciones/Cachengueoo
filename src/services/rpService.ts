import { getSupabaseClient } from './supabaseClient';
import { db } from './firebaseClient';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import {
  RPProfile,
  RPApplication,
  RPEventLink,
  RPActivityLog,
  RPActivityAction,
  RPStatus,
  ActiveRPAttribution,
  UserProfile,
  ClubEvent
} from '../types';

const STORAGE_ACTIVE_RP_KEY = 'cachengueoo_active_rp';
const STORAGE_CACHED_APPLICATIONS = 'cachengueoo_cached_rp_apps';
const STORAGE_CACHED_RP_PROFILES = 'cachengueoo_cached_rp_profiles';
const STORAGE_CACHED_RP_LINKS = 'cachengueoo_cached_rp_links';

// Fast in-memory caches to prevent database latency
const rpProfileMemoryCache = new Map<string, { data: RPProfile; timestamp: number }>();
const rpLinksMemoryCache = new Map<string, { data: Record<string, string>; timestamp: number }>();
const rpAnalyticsMemoryCache = new Map<string, { data: RPAnalyticsSummary; timestamp: number }>();

// Fast promise timeout to prevent slow network / database delay
async function withTimeout<T>(promise: Promise<T>, timeoutMs = 1200, fallbackValue: T): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallbackValue), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

// Helper: Sanitize string to URL slug
export function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9_-]/g, '')     // Only alphanumeric, hyphen and underscore
    .replace(/-+/g, '-')             // Replace multiple hyphens
    .replace(/^-|-$/g, '')           // Trim hyphens
    .substring(0, 30);
}

// Helper: Validate slug format
export function isValidSlug(slug: string): { valid: boolean; error?: string } {
  if (!slug || slug.trim().length < 3) {
    return { valid: false, error: 'El slug debe tener al menos 3 caracteres.' };
  }
  if (slug.length > 30) {
    return { valid: false, error: 'El slug no puede tener más de 30 caracteres.' };
  }
  const reservedWords = [
    'admin', 'match', 'perfil', 'entradas', 'beneficios', 'cumpleanos',
    'reservas', 'login', 'registro', 'auth', 'api', 'dashboard', 'settings'
  ];
  if (reservedWords.includes(slug.toLowerCase())) {
    return { valid: false, error: `"${slug}" es una palabra reservada del sistema.` };
  }
  const regex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!regex.test(slug)) {
    return { valid: false, error: 'El slug solo puede contener letras minúsculas, números y guiones medios (sin espacios).' };
  }
  return { valid: true };
}

// Helper: Sanitize WhatsApp number (Argentine or international)
export function sanitizeWhatsApp(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (!cleaned) return '';
  // Si empieza con 0 o 15 (común en Argentina), normalizar a 549...
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.startsWith('15')) {
    cleaned = cleaned.substring(2);
  }
  if (cleaned.length === 10 && !cleaned.startsWith('54')) {
    cleaned = '549' + cleaned;
  } else if (cleaned.length === 11 && cleaned.startsWith('54') && !cleaned.startsWith('549')) {
    cleaned = '549' + cleaned.substring(2);
  }
  return cleaned;
}

// ==============================================================================
// 1. SOLICITUDES DE RELACIONES PÚBLICAS (RP Applications)
// ==============================================================================

export async function submitRPApplication(
  userId: string,
  fullName: string,
  whatsapp: string,
  instagram?: string,
  notes?: string,
  userEmail?: string
): Promise<{ success: boolean; application?: RPApplication; error?: string }> {
  try {
    const cleanPhone = sanitizeWhatsApp(whatsapp);
    if (!cleanPhone || cleanPhone.length < 8) {
      return { success: false, error: 'Por favor ingresa un número de WhatsApp válido.' };
    }

    const newApp: RPApplication = {
      id: `app_${userId}_${Date.now()}`,
      userId,
      userEmail: userEmail || '',
      fullName: fullName.trim(),
      whatsapp: cleanPhone,
      instagram: instagram ? instagram.trim().replace(/^@/, '') : undefined,
      notes: notes?.trim() || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Supabase insert
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('rp_applications').insert({
          user_id: newApp.userId,
          user_email: newApp.userEmail,
          full_name: newApp.fullName,
          whatsapp: newApp.whatsapp,
          instagram: newApp.instagram || null,
          notes: newApp.notes || null,
          status: 'pending'
        });
      } catch (err) {
        console.warn('Supabase application insert fallback to Firestore:', err);
      }
    }

    // 2. Firestore dual-sync
    try {
      await setDoc(doc(db, 'rp_applications', newApp.id), newApp);
      // Actualizar también en el perfil del usuario para acceso rápido
      await updateDoc(doc(db, 'profiles', userId), {
        rpStatus: 'pending'
      });
    } catch (err) {
      console.warn('Firestore application sync warning:', err);
    }

    // 3. LocalStorage cache
    try {
      const stored = localStorage.getItem(STORAGE_CACHED_APPLICATIONS);
      const list: RPApplication[] = stored ? JSON.parse(stored) : [];
      const filtered = list.filter(a => a.userId !== userId);
      filtered.unshift(newApp);
      localStorage.setItem(STORAGE_CACHED_APPLICATIONS, JSON.stringify(filtered));
    } catch (e) {
      // ignore
    }

    return { success: true, application: newApp };
  } catch (error: any) {
    console.error('Error submitting RP application:', error);
    return { success: false, error: error.message || 'Error al enviar solicitud' };
  }
}

export async function getUserRPApplication(userId: string): Promise<RPApplication | null> {
  // 1. Try Supabase
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('rp_applications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          userId: data.user_id,
          userEmail: data.user_email,
          fullName: data.full_name,
          whatsapp: data.whatsapp,
          instagram: data.instagram || undefined,
          notes: data.notes || undefined,
          status: data.status as RPStatus,
          reviewedBy: data.reviewed_by || undefined,
          reviewedAt: data.reviewed_at || undefined,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
    } catch (e) {
      console.warn('Supabase getUserRPApplication fallback to Firestore:', e);
    }
  }

  // 2. Try Firestore
  try {
    const q = query(
      collection(db, 'rp_applications'),
      where('userId', '==', userId),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as RPApplication;
    }
  } catch (e) {
    console.warn('Firestore getUserRPApplication fallback:', e);
  }

  // 3. Try LocalStorage
  try {
    const stored = localStorage.getItem(STORAGE_CACHED_APPLICATIONS);
    if (stored) {
      const list: RPApplication[] = JSON.parse(stored);
      const found = list.find(a => a.userId === userId);
      if (found) return found;
    }
  } catch (e) {
    // ignore
  }

  return null;
}

export async function getAllRPApplications(): Promise<RPApplication[]> {
  const appsMap = new Map<string, RPApplication>();

  // 1. Supabase
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('rp_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        data.forEach(item => {
          appsMap.set(item.id || item.user_id, {
            id: item.id,
            userId: item.user_id,
            userEmail: item.user_email,
            fullName: item.full_name,
            whatsapp: item.whatsapp,
            instagram: item.instagram || undefined,
            notes: item.notes || undefined,
            status: item.status as RPStatus,
            reviewedBy: item.reviewed_by || undefined,
            reviewedAt: item.reviewed_at || undefined,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
          });
        });
      }
    } catch (e) {
      console.warn('Supabase getAllRPApplications error:', e);
    }
  }

  // 2. Firestore
  try {
    const snap = await getDocs(collection(db, 'rp_applications'));
    snap.docs.forEach(d => {
      const app = d.data() as RPApplication;
      if (!appsMap.has(app.id)) {
        appsMap.set(app.id, app);
      }
    });
  } catch (e) {
    console.warn('Firestore getAllRPApplications error:', e);
  }

  // 3. LocalStorage merge
  try {
    const stored = localStorage.getItem(STORAGE_CACHED_APPLICATIONS);
    if (stored) {
      const list: RPApplication[] = JSON.parse(stored);
      list.forEach(a => {
        if (!appsMap.has(a.id)) {
          appsMap.set(a.id, a);
        }
      });
    }
  } catch (e) {
    // ignore
  }

  return Array.from(appsMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// ==============================================================================
// 2. APROBACIÓN / RECHAZO DE SOLICITUDES Y GESTIÓN DE ROLES
// ==============================================================================

export async function approveRPApplication(
  application: RPApplication,
  adminUserId: string
): Promise<{ success: boolean; rpProfile?: RPProfile; error?: string }> {
  try {
    const nowIso = new Date().toISOString();

    // 1. Generar slug único base
    let baseSlug = sanitizeSlug(application.fullName);
    if (!baseSlug || baseSlug.length < 3) {
      baseSlug = `rp-${application.userId.substring(0, 6)}`;
    }

    // Verificar si el slug ya existe
    let finalSlug = baseSlug;
    let counter = 1;
    while (await checkSlugTaken(finalSlug)) {
      counter++;
      finalSlug = `${baseSlug}${counter}`;
    }

    // 2. Crear RP Profile
    const rpProfile: RPProfile = {
      id: `rp_${application.userId}`,
      userId: application.userId,
      publicName: application.fullName,
      slug: finalSlug,
      whatsapp: application.whatsapp,
      instagram: application.instagram,
      status: 'approved',
      approvedBy: adminUserId,
      approvedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // 3. Guardar en Supabase
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        // Actualizar solicitud
        await supabase
          .from('rp_applications')
          .update({
            status: 'approved',
            reviewed_by: adminUserId,
            reviewed_at: nowIso,
            updated_at: nowIso
          })
          .eq('user_id', application.userId);

        // Insertar / actualizar perfil RP
        await supabase.from('rp_profiles').upsert({
          user_id: rpProfile.userId,
          public_name: rpProfile.publicName,
          slug: rpProfile.slug,
          whatsapp: rpProfile.whatsapp,
          instagram: rpProfile.instagram || null,
          status: 'approved',
          approved_by: adminUserId,
          approved_at: nowIso,
          updated_at: nowIso
        }, { onConflict: 'user_id' });
      } catch (err) {
        console.warn('Supabase approveRPApplication error:', err);
      }
    }

    // 4. Guardar en Firestore
    try {
      // Actualizar application
      await setDoc(doc(db, 'rp_applications', application.id), {
        ...application,
        status: 'approved',
        reviewedBy: adminUserId,
        reviewedAt: nowIso,
        updatedAt: nowIso
      }, { merge: true });

      // Guardar rp_profile
      await setDoc(doc(db, 'rp_profiles', rpProfile.id), rpProfile, { merge: true });

      // Actualizar perfil del usuario: role = 'rp', isRp = true, rpSlug, rpStatus = 'approved'
      await updateDoc(doc(db, 'profiles', application.userId), {
        role: 'rp',
        isRp: true,
        rpSlug: rpProfile.slug,
        rpStatus: 'approved'
      });
    } catch (err) {
      console.warn('Firestore approveRPApplication error:', err);
    }

    // 5. Actualizar cache local
    try {
      const stored = localStorage.getItem(STORAGE_CACHED_RP_PROFILES);
      const list: RPProfile[] = stored ? JSON.parse(stored) : [];
      const filtered = list.filter(p => p.userId !== rpProfile.userId);
      filtered.push(rpProfile);
      localStorage.setItem(STORAGE_CACHED_RP_PROFILES, JSON.stringify(filtered));
    } catch (e) {
      // ignore
    }

    return { success: true, rpProfile };
  } catch (error: any) {
    console.error('Error approving RP application:', error);
    return { success: false, error: error.message || 'Error al aprobar solicitud' };
  }
}

export async function rejectRPApplication(
  application: RPApplication,
  adminUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const nowIso = new Date().toISOString();

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase
          .from('rp_applications')
          .update({
            status: 'rejected',
            reviewed_by: adminUserId,
            reviewed_at: nowIso,
            updated_at: nowIso
          })
          .eq('user_id', application.userId);
      } catch (e) {
        console.warn('Supabase rejectRPApplication error:', e);
      }
    }

    try {
      await updateDoc(doc(db, 'rp_applications', application.id), {
        status: 'rejected',
        reviewedBy: adminUserId,
        reviewedAt: nowIso,
        updatedAt: nowIso
      });
      await updateDoc(doc(db, 'profiles', application.userId), {
        rpStatus: 'rejected',
        isRp: false,
        role: 'user'
      });
    } catch (e) {
      console.warn('Firestore rejectRPApplication error:', e);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error rejecting RP application:', error);
    return { success: false, error: error.message || 'Error al rechazar solicitud' };
  }
}

// ==============================================================================
// 3. GESTIÓN DE PERFILES RP (Perfil Pública)
// ==============================================================================

export async function checkSlugTaken(slug: string, excludeUserId?: string): Promise<boolean> {
  const clean = sanitizeSlug(slug);
  if (!clean) return true;

  // 1. Supabase check
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      let q = supabase
        .from('rp_profiles')
        .select('user_id')
        .ilike('slug', clean);

      if (excludeUserId) {
        q = q.neq('user_id', excludeUserId);
      }

      const { data } = await q.maybeSingle();
      if (data) return true;
    } catch (e) {
      console.warn('Supabase checkSlugTaken error:', e);
    }
  }

  // 2. Firestore check
  try {
    const q = query(collection(db, 'rp_profiles'), where('slug', '==', clean));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const match = snap.docs.find(d => {
        const p = d.data() as RPProfile;
        return excludeUserId ? p.userId !== excludeUserId : true;
      });
      if (match) return true;
    }
  } catch (e) {
    console.warn('Firestore checkSlugTaken error:', e);
  }

  return false;
}

export async function getRPProfileByUserId(userId: string): Promise<RPProfile | null> {
  // 1. Memoria rápida (< 60s)
  const cachedMem = rpProfileMemoryCache.get(userId);
  if (cachedMem && Date.now() - cachedMem.timestamp < 60000) {
    return cachedMem.data;
  }

  // 2. LocalStorage inmediato (0 ms)
  try {
    const stored = localStorage.getItem(STORAGE_CACHED_RP_PROFILES);
    if (stored) {
      const list: RPProfile[] = JSON.parse(stored);
      const found = list.find(p => p.userId === userId);
      if (found) {
        rpProfileMemoryCache.set(userId, { data: found, timestamp: Date.now() });
        // Sincronizar en segundo plano sin demorar la respuesta
        fetchProfileFromNetwork(userId).catch(() => {});
        return found;
      }
    }
  } catch (e) {
    // ignore
  }

  return await fetchProfileFromNetwork(userId);
}

async function fetchProfileFromNetwork(userId: string): Promise<RPProfile | null> {
  // 1. Supabase con timeout de 1 segundo
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const queryPromise = supabase
        .from('rp_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const { data, error } = await withTimeout<{ data: any; error: any }>(
        queryPromise as any,
        1000,
        { data: null, error: null }
      );

      if (!error && data) {
        const profile: RPProfile = {
          id: data.id,
          userId: data.user_id,
          publicName: data.public_name,
          slug: data.slug,
          whatsapp: data.whatsapp,
          instagram: data.instagram || undefined,
          status: data.status as RPStatus,
          approvedBy: data.approved_by || undefined,
          approvedAt: data.approved_at || undefined,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        rpProfileMemoryCache.set(userId, { data: profile, timestamp: Date.now() });
        return profile;
      }
    } catch (e) {
      // fallback
    }
  }

  // 2. Firestore con timeout de 1 segundo
  try {
    const q = query(
      collection(db, 'rp_profiles'),
      where('userId', '==', userId),
      limit(1)
    );
    const snap = await withTimeout(
      getDocs(q),
      1000,
      { empty: true, docs: [] } as any
    );
    if (!snap.empty && snap.docs && snap.docs.length > 0) {
      const profile = snap.docs[0].data() as RPProfile;
      rpProfileMemoryCache.set(userId, { data: profile, timestamp: Date.now() });
      return profile;
    }
  } catch (e) {
    // fallback
  }

  return null;
}

export async function getRPProfileBySlug(slug: string): Promise<RPProfile | null> {
  const clean = sanitizeSlug(slug);
  if (!clean) return null;

  // 1. Supabase
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('rp_profiles')
        .select('*')
        .ilike('slug', clean)
        .eq('status', 'approved')
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          userId: data.user_id,
          publicName: data.public_name,
          slug: data.slug,
          whatsapp: data.whatsapp,
          instagram: data.instagram || undefined,
          status: data.status as RPStatus,
          approvedBy: data.approved_by || undefined,
          approvedAt: data.approved_at || undefined,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
    } catch (e) {
      console.warn('Supabase getRPProfileBySlug fallback:', e);
    }
  }

  // 2. Firestore
  try {
    const q = query(
      collection(db, 'rp_profiles'),
      where('slug', '==', clean),
      where('status', '==', 'approved'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as RPProfile;
    }
  } catch (e) {
    console.warn('Firestore getRPProfileBySlug error:', e);
  }

  // 3. LocalStorage
  try {
    const stored = localStorage.getItem(STORAGE_CACHED_RP_PROFILES);
    if (stored) {
      const list: RPProfile[] = JSON.parse(stored);
      const found = list.find(p => p.slug.toLowerCase() === clean && p.status === 'approved');
      if (found) return found;
    }
  } catch (e) {
    // ignore
  }

  return null;
}

export async function updateRPProfile(
  userId: string,
  updates: {
    publicName: string;
    slug: string;
    whatsapp: string;
    instagram?: string;
  }
): Promise<{ success: boolean; rpProfile?: RPProfile; error?: string }> {
  try {
    const cleanPublicName = updates.publicName.trim();
    if (!cleanPublicName) {
      return { success: false, error: 'El nombre público no puede estar vacío.' };
    }

    const cleanSlug = sanitizeSlug(updates.slug);
    const slugCheck = isValidSlug(cleanSlug);
    if (!slugCheck.valid) {
      return { success: false, error: slugCheck.error };
    }

    // Verificar unicidad de slug
    const taken = await checkSlugTaken(cleanSlug, userId);
    if (taken) {
      return { success: false, error: `El slug "${cleanSlug}" ya está en uso por otro promotor.` };
    }

    const cleanWhatsApp = sanitizeWhatsApp(updates.whatsapp);
    if (!cleanWhatsApp || cleanWhatsApp.length < 8) {
      return { success: false, error: 'Por favor ingresa un número de WhatsApp válido.' };
    }

    const nowIso = new Date().toISOString();

    const existing = await getRPProfileByUserId(userId);
    const updatedProfile: RPProfile = {
      id: existing?.id || `rp_${userId}`,
      userId,
      publicName: cleanPublicName,
      slug: cleanSlug,
      whatsapp: cleanWhatsApp,
      instagram: updates.instagram ? updates.instagram.trim().replace(/^@/, '') : undefined,
      status: existing?.status || 'approved',
      approvedBy: existing?.approvedBy,
      approvedAt: existing?.approvedAt || nowIso,
      createdAt: existing?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    // 1. Supabase update
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('rp_profiles').upsert({
          user_id: userId,
          public_name: updatedProfile.publicName,
          slug: updatedProfile.slug,
          whatsapp: updatedProfile.whatsapp,
          instagram: updatedProfile.instagram || null,
          updated_at: nowIso
        }, { onConflict: 'user_id' });
      } catch (e) {
        console.warn('Supabase updateRPProfile warning:', e);
      }
    }

    // 2. Firestore update
    try {
      await setDoc(doc(db, 'rp_profiles', updatedProfile.id), updatedProfile, { merge: true });
      await updateDoc(doc(db, 'profiles', userId), {
        rpSlug: updatedProfile.slug
      });
    } catch (e) {
      console.warn('Firestore updateRPProfile error:', e);
    }

    // 3. LocalStorage update
    try {
      const stored = localStorage.getItem(STORAGE_CACHED_RP_PROFILES);
      const list: RPProfile[] = stored ? JSON.parse(stored) : [];
      const filtered = list.filter(p => p.userId !== userId);
      filtered.push(updatedProfile);
      localStorage.setItem(STORAGE_CACHED_RP_PROFILES, JSON.stringify(filtered));
    } catch (e) {
      // ignore
    }

    return { success: true, rpProfile: updatedProfile };
  } catch (error: any) {
    console.error('Error updating RP profile:', error);
    return { success: false, error: error.message || 'Error al actualizar perfil de RP' };
  }
}

export async function setRPStatus(
  rpId: string,
  userId: string,
  status: RPStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const nowIso = new Date().toISOString();

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase
          .from('rp_profiles')
          .update({ status, updated_at: nowIso })
          .eq('user_id', userId);
      } catch (e) {
        console.warn('Supabase setRPStatus error:', e);
      }
    }

    try {
      await updateDoc(doc(db, 'rp_profiles', rpId), { status, updatedAt: nowIso });
      await updateDoc(doc(db, 'profiles', userId), {
        rpStatus: status,
        isRp: status === 'approved',
        role: status === 'approved' ? 'rp' : 'user'
      });
    } catch (e) {
      console.warn('Firestore setRPStatus error:', e);
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAllRPProfiles(): Promise<RPProfile[]> {
  const map = new Map<string, RPProfile>();

  // 1. Supabase
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('rp_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        data.forEach(item => {
          map.set(item.user_id, {
            id: item.id,
            userId: item.user_id,
            publicName: item.public_name,
            slug: item.slug,
            whatsapp: item.whatsapp,
            instagram: item.instagram || undefined,
            status: item.status as RPStatus,
            approvedBy: item.approved_by || undefined,
            approvedAt: item.approved_at || undefined,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
          });
        });
      }
    } catch (e) {
      console.warn('Supabase getAllRPProfiles error:', e);
    }
  }

  // 2. Firestore
  try {
    const snap = await getDocs(collection(db, 'rp_profiles'));
    snap.docs.forEach(d => {
      const p = d.data() as RPProfile;
      if (!map.has(p.userId)) {
        map.set(p.userId, p);
      }
    });
  } catch (e) {
    console.warn('Firestore getAllRPProfiles error:', e);
  }

  // 3. LocalStorage
  try {
    const stored = localStorage.getItem(STORAGE_CACHED_RP_PROFILES);
    if (stored) {
      const list: RPProfile[] = JSON.parse(stored);
      list.forEach(p => {
        if (!map.has(p.userId)) {
          map.set(p.userId, p);
        }
      });
    }
  } catch (e) {
    // ignore
  }

  return Array.from(map.values());
}

// ==============================================================================
// 4. CONFIGURACIÓN DE ENLACES DE PASSLINE POR RP Y POR EVENTO
// ==============================================================================

export async function getRPEventLinks(rpId: string): Promise<Record<string, string>> {
  // 1. Memoria rápida (< 60s)
  const cachedMem = rpLinksMemoryCache.get(rpId);
  if (cachedMem && Date.now() - cachedMem.timestamp < 60000) {
    return cachedMem.data;
  }

  // 2. LocalStorage inmediato (0 ms)
  try {
    const stored = localStorage.getItem(`${STORAGE_CACHED_RP_LINKS}_${rpId}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      rpLinksMemoryCache.set(rpId, { data: parsed, timestamp: Date.now() });
      fetchLinksFromNetwork(rpId).catch(() => {});
      return parsed;
    }
  } catch (e) {
    // ignore
  }

  return await fetchLinksFromNetwork(rpId);
}

async function fetchLinksFromNetwork(rpId: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  // 1. Supabase con timeout de 1 segundo
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const queryPromise = supabase
        .from('rp_event_links')
        .select('event_id, passline_url')
        .eq('rp_id', rpId)
        .eq('is_active', true);

      const { data, error } = await withTimeout<{ data: any; error: any }>(
        queryPromise as any,
        1000,
        { data: null, error: null }
      );

      if (!error && data && Array.isArray(data)) {
        data.forEach((row: any) => {
          result[row.event_id] = row.passline_url;
        });
        if (Object.keys(result).length > 0) {
          rpLinksMemoryCache.set(rpId, { data: result, timestamp: Date.now() });
          try {
            localStorage.setItem(`${STORAGE_CACHED_RP_LINKS}_${rpId}`, JSON.stringify(result));
          } catch {}
          return result;
        }
      }
    } catch (e) {
      // fallback
    }
  }

  // 2. Firestore con timeout de 1 segundo
  try {
    const q = query(
      collection(db, 'rp_event_links'),
      where('rpId', '==', rpId),
      where('isActive', '==', true)
    );
    const snap = await withTimeout(
      getDocs(q),
      1000,
      { empty: true, docs: [] } as any
    );
    snap.docs.forEach((d: any) => {
      const data = d.data() as RPEventLink;
      result[data.eventId] = data.passlineUrl;
    });
    if (Object.keys(result).length > 0) {
      rpLinksMemoryCache.set(rpId, { data: result, timestamp: Date.now() });
      try {
        localStorage.setItem(`${STORAGE_CACHED_RP_LINKS}_${rpId}`, JSON.stringify(result));
      } catch {}
      return result;
    }
  } catch (e) {
    // fallback
  }

  return result;
}

export async function saveRPEventLink(
  rpId: string,
  eventId: string,
  passlineUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanUrl = passlineUrl.trim();
    const nowIso = new Date().toISOString();
    const linkId = `rplink_${rpId}_${eventId}`;

    // 1. Supabase
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('rp_event_links').upsert({
          rp_id: rpId,
          event_id: eventId,
          passline_url: cleanUrl,
          is_active: cleanUrl.length > 0,
          updated_at: nowIso
        }, { onConflict: 'rp_id,event_id' });
      } catch (e) {
        console.warn('Supabase saveRPEventLink error:', e);
      }
    }

    // 2. Firestore
    try {
      await setDoc(doc(db, 'rp_event_links', linkId), {
        id: linkId,
        rpId,
        eventId,
        passlineUrl: cleanUrl,
        isActive: cleanUrl.length > 0,
        updatedAt: nowIso,
        createdAt: nowIso
      }, { merge: true });
    } catch (e) {
      console.warn('Firestore saveRPEventLink error:', e);
    }

    // 3. LocalStorage
    try {
      const key = `${STORAGE_CACHED_RP_LINKS}_${rpId}`;
      const stored = localStorage.getItem(key);
      const links: Record<string, string> = stored ? JSON.parse(stored) : {};
      if (cleanUrl) {
        links[eventId] = cleanUrl;
      } else {
        delete links[eventId];
      }
      localStorage.setItem(key, JSON.stringify(links));
    } catch (e) {
      // ignore
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ==============================================================================
// 5. ATRIBUCIÓN DE SESIÓN, COOKIES / STORAGE Y REDIRECCIONES
// ==============================================================================

export function getActiveRPAttribution(): ActiveRPAttribution | null {
  try {
    const stored = localStorage.getItem(STORAGE_ACTIVE_RP_KEY) || sessionStorage.getItem(STORAGE_ACTIVE_RP_KEY);
    if (!stored) return null;
    const parsed: ActiveRPAttribution = JSON.parse(stored);

    // Expiración de atribución: 30 días
    const attributedTime = new Date(parsed.attributedAt).getTime();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - attributedTime > thirtyDaysMs) {
      clearActiveRPAttribution();
      return null;
    }

    return parsed;
  } catch (e) {
    return null;
  }
}

export function setActiveRPAttribution(
  rp: RPProfile,
  eventLinks?: Record<string, string>
): void {
  try {
    const attribution: ActiveRPAttribution = {
      rpId: rp.id,
      slug: rp.slug,
      publicName: rp.publicName,
      whatsapp: rp.whatsapp,
      instagram: rp.instagram,
      attributedAt: new Date().toISOString(),
      eventLinks: eventLinks || {},
    };
    const json = JSON.stringify(attribution);
    localStorage.setItem(STORAGE_ACTIVE_RP_KEY, json);
    sessionStorage.setItem(STORAGE_ACTIVE_RP_KEY, json);
  } catch (e) {
    console.warn('Could not save RP attribution to storage:', e);
  }
}

export function clearActiveRPAttribution(): void {
  try {
    localStorage.removeItem(STORAGE_ACTIVE_RP_KEY);
    sessionStorage.removeItem(STORAGE_ACTIVE_RP_KEY);
  } catch (e) {
    // ignore
  }
}

// ==============================================================================
// 6. TRACKING DE ACTIVIDAD Y ANALÍTICAS
// ==============================================================================

// Helper: Generar o recuperar sessionId anónimo para evitar duplicados masivos de clicks
function getAnonSessionId(): string {
  let sId = sessionStorage.getItem('cachengueoo_rp_session_id');
  if (!sId) {
    sId = 's_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
    sessionStorage.setItem('cachengueoo_rp_session_id', sId);
  }
  return sId;
}

export async function logRPActivity(
  rpId: string,
  actionType: RPActivityAction,
  eventId?: string
): Promise<void> {
  try {
    const sessionId = getAnonSessionId();
    const nowIso = new Date().toISOString();
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // 1. Supabase
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('rp_activity_logs').insert({
          rp_id: rpId,
          event_id: eventId || null,
          action_type: actionType,
          session_id: sessionId,
          user_agent: navigator.userAgent?.substring(0, 200) || null,
        });
      } catch (e) {
        // silence background log errors
      }
    }

    // 2. Firestore
    try {
      await setDoc(doc(db, 'rp_activity_logs', logId), {
        id: logId,
        rpId,
        eventId: eventId || null,
        actionType,
        sessionId,
        createdAt: nowIso,
      });
    } catch (e) {
      // silence
    }
  } catch (e) {
    // Non-blocking
  }
}

export interface RPAnalyticsSummary {
  rpId: string;
  totalVisits: number;
  ticketClicks: number;
  birthdayClicks: number;
  reservationClicks: number;
  totalActions: number;
}

export async function getRPAnalytics(rpId: string): Promise<RPAnalyticsSummary> {
  // 1. Memoria rápida (< 30s)
  const cachedMem = rpAnalyticsMemoryCache.get(rpId);
  if (cachedMem && Date.now() - cachedMem.timestamp < 30000) {
    return cachedMem.data;
  }

  const summary: RPAnalyticsSummary = {
    rpId,
    totalVisits: 0,
    ticketClicks: 0,
    birthdayClicks: 0,
    reservationClicks: 0,
    totalActions: 0,
  };

  // 1. Supabase con timeout de 1 segundo
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const queryPromise = supabase
        .from('rp_activity_logs')
        .select('action_type')
        .eq('rp_id', rpId);

      const { data, error } = await withTimeout<{ data: any; error: any }>(
        queryPromise as any,
        1000,
        { data: null, error: null }
      );

      if (!error && data && Array.isArray(data)) {
        data.forEach((item: any) => {
          summary.totalActions++;
          if (item.action_type === 'visit') summary.totalVisits++;
          else if (item.action_type === 'ticket_click') summary.ticketClicks++;
          else if (item.action_type === 'birthday_click') summary.birthdayClicks++;
          else if (item.action_type === 'reservation_click') summary.reservationClicks++;
        });
        rpAnalyticsMemoryCache.set(rpId, { data: summary, timestamp: Date.now() });
        return summary;
      }
    } catch (e) {
      // fallback
    }
  }

  // 2. Firestore con timeout de 1 segundo
  try {
    const q = query(
      collection(db, 'rp_activity_logs'),
      where('rpId', '==', rpId),
      limit(200)
    );
    const snap = await withTimeout(
      getDocs(q),
      1000,
      { empty: true, docs: [] } as any
    );
    snap.docs.forEach((d: any) => {
      const item = d.data() as RPActivityLog;
      summary.totalActions++;
      if (item.actionType === 'visit') summary.totalVisits++;
      else if (item.actionType === 'ticket_click') summary.ticketClicks++;
      else if (item.actionType === 'birthday_click') summary.birthdayClicks++;
      else if (item.actionType === 'reservation_click') summary.reservationClicks++;
    });
    rpAnalyticsMemoryCache.set(rpId, { data: summary, timestamp: Date.now() });
  } catch (e) {
    // fallback
  }

  return summary;
}
