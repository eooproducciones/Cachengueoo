import { useState, useCallback, useEffect } from 'react';
import { authService, notifyAuthChange } from '../services/authService';
import { getSupabaseClient } from '../services/supabaseClient';
import { buildUserProfileFromSources } from '../utils/profileMetadata';
import { UserProfile } from '../types';

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(() => authService.getCurrentUser());

  useEffect(() => {
    // Sincronizar automáticamente el perfil real desde Supabase si hay sesión o si vuelve de Google OAuth
    const client = getSupabaseClient();
    let authSubscription: { unsubscribe: () => void } | null = null;

    if (client) {
      const handleUserSession = async (authUser: any) => {
        if (!authUser) return;
        try {
          let { data: profileData } = await client
            .from('profiles')
            .select('*')
            .or(`id.eq.${authUser.id},email.eq.${authUser.email}`)
            .maybeSingle();

          // Helper: Determinar si la foto fue realmente subida por el usuario y no proviene de Google
          const isRealUploadedPhoto = (url?: string | null) =>
            Boolean(
              url &&
              !url.includes('images.unsplash.com') &&
              !url.includes('googleusercontent.com') &&
              !url.includes('ggpht.com')
            );

          // Si el usuario ingresó por Google y aún no tiene fila en profiles, crearla automáticamente con sus datos
          if (!profileData && authUser.email) {
            const googleName =
              authUser.user_metadata?.full_name ||
              authUser.user_metadata?.name ||
              authUser.email.split('@')[0];

            // NUNCA tomar la foto de Google: el usuario debe subir sí o sí una foto propia
            const newProfileRecord = {
              id: authUser.id,
              email: authUser.email,
              full_name: googleName,
              nickname: googleName.split(' ')[0] || googleName,
              avatar_url: '',
              gender: 'hombre',
              preference: 'todos',
              birth_date: '2001-01-01',
              age: 23,
              bio: '',
              drink_favorite: 'Fernet con Coca',
              drinks: ['Fernet'],
              instagram: '',
              interests: [],
              updated_at: new Date().toISOString(),
            };

            try {
              await client.from('profiles').upsert(newProfileRecord, { onConflict: 'id' });
            } catch {
              // Ignore initial profile creation error
            }
            profileData = newProfileRecord;
          }

          const currentLocal = authService.getCurrentUser();
          const mergedUser = buildUserProfileFromSources(authUser, profileData, currentLocal);
          if (authUser.email && (!mergedUser.email || mergedUser.email.includes('usuario.cache'))) {
            mergedUser.email = authUser.email;
          }

          // Si el avatar guardado era de Google, limpiarlo para forzar que suba su foto real
          if (mergedUser.avatarUrl && !isRealUploadedPhoto(mergedUser.avatarUrl)) {
            mergedUser.avatarUrl = '';
            mergedUser.photos = [];
          }

          setUser(mergedUser);
          localStorage.setItem('cachengueoo_current_user', JSON.stringify(mergedUser));
          sessionStorage.setItem('cachengueoo_current_user', JSON.stringify(mergedUser));
          notifyAuthChange();

          // El usuario solo se considera configurado si TIENE FOTO PROPIA SUBIDA
          const hasUploadedPhoto =
            isRealUploadedPhoto(mergedUser?.avatarUrl) ||
            isRealUploadedPhoto(profileData?.avatar_url);

          if (!hasUploadedPhoto) {
            // Si no subió foto propia, debe abrir el wizard para subirla obligatoriamente
            localStorage.removeItem('cachengueoo_cache_id_created');
            window.dispatchEvent(new CustomEvent('cachengueoo_open_cache_id_wizard'));
            return;
          }

          localStorage.setItem('cachengueoo_cache_id_created', 'true');
          sessionStorage.removeItem('cachengueoo_flow_intent');
          localStorage.removeItem('cachengueoo_flow_intent');
        } catch (err) {
          console.warn('Error fetching or creating Supabase profile in useAuth:', err);
        }
      };

      // 1. Verificar sesión existente al cargar
      client.auth.getUser().then(({ data }) => {
        if (data?.user) {
          handleUserSession(data.user);
        }
      });

      // 2. Escuchar cambios de autenticación (ej. cuando vuelve del redirect de Google)
      const { data: subData } = client.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          handleUserSession(session.user);
        }
      });
      authSubscription = subData.subscription;
    }

    const handleAuthChange = () => {
      setUser(authService.getCurrentUser());
    };

    window.addEventListener('cachengueoo_auth_change', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
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
