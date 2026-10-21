import { useState, useCallback, useEffect } from 'react';
import { authService, notifyAuthChange } from '../services/authService';
import { UserProfile } from '../types';

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(() => authService.getCurrentUser());

  useEffect(() => {
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
