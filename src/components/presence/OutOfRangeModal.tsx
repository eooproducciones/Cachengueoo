import React from 'react';
import { X, Navigation, QrCode, AlertCircle, RefreshCw, MapPin } from 'lucide-react';

export interface OutOfRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetryGps: () => void;
  distanceMeters?: number;
  radiusMeters?: number;
  closestLocationName?: string;
  isChecking?: boolean;
  customMessage?: string;
}

export const OutOfRangeModal: React.FC<OutOfRangeModalProps> = ({
  isOpen,
  onClose,
  onRetryGps,
  distanceMeters,
  radiusMeters = 150,
  closestLocationName = 'Cachengueoo Boliche',
  isChecking = false,
  customMessage,
}) => {
  if (!isOpen) return null;

  const formattedDistance =
    distanceMeters !== undefined && distanceMeters > 0
      ? distanceMeters >= 1000
        ? `${(distanceMeters / 1000).toFixed(1)} km`
        : `${Math.round(distanceMeters)} metros`
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#121217] border border-red-500/30 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative flex flex-col text-center p-6 space-y-5 animate-in zoom-in-95 duration-200">
        {/* Botón cerrar X */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icono de advertencia llamativo con aura */}
        <div className="relative mx-auto mt-1">
          <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-red-600/30 via-rose-500/20 to-[#F39200]/20 border-2 border-red-500/60 flex items-center justify-center shadow-xl shadow-red-500/20 animate-pulse">
            <span className="text-3xl sm:text-4xl select-none">📍</span>
          </div>
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-red-500 border-2 border-[#121217] flex items-center justify-center text-white text-[11px] font-bold">
            ✕
          </span>
        </div>

        {/* TÍTULO EXACTO SOLICITADO POR EL USUARIO */}
        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-wider">
            <AlertCircle className="w-3 h-3" />
            Fuera de cobertura
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white font-display uppercase tracking-tight">
            OUCH! No estas dentro de Cache
          </h2>
          <p className="text-xs text-zinc-300 max-w-sm mx-auto leading-relaxed">
            {customMessage ||
              'Cachengueoo Match es exclusivo para quienes están viviendo la noche en el boliche. Para ingresar tenés que encontrarte dentro del perímetro permitido mediante GPS.'}
          </p>
        </div>

        {/* Caja de métricas de ubicación si están disponibles */}
        <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-2 text-xs text-left">
          <div className="flex items-center justify-between py-1 border-b border-zinc-900 text-zinc-400">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#F39200]" />
              Sede de referencia:
            </span>
            <span className="font-bold text-white truncate max-w-[170px]">
              {closestLocationName}
            </span>
          </div>

          {formattedDistance && (
            <div className="flex items-center justify-between py-1 border-b border-zinc-900 text-zinc-400">
              <span>Tu distancia calculada:</span>
              <span className="font-mono font-bold text-red-400">
                {formattedDistance}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between py-1 text-zinc-400">
            <span>Radio de cobertura permitido:</span>
            <span className="font-mono font-bold text-emerald-400">
              {radiusMeters} metros
            </span>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={onRetryGps}
            disabled={isChecking}
            className="w-full h-12 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#F39200]/25 transition-all disabled:opacity-60"
          >
            {isChecking ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Comprobando GPS en tiempo real...</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4" />
                <span>Reintentar comprobación GPS</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full h-9 rounded-xl text-zinc-400 hover:text-white text-xs font-medium cursor-pointer transition-colors"
          >
            Cerrar y volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
};
