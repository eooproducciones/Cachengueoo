import React, { useState, useEffect } from 'react';
import { X, MapPin, Navigation, Sparkles, RefreshCw, AlertTriangle } from 'lucide-react';
import { PresenceStatus } from '../../services/presenceService';
import { VenueConfig } from '../../types';

interface PresenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  presence: PresenceStatus;
  venueConfig: VenueConfig;
  onCheckGps: () => Promise<void>;
  isChecking: boolean;
  errorMessage: string | null;
  onSimulatePresence?: (isInside: boolean, method?: 'GPS') => void;
  onResetPresence?: () => void;
}

export const PresenceModal: React.FC<PresenceModalProps> = ({
  isOpen,
  onClose,
  presence,
  venueConfig,
  onCheckGps,
  isChecking,
  errorMessage,
}) => {
  // Al abrir el modal, comprobar automáticamente por GPS
  useEffect(() => {
    if (isOpen && !presence.isInside && !isChecking) {
      onCheckGps();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#121217] border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-700/60 flex items-center justify-center text-[#F39200]">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-display">Validación GPS</h2>
              <p className="text-xs text-zinc-400">
                {venueConfig.locations && venueConfig.locations.length > 1
                  ? `${venueConfig.locations.filter((l) => l.isActive).length} sedes habilitadas (Sede Central / Arena Maipú)`
                  : `${venueConfig.name} · ${venueConfig.city}, ${venueConfig.province}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Main Status Display */}
          <div
            className={`p-5 rounded-2xl border text-center transition-all ${
              presence.isInside
                ? 'bg-emerald-950/30 border-emerald-500/40'
                : 'bg-zinc-900/60 border-zinc-800'
            }`}
          >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3 bg-zinc-900/80 border border-zinc-700/50">
              {presence.isInside ? (
                <span className="text-3xl">🔥</span>
              ) : isChecking ? (
                <RefreshCw className="w-7 h-7 text-[#F39200] animate-spin" />
              ) : (
                <Navigation className="w-7 h-7 text-zinc-400" />
              )}
            </div>

            <h3 className="text-lg font-bold text-white font-display">
              {isChecking
                ? 'Buscando tu ubicación...'
                : presence.isInside
                ? presence.gpsResult?.matchedLocationName
                  ? `¡Estás en ${presence.gpsResult.matchedLocationName}! 🔥`
                  : '¡Estás en Cachengueoo! 🔥'
                : 'OUCH! No estás dentro de Cache'}
            </h3>

            <p className="text-xs text-zinc-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
              {presence.isInside
                ? `Ubicación GPS confirmada dentro del perímetro permitido${
                    presence.gpsResult?.matchedLocationName
                      ? ` (${presence.gpsResult.matchedLocationName})`
                      : ''
                  }.`
                : 'Para participar en Cachengueoo Match, debés encontrarte físicamente en una de las sedes habilitadas comprobando tu GPS.'}
            </p>

            {/* GPS Metadata readout if available */}
            {presence.gpsResult && (
              <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-around text-[11px] text-zinc-400">
                <div>
                  <span className="text-zinc-500 block">Distancia</span>
                  <span className="font-semibold text-zinc-200">
                    {presence.gpsResult.distanceMeters} m
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Radio permitido</span>
                  <span className="font-semibold text-zinc-200">
                    {venueConfig.radiusMeters} m
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Precisión GPS</span>
                  <span className="font-semibold text-zinc-200">
                    ±{presence.gpsResult.accuracyMeters} m
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Error notice if GPS failed */}
          {errorMessage && (
            <div className="bg-amber-950/30 border border-amber-600/40 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-300">Aviso de ubicación:</p>
                <p className="text-zinc-300 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Action button */}
          <div className="pt-1">
            <button
              onClick={onCheckGps}
              disabled={isChecking}
              className="w-full h-12 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-extrabold text-sm flex items-center justify-center gap-2 active:scale-[0.99] transition-all cursor-pointer shadow-lg shadow-[#F39200]/20 disabled:opacity-50"
            >
              <Navigation className="w-4 h-4 fill-black" />
              {isChecking ? 'Verificando señal GPS...' : 'Comprobar presencia vía GPS'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

