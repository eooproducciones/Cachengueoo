import { useState, useCallback } from 'react';
import { authService } from '../services/authService';
import { UserProfile } from '../types';

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(() => authService.getCurrentUser());

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
    setUser,
    updateProfile,
    switchDemoUser,
    logout,
  };
}
