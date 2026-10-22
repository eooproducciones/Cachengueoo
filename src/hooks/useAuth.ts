import { useState, useCallback, useEffect } from 'react';
import { authService, notifyAuthChange } from '../services/authService';
import { getSupabaseClient } from '../services/supabaseClient';
import { UserProfile } from '../types';

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(() => authService.getCurrentUser());

  useEffect(() => {
    // Sincronizar automáticamente el perfil real desde Supabase si hay sesión
    const client = getSupabaseClient();
    if (client) {
      client.auth.getUser().then(({ data }) => {
        if (data?.user) {
          client
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle()
            .then(({ data: profileData }) => {
              if (profileData) {
                const u: UserProfile = {
                  id: profileData.id,
                  email: profileData.email,
                  fullName: profileData.full_name,
                  nickname: profileData.nickname,
                  birthDate: profileData.birth_date,
                  age: profileData.age || 23,
                  avatarUrl:
                    profileData.avatar_url ||
                    (Array.isArray(profileData.photos) && profileData.photos[0]) ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
                  photos:
                    Array.isArray(profileData.photos) && profileData.photos.length > 0
                      ? profileData.photos
                      : profileData.avatar_url
                      ? [profileData.avatar_url]
                      : [],
                  gender: profileData.gender || 'otro',
                  preference: profileData.preference || 'todos',
                  interests: profileData.interests || [],
                  bio: profileData.bio || '',
                  drinkFavorite: profileData.drink_favorite || 'Fernet con Coca',
                  drinks:
                    profileData.interests && profileData.interests.length > 0
                      ? profileData.interests
                      : ['Fernet', 'Skyy'],
                  instagram: profileData.instagram || undefined,
                  createdAt: profileData.created_at,
                  isAdmin: profileData.email?.includes('admin'),
                  role: profileData.email?.includes('admin') ? 'admin' : 'user',
                };
                setUser(u);
                localStorage.setItem('cachengueoo_current_user', JSON.stringify(u));
                sessionStorage.setItem('cachengueoo_current_user', JSON.stringify(u));
              }
            });
        }
      });
    }

    const handleAuthChange = () => {
      setUser(authService.getCurrentUser());
    };

    window.addEventListener('cachengueoo_auth_change', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    return () => {
      window.removeEventListener('cachengueoo_auth_change', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  const setLoggedUser = useCallback((newUser: UserProfile | null) => {
    setUser(newUser);
    if (newUser) {
      localStorage.setItem('cachengueoo_current_user', JSON.stringify(newUser));
      sessionStorage.setItem('cachengueoo_current_user', JSON.stringify(newUser));
      notifyAuthChange();
    } else {
      authService.logout();
    }
  }, []);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    const updated = authService.updateProfile(updates);
    setUser(updated);
    return updated;
  }, []);

  const switchDemoUser = useCallback((role: 'user' | 'admin' | 'valen') => {
    const newUser = authService.loginDemo(role);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  return {
    user,
    setUser: setLoggedUser,
    updateProfile,
    switchDemoUser,
    logout,
  };
}
