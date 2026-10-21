import React, { useState } from 'react';
import { X, MapPin, QrCode, Navigation, Sparkles, RefreshCw, AlertTriangle } from 'lucide-react';
import { PresenceStatus } from '../../services/presenceService';
import { VenueConfig, ValidationMode } from '../../types';

interface PresenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  presence: PresenceStatus;
  venueConfig: VenueConfig;
  validationMode: ValidationMode;
  onCheckGps: () => Promise<void>;
  isChecking: boolean;
  errorMessage: string | null;
  onOpenQrScanner: () => void;
  onSimulatePresence: (isInside: boolean, method?: 'GPS' | 'QR') => void;
  onResetPresence: () => void;
}

export const PresenceModal: React.FC<PresenceModalProps> = ({
  isOpen,
  onClose,
  presence,
  venueConfig,
  validationMode,
  onCheckGps,
  isChecking,
  errorMessage,
  onOpenQrScanner,
  onSimulatePresence,
  onResetPresence,
}) => {
  const [showSimControls, setShowSimControls] = useState(true);

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
              <h2 className="text-base font-bold text-white font-display">Validación de Presencia</h2>
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
                : 'No estás dentro de una sede habilitada'}
            </h3>

            <p className="text-xs text-zinc-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
              {presence.isInside
                ? presence.methodUsed === 'QR'
                  ? 'Presencia verificada mediante escaneo de código QR en puerta.'
                  : `Ubicación GPS confirmada dentro del perímetro permitido${
                      presence.gpsResult?.matchedLocationName
                        ? ` (${presence.gpsResult.matchedLocationName})`
                        : ''
                    }.`
                : 'Para participar en Cachengueoo Match y beneficios exclusivos, debés encontrarte físicamente en una de las sedes habilitadas.'}
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
                  <span className="text-zinc-500 block">Radio fijado</span>
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

          {/* Validation Rules Indicator */}
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3.5 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="text-zinc-400 block font-medium">Modo de validación de hoy:</span>
              <span className="font-semibold text-white">
                {validationMode === 'GPS_OR_QR' && 'GPS o Código QR (Cualquiera)'}
                {validationMode === 'GPS_ONLY' && 'Sólo Geolocalización GPS'}
                {validationMode === 'QR_ONLY' && 'Sólo Código QR en puerta'}
                {validationMode === 'GPS_AND_QR' && 'Doble validación: GPS + QR'}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-zinc-300">
              {validationMode}
            </span>
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

          {/* Actions: Method A vs Method B */}
          <div className="space-y-2.5 pt-1">
            <button
              onClick={onCheckGps}
              disabled={isChecking}
              className="w-full h-12 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-white font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
            >
              <Navigation className="w-4 h-4 text-[#F39200]" />
              {isChecking ? 'Verificando señal GPS...' : 'Comprobar presencia vía GPS'}
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenQrScanner();
              }}
              className="w-full h-12 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.99] transition-all cursor-pointer shadow-lg shadow-[#F39200]/20"
            >
              <QrCode className="w-4 h-4" />
              Escanear QR de Presencia
            </button>
          </div>

          {/* Simulation & Testing Panel for Dev / Sandbox Preview */}
          <div className="pt-2 border-t border-zinc-800/80">
            <button
              onClick={() => setShowSimControls(!showSimControls)}
              className="flex items-center justify-between w-full text-xs font-semibold text-zinc-400 hover:text-zinc-200 cursor-pointer py-1"
            >
              <span className="flex items-center gap-1.5 text-zinc-300">
                <Sparkles className="w-3.5 h-3.5 text-[#F39200]" />
                Modo de Prueba / Sandbox
              </span>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider">
                {showSimControls ? 'Ocultar' : 'Mostrar'}
              </span>
            </button>

            {showSimControls && (
              <div className="mt-3 p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-2">
                <p className="text-[11px] text-zinc-400 leading-tight">
                  Herramienta de testing para probar la plataforma fuera de Mendoza:
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => {
                      onSimulatePresence(true, 'GPS');
                      onClose();
                    }}
                    className="h-9 rounded-lg bg-emerald-950/40 border border-emerald-600/50 text-emerald-400 text-xs font-semibold hover:bg-emerald-900/40 transition-colors cursor-pointer"
                  >
                    Simular ADENTRO 🔥
                  </button>
                  <button
                    onClick={() => {
                      onSimulatePresence(false);
                      onClose();
                    }}
                    className="h-9 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs font-semibold hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    Simular AFUERA 📍
                  </button>
                </div>
                {presence.isInside && (
                  <button
                    onClick={onResetPresence}
                    className="w-full text-center text-[10px] text-red-400 hover:underline pt-1 cursor-pointer block"
                  >
                    Reiniciar y salir del boliche
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
