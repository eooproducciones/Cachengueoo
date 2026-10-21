import { UserProfile } from '../types';
import { getSupabaseClient } from './supabaseClient';

const USER_STORAGE_KEY = 'cachengueoo_current_user';
const USERS_LIST_STORAGE_KEY = 'cachengueoo_registered_users';

export function notifyAuthChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cachengueoo_auth_change'));
  }
}

// 1. Cuenta de usuario de ejemplo (SIN administración habilitada)
export const DEFAULT_EXAMPLE_USER: UserProfile = {
  id: 'usr_cachenguero_01',
  email: 'usuario@cachengueoo.com',
  fullName: 'Juan Ignacio Pérez',
  nickname: 'Juani',
  birthDate: '2001-09-12',
  age: 23,
  avatarUrl:
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
  photos: [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
  ],
  gender: 'hombre',
  preference: 'todos',
  interests: ['Fernet', 'Skyy', 'Reggaeton', 'Cumbia'],
  bio: 'Listo para romper la pista en Cachengueoo 💃🕺 Si hay Fernet, hay charla.',
  drinkFavorite: 'Fernet & Skyy',
  drinks: ['Fernet', 'Skyy'],
  zodiacSign: 'Virgo',
  musicPreferences: ['Reggaeton', 'Cumbia', 'Cuarteto', 'Rock'],
  instagram: '@juani_cache',
  createdAt: '2026-03-01T00:00:00Z',
  isAdmin: false,
  role: 'user',
};

// 2. Cuenta de administrador de ejemplo (Pasa directo al panel admin)
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
    return [DEFAULT_EXAMPLE_USER, DEFAULT_ADMIN_USER];
  },

  updateProfile(profile: Partial<UserProfile>): UserProfile | null {
    const current = this.getCurrentUser();
    if (!current) return null;

    const updated = { ...current, ...profile };
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));

    // Update in all users list
    const all = this.getAllUsers();
    const updatedList = all.map((u) => (u.id === current.id ? updated : u));
    localStorage.setItem(USERS_LIST_STORAGE_KEY, JSON.stringify(updatedList));

    // If Supabase is connected:
    const client = getSupabaseClient();
    if (client) {
      client.from('profiles').update(profile).eq('id', current.id).then();
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

    // 1. Cuenta de Usuario fija: usuario@cachengueoo.com o usuario@cachuengueoo.com / river??2??
    const isUserAccount =
      cleanEmail === 'usuario@cachengueoo.com' || cleanEmail === 'usuario@cachuengueoo.com';

    if (isUserAccount) {
      if (cleanPassword === 'river??2??') {
        const u = { ...DEFAULT_EXAMPLE_USER, email: cleanEmail };
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
        sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
        notifyAuthChange();
        return { success: true, user: u };
      }
      return {
        success: false,
        message: 'Contraseña incorrecta para cuenta de usuario. (Clave: river??2??)',
      };
    }

    // 2. Cuenta de Administrador fija: admin@cachengueoo.com o admin@cachuengueoo.com / river??2??
    const isAdminAccount =
      cleanEmail === 'admin@cachengueoo.com' || cleanEmail === 'admin@cachuengueoo.com';

    if (isAdminAccount) {
      if (cleanPassword === 'river??2??') {
        const u = { ...DEFAULT_ADMIN_USER, email: cleanEmail };
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
        sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
        notifyAuthChange();
        return { success: true, user: u };
      }
      return {
        success: false,
        message: 'Contraseña incorrecta para cuenta de administrador. (Clave: river??2??)',
      };
    }

    // Supabase Auth (si está activo)
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (!error && data.user) {
        const { data: profileData } = await client
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileData) {
          const u: UserProfile = {
            id: profileData.id,
            email: profileData.email,
            fullName: profileData.full_name,
            nickname: profileData.nickname,
            birthDate: profileData.birth_date,
            age: profileData.age,
            avatarUrl: profileData.avatar_url,
            gender: profileData.gender,
            preference: profileData.preference,
            interests: profileData.interests || [],
            bio: profileData.bio || '',
            drinkFavorite: profileData.drink_favorite || 'Fernet & Skyy',
            drinks: profileData.drinks || ['Fernet', 'Skyy'],
            createdAt: profileData.created_at,
            isAdmin: cleanEmail.includes('admin'),
            role: cleanEmail.includes('admin') ? 'admin' : 'user',
          };
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
          sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
          notifyAuthChange();
          return { success: true, user: u };
        }
      }
    }

    // Buscar en usuarios locales registrados previamente
    const all = this.getAllUsers();
    const found = all.find((u) => u.email.toLowerCase() === cleanEmail);

    if (found) {
      if (found.password && found.password !== cleanPassword) {
        return { success: false, message: 'Contraseña incorrecta' };
      }
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(found));
      sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(found));
      notifyAuthChange();
      return { success: true, user: found };
    }

    // Ingreso flexible de prueba si la contraseña coincide con river??2??
    if (cleanPassword === 'river??2??') {
      const isAdmin = cleanEmail.includes('admin');
      const fallbackUser: UserProfile = {
        ...(isAdmin ? DEFAULT_ADMIN_USER : DEFAULT_EXAMPLE_USER),
        id: `usr_${Date.now()}`,
        email: cleanEmail,
        fullName: cleanEmail.split('@')[0],
        nickname: cleanEmail.split('@')[0],
        isAdmin,
        role: isAdmin ? 'admin' : 'user',
      };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(fallbackUser));
      sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(fallbackUser));
      notifyAuthChange();
      return { success: true, user: fallbackUser };
    }

    return {
      success: false,
      message: 'Usuario no encontrado. Podés registrarte o usar usuario@cachengueoo.com o admin@cachengueoo.com con river??2??',
    };
  },

  async registerUser(
    newUser: UserProfile,
    password?: string
  ): Promise<{ success: boolean; message?: string }> {
    const client = getSupabaseClient();

    if (client && password) {
      const { data, error } = await client.auth.signUp({
        email: newUser.email,
        password,
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (data.user) {
        await client.from('profiles').insert({
          id: data.user.id,
          email: newUser.email,
          full_name: newUser.fullName,
          nickname: newUser.nickname,
          birth_date: newUser.birthDate,
          age: newUser.age,
          avatar_url: newUser.avatarUrl,
          gender: newUser.gender,
          preference: newUser.preference,
          interests: newUser.interests,
          bio: newUser.bio,
          drink_favorite: newUser.drinkFavorite,
        });
      }
    }

    // Save locally
    const userToSave: UserProfile = {
      ...newUser,
      password,
      isAdmin: false,
      role: 'user',
    };

    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userToSave));
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userToSave));
    const all = this.getAllUsers();
    localStorage.setItem(USERS_LIST_STORAGE_KEY, JSON.stringify([...all, userToSave]));
    notifyAuthChange();

    return { success: true };
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
      client.auth.signOut().then();
    }
    sessionStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    notifyAuthChange();
  },

  loginDemo(role: 'user' | 'admin' | 'valen'): UserProfile {
    if (role === 'admin') {
      sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(DEFAULT_ADMIN_USER));
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(DEFAULT_ADMIN_USER));
      notifyAuthChange();
      return DEFAULT_ADMIN_USER;
    }
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(DEFAULT_EXAMPLE_USER));
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(DEFAULT_EXAMPLE_USER));
    notifyAuthChange();
    return DEFAULT_EXAMPLE_USER;
  },
};
