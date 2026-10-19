import { VenueConfig } from '../types';

/**
 * Configuración central del boliche Cachengueoo en Mendoza, Argentina.
 * Modificable dinámicamente o por variables de entorno / Supabase en el futuro.
 */
export const DEFAULT_VENUE_LOCATION: VenueConfig = {
  name: 'CACHENGUEOO',
  city: 'Mendoza',
  province: 'Mendoza',
  country: 'Argentina',
  // Ubicación nocturna de referencia en Mendoza (Chacras de Coria / San Martín / Ruta Panamericana nightlife hub)
  latitude: -32.89084,
  longitude: -68.84717,
  // Radio de presencia por defecto en metros (150 metros cubre el local, patio y VIP)
  radiusMeters: 180,
};

// Key en localStorage para permitir que el administrador modifique las coordenadas y radio en vivo
const VENUE_STORAGE_KEY = 'cachengueoo_venue_config';

export function getVenueConfig(): VenueConfig {
  try {
    const saved = localStorage.getItem(VENUE_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error reading venue config from storage', e);
  }
  return DEFAULT_VENUE_LOCATION;
}

export function saveVenueConfig(config: VenueConfig): void {
  try {
    localStorage.setItem(VENUE_STORAGE_KEY, JSON.stringify(config));
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
}

/**
 * Valida si un punto geográfico se encuentra dentro del radio de Cachengueoo,
 * evaluando también la precisión entregada por el hardware GPS.
 */
export function validateVenuePresence(
  userLat: number,
  userLon: number,
  accuracyMeters: number,
  venueConfig = getVenueConfig()
): GeolocationValidationResult {
  const distance = calculateHaversineDistance(
    userLat,
    userLon,
    venueConfig.latitude,
    venueConfig.longitude
  );

  // Umbral de precisión: si el GPS tiene un margen de error mayor a 2.5x el radio del club,
  // la ubicación no es confiable para validar automáticamente.
  const isAccuracyAcceptable = accuracyMeters <= venueConfig.radiusMeters * 2;

  // Está dentro si la distancia es menor o igual al radio
  const isInside = distance <= venueConfig.radiusMeters;

  let message = '';
  if (!isAccuracyAcceptable && isInside) {
    message = 'Señal GPS de baja precisión. Recomendamos validar con QR en el ingreso.';
  } else if (isInside) {
    message = '¡Estás en Cachengueoo! 🔥';
  } else {
    message = `Estás a ${Math.round(distance)}m de Cachengueoo (radio: ${venueConfig.radiusMeters}m).`;
  }

  return {
    isInside: isInside && isAccuracyAcceptable,
    distanceMeters: Math.round(distance),
    accuracyMeters: Math.round(accuracyMeters),
    isAccuracyAcceptable,
    message,
  };
}
