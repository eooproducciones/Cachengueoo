import { useState, useEffect, useCallback } from 'react';
import { presenceService, PresenceStatus } from '../services/presenceService';
import { eventService } from '../services/eventService';
import { getVenueConfig } from '../config/venue';
import { PresenceMethod, VenueConfig } from '../types';

export function usePresence() {
  const [presence, setPresence] = useState<PresenceStatus>(() => presenceService.getStoredPresence());
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [venueConfig, setVenueConfig] = useState<VenueConfig>(() => getVenueConfig());
  const currentEvent = eventService.getActiveTonightEvent();

  // Escuchar actualizaciones de locaciones y perímetro geográfico
  useEffect(() => {
    const handleVenueChange = () => {
      setVenueConfig(getVenueConfig());
    };
    window.addEventListener('cachengueoo_venue_change', handleVenueChange);
    window.addEventListener('storage', handleVenueChange);
    return () => {
      window.removeEventListener('cachengueoo_venue_change', handleVenueChange);
      window.removeEventListener('storage', handleVenueChange);
    };
  }, []);

  // Comprueba la presencia real mediante GPS
  const checkGpsPresence = useCallback(async () => {
    setIsChecking(true);
    setErrorMessage(null);

    try {
      const gpsResult = await presenceService.checkRealGeolocation();
      const current = presenceService.getStoredPresence();

      const isInside = presenceService.evaluateValidationRule(
        gpsResult.isInside,
        Boolean(current.qrVerified),
        currentEvent.validationMode
      );

      const updated: PresenceStatus = {
        ...current,
        isInside,
        methodUsed: 'GPS',
        gpsResult,
        gpsVerified: gpsResult.isInside,
        validatedAt: new Date().toISOString(),
      };

      presenceService.saveStoredPresence(updated);
      setPresence(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al verificar GPS';
      setErrorMessage(msg);
    } finally {
      setIsChecking(false);
    }
  }, [currentEvent.validationMode]);

  // Valida código QR
  const validateQr = useCallback((qrToken: string) => {
    const result = presenceService.validateQrCode(qrToken);
    if (result.success) {
      setPresence(presenceService.getStoredPresence());
    }
    return result;
  }, []);

  // Simular presencia para pruebas
  const simulatePresence = useCallback((isInside: boolean, method: PresenceMethod = 'GPS') => {
    const newState = presenceService.setSimulatedPresence(isInside, method);
    setPresence(newState);
  }, []);

  // Limpiar presencia
  const resetPresence = useCallback(() => {
    presenceService.clearPresence();
    setPresence({ isInside: false });
  }, []);

  // Verificación periódica cada 3 minutos si está activo
  useEffect(() => {
    if (!presence.simulated && presence.isInside) {
      const interval = setInterval(() => {
        checkGpsPresence();
      }, 3 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [presence.isInside, presence.simulated, checkGpsPresence]);

  return {
    presence,
    isInside: presence.isInside,
    isChecking,
    errorMessage,
    venueConfig,
    currentEvent,
    checkGpsPresence,
    validateQr,
    simulatePresence,
    resetPresence,
  };
}
