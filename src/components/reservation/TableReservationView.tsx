import React, { useState, useEffect } from 'react';
import {
  Users,
  Mail,
  Calendar,
  CheckCircle2,
  Sparkles,
  Pizza,
  Wine,
  Instagram,
  Clock,
  MessageCircle,
  GlassWater,
  PartyPopper,
} from 'lucide-react';
import { UserProfile } from '../../types';

interface TableReservationViewProps {
  currentUser: UserProfile | null;
}

export const TableReservationView: React.FC<TableReservationViewProps> = ({ currentUser }) => {
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [whatsappSentUrl, setWhatsappSentUrl] = useState('');
  const [formData, setFormData] = useState({
    name: currentUser?.fullName || '',
    instagram: currentUser?.instagram ? currentUser.instagram.replace(/^@/, '') : '',
    date: '2026-10-17',
    guestCount: 10,
    email: currentUser?.email || '',
  });

  // Asegura que al entrar la pantalla siempre comience desde arriba de todo
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.body.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  const buildWhatsAppMessage = () => {
    const igHandle = formData.instagram.trim()
      ? formData.instagram.startsWith('@')
        ? formData.instagram.trim()
        : `@${formData.instagram.trim()}`
      : 'No especificado';

    return `Hola! Quiero hacer una reserva.

👥 Mínimo: 5 personas
🍕 1 pizza cada 5 personas (máximo 4)
🍾 1 combo a elección
🍷 Degustación de vinos: 23:00 a 00:00 hs
💰 Valor: $15.000 por persona

🕙 Viernes: apertura 22:00 hs
🕘 Sábados: apertura 21:00 hs
🎟️ QR válido hasta las 23:30 hs. Luego de ese horario se abona diferencia en taquilla.

Mujeres +23 | Hombres +25 | General menores de 45 años

📲 Mis datos:
•  Nombre: ${formData.name.trim()}
•  Instagram: ${igHandle}
•  Fecha: ${formData.date}
•  Somos: ${formData.guestCount} personas
•  Mail: ${formData.email.trim()}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const msg = buildWhatsAppMessage();
    const waUrl = `https://wa.me/5492615651192?text=${encodeURIComponent(msg)}`;
    setWhatsappSentUrl(waUrl);
    setSubmittedSuccess(true);

    try {
      window.open(waUrl, '_blank');
    } catch (err) {
      console.warn('Popup blocked, using direct button in UI', err);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-4 space-y-5">
      {/* HERO HEADER */}
      <div className="bg-[#121217] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <Wine className="w-5 h-5 text-[#F39200]" />
          <span className="text-[10px] uppercase font-bold text-[#F39200] tracking-widest">
            ESPACIO VIP & AMIGOS
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white font-display uppercase tracking-tight">
          RESERVÁ TU MESA EN <span className="text-[#F39200]">CACHE</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-1 max-w-md leading-relaxed">
          Asegurá tu lugar con tu grupo de amigos. ¡Pueden invitar la cantidad de personas que quieran!
        </p>
      </div>

      {/* BENEFICIOS Y PAQUETE DE RESERVA */}
      <div className="bg-[#121217] border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#F39200]" />
            Todo lo que incluye tu reserva
          </h3>
          <span className="px-2.5 py-1 rounded-full bg-[#F39200]/10 border border-[#F39200]/40 text-[#F39200] text-[11px] font-black">
            $15.000 / persona
          </span>
        </div>

        {/* Grid de beneficios sin cumpleañero ni champagne */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F39200]/10 text-[#F39200] flex items-center justify-center shrink-0 border border-[#F39200]/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Mínimo: 5 personas</p>
              <p className="text-[10px] text-zinc-400">Invitá a todos los que quieras sin límite.</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-950/40 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
              <Pizza className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">1 pizza cada 5 personas</p>
              <p className="text-[10px] text-zinc-400">Pizzas caseras al horno (máximo 4).</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-950/40 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
              <GlassWater className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">1 combo a elección</p>
              <p className="text-[10px] text-zinc-400">Botella + gaseosas para el grupo.</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-950/40 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
              <Wine className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Degustación de vinos</p>
              <p className="text-[10px] text-zinc-400">De 23:00 a 00:00 hs en el sector lounge.</p>
            </div>
          </div>
        </div>

        {/* Horarios y Condiciones */}
        <div className="mt-4 pt-4 border-t border-zinc-800/80 space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800/80 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#F39200] shrink-0" />
              <div>
                <p className="font-bold text-white">Viernes</p>
                <p className="text-zinc-400">Apertura 22:00 hs</p>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800/80 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#F39200] shrink-0" />
              <div>
                <p className="font-bold text-white">Sábados</p>
                <p className="text-zinc-400">Apertura 21:00 hs</p>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
            <p className="flex items-center gap-1.5 text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F39200]"></span>
              <strong>QR de ingreso válido hasta las 23:30 hs.</strong> Luego de ese horario se abona diferencia en taquilla.
            </p>
            <p className="flex items-center gap-1.5 text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600"></span>
              Admisión: Mujeres +23 · Hombres +25 · General menores de 45 años.
            </p>
          </div>
        </div>
      </div>

      {/* FORMULARIO DE SOLICITUD DE RESERVA */}
      <div className="bg-[#121217] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl">
        <h3 className="text-base font-bold text-white font-display mb-1">
          Solicitud de Reserva de Mesa
        </h3>
        <p className="text-xs text-zinc-400 mb-4">
          Completá tus datos para enviar tu solicitud directamente a nuestro WhatsApp oficial de RRPP.
        </p>

        {submittedSuccess ? (
          <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <div className="space-y-1">
              <h4 className="text-base font-bold text-white font-display">
                ¡Solicitud Lista para Enviar!
              </h4>
              <p className="text-xs text-zinc-300 leading-relaxed max-w-sm mx-auto">
                Tu mensaje ya fue preparado con todos tus datos. Hacé clic abajo para abrir la conversación en WhatsApp con el equipo de RRPP de Cachengueoo (+54 9 261 565-1192).
              </p>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 text-left text-xs space-y-1 max-w-sm mx-auto">
              <p className="text-zinc-400">
                • <strong className="text-white">Nombre:</strong> {formData.name}
              </p>
              <p className="text-zinc-400">
                • <strong className="text-white">Instagram:</strong> @{formData.instagram.replace(/^@/, '')}
              </p>
              <p className="text-zinc-400">
                • <strong className="text-white">Fecha:</strong> {formData.date}
              </p>
              <p className="text-zinc-400">
                • <strong className="text-white">Somos:</strong> {formData.guestCount} personas
              </p>
              <p className="text-zinc-400">
                • <strong className="text-white">Mail:</strong> {formData.email}
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2 max-w-sm mx-auto">
              <a
                href={whatsappSentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-emerald-900/30"
              >
                <MessageCircle className="w-4 h-4 fill-white text-emerald-600" />
                Abrir WhatsApp (+54 9 261 565-1192)
              </a>
              <button
                type="button"
                onClick={() => setSubmittedSuccess(false)}
                className="w-full h-10 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white cursor-pointer"
              >
                Modificar datos o cargar otra solicitud
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* 1. NOMBRE */}
            <div>
              <label className="text-zinc-400 block mb-1 font-semibold">
                • Nombre:
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Tu nombre completo"
                className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-[#F39200]"
              />
            </div>

            {/* 2. INSTAGRAM */}
            <div>
              <label className="text-zinc-400 block mb-1 font-semibold flex items-center gap-1.5">
                <Instagram className="w-3.5 h-3.5 text-[#F39200]" />
                • Instagram:
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-semibold">
                  @
                </span>
                <input
                  type="text"
                  required
                  value={formData.instagram}
                  onChange={(e) =>
                    setFormData({ ...formData, instagram: e.target.value.replace(/^@/, '') })
                  }
                  placeholder="usuario"
                  className="w-full h-11 pl-8 pr-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-[#F39200]"
                />
              </div>
            </div>

            {/* 3. FECHA Y 4. CANTIDAD DE PERSONAS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-400 block mb-1 font-semibold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#F39200]" />
                  • Fecha:
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-[#F39200]"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 font-semibold flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#F39200]" />
                  • Cantidad de personas:
                </label>
                <input
                  type="number"
                  min="5"
                  max="150"
                  required
                  value={formData.guestCount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      guestCount: parseInt(e.target.value) || 5,
                    })
                  }
                  placeholder="Mínimo 5 personas"
                  className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-[#F39200]"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Mínimo 5 personas · Sin límite máximo
                </span>
              </div>
            </div>

            {/* 5. MAIL */}
            <div>
              <label className="text-zinc-400 block mb-1 font-semibold flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#F39200]" />
                • Mail:
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="ejemplo@email.com"
                className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-[#F39200]"
              />
            </div>

            {/* BOTÓN ENVIAR SOLICITUD DE RESERVA */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full h-12 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-[#F39200]/25 active:scale-[0.99]"
              >
                <MessageCircle className="w-4 h-4 fill-black" />
                Enviar Solicitud de Reserva
              </button>
              <p className="text-[10px] text-zinc-500 text-center mt-2">
                Se abrirá WhatsApp (+54 9 261 565-1192) con tu solicitud armada automáticamente.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
