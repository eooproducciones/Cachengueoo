import React, { useState, useEffect } from 'react';
import {
  Link as LinkIcon,
  Copy,
  Check,
  ExternalLink,
  Share2,
  Calendar,
  Ticket,
  MessageCircle,
  Instagram,
  Sparkles,
  TrendingUp,
  Save,
  AlertCircle,
  Eye,
  Wine,
  Cake,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { RPProfile, ClubEvent, UserProfile } from '../../types';
import {
  getRPProfileByUserId,
  updateRPProfile,
  getRPEventLinks,
  saveRPEventLink,
  getRPAnalytics,
  RPAnalyticsSummary,
  sanitizeSlug,
  isValidSlug,
  sanitizeWhatsApp
} from '../../services/rpService';
import { eventService } from '../../services/eventService';

interface RPProfileSectionProps {
  currentUser: UserProfile;
  onRefreshUser?: () => void;
}

export const RPProfileSection: React.FC<RPProfileSectionProps> = ({
  currentUser,
  onRefreshUser,
}) => {
  const [rpProfile, setRpProfile] = useState<RPProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [publicName, setPublicName] = useState('');
  const [slug, setSlug] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [instagram, setInstagram] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // Link copy state
  const [hasCopiedLink, setHasCopiedLink] = useState(false);

  // Events & RP Links
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [eventLinks, setEventLinks] = useState<Record<string, string>>({});
  const [savingEventId, setSavingEventId] = useState<string | null>(null);
  const [eventSuccessMsg, setEventSuccessMsg] = useState<Record<string, boolean>>({});

  // Analytics
  const [analytics, setAnalytics] = useState<RPAnalyticsSummary>({
    rpId: '',
    totalVisits: 0,
    ticketClicks: 0,
    birthdayClicks: 0,
    reservationClicks: 0,
    totalActions: 0,
  });

  // Load initial data
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setIsLoading(true);
      try {
        const profile = await getRPProfileByUserId(currentUser.id);
        if (!mounted) return;

        if (profile) {
          setRpProfile(profile);
          setPublicName(profile.publicName);
          setSlug(profile.slug);
          setWhatsapp(profile.whatsapp);
          setInstagram(profile.instagram || '');

          // Load RP event links
          const links = await getRPEventLinks(profile.id);
          if (mounted) setEventLinks(links);

          // Load analytics
          const stats = await getRPAnalytics(profile.id);
          if (mounted) setAnalytics(stats);
        } else {
          // Fallback if not yet initialized
          const defaultSlug = sanitizeSlug(currentUser.fullName || 'rp');
          setPublicName(currentUser.fullName || 'Promotor Oficial');
          setSlug(defaultSlug);
          setWhatsapp(currentUser.phone || '');
          setInstagram(currentUser.instagram?.replace(/^@/, '') || '');
        }

        // Load active events
        const allEvents = eventService.getEvents();
        // Solo eventos habilitados para promoción (isAvailableForRp !== false)
        const rpEvents = allEvents.filter(e => e.isAvailableForRp !== false);
        if (mounted) setEvents(rpEvents);
      } catch (err) {
        console.error('Error loading RP profile data:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [currentUser]);

  // Compute public vanity URL
  const baseUrl = window.location.origin;
  const affiliateUrl = `${baseUrl}/${slug || 'tu-slug'}`;

  const handleCopyLink = () => {
    if (!slug) return;
    navigator.clipboard.writeText(affiliateUrl);
    setHasCopiedLink(true);
    setTimeout(() => setHasCopiedLink(false), 2500);
  };

  const handleShareWhatsApp = () => {
    if (!slug) return;
    const text = encodeURIComponent(
      `¡Hola! Sacá tus entradas para Cachengueoo desde mi enlace oficial: ${affiliateUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErrorMsg(null);
    setProfileSuccessMsg(null);

    const slugCheck = isValidSlug(slug);
    if (!slugCheck.valid) {
      setProfileErrorMsg(slugCheck.error || 'Slug inválido');
      return;
    }

    const cleanPhone = sanitizeWhatsApp(whatsapp);
    if (!cleanPhone || cleanPhone.length < 8) {
      setProfileErrorMsg('Por favor ingresa un número de WhatsApp válido.');
      return;
    }

    setIsSavingProfile(true);
    try {
      const res = await updateRPProfile(currentUser.id, {
        publicName,
        slug: sanitizeSlug(slug),
        whatsapp: cleanPhone,
        instagram,
      });

      if (res.success && res.rpProfile) {
        setRpProfile(res.rpProfile);
        setSlug(res.rpProfile.slug);
        setProfileSuccessMsg('¡Perfil de Relación Pública actualizado correctamente!');
        setTimeout(() => setProfileSuccessMsg(null), 4000);
        if (onRefreshUser) onRefreshUser();
      } else {
        setProfileErrorMsg(res.error || 'Error al actualizar perfil');
      }
    } catch (err: any) {
      setProfileErrorMsg(err.message || 'Error al conectar con la base de datos');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveEventLink = async (eventId: string) => {
    if (!rpProfile) {
      setProfileErrorMsg('Debes guardar primero tu perfil de RP antes de configurar enlaces.');
      return;
    }

    const urlToSave = (eventLinks[eventId] || '').trim();
    setSavingEventId(eventId);
    try {
      const res = await saveRPEventLink(rpProfile.id, eventId, urlToSave);
      if (res.success) {
        setEventSuccessMsg((prev) => ({ ...prev, [eventId]: true }));
        setTimeout(() => {
          setEventSuccessMsg((prev) => ({ ...prev, [eventId]: false }));
        }, 3000);
      }
    } catch (err) {
      console.error('Error saving event link:', err);
    } finally {
      setSavingEventId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-[#F39200] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-zinc-400">Cargando panel de Relaciones Públicas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header & Badge Card */}
      <div className="bg-[#121217] border border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-[#F39200]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#F39200]/25 to-amber-500/10 border border-[#F39200]/40 flex items-center justify-center text-[#F39200] shadow-md shadow-[#F39200]/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-[#F39200] tracking-widest block">
                  PANEL DE PROMOTOR
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  RP Aprobado
                </span>
              </div>
              <h2 className="text-xl font-black text-white font-display uppercase tracking-tight">
                {rpProfile?.publicName || currentUser.fullName}
              </h2>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[10px] text-zinc-400 block font-semibold">Estado de afiliado</span>
            <span className="text-xs font-bold text-white">Activo y Generando Ventas</span>
          </div>
        </div>

        {/* 2. Personalized Vanity URL Box */}
        <div className="mt-5 p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-[#F39200]" />
              Tu enlace personalizado de Cachengueoo:
            </span>
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
              Enlace Activo
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/60 border border-zinc-700/80 text-white font-mono text-xs truncate select-all flex items-center gap-2">
              <span className="text-zinc-500">{baseUrl}/</span>
              <span className="text-[#F39200] font-bold">{slug || 'tu-slug'}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className={`flex-1 sm:flex-none h-10 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  hasCopiedLink
                    ? 'bg-emerald-500 text-black'
                    : 'bg-[#F39200] hover:bg-[#E08400] text-black shadow-md shadow-[#F39200]/20'
                }`}
              >
                {hasCopiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Enlace</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="h-10 px-3.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                title="Compartir en WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>

              <a
                href={affiliateUrl}
                target="_blank"
                rel="noreferrer"
                className="h-10 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
                title="Abrir enlace"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Compartí este enlace con tus contactos. Toda persona que ingrese verá tus enlaces de Passline en los eventos, y si festeja su cumpleaños o reserva mesa, te escribirá directamente a tu WhatsApp.
          </p>
        </div>
      </div>

      {/* 3. Métricas de Afiliado (Hotmart style) */}
      <div className="bg-[#121217] border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#F39200]" />
            <h3 className="text-xs font-black uppercase text-white tracking-wider">
              Métricas de tu Enlace
            </h3>
          </div>
          <span className="text-[10px] text-zinc-500">Actualizado en tiempo real</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-center space-y-1">
            <div className="flex items-center justify-center text-blue-400 mb-1">
              <Eye className="w-4 h-4" />
            </div>
            <span className="text-xl sm:text-2xl font-black text-white">{analytics.totalVisits}</span>
            <span className="text-[10px] text-zinc-400 block font-semibold uppercase">Visitas Web</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-center space-y-1">
            <div className="flex items-center justify-center text-[#F39200] mb-1">
              <Ticket className="w-4 h-4" />
            </div>
            <span className="text-xl sm:text-2xl font-black text-white">{analytics.ticketClicks}</span>
            <span className="text-[10px] text-zinc-400 block font-semibold uppercase">Clics Passline</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-center space-y-1">
            <div className="flex items-center justify-center text-pink-400 mb-1">
              <Cake className="w-4 h-4" />
            </div>
            <span className="text-xl sm:text-2xl font-black text-white">{analytics.birthdayClicks}</span>
            <span className="text-[10px] text-zinc-400 block font-semibold uppercase">Cumpleaños</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-center space-y-1">
            <div className="flex items-center justify-center text-amber-400 mb-1">
              <Wine className="w-4 h-4" />
            </div>
            <span className="text-xl sm:text-2xl font-black text-white">{analytics.reservationClicks}</span>
            <span className="text-[10px] text-zinc-400 block font-semibold uppercase">Mesas</span>
          </div>
        </div>
      </div>

      {/* 4. Configuración de Enlaces de Passline por Evento */}
      <div className="bg-[#121217] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-[#F39200]" />
            <h3 className="text-sm font-black uppercase text-white tracking-wide">
              Enlaces de Passline por Evento
            </h3>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Pegá tu link personal de Passline en cada evento. Cuando un cliente tuyo haga clic en "Comprar entrada", se abrirá exactamente tu enlace personal para acreditarte la venta.
          </p>
        </div>

        {events.length === 0 ? (
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-center space-y-2">
            <Calendar className="w-6 h-6 text-zinc-600 mx-auto" />
            <p className="text-xs text-zinc-400">
              No hay eventos habilitados para promoción en este momento.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => {
              const currentLink = eventLinks[event.id] || '';
              const isSaving = savingEventId === event.id;
              const isSuccess = eventSuccessMsg[event.id];

              return (
                <div
                  key={event.id}
                  className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700/80 transition-colors space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={event.flyerUrl}
                      alt={event.title}
                      className="w-14 h-14 rounded-xl object-cover border border-zinc-700 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-[#F39200]">
                          {event.dateStr}
                        </span>
                        {event.isActiveTonight && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase">
                            Esta Noche
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-white truncate">{event.title}</h4>
                      <p className="text-[11px] text-zinc-400 truncate">{event.locationName}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-bold text-zinc-300 block">
                      Tu enlace personal de Passline para esta fecha:
                    </label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="url"
                        value={currentLink}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEventLinks((prev) => ({ ...prev, [event.id]: val }));
                        }}
                        placeholder="https://www.passline.com/sitio/tu-enlace-personal"
                        className="flex-1 h-10 px-3 rounded-xl bg-black/60 border border-zinc-700 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-[#F39200]"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEventLink(event.id)}
                        disabled={isSaving}
                        className={`h-10 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                          isSuccess
                            ? 'bg-emerald-500 text-black'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                        }`}
                      >
                        {isSaving ? (
                          <span>Guardando...</span>
                        ) : isSuccess ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>¡Guardado!</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5 text-[#F39200]" />
                            <span>Guardar</span>
                          </>
                        )}
                      </button>
                    </div>
                    {currentLink && (
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Enlace personalizado configurado correctamente.
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Datos del Perfil Público (Form) */}
      <div className="bg-[#121217] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-black uppercase text-white tracking-wide">
            Datos de tu Perfil de Promotor
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Podés modificar tu nombre público, slug de la URL y los datos de contacto donde recibirás a tus clientes.
          </p>
        </div>

        {profileErrorMsg && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/50 flex items-start gap-2.5 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{profileErrorMsg}</span>
          </div>
        )}

        {profileSuccessMsg && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/50 flex items-start gap-2.5 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{profileSuccessMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-300">
                Nombre de Promotor / Público *
              </label>
              <input
                type="text"
                required
                value={publicName}
                onChange={(e) => setPublicName(e.target.value)}
                placeholder="Ej: Nacho Vichi"
                className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-[#F39200]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-300 flex items-center justify-between">
                <span>Slug de URL personalizada *</span>
                <span className="text-[10px] text-zinc-500 font-normal">Sin espacios</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-mono font-bold">/</span>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(sanitizeSlug(e.target.value))}
                  placeholder="nachovichi"
                  className="w-full h-11 pl-7 pr-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono text-xs placeholder:text-zinc-600 focus:outline-none focus:border-[#F39200]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                WhatsApp para Reservas & Cumpleaños *
              </label>
              <input
                type="tel"
                required
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="Ej: 2615651192 o +54 9 261..."
                className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-[#F39200]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                <Instagram className="w-3.5 h-3.5 text-pink-400" />
                Instagram (Opcional)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-bold">@</span>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="tu_usuario"
                  className="w-full h-11 pl-8 pr-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-[#F39200]"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSavingProfile}
              className="px-6 py-2.5 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-[#F39200]/25 disabled:opacity-50 transition-all"
            >
              {isSavingProfile ? (
                <span>Guardando...</span>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar Datos de Promotor</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
