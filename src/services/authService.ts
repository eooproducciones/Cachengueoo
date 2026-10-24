import { UserProfile } from '../types';
import { getSupabaseClient } from './supabaseClient';
import { buildUserProfileFromSources, packProfileInterests } from '../utils/profileMetadata';
import { presenceService } from './presenceService';

const USER_STORAGE_KEY = 'cachengueoo_current_user';
const USERS_LIST_STORAGE_KEY = 'cachengueoo_registered_users';

export function notifyAuthChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cachengueoo_auth_change'));
  }
}

// 1. Cuenta de administrador de emergencia para Cachengueoo
export const DEFAULT_ADMIN_USER: UserProfile = {
  id: 'usr_admin_01',
  email: 'admin@cachengueoo.com',
  fullName: 'Administrador Cachengueoo',
  nickname: 'Staff Admin',
  birthDate: '1995-01-01',
  age: 31,
  avatarUrl:
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
  photos: [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
  ],
  gender: 'otro',
  preference: 'todos',
  interests: ['Gestión', 'Eventos', 'Beneficios'],
  bio: 'Administración Cachengueoo Mendoza',
  drinkFavorite: 'Fernet & Skyy',
  drinks: ['Fernet', 'Skyy'],
  createdAt: '2026-01-01T00:00:00Z',
  isAdmin: true,
  role: 'admin',
};

