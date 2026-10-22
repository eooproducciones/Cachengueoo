import { getVenueConfig, validateVenuePresence, GeolocationValidationResult } from '../config/venue';
import { PresenceMethod, PresenceRecord, ValidationMode } from '../types';

const PRESENCE_CACHE_KEY = 'cachengueoo_presence_state';
const QR_ACTIVE_TOKEN_KEY = 'cachengueoo_active_qr_token';

export interface PresenceStatus {
  isInside: boolean;
  methodUsed?: PresenceMethod;
  gpsResult?: GeolocationValidationResult;
  validatedAt?: string;
  simulated?: boolean;
  qrVerified?: boolean;
  gpsVerified?: boolean;
}

// Token QR por defecto de la noche (rotativo por el admin)
const DEFAULT_NIGHT_QR = 'CACHE-NIGHT-MZA-2026';

export const presenceService = {
  /**
   * Obtiene el token QR activo para la noche actual
   */
  getActiveQrToken(): string {
    return localStorage.getItem(QR_ACTIVE_TOKEN_KEY) || DEFAULT_NIGHT_QR;
  },

  /**
   * Actualiza el token QR activo (desde el panel administrativo)
   */
  setActiveQrToken(token: string): void {
    localStorage.setItem(QR_ACTIVE_TOKEN_KEY, token);
  },

  /**
   * Genera un nuevo código QR dinámico para el evento
   */
  generateNewNightQr(eventId: string): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const newToken = `CACHE-QR-${eventId.slice(-4).toUpperCase()}-${timestamp}`;
    this.setActiveQrToken(newToken);
    return newToken;
  },

  /**
   * Obtiene el estado guardado de presencia del usuario para la sesión actual
   */
  getStoredPresence(): PresenceStatus {
    try {
      const stored = localStorage.getItem(PRESENCE_CACHE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error parsing cached presence', e);
    }
    return {
      isInside: false,
    };
  },

  /**
   * Guarda el estado de presencia en almacenamiento local
   */
  saveStoredPresence(status: PresenceStatus): void {
    try {
      localStorage.setItem(PRESENCE_CACHE_KEY, JSON.stringify(status));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cachengueoo_presence_change', { detail: status }));
      }
    } catch (e) {
      console.error('Error saving presence state', e);
    }
  },

  /**
   * Limpia el estado de presencia (para simular salir del boliche o testing)
   */
  clearPresence(): void {
    localStorage.removeItem(PRESENCE_CACHE_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cachengueoo_presence_change', { detail: { isInside: false } }));
    }
  },

  /**
   * Evalúa la regla de validación configurada para el evento actual
   */
  evaluateValidationRule(
    gpsValid: boolean,
    qrValid: boolean,
    mode: ValidationMode = 'GPS_OR_QR'
  ): boolean {
    switch (mode) {
      case 'GPS_ONLY':
        return gpsValid;
      case 'QR_ONLY':
        return qrValid;
      case 'GPS_AND_QR':
        return gpsValid && qrValid;
      case 'GPS_OR_QR':
      default:
        return gpsValid || qrValid;
    }
  },

  /**
   * MÉTODO A — Geolocalización Real usando navigator.geolocation
   */
  async checkRealGeolocation(): Promise<GeolocationValidationResult> {
    if (!navigator.geolocation) {
      throw new Error('La geolocalización no está soportada por este navegador.');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const venue = getVenueConfig();
          const result = validateVenuePresence(latitude, longitude, accuracy, venue);
          resolve(result);
        },
        (error) => {
          let msg = 'No se pudo obtener la ubicación GPS.';
          if (error.code === error.PERMISSION_DENIED) {
            msg = 'Permiso de ubicación denegado. Podés validar tu presencia escaneando el QR del boliche.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            msg = 'Señal de GPS no disponible en este momento.';
          } else if (error.code === error.TIMEOUT) {
            msg = 'Tiempo de espera de GPS agotado.';
          }
          reject(new Error(msg));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        }
      );
    });
  },

  /**
   * MÉTODO B — Validación de Presencia vía Código QR del evento
   */
  validateQrCode(scannedToken: string): { success: boolean; message: string } {
    const cleanToken = scannedToken.trim();
    const activeToken = this.getActiveQrToken();

    // Permite el token activo o tokens que sigan el patrón oficial de Cachengueoo
    const isValid =
      cleanToken === activeToken ||
      cleanToken.startsWith('CACHE-NIGHT') ||
      cleanToken.startsWith('CACHE-QR');

    if (isValid) {
      const current = this.getStoredPresence();
      const updated: PresenceStatus = {
        ...current,
        isInside: true,
        methodUsed: 'QR',
        qrVerified: true,
        validatedAt: new Date().toISOString(),
      };
      this.saveStoredPresence(updated);
      return {
        success: true,
        message: '¡Presencia validada con éxito mediante QR! Bienvenido a Cachengueoo 🔥',
      };
    }

    return {
      success: false,
      message: 'Código QR no válido o expirado para esta noche.',
    };
  },

  /**
   * MODO SIMULACIÓN PARA DESARROLLO Y TESTING:
   * Permite a los usuarios y evaluadores probar la experiencia dentro y fuera del boliche
   * sin requerir estar físicamente en Mendoza.
   */
  setSimulatedPresence(isInside: boolean, method: PresenceMethod = 'GPS'): PresenceStatus {
    const venue = getVenueConfig();
    const state: PresenceStatus = isInside
      ? {
          isInside: true,
          methodUsed: method,
          simulated: true,
          qrVerified: method === 'QR',
          gpsVerified: method === 'GPS',
          validatedAt: new Date().toISOString(),
          gpsResult: {
            isInside: true,
            distanceMeters: 25,
            accuracyMeters: 12,
            isAccuracyAcceptable: true,
            message: '¡Estás en Cachengueoo! 🔥 (Modo Simulación Activo)',
          },
        }
      : {
          isInside: false,
          simulated: true,
          qrVerified: false,
          gpsVerified: false,
          validatedAt: new Date().toISOString(),
          gpsResult: {
            isInside: false,
            distanceMeters: 3850,
            accuracyMeters: 15,
            isAccuracyAcceptable: true,
            message: `No estás dentro de Cachengueoo (${venue.city}, ${venue.province}).`,
          },
        };

    this.saveStoredPresence(state);
    return state;
  },

  /**
   * Registra la presencia en el historial de eventos
   */
  logPresenceRecord(userId: string, eventId: string, method: PresenceMethod): PresenceRecord {
    return {
      id: `pres_${Date.now()}`,
      userId,
      eventId,
      validatedAt: new Date().toISOString(),
      method,
      isValid: true,
    };
  },
};
