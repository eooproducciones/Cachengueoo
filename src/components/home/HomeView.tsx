import React from 'react';
import {
  Flame,
  Ticket,
  Calendar,
  MapPin,
  QrCode,
  Crown,
  Cake,
  Wine,
} from 'lucide-react';
import { ClubBenefit, ClubEvent, UserProfile } from '../../types';
import { PresenceStatus } from '../../services/presenceService';
import { isEventToday } from '../../services/eventService';

interface HomeViewProps {
  currentUser: UserProfile | null;
  presence: PresenceStatus;
  tonightEvent: ClubEvent;
  upcomingEvents?: ClubEvent[];
  benefits?: ClubBenefit[];
  onNavigateTab: (tab: string) => void;
  onOpenPresenceModal: () => void;
  onOpenQrScanner: () => void;
  onActivateMatch?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  currentUser,
  presence,
  tonightEvent,
  upcomingEvents = [],
  benefits = [],
  onNavigateTab,
  onOpenPresenceModal,
  onOpenQrScanner,
  onActivateMatch,
}) => {
  return (
    <div className="max-w-xl mx-auto px-4 py-4 space-y-6">
      {/* SECTION 1: PRESENCE HERO BANNER */}
      {presence.isInside ? (
        /* DENTRO DE CACHENGUEOO -> MATCH CALL TO ACTION SOBRIO */
        <div className="bg-[#121217] border border-[#F39200]/40 rounded-3xl p-5 shadow-xl relative overflow-hidden animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              ESTÁS EN CACHENGUEOO 🔥
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white font-display uppercase tracking-tight mt-1">
            CONOCÉ QUIÉN ESTÁ <span className="text-[#F39200]">ESTA NOCHE</span>
          </h2>
          <p className="text-xs text-zinc-300 mt-1 max-w-sm leading-relaxed">
            Hay cientos de personas en el boliche ahora mismo. Mira sus perfiles en tiempo real, hace amigos y tomen algo.
          </p>

          <div className="mt-4">
            <button
              onClick={onActivateMatch || (() => onNavigateTab('match'))}
              className="w-full h-12 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#F39200]/25 active:scale-[0.98] transition-all"
            >
              <Flame className="w-4 h-4 fill-black" />
              ACTIVAR CACHENGUEOO MATCH
            </button>
          </div>
        </div>
      ) : (
        /* FUERA DE CACHENGUEOO -> VALIDACIÓN GPS O QR */
        <div className="bg-[#121217] border border-zinc-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#F39200] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#F39200]" />
              MENDOZA NIGHTLIFE
            </span>
            <span className="text-[10px] text-zinc-500">Mendoza · Argentina</span>
          </div>

          <h2 className="text-lg font-black text-white font-display uppercase tracking-tight">
            ¿LLEGASTE A <span className="text-[#F39200]">CACHENGUEOO</span>?
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm leading-relaxed">
            Validá tu presencia mediante GPS o escaneá el QR en puerta para desbloquear{' '}
            <strong className="text-white">Cachengueoo Match</strong> y conectar con gente esta noche.
          </p>

          <div className="mt-4 space-y-2">
            <button
              onClick={onActivateMatch || (() => onNavigateTab('match'))}
              className="w-full h-12 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#F39200]/25 active:scale-[0.98] transition-all"
            >
              <Flame className="w-4 h-4 fill-black" />
              ACTIVAR CACHENGUEOO MATCH
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onOpenPresenceModal}
                className="h-10 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <MapPin className="w-3.5 h-3.5 text-[#F39200]" />
                Validar por GPS
              </button>
              <button
                onClick={onOpenQrScanner}
                className="h-10 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-amber-400 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <QrCode className="w-3.5 h-3.5 text-[#F39200]" />
                Escanear QR Puerta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: PRÓXIMAS FECHAS */}
      {(() => {
        const allList = (upcomingEvents && upcomingEvents.length > 0)
          ? upcomingEvents
          : (tonightEvent ? [tonightEvent] : []);

        // 1. Detectar si hay evento de hoy (por fecha actual del día)
        const todayEvt = allList.find((e) => isEventToday(e) || e.isActiveTonight);

        // 2. Eventos marcados como destacados para el inicio
        const featuredList = allList.filter((e) => e.isFeatured);

        // 3. Combinar: el evento de hoy SIEMPRE va primero, más todas las fechas destacadas
        const eventsMap = new Map<string, ClubEvent>();
        if (todayEvt) {
          eventsMap.set(todayEvt.id, { ...todayEvt, isActiveTonight: true });
        }
        featuredList.forEach((evt) => {
          if (!eventsMap.has(evt.id)) {
            eventsMap.set(evt.id, evt);
          }
        });

        // Si no hay evento de hoy ni destacados, mostrar las primeras fechas próximas
        if (eventsMap.size === 0) {
          allList.slice(0, 3).forEach((evt) => {
            eventsMap.set(evt.id, evt);
          });
        }

        const displayEvents = Array.from(eventsMap.values()).sort((a, b) => {
          const aIsToday = a.isActiveTonight || isEventToday(a);
          const bIsToday = b.isActiveTonight || isEventToday(b);
          if (aIsToday && !bIsToday) return -1;
          if (!aIsToday && bIsToday) return 1;
          return (a.dateIso || '').localeCompare(b.dateIso || '');
        });

        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">
                Próximas fechas
              </h3>
            </div>

            <div className="space-y-4">
              {displayEvents.length === 0 ? (
                <div className="p-6 rounded-3xl bg-[#121217] border border-zinc-800 text-center space-y-2">
                  <Calendar className="w-8 h-8 text-zinc-600 mx-auto" />
                  <h4 className="text-sm font-bold text-white font-display">No hay eventos publicados por el momento</h4>
                  <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                    Pronto se anunciarán las próximas noches y fiestas de Cachengueoo.
                  </p>
                </div>
              ) : (
                displayEvents.map((evt) => {
                  const isToday = evt.isActiveTonight || isEventToday(evt);

                  return (
                    <div
                      key={evt.id}
                      className="bg-[#121217] border border-zinc-800 rounded-3xl overflow-hidden shadow-xl"
                    >
                      <div className="relative aspect-[16/9] w-full">
                        <img
                          src={evt.flyerUrl}
                          alt={evt.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#121217] via-black/30 to-transparent"></div>

                        <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-[#F39200] text-black font-black text-[10px] tracking-wider uppercase shadow-lg">
                          {isToday ? 'HOY EN CACHE 🔥' : 'FECHA DESTACADA ⭐'}
                        </div>

                        <div className="absolute bottom-3 left-4 right-4">
                          <h4 className="text-xl font-black text-white font-display uppercase tracking-tight">
                            {evt.title}
                          </h4>
                        </div>
                      </div>

                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between text-xs text-zinc-400">
                          <span className="flex items-center gap-1.5 font-medium text-zinc-200">
                            <Calendar className="w-3.5 h-3.5 text-[#F39200]" />
                            {evt.dateStr}
                          </span>
                          {evt.timeRange && (
                            <span className="text-zinc-400 text-[11px] font-mono">{evt.timeRange}</span>
                          )}
                        </div>

                        {/* Action button */}
                        <div className="pt-1">
                          <a
                            href={evt.passlineUrl || 'https://www.passline.com'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full h-11 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md shadow-[#F39200]/20 active:scale-[0.99]"
                          >
                            <Ticket className="w-4 h-4" />
                            Comprar entrada
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })()}

      {/* SECTION 3: SERVICIOS RÁPIDOS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. Club Cachengueoo */}
        <div
          onClick={() => onNavigateTab('membresia')}
          className="p-4 rounded-3xl bg-[#121217] border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer group flex sm:flex-col items-center sm:items-start gap-3.5 sm:gap-2.5"
        >
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
            <Crown className="w-5 h-5 text-[#F39200] group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-white font-display">Cachengueoo Club</h4>
            <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">Membresía mensual con entradas libres y VIP.</p>
          </div>
        </div>

        {/* 2. Festejá tu Cumple */}
        <div
          onClick={() => onNavigateTab('cumpleanos')}
          className="p-4 rounded-3xl bg-[#121217] border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer group flex sm:flex-col items-center sm:items-start gap-3.5 sm:gap-2.5"
        >
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
            <Cake className="w-5 h-5 text-[#F39200] group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-white font-display">Festejá tu cumple</h4>
            <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">Champagne gratis y lista para tus amigos.</p>
          </div>
        </div>

        {/* 3. Reservá tu mesa */}
        <div
          onClick={() => onNavigateTab('reserva_mesa')}
          className="p-4 rounded-3xl bg-[#121217] border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer group flex sm:flex-col items-center sm:items-start gap-3.5 sm:gap-2.5"
        >
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
            <Wine className="w-5 h-5 text-[#F39200] group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-white font-display">Reservá tu mesa</h4>
            <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">Livings VIP, botellas y atención preferencial.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