export const authService = {
  // Sesión persistente: si el usuario ya inició sesión, no se cierra a menos que haga click en "Cerrar sesión"
  getCurrentUser(): UserProfile | null {
    try {
      const saved = localStorage.getItem(USER_STORAGE_KEY) || sessionStorage.getItem(USER_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return null;
  },

  getAllUsers(): UserProfile[] {
    try {
      const saved = localStorage.getItem(USERS_LIST_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  },

  async updateProfile(profile: Partial<UserProfile>): Promise<UserProfile | null> {
    const current = this.getCurrentUser();
    if (!current) return null;

    const updated: UserProfile = {
      ...current,
      ...profile,
      avatarUrl: profile.avatarUrl || (profile.photos && profile.photos[0]) || current.avatarUrl,
      photos:
        profile.photos && profile.photos.length > 0 ? profile.photos : current.photos,
      drinks: profile.drinks && profile.drinks.length > 0 ? profile.drinks : current.drinks,
      musicPreferences:
        profile.musicPreferences && profile.musicPreferences.length > 0
          ? profile.musicPreferences
          : current.musicPreferences,
      zodiacSign: profile.zodiacSign || current.zodiacSign,
    };

    // Guardar inmediatamente en localStorage y sessionStorage
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));

    // Update in all users list
    const all = this.getAllUsers();
    const existingIdx = all.findIndex((u) => u.id === current.id || (u.email && u.email === current.email));
    if (existingIdx >= 0) {
      all[existingIdx] = updated;
    } else {
      all.unshift(updated);
    }
    localStorage.setItem(USERS_LIST_STORAGE_KEY, JSON.stringify(all));

    // Si Supabase está conectado, sincronizar en Auth y en tabla profiles
    const client = getSupabaseClient();
    if (client) {
      // 1. Guardar metadatos completos en Supabase Auth
      try {
        await client.auth.updateUser({
          data: {
            full_name: updated.fullName,
            nickname: updated.nickname,
            birth_date: updated.birthDate,
            age: updated.age,
            avatar_url: updated.avatarUrl,
            photos: updated.photos,
            gender: updated.gender,
            preference: updated.preference,
            bio: updated.bio,
            drink_favorite: updated.drinkFavorite,
            drinks: updated.drinks,
            zodiac_sign: updated.zodiacSign,
            music_preferences: updated.musicPreferences,
            instagram: updated.instagram,
          },
        });
      } catch (e) {
        console.warn('Nota: Supabase auth.updateUser omitido o sin sesión activa:', e);
      }

      // 2. Guardar en public.profiles usando ÚNICAMENTE las columnas existentes
      const validDbRecord: Record<string, unknown> = {
        full_name: updated.fullName,
        nickname: updated.nickname,
        birth_date: updated.birthDate,
        age: updated.age,
        avatar_url: updated.avatarUrl,
        gender: updated.gender,
        preference: updated.preference,
        bio: updated.bio || '',
        drink_favorite: updated.drinkFavorite || 'Fernet con Coca',
        instagram: updated.instagram || '',
        interests: packProfileInterests(updated),
        updated_at: new Date().toISOString(),
      };

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(current.id);

      try {
        if (isUuid) {
          await client
            .from('profiles')
            .upsert(
              {
                id: current.id,
                email: current.email,
                ...validDbRecord,
              },
              { onConflict: 'id' }
            );
        } else if (current.email) {
          await client
            .from('profiles')
            .update(validDbRecord)
            .eq('email', current.email);
        }
      } catch (e) {
        console.warn('Advertencia al sincronizar perfil en Supabase:', e);
      }
    }

    notifyAuthChange();
    return updated;
  },

  async loginWithCredentials(
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: UserProfile; message?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // 1. Acceso de administrador de emergencia Cachengueoo
    if (cleanEmail === 'admin@cachengueoo.com' || cleanEmail === 'admin@cachuengueoo.com') {
      if (cleanPassword === 'river??2??') {
        const u = { ...DEFAULT_ADMIN_USER, email: cleanEmail };
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
        sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
        notifyAuthChange();
        return { success: true, user: u };
      }
      return {
        success: false,
        message: 'Contraseña incorrecta para cuenta de administrador.',
      };
    }

    // 2. Supabase Auth REAL en producción
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (error) {
        let errMessage = error.message;
        if (error.message.includes('Invalid login credentials')) {
          errMessage = 'Email o contraseña incorrectos en Cachengueoo.';
        } else if (error.message.includes('Email not confirmed')) {
          errMessage = 'Debés confirmar tu correo para ingresar (o desactivar "Confirm email" en Supabase Auth Settings).';
        }
        return { success: false, message: errMessage };
      }

      if (data?.user) {
        // Consultar el perfil real desde la tabla public.profiles de Supabase
        const { data: profileData } = await client
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        const currentLocal = this.getCurrentUser();
        const u: UserProfile = buildUserProfileFromSources(
          data.user,
          profileData,
          currentLocal?.id === data.user.id ? currentLocal : null
        );

        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
        sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
        notifyAuthChange();
        return { success: true, user: u };
      }
    }

    // Si no se pudo iniciar con Supabase o no hay conexión, verificar usuarios registrados localmente
    const matchedLocal = this.getAllUsers().find(
      (u) => u.email.toLowerCase() === cleanEmail
    );
    if (matchedLocal) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(matchedLocal));
      sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(matchedLocal));
      notifyAuthChange();
      return { success: true, user: matchedLocal };
    }

    return {
      success: false,
      message: 'No se encontró el usuario. Por favor creá tu Cache ID o corroborá tu email y contraseña.',
    };
  },

  async registerUser(
    newUser: UserProfile,
    password?: string
  ): Promise<{ success: boolean; message?: string; user?: UserProfile }> {
    const client = getSupabaseClient();

    if (client && password) {
      const metaData = {
        full_name: newUser.fullName,
        nickname: newUser.nickname,
        birth_date: newUser.birthDate,
        age: newUser.age,
        avatar_url: newUser.avatarUrl,
        photos: newUser.photos,
        gender: newUser.gender,
        preference: newUser.preference,
        bio: newUser.bio,
        drink_favorite: newUser.drinkFavorite,
        drinks: newUser.drinks,
        zodiac_sign: newUser.zodiacSign,
        music_preferences: newUser.musicPreferences,
        instagram: newUser.instagram,
      };

      // 1. Crear el usuario en Supabase Auth enviando toda su metadata
      const { data, error } = await client.auth.signUp({
        email: newUser.email,
        password,
        options: {
          data: metaData,
        },
      });

      let userId = data?.user?.id;

      // Si el usuario ya existe en Supabase Auth, iniciar sesión y actualizar metadata
      if (error && error.message.toLowerCase().includes('already registered')) {
        const signInRes = await client.auth.signInWithPassword({
          email: newUser.email,
          password,
        });
        if (!signInRes.error && signInRes.data?.user) {
          userId = signInRes.data.user.id;
          await client.auth.updateUser({ data: metaData });
        } else {
          return {
            success: false,
            message: 'Este correo ya está registrado en Cachengueoo. Ingresá en "Iniciar sesión" con tu contraseña.',
          };
        }
      } else if (error) {
        return { success: false, message: error.message };
      }

      if (userId) {
        // 2. Guardar en public.profiles usando ÚNICAMENTE las columnas existentes + interests empaquetados
        const validDbRecord = {
          id: userId,
          email: newUser.email,
          full_name: newUser.fullName,
          nickname: newUser.nickname,
          birth_date: newUser.birthDate,
          age: newUser.age,
          avatar_url: newUser.avatarUrl,
          gender: newUser.gender,
          preference: newUser.preference,
          interests: packProfileInterests(newUser),
          bio: newUser.bio || '',
          drink_favorite: newUser.drinkFavorite || 'Fernet con Coca',
          instagram: newUser.instagram || '',
          is_verified_in_venue: false,
          updated_at: new Date().toISOString(),
        };

        const { error: upsertErr } = await client.from('profiles').upsert(
          validDbRecord,
          { onConflict: 'id' }
        );

        if (upsertErr) {
          console.warn('Advertencia al sincronizar perfil en Supabase:', upsertErr.message);
        }

        const registeredProfile: UserProfile = {
          ...newUser,
          id: userId,
          isAdmin: newUser.email.includes('admin'),
          role: newUser.email.includes('admin') ? 'admin' : 'user',
        };

        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(registeredProfile));
        sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(registeredProfile));

        const allUsers = this.getAllUsers().filter((u) => u.id !== registeredProfile.id && u.email !== registeredProfile.email);
        allUsers.unshift(registeredProfile);
        localStorage.setItem(USERS_LIST_STORAGE_KEY, JSON.stringify(allUsers));

        notifyAuthChange();

        return { success: true, user: registeredProfile };
      }
    }

    // Guardado local de contingencia
    const localUser: UserProfile = {
      ...newUser,
      isAdmin: newUser.email.includes('admin'),
      role: newUser.email.includes('admin') ? 'admin' : 'user',
    };
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(localUser));
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(localUser));

    const allUsers = this.getAllUsers().filter((u) => u.id !== localUser.id && u.email !== localUser.email);
    allUsers.unshift(localUser);
    localStorage.setItem(USERS_LIST_STORAGE_KEY, JSON.stringify(allUsers));

    notifyAuthChange();

    return { success: true, user: localUser };
  },

  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    const client = getSupabaseClient();
    if (client) {
      const { error } = await client.auth.resetPasswordForEmail(email);
      if (error) {
        return { success: false, message: error.message };
      }
    }
    return {
      success: true,
      message: `Te enviamos un correo electrónico a ${email} con el enlace para restablecer tu contraseña. Revisá tu bandeja de entrada o spam.`,
    };
  },

  logout(): void {
    const client = getSupabaseClient();
    if (client) {
      client.auth.signOut().then(() => {}, () => {});
    }
    sessionStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    presenceService.clearPresence();
    notifyAuthChange();
  },

  async deleteUser(userId: string, userEmail?: string): Promise<{ success: boolean; message: string }> {
    // 1. Delete from local users list
    const all = this.getAllUsers().filter(
      (u) => u.id !== userId && (!userEmail || u.email?.toLowerCase() !== userEmail.toLowerCase())
    );
    localStorage.setItem(USERS_LIST_STORAGE_KEY, JSON.stringify(all));

    // If current session is this user, log out
    const current = this.getCurrentUser();
    if (current && (current.id === userId || (userEmail && current.email?.toLowerCase() === userEmail.toLowerCase()))) {
      sessionStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      notifyAuthChange();
    }

    // 2. Also remove from blocked list if present
    try {
      const blocked = JSON.parse(localStorage.getItem('cachengueoo_blocked_match_users') || '[]');
      const filteredBlocked = blocked.filter(
        (id: string) => id !== userId && (!userEmail || id !== userEmail.toLowerCase())
      );
      localStorage.setItem('cachengueoo_blocked_match_users', JSON.stringify(filteredBlocked));
    } catch {}

    // 3. Delete from Supabase profiles table
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('profiles').delete().eq('id', userId);
        if (userEmail) {
          await client.from('profiles').delete().eq('email', userEmail);
        }
      } catch (e) {
        console.warn('Error deleting user from Supabase profiles:', e);
      }
    }

    notifyAuthChange();
    return { success: true, message: 'Usuario eliminado permanentemente' };
  },

  loginDemo(role: 'user' | 'admin' | 'valen'): UserProfile {
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(DEFAULT_ADMIN_USER));
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(DEFAULT_ADMIN_USER));
    notifyAuthChange();
    return DEFAULT_ADMIN_USER;
  },
};
