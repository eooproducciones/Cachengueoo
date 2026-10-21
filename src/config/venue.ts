import { VenueConfig, VenueLocation } from '../types';

export const DEFAULT_LOCATIONS: VenueLocation[] = [
  {
    id: 'loc_cache_principal',
    name: 'Cachengueoo - Sede Principal',
    address: 'San Martín & Panamericana, Mendoza',
    city: 'Mendoza',
    province: 'Mendoza',
    country: 'Argentina',
    latitude: -32.89084,
    longitude: -68.84717,
    radiusMeters: 180,
    isActive: true,
  },
  {
    id: 'loc_arena_maipu',
    name: 'Arena Maipú - Evento Especial',
    address: 'Emilio Civit & Maza, Maipú, Mendoza',
    city: 'Maipú',
    province: 'Mendoza',
    country: 'Argentina',
    latitude: -32.97745,
    longitude: -68.79090,
    radiusMeters: 300,
    isActive: true,
  },
];

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
  locations: DEFAULT_LOCATIONS,
};

// Key en localStorage para permitir que el administrador modifique las coordenadas y radio en vivo
const VENUE_STORAGE_KEY = 'cachengueoo_venue_config';

export function getVenueConfig(): VenueConfig {
  try {
    const saved = localStorage.getItem(VENUE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!parsed.locations || parsed.locations.length === 0) {
        parsed.locations = DEFAULT_LOCATIONS;
      }
      return parsed;
    }
  } catch (e) {
    console.error('Error reading venue config from storage', e);
  }
  return DEFAULT_VENUE_LOCATION;
}

export function saveVenueConfig(config: VenueConfig): void {
  try {
    localStorage.setItem(VENUE_STORAGE_KEY, JSON.stringify(config));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cachengueoo_venue_change', { detail: config }));
    }
  } catch (e) {
    console.error('Error saving venue config', e);
  }
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
      : [
          {
            id: 'default',
            name: venueConfig.name,
            city: venueConfig.city,
            province: venueConfig.province,
            country: venueConfig.country,
            latitude: venueConfig.latitude,
            longitude: venueConfig.longitude,
            radiusMeters: venueConfig.radiusMeters,
            isActive: true,
          },
        ];

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
  const isAccuracyAcceptable = accuracyMeters <= targetRadius * 2.5;
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
    if (!isAccuracyAcceptable) {
      message = `Señal GPS aproximada en ${insideLocation.name}. Recomendamos escanear el QR oficial.`;
    } else {
      message = `¡Estás en ${insideLocation.name}! 🔥`;
    }
  } else {
    message = `Estás a ${Math.round(minDistance)}m de ${closestLocation.name} (radio permitido: ${closestLocation.radiusMeters}m).`;
  }

  return {
    isInside: isInside && isAccuracyAcceptable,
    distanceMeters,
    accuracyMeters: Math.round(accuracyMeters),
    isAccuracyAcceptable,
    message,
    matchedLocationName: insideLocation?.name,
  };
}
