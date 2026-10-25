import React, { useState } from 'react';
import {
  Ticket,
  Calendar,
  Clock,
  Music,
  ExternalLink,
  ShieldCheck,
  Mail,
  AlertCircle,
  X,
  HelpCircle,
  Inbox,
} from 'lucide-react';
import { ClubEvent, UserProfile } from '../../types';
import { eventService, isEventToday } from '../../services/eventService';

interface TicketsViewProps {
  currentUser: UserProfile | null;
}

export const TicketsView: React.FC<TicketsViewProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'events' | 'my-tickets'>('events');
  const [rawEvents, setRawEvents] = useState<ClubEvent[]>(() => eventService.getEvents());

  React.useEffect(() => {
    const handleEventsChange = () => setRawEvents(eventService.getEvents());
    window.addEventListener('cachengueoo_events_updated', handleEventsChange);
    window.addEventListener('storage', handleEventsChange);

    eventService.syncEventsFromSupabase().then(setRawEvents).catch(() => {});

    return () => {
      window.removeEventListener('cachengueoo_events_updated', handleEventsChange);
      window.removeEventListener('storage', handleEventsChange);
    };
  }, []);

  // Ordenar eventos estrictamente del más próximo al más lejano (fecha más cercana primero)
  const events = [...rawEvents].sort((a, b) => {
    const aIsToday = a.isActiveTonight || isEventToday(a);
    const bIsToday = b.isActiveTonight || isEventToday(b);

    if (aIsToday && !bIsToday) return -1;
    if (!aIsToday && bIsToday) return 1;

    const timeA = a.dateIso ? new Date(a.dateIso).getTime() : Infinity;
    const timeB = b.dateIso ? new Date(b.dateIso).getTime() : Infinity;

    if (timeA !== timeB) {
      return timeA - timeB;
    }

    return (a.dateIso || '').localeCompare(b.dateIso || '');
  });
  const [showPasslineModal, setShowPasslineModal] = useState(false);
  const [showMailClientSelector, setShowMailClientSelector] = useState(false);

  const handleSelectMyTickets = () => {
    setActiveTab('my-tickets');
    setShowPasslineModal(true);
  };

  const handleOpenEmail = () => {
    setShowMailClientSelector(true);
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-4 space-y-5">
      {/* Tab Switcher: Próximos Eventos vs Mis Entradas (sin el número) */}
      <div className="flex items-center gap-2 p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
        <button
          onClick={() => setActiveTab('events')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'events'
              ? 'bg-[#F39200] text-black shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          Próximos Eventos
        </button>
        <button
          onClick={handleSelectMyTickets}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'my-tickets'
              ? 'bg-[#F39200] text-black shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Ticket className="w-3.5 h-3.5" />
          Mis Entradas
        </button>
      </div>

      {/* TAB 1: PRÓXIMOS EVENTOS (COMPRA DIRECTA EN PASSLINE) */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          {events.length === 0 ? (
            <div className="p-8 rounded-3xl bg-[#121217] border border-zinc-800 text-center space-y-3">
              <Calendar className="w-10 h-10 text-zinc-600 mx-auto" />
              <h3 className="text-base font-bold text-white font-display">No hay eventos disponibles</h3>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
                Pronto anunciaremos las próximas noches y fiestas de Cachengueoo.
              </p>
            </div>
          ) : (
            events.map((event) => {
            const isToday = event.isActiveTonight || isEventToday(event);

            return (
              <div
                key={event.id}
                className="bg-[#121217] border border-zinc-800 rounded-3xl overflow-hidden shadow-xl"
              >
                {/* Event Cover Image */}
                <div className="relative aspect-[16/9] w-full overflow-hidden">
                  <img
                    src={event.flyerUrl}
                    alt={event.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#121217] via-black/40 to-transparent"></div>

                  {isToday ? (
                    <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-[#F39200] text-black font-extrabold text-[10px] uppercase tracking-wider shadow-lg">
                      HOY EN CACHENGUEOO 🔥
                    </div>
                  ) : event.isFeatured ? (
                    <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/90 text-black font-extrabold text-[10px] uppercase tracking-wider shadow-lg backdrop-blur-sm">
                      FECHA DESTACADA ⭐
                    </div>
                  ) : null}

                <div className="absolute bottom-3 left-4 right-4">
                  <h3 className="text-xl font-black text-white font-display uppercase tracking-tight">
                    {event.title}
                  </h3>
                </div>
              </div>

              {/* Event Details */}
              <div className="p-4 sm:p-5 space-y-3.5">
                {/* Fecha y Horario */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-zinc-300">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#F39200]" />
                    <span>{event.dateStr}</span>
                  </div>
                  {event.timeRange && (
                    <div className="flex items-center gap-1 text-zinc-400 font-mono text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-[#F39200]" />
                      <span>{event.timeRange}</span>
                    </div>
                  )}
                </div>

                {/* Lineup */}
                {event.djs && event.djs.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
                      <Music className="w-3 h-3 text-[#F39200]" />
                      Lineup:
                    </span>
                    {event.djs.map((dj, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-200 font-mono"
                      >
                        {dj}
                      </span>
                    ))}
                  </div>
                )}


                {/* Pasarela Passline / QR Oficial badge */}
                <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#F39200]" />
                    <span className="font-semibold text-zinc-300">
                      Pasarela Passline / QR Oficial
                    </span>
                  </span>
                  <span className="text-[10px] text-zinc-500">Ticketing Externo</span>
                </div>

                {/* Único botón: Comprar entradas hacia Passline */}
                <div className="pt-1">
                  <a
                    href={event.passlineUrl || 'https://www.passline.com'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-12 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-[#F39200]/20 active:scale-[0.99]"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Comprar entradas
                  </a>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  )}

      {/* TAB 2: MIS ENTRADAS (INFORMACIÓN Y ACCESO A PASSLINE / MAIL) */}
      {activeTab === 'my-tickets' && (
        <div className="space-y-4">
          <div className="p-6 sm:p-7 rounded-3xl bg-[#121217] border border-zinc-800 space-y-5 shadow-xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#F39200]/10 border border-[#F39200]/30 text-[#F39200] flex items-center justify-center mx-auto shadow-md">
              <Ticket className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-zinc-900 text-[#F39200] text-[10px] font-bold uppercase tracking-wider border border-zinc-800 inline-block">
                Servicio Tercerizado Passline
              </span>
              <h3 className="text-lg font-bold text-white font-display">
                ¿Dónde están mis entradas?
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed max-w-md mx-auto">
                Cachengueoo terceriza la venta y emisión de entradas a través de la plataforma de{' '}
                <strong className="text-white">Passline</strong>. Si realizaste compras, por favor revisá
                tu casilla de correo electrónico o ingresá directamente a tu perfil en Passline.
              </p>
              <p className="text-[11px] text-zinc-400 leading-relaxed max-w-md mx-auto pt-1">
                Si tuviste algún inconveniente o consulta con tu cobro o tus tickets, debés comunicarte
                directamente con el soporte oficial de Passline.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5 max-w-md mx-auto">
              <button
                type="button"
                onClick={handleOpenEmail}
                className="flex-1 h-12 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-[#F39200]/20 active:scale-95"
              >
                <Mail className="w-4 h-4" />
                Abrir mi mail
              </button>

              <a
                href="https://www.passline.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 h-12 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <ExternalLink className="w-4 h-4 text-[#F39200]" />
                Ir a Passline
              </a>
            </div>

            <div className="pt-4 border-t border-zinc-800/80 text-[11px] text-zinc-500">
              Cachengueoo queda exento del procesamiento de pagos y validación directa de transacciones realizadas en Passline.
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL: INFORMACIÓN PASSLINE AL ENTRAR A "MIS ENTRADAS" */}
      {showPasslineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative bg-[#121217] border border-zinc-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <button
              onClick={() => setShowPasslineModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F39200]/10 border border-[#F39200]/30 flex items-center justify-center text-[#F39200] shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#F39200] tracking-wider block">
                  AVISO IMPORTANTE
                </span>
                <h4 className="text-base font-bold text-white font-display">
                  Venta Tercerizada por Passline
                </h4>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-zinc-300 leading-relaxed bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800">
              <p>
                En <strong className="text-white">Cachengueoo</strong> tercerizamos la venta y emisión
                de todas las entradas oficiales a través de la plataforma de{' '}
                <strong className="text-white">Passline</strong>.
              </p>
              <p>
                Si realizaste compras, por favor <strong className="text-[#F39200]">revisá tu casilla de correo electrónico</strong> (incluyendo la carpeta de Correo no deseado / Spam) o ingresá con tu cuenta a Passline para descargar tus códigos QR de acceso.
              </p>
              <p className="text-zinc-400 text-[11px]">
                Ante cualquier inconveniente o consulta con la compra, debés comunicarte directamente con Passline.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowPasslineModal(false);
                  handleOpenEmail();
                }}
                className="w-full h-11 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-[#F39200]/20"
              >
                <Mail className="w-4 h-4" />
                Abrir mi mail
              </button>

              <div className="flex gap-2">
                <a
                  href="https://www.passline.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 h-10 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Ir a Passline
                </a>
                <button
                  type="button"
                  onClick={() => setShowPasslineModal(false)}
                  className="flex-1 h-10 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SELECTOR DE CLIENTE DE CORREO (GMAIL / OUTLOOK / APP PREDETERMINADA) */}
      {showMailClientSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative bg-[#121217] border border-zinc-800 rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Inbox className="w-5 h-5 text-[#F39200]" />
                <h4 className="text-base font-bold text-white font-display">Abrir mi Correo</h4>
              </div>
              <button
                onClick={() => setShowMailClientSelector(false)}
                className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Elegí cómo querés revisar tus entradas de Passline:
            </p>

            <div className="space-y-2">
              <a
                href="https://mail.google.com/mail/u/0/#search/passline"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowMailClientSelector(false)}
                className="w-full p-3 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-[#F39200]/50 flex items-center justify-between text-xs text-white cursor-pointer transition-colors"
              >
                <span className="font-semibold flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                  Gmail (Buscar "Passline")
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
              </a>

              <a
                href="https://outlook.live.com/mail/0/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowMailClientSelector(false)}
                className="w-full p-3 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-[#F39200]/50 flex items-center justify-between text-xs text-white cursor-pointer transition-colors"
              >
                <span className="font-semibold flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  Outlook / Hotmail
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
              </a>

              <a
                href="mailto:"
                onClick={() => setShowMailClientSelector(false)}
                className="w-full p-3 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-[#F39200]/50 flex items-center justify-between text-xs text-white cursor-pointer transition-colors"
              >
                <span className="font-semibold flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F39200]"></span>
                  Aplicación de Correo del Celular
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
              </a>
            </div>

            <button
              type="button"
              onClick={() => setShowMailClientSelector(false)}
              className="w-full h-10 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-semibold cursor-pointer"
            >
              Volver
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
