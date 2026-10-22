import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_STORAGE_URL_KEY = 'cachengueoo_supabase_url';
const SUPABASE_STORAGE_KEY_KEY = 'cachengueoo_supabase_anon_key';

export interface SupabaseConfig {
  url: string | null;
  anonKey: string | null;
  isConfigured: boolean;
}

export function cleanSupabaseUrl(raw: string | null): string | null {
  if (!raw) return null;
  let u = raw.trim();
  u = u.replace(/\/+$/, '');
  u = u.replace(/\/rest\/v1$/i, '');
  return u.replace(/\/+$/, '');
}

export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta.env as Record<string, string | undefined>).VITE_SUPABASE_URL || null;
  const envKey = (import.meta.env as Record<string, string | undefined>).VITE_SUPABASE_ANON_KEY || null;

  const storedUrl = localStorage.getItem(SUPABASE_STORAGE_URL_KEY);
  const storedKey = localStorage.getItem(SUPABASE_STORAGE_KEY_KEY);

  const url = cleanSupabaseUrl(storedUrl || envUrl);
  const anonKey = storedKey || envKey;

  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey),
  };
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  const cleanUrl = cleanSupabaseUrl(url) || url.trim();
  localStorage.setItem(SUPABASE_STORAGE_URL_KEY, cleanUrl);
  localStorage.setItem(SUPABASE_STORAGE_KEY_KEY, anonKey.trim());
  // Reset client instance
  clientInstance = null;
}

export function clearSupabaseConfig(): void {
  localStorage.removeItem(SUPABASE_STORAGE_URL_KEY);
  localStorage.removeItem(SUPABASE_STORAGE_KEY_KEY);
  clientInstance = null;
}

let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.isConfigured || !config.url || !config.anonKey) {
    return null;
  }

  if (!clientInstance) {
    try {
      clientInstance = createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
      return null;
    }
  }

  return clientInstance;
}

export const isSupabaseConfigured = (): boolean => {
  return getSupabaseConfig().isConfigured;
};
