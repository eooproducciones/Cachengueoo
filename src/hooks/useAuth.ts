import { useState, useCallback } from 'react';
import { authService } from '../services/authService';
import { UserProfile } from '../types';

export function useAuth() {
  const [user, setUser] = useState<UserProfile>(() => authService.getCurrentUser());

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    const updated = authService.updateProfile(updates);
    setUser(updated);
    return updated;
  }, []);

  const switchDemoUser = useCallback((role: 'mateo' | 'valen' | 'admin') => {
    const newUser = authService.loginDemo(role);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(authService.getCurrentUser());
  }, []);

  return {
    user,
    updateProfile,
    switchDemoUser,
    logout,
  };
}
