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
import { isEventToday, isEventPast } from '../../services/eventService';
import { getActiveRPAttribution, logRPActivity } from '../../services/rpService';

interface HomeViewProps {
  currentUser: UserProfile | null;
  presence: PresenceStatus;
  tonightEvent?: ClubEvent | null;
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
      {/* SECTION 1: HERO CACHENGUEOO MATCH (Simple, directo y con botón titilando que invita a tocarlo) */}
      <div className="bg-[#121217] border border-[#F39200]/30 hover:border-[#F39200]/60 rounded-3xl p-5 shadow-2xl relative overflow-hidden transition-all">
        {/* Glow de fondo ambiental */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#F39200]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-2">
          {Boolean(currentUser) && presence.isInside ? (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              ESTÁS EN CACHENGUEOO 🔥
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-black tracking-wider uppercase text-amber-300 bg-amber-950/50 px-3 py-1 rounded-full border border-amber-500/30">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              EN VIVO EN LA PISTA 🔥
            </span>
          )}
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Cachengueoo Mendoza</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-white font-display uppercase tracking-tight mt-1">
          CONECTÁ CON QUIÉN ESTÁ <span className="text-[#F39200]">ESTA NOCHE</span>
        </h2>
        <p className="text-xs text-zinc-300 mt-1 max-w-sm leading-relaxed">
          Mirá los perfiles de la gente en el boliche, hacé match en tiempo real y compartan una copa.
        </p>

        {/* Botón de Match Titilando y Luminoso */}
        <div className="mt-4 relative group">
          {/* Halos de luz titilante expansivos */}
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-amber-500 via-[#F39200] to-rose-500 opacity-70 blur-md group-hover:opacity-100 animate-pulse transition duration-500 pointer-events-none" />
          <div className="absolute -inset-0.5 rounded-2xl bg-white/20 blur-sm animate-ping opacity-40 pointer-events-none" />

          <button
            onClick={onActivateMatch || (() => onNavigateTab('match'))}
            className="relative w-full h-13 rounded-2xl bg-gradient-to-r from-[#EA580C] via-[#F39200] to-[#FBBF24] hover:brightness-110 text-black font-black text-xs sm:text-sm uppercase tracking-wide flex items-center justify-center gap-2.5 cursor-pointer shadow-xl shadow-[#F39200]/30 active:scale-[0.98] transition-all overflow-hidden"
          >
            {/* Destello de luz pasando */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
            
            <Flame className="w-5 h-5 fill-black stroke-black animate-pulse" />
            <span>ENTRAR A MATCH</span>
            <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full font-bold">EN VIVO</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: PRÓXIMAS FECHAS */}
      {(() => {
        // Solo mostrar eventos que realmente existan (cargados en admin) y que NO hayan pasado
        const validUpcoming = (upcomingEvents || []).filter((e) => !isEventPast(e));
        const validTonight = tonightEvent && isEventToday(tonightEvent) && !isEventPast(tonightEvent) ? tonightEvent : null;

        const allList = validUpcoming.length > 0
          ? validUpcoming
          : (validTonight && validTonight.id && validTonight.title ? [validTonight] : []);

        // 1. Detectar si hay evento de hoy (por fecha actual del día)
        const todayEvt = allList.find((e) => isEventToday(e));

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
          const aIsToday = isEventToday(a);
          const bIsToday = isEventToday(b);
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
                          {(() => {
                            const activeRP = getActiveRPAttribution();
                            const passlineLink =
                              (activeRP?.eventLinks && activeRP.eventLinks[evt.id]) ||
                              evt.passlineUrl ||
                              'https://www.passline.com';

                            return (
                              <a
                                href={passlineLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => {
                                  if (activeRP) {
                                    logRPActivity(activeRP.rpId, 'ticket_click', evt.id);
                                  }
                                }}
                                className="w-full h-11 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md shadow-[#F39200]/20 active:scale-[0.99]"
                              >
                                <Ticket className="w-4 h-4" />
                                Comprar entrada
                              </a>
                            );
                          })()}
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
