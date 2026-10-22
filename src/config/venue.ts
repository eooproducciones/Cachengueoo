import { VenueConfig, VenueLocation } from '../types';

export const DEFAULT_LOCATIONS: VenueLocation[] = [];

/**
 * Configuración central del boliche Cachengueoo en Mendoza, Argentina.
 */
export const DEFAULT_VENUE_LOCATION: VenueConfig = {
  name: 'CACHENGUEOO',
  city: 'Mendoza',
  province: 'Mendoza',
  country: 'Argentina',
  latitude: -32.89084,
  longitude: -68.84717,
  radiusMeters: 180,
  locations: [],
};

import { getSupabaseClient } from '../services/supabaseClient';

// Key en localStorage para permitir que el administrador modifique las coordenadas y radio en vivo
const VENUE_STORAGE_KEY = 'cachengueoo_venue_config';

export function getVenueConfig(): VenueConfig {
  try {
    const saved = localStorage.getItem(VENUE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!parsed.locations) {
        parsed.locations = [];
      }
      return parsed;
    }
  } catch (e) {
    console.error('Error reading venue config from storage', e);
  }
  return DEFAULT_VENUE_LOCATION;
}

/**
 * Guarda la configuración en localStorage y la sincroniza con Supabase en segundo plano
 */
export function saveVenueConfig(config: VenueConfig): void {
  try {
    localStorage.setItem(VENUE_STORAGE_KEY, JSON.stringify(config));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cachengueoo_venue_change', { detail: config }));
    }

    // Sincronizar en la nube con Supabase si está conectado
    syncVenueConfigToSupabase(config).catch((err) => {
      console.warn('Could not sync venue config to Supabase:', err);
    });
  } catch (e) {
    console.error('Error saving venue config', e);
  }
}

/**
 * Sincroniza las locaciones hacia la tabla public.venue_locations de Supabase
 */
export async function syncVenueConfigToSupabase(config: VenueConfig): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    if (config.locations && config.locations.length > 0) {
      const records = config.locations.map((loc) => ({
        id: loc.id,
        name: loc.name,
        address: loc.address || '',
        city: loc.city || 'Mendoza',
        province: loc.province || 'Mendoza',
        country: loc.country || 'Argentina',
        latitude: loc.latitude,
        longitude: loc.longitude,
        radius_meters: loc.radiusMeters,
        is_active: loc.isActive,
        updated_at: new Date().toISOString(),
      }));

      await supabase.from('venue_locations').upsert(records, { onConflict: 'id' });
    }
  } catch (e) {
    console.warn('Error in syncVenueConfigToSupabase', e);
  }
}

/**
 * Elimina una locación en la nube en Supabase
 */
export async function deleteVenueLocationFromSupabase(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    await supabase.from('venue_locations').delete().eq('id', id);
  } catch (e) {
    console.warn('Error deleting venue location from Supabase', e);
  }
}


/**
 * Descarga las locaciones activas desde Supabase y actualiza el estado local
 */
export async function syncVenueLocationsFromSupabase(): Promise<VenueLocation[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('venue_locations')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Error fetching venue locations from Supabase:', error.message);
      return null;
    }

    if (data && data.length > 0) {
      const mappedLocations: VenueLocation[] = data.map((row) => ({
        id: row.id,
        name: row.name,
        address: row.address || '',
        city: row.city || 'Mendoza',
        province: row.province || 'Mendoza',
        country: row.country || 'Argentina',
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        radiusMeters: parseInt(row.radius_meters, 10) || 180,
        isActive: Boolean(row.is_active),
      }));

      const current = getVenueConfig();
      const primary = mappedLocations[0];
      const updated: VenueConfig = {
        ...current,
        name: primary ? primary.name : current.name,
        city: primary ? primary.city : current.city,
        latitude: primary ? primary.latitude : current.latitude,
        longitude: primary ? primary.longitude : current.longitude,
        radiusMeters: primary ? primary.radiusMeters : current.radiusMeters,
        locations: mappedLocations,
      };

      localStorage.setItem(VENUE_STORAGE_KEY, JSON.stringify(updated));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cachengueoo_venue_change', { detail: updated }));
      }
      return mappedLocations;
    }
  } catch (e) {
    console.warn('Error syncing venue locations from Supabase', e);
  }
  return null;
}


/**
 * Cálculo de distancia Haversine en metros entre dos coordenadas geográficas.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Radio de la Tierra en metros
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export interface GeolocationValidationResult {
  isInside: boolean;
  distanceMeters: number;
  accuracyMeters: number;
  isAccuracyAcceptable: boolean;
  message: string;
  matchedLocationName?: string;
}

/**
 * Valida si un punto geográfico se encuentra dentro del radio permitido
 * de CUALQUIERA de las locaciones activas (ej. Sede Central o Arena Maipú).
 */
export function validateVenuePresence(
  userLat: number,
  userLon: number,
  accuracyMeters: number,
  venueConfig = getVenueConfig()
): GeolocationValidationResult {
  const activeLocations: VenueLocation[] =
    venueConfig.locations && venueConfig.locations.length > 0
      ? venueConfig.locations.filter((loc) => loc.isActive)
      : [];

  if (activeLocations.length === 0) {
    return {
      isInside: false,
      distanceMeters: 0,
      accuracyMeters: Math.round(accuracyMeters),
      isAccuracyAcceptable: true,
      message: 'No hay locaciones activas configuradas.',
    };
  }

  let insideLocation: VenueLocation | null = null;
  let minDistance = Infinity;
  let closestLocation = activeLocations[0];

  for (const loc of activeLocations) {
    const dist = calculateHaversineDistance(userLat, userLon, loc.latitude, loc.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      closestLocation = loc;
    }
    if (dist <= loc.radiusMeters) {
      insideLocation = loc;
      break;
    }
  }

  const targetRadius = insideLocation ? insideLocation.radiusMeters : closestLocation.radiusMeters;
  const isAccuracyAcceptable = accuracyMeters <= Math.max(targetRadius * 3, 350);
  const isInside = insideLocation !== null;

  let message = '';
  let distanceMeters = Math.round(minDistance);

  if (insideLocation) {
    distanceMeters = Math.round(
      calculateHaversineDistance(
        userLat,
        userLon,
        insideLocation.latitude,
        insideLocation.longitude
      )
    );
    message = `¡Estás en ${insideLocation.name}! 🔥`;
  } else {
    message = `Estás a ${Math.round(minDistance)}m de ${closestLocation.name} (radio permitido: ${closestLocation.radiusMeters}m).`;
  }

  return {
    isInside,
    distanceMeters,
    accuracyMeters: Math.round(accuracyMeters),
    isAccuracyAcceptable: true,
    message,
    matchedLocationName: insideLocation?.name,
  };
}
