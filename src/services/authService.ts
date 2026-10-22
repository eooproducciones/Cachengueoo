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
      const dbUpdates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (profile.fullName !== undefined) dbUpdates.full_name = profile.fullName;
      if (profile.nickname !== undefined) dbUpdates.nickname = profile.nickname;
      if (profile.birthDate !== undefined) dbUpdates.birth_date = profile.birthDate;
      if (profile.age !== undefined) dbUpdates.age = profile.age;
      if (profile.avatarUrl !== undefined) dbUpdates.avatar_url = profile.avatarUrl;
      if (profile.photos !== undefined) dbUpdates.photos = profile.photos;
      if (profile.gender !== undefined) dbUpdates.gender = profile.gender;
      if (profile.preference !== undefined) dbUpdates.preference = profile.preference;
      if (profile.interests !== undefined) dbUpdates.interests = profile.interests;
      if (profile.bio !== undefined) dbUpdates.bio = profile.bio;
      if (profile.drinkFavorite !== undefined) dbUpdates.drink_favorite = profile.drinkFavorite;
      if (profile.instagram !== undefined) dbUpdates.instagram = profile.instagram;

      client
        .from('profiles')
        .update(dbUpdates)
        .eq('id', current.id)
        .then(({ error }) => {
          if (error) console.warn('Supabase profile update notice:', error.message);
        });
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

        const u: UserProfile = {
          id: data.user.id,
          email: data.user.email || cleanEmail,
          fullName: profileData?.full_name || data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
          nickname: profileData?.nickname || data.user.user_metadata?.nickname || cleanEmail.split('@')[0],
          birthDate: profileData?.birth_date || data.user.user_metadata?.birth_date || '2001-01-01',
          age: profileData?.age || data.user.user_metadata?.age || 23,
          avatarUrl:
            profileData?.avatar_url ||
            data.user.user_metadata?.avatar_url ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
          photos: profileData?.avatar_url
            ? [profileData.avatar_url]
            : [
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
              ],
          gender: profileData?.gender || data.user.user_metadata?.gender || 'otro',
          preference: profileData?.preference || data.user.user_metadata?.preference || 'todos',
          interests: profileData?.interests || data.user.user_metadata?.interests || ['Fernet', 'Skyy'],
          bio: profileData?.bio || data.user.user_metadata?.bio || 'Listo para romper la pista en Cachengueoo.',
          drinkFavorite: profileData?.drink_favorite || 'Fernet con Coca',
          drinks: profileData?.interests && profileData.interests.length > 0 ? profileData.interests : ['Fernet', 'Skyy'],
          instagram: profileData?.instagram || data.user.user_metadata?.instagram || undefined,
          createdAt: profileData?.created_at || data.user.created_at || new Date().toISOString(),
          isAdmin: cleanEmail.includes('admin'),
          role: cleanEmail.includes('admin') ? 'admin' : 'user',
        };

        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
        sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
        notifyAuthChange();
        return { success: true, user: u };
      }
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
      // 1. Crear el usuario en Supabase Auth enviando toda su metadata
      const { data, error } = await client.auth.signUp({
        email: newUser.email,
        password,
        options: {
          data: {
            full_name: newUser.fullName,
            nickname: newUser.nickname,
            birth_date: newUser.birthDate,
            age: newUser.age,
            avatar_url: newUser.avatarUrl,
            gender: newUser.gender,
            preference: newUser.preference,
            bio: newUser.bio,
            drink_favorite: newUser.drinkFavorite,
            instagram: newUser.instagram,
          },
        },
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (data?.user) {
        // 2. Guardar con upsert en la tabla public.profiles de Supabase
        const { error: upsertErr } = await client.from('profiles').upsert(
          {
            id: data.user.id,
            email: newUser.email,
            full_name: newUser.fullName,
            nickname: newUser.nickname,
            birth_date: newUser.birthDate,
            age: newUser.age,
            avatar_url: newUser.avatarUrl,
            gender: newUser.gender,
            preference: newUser.preference,
            interests: newUser.interests || [],
            bio: newUser.bio || '',
            drink_favorite: newUser.drinkFavorite || 'Fernet con Coca',
            instagram: newUser.instagram || '',
            is_verified_in_venue: false,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

        if (upsertErr) {
          console.warn('Advertencia al sincronizar perfil en Supabase:', upsertErr.message);
        }

        const registeredProfile: UserProfile = {
          ...newUser,
          id: data.user.id,
          isAdmin: false,
          role: 'user',
        };

        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(registeredProfile));
        sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(registeredProfile));
        notifyAuthChange();

        return { success: true, user: registeredProfile };
      }
    }

    // Guardado local de contingencia
    const localUser: UserProfile = {
      ...newUser,
      isAdmin: false,
      role: 'user',
    };
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(localUser));
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(localUser));
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
