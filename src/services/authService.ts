import { CURRENT_MOCK_USER } from '../data/mockData';
import { UserProfile } from '../types';
import { getSupabaseClient } from './supabaseClient';

const USER_STORAGE_KEY = 'cachengueoo_current_user';
const USERS_LIST_STORAGE_KEY = 'cachengueoo_registered_users';

export const authService = {
  getCurrentUser(): UserProfile {
    try {
      const saved = localStorage.getItem(USER_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return CURRENT_MOCK_USER;
  },

  getAllUsers(): UserProfile[] {
    try {
      const saved = localStorage.getItem(USERS_LIST_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [CURRENT_MOCK_USER];
  },

  updateProfile(profile: Partial<UserProfile>): UserProfile {
    const current = this.getCurrentUser();
    const updated = { ...current, ...profile };
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));

    // Update in all users list
    const all = this.getAllUsers();
    const updatedList = all.map((u) => (u.id === current.id ? updated : u));
    localStorage.setItem(USERS_LIST_STORAGE_KEY, JSON.stringify(updatedList));

    // If Supabase is connected:
    const client = getSupabaseClient();
    if (client) {
      client.from('profiles').update(profile).eq('id', current.id).then();
    }

    return updated;
  },

  async loginWithCredentials(
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: UserProfile; message?: string }> {
    const client = getSupabaseClient();

    // Si Supabase está configurado, usar Supabase Auth real:
    if (client) {
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (data.user) {
        // Fetch profile from table
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
            drinkFavorite: profileData.drink_favorite || 'Fernet con Coca',
            createdAt: profileData.created_at,
          };
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
          return { success: true, user: u };
        }
      }
    }

    // Modo local / Mock
    const all = this.getAllUsers();
    const found = all.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (found) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(found));
      return { success: true, user: found };
    }

    // Si es una cuenta demo conocida
    if (email.toLowerCase().includes('valen')) {
      const u = this.loginDemo('valen');
      return { success: true, user: u };
    }

    // Permitir ingreso flexible para desarrollo
    const fallbackUser: UserProfile = {
      ...CURRENT_MOCK_USER,
      email,
      fullName: email.split('@')[0],
      nickname: email.split('@')[0],
    };
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(fallbackUser));
    return { success: true, user: fallbackUser };
  },

  async registerUser(
    newUser: UserProfile,
    password: string
  ): Promise<{ success: boolean; message?: string }> {
    const client = getSupabaseClient();

    if (client) {
      const { data, error } = await client.auth.signUp({
        email: newUser.email,
        password,
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (data.user) {
        // Insert profile row
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
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
    const all = this.getAllUsers();
    localStorage.setItem(USERS_LIST_STORAGE_KEY, JSON.stringify([...all, newUser]));

    return { success: true };
  },

  logout(): void {
    const client = getSupabaseClient();
    if (client) {
      client.auth.signOut().then();
    }
    localStorage.removeItem(USER_STORAGE_KEY);
  },

  loginDemo(role: 'mateo' | 'valen' | 'admin'): UserProfile {
    if (role === 'valen') {
      const valen: UserProfile = {
        id: 'usr_match_01',
        email: 'valen.morales@gmail.com',
        fullName: 'Valentina Morales',
        nickname: 'Valen',
        birthDate: '2003-04-12',
        age: 22,
        avatarUrl:
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
        gender: 'mujer',
        preference: 'todos',
        interests: ['Gin Tonic de Frutos Rojos', 'Reggaeton Viejo', 'Bresh', 'Cachengue'],
        bio: 'Si suena Daddy Yankee o Duki estoy en el medio de la pista. Barra VIP 🍸',
        drinkFavorite: 'Gin Tonic de Frutos Rojos',
        instagram: '@valenmorales',
        createdAt: '2026-02-15T00:00:00Z',
      };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(valen));
      return valen;
    }

    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(CURRENT_MOCK_USER));
    return CURRENT_MOCK_USER;
  },
};
