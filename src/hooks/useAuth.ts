import { useState, useCallback, useEffect } from 'react';
import { authService, notifyAuthChange } from '../services/authService';
import { getSupabaseClient } from '../services/supabaseClient';
import { buildUserProfileFromSources } from '../utils/profileMetadata';
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
              const currentLocal = authService.getCurrentUser();
              const mergedUser = buildUserProfileFromSources(data.user, profileData, currentLocal);
              setUser(mergedUser);
              localStorage.setItem('cachengueoo_current_user', JSON.stringify(mergedUser));
              sessionStorage.setItem('cachengueoo_current_user', JSON.stringify(mergedUser));
            })
            .catch((err) => {
              console.warn('Error fetching Supabase profile in useAuth:', err);
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

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    const updated = await authService.updateProfile(updates);
    if (updated) {
      setUser(updated);
    }
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
