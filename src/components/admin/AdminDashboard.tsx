import React, { useState } from 'react';
import {
  Calendar,
  Users,
  Flame,
  Ticket,
  Gift,
  Crown,
  MapPin,
  QrCode,
  Plus,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  ScanLine,
  Database,
  Cake,
  ShieldCheck,
  Check,
  X,
  ExternalLink,
  Trash2,
  Upload,
  Star,
  Clock,
  Music,
  Image as ImageIcon,
} from 'lucide-react';
import { ClubEvent, ValidationMode, VenueConfig, BirthdayRequest } from '../../types';
import { eventService } from '../../services/eventService';
import { presenceService } from '../../services/presenceService';
import { ticketService } from '../../services/ticketService';
import { benefitService } from '../../services/benefitService';
import { birthdayService } from '../../services/birthdayService';
import { authService } from '../../services/authService';
import { getVenueConfig, saveVenueConfig } from '../../config/venue';
import { MOCK_MATCH_PROFILES } from '../../data/mockData';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  getSupabaseClient,
} from '../../services/supabaseClient';
import { passlineParser, FOUR_PRESET_FLYERS } from '../../services/passlineParser';

export const AdminDashboard: React.FC = () => {
  const [adminTab, setAdminTab] = useState<
    'presencia' | 'eventos' | 'entradas' | 'usuarios' | 'cumpleanos' | 'venue' | 'supabase'
  >('presencia');

  // Events state
  const [events, setEvents] = useState<ClubEvent[]>(() => eventService.getEvents());
  const activeEvent = eventService.getActiveTonightEvent();

  // QR Token state
  const [activeQrToken, setActiveQrToken] = useState(() => presenceService.getActiveQrToken());

  // Ticket scanner state
  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);

  // Venue Config state
  const [venueConfig, setVenueState] = useState<VenueConfig>(() => getVenueConfig());
  const [venueSavedNotice, setVenueSavedNotice] = useState(false);

  // New Event manual form state
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDateIso, setNewEventDateIso] = useState('');
  const [newEventDateStr, setNewEventDateStr] = useState('');
  const [newEventTimeRange, setNewEventTimeRange] = useState('23:00 — 06:00 hs');
  const [newEventLineup, setNewEventLineup] = useState('');
  const [newEventLink, setNewEventLink] = useState('');
  const [newEventFlyerUrl, setNewEventFlyerUrl] = useState(
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80'
  );
  const [newEventIsFeatured, setNewEventIsFeatured] = useState(false);

  // Birthday requests state
  const [birthdays, setBirthdays] = useState<BirthdayRequest[]>(() => birthdayService.getRequests());

  // Supabase live config state
  const [sbConfig, setSbConfig] = useState(() => getSupabaseConfig());
  const [sbUrlInput, setSbUrlInput] = useState(sbConfig.url || '');
  const [sbKeyInput, setSbKeyInput] = useState(sbConfig.anonKey || '');
  const [sbTestResult, setSbTestResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
  } | null>(null);

  // Handle Event Validation Mode Change
  const handleModeChange = (eventId: string, mode: ValidationMode) => {
    eventService.updateEventValidationMode(eventId, mode);
    setEvents(eventService.getEvents());
  };

  // Handle Event Activation
  const handleSetActiveEvent = (eventId: string) => {
    eventService.setActiveTonightEvent(eventId);
    setEvents(eventService.getEvents());
  };

  // Generate New QR for Tonight
  const handleGenerateNewQr = () => {
    const newToken = presenceService.generateNewNightQr(activeEvent.id);
    setActiveQrToken(newToken);
  };

  // Ticket validation scan in door
  const handleVerifyTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;
    const res = ticketService.validateTicketQr(scanInput.trim());
    setScanResult(res);
  };

  // Save Venue Settings
  const handleSaveVenue = (e: React.FormEvent) => {
    e.preventDefault();
    saveVenueConfig(venueConfig);
    setVenueSavedNotice(true);
    setTimeout(() => setVenueSavedNotice(false), 3000);
  };

  // Formateador de fecha en español
  const formatSpanishDate = (iso: string) => {
    if (!iso) return '';
    try {
      const [y, m, d] = iso.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
      ];
      return `${days[dt.getDay()]} ${d} de ${months[m - 1]}`;
    } catch {
      return iso;
    }
  };

  const handleDateIsoChange = (val: string) => {
    setNewEventDateIso(val);
    const formatted = formatSpanishDate(val);
    setNewEventDateStr(formatted);
  };

  // Carga de archivo de imagen desde el dispositivo
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setNewEventFlyerUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Manejador del link de Passline (primer campo): recopila el nombre de la fiesta pero deja editarlo libremente
  const handlePasslineLinkChange = (url: string) => {
    setNewEventLink(url);
    if (!url.trim()) return;

    try {
      const extracted = passlineParser.extractFromUrl(url);
      if (extracted.title) {
        setNewEventTitle(extracted.title);
      }
      if (extracted.dateIso && !newEventDateIso) {
        setNewEventDateIso(extracted.dateIso);
      }
      if (extracted.dateStr && !newEventDateStr) {
        setNewEventDateStr(extracted.dateStr);
      }
      if (extracted.flyerUrl) {
        setNewEventFlyerUrl(extracted.flyerUrl);
      }
    } catch (e) {
      console.warn('Error extracting from link', e);
    }
  };

  // Toggle de evento destacado en el inicio
  const handleToggleFeatured = (eventId: string) => {
    eventService.toggleFeatured(eventId);
    setEvents(eventService.getEvents());
  };

  // Crear Evento
  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    const dateIsoToUse = newEventDateIso || new Date().toISOString().split('T')[0];
    const dateStrToUse =
      newEventDateStr.trim() || formatSpanishDate(dateIsoToUse) || 'Próximo Fin de Semana';
    const timeToUse = newEventTimeRange.trim() || '23:00 — 06:00 hs';
    const djsArray = newEventLineup
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);

    eventService.createEvent({
      title: newEventTitle.trim(),
      subtitle: '',
      dateStr: dateStrToUse,
      dateIso: dateIsoToUse,
      timeRange: timeToUse,
      locationName: 'Cachengueoo Boliche · Mendoza',
      description: '',
      flyerUrl: newEventFlyerUrl,
      isActiveTonight: false, // se activa automáticamente en eventService cuando llega el día
      isFeatured: newEventIsFeatured,
      validationMode: 'GPS_OR_QR',
      djs: djsArray,
      ticketTypes: [],
      passlineUrl: newEventLink.trim()
        ? newEventLink.trim().startsWith('http')
          ? newEventLink.trim()
          : `https://${newEventLink.trim()}`
        : 'https://www.passline.com',
    });

    setEvents(eventService.getEvents());
    setShowNewEventModal(false);

    // Resetear formulario
    setNewEventTitle('');
    setNewEventDateIso('');
    setNewEventDateStr('');
    setNewEventTimeRange('23:00 — 06:00 hs');
    setNewEventLineup('');
    setNewEventLink('');
    setNewEventIsFeatured(false);
  };

  // Eliminar evento
  const handleDeleteEvent = (eventId: string) => {
    eventService.deleteEvent(eventId);
    setEvents(eventService.getEvents());
  };

  // Birthday status change
  const handleBirthdayStatus = (id: string, status: 'pending' | 'approved' | 'contacted') => {
    birthdayService.updateRequestStatus(id, status);
    setBirthdays(birthdayService.getRequests());
  };

  // Supabase test connection
  const handleSaveAndTestSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sbUrlInput.trim() || !sbKeyInput.trim()) {
      clearSupabaseConfig();
      setSbConfig(getSupabaseConfig());
      setSbTestResult({
        tested: true,
        success: false,
        message: 'Credenciales eliminadas. La app volverá al modo desacoplado mock.',
      });
      return;
    }

    saveSupabaseConfig(sbUrlInput, sbKeyInput);
    setSbConfig(getSupabaseConfig());

    try {
      const client = getSupabaseClient();
      if (!client) throw new Error('No se pudo inicializar el cliente de Supabase.');

      // Test a light ping to profiles table or auth
      const { error } = await client.from('profiles').select('count', { count: 'exact', head: true });
      if (error && error.code !== 'PGRST116') {
        setSbTestResult({
          tested: true,
          success: false,
          message: `Conectado al proyecto, pero la tabla 'profiles' aún no fue creada o falta ejecutar supabase.schema.sql (${error.message}).`,
        });
      } else {
        setSbTestResult({
          tested: true,
          success: true,
          message: '¡Conexión exitosa con tu base de datos PostgreSQL de Supabase! Tablas listas.',
        });
      }
    } catch (err: unknown) {
      setSbTestResult({
        tested: true,
        success: false,
        message: err instanceof Error ? err.message : 'Error al conectar con Supabase',
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Admin Header */}
      <div className="bg-[#121217] border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-[#F39200]/20 text-[#F39200] text-[10px] font-black uppercase tracking-widest">
              STAFF & CONTROL
            </span>
            <span className="text-zinc-500 text-xs">· Cachengueoo Mendoza</span>
          </div>
          <h1 className="text-2xl font-black text-white font-display uppercase tracking-tight">
            PANEL ADMINISTRATIVO <span className="text-[#F39200]">CACHENGUEOO</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Gestión en tiempo real de eventos, validación de presencia, Match, entradas y base de datos.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-2.5 rounded-2xl text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-zinc-300 font-medium">Evento activo hoy:</span>
          <strong className="text-white truncate max-w-[140px]">{activeEvent.title}</strong>
        </div>
      </div>

      {/* Admin Tab Navigation */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar p-1 bg-zinc-900/80 border border-zinc-800 rounded-2xl">
        {[
          { id: 'presencia', label: 'Presencia & QR', icon: MapPin },
          { id: 'eventos', label: 'Eventos', icon: Calendar },
          { id: 'entradas', label: 'Control Entradas', icon: Ticket },
          { id: 'usuarios', label: 'Usuarios & Match', icon: Users },
          { id: 'cumpleanos', label: 'Cumpleaños', icon: Cake },
          { id: 'venue', label: 'Config Geográfica', icon: ScanLine },
          { id: 'supabase', label: 'Supabase DB', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = adminTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setAdminTab(tab.id as typeof adminTab)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-[#F39200] text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB: PRESENCIA & QR */}
      {adminTab === 'presencia' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-[#121217] border border-zinc-800 space-y-1">
              <span className="text-xs text-zinc-400">Total Personas Adentro</span>
              <span className="text-3xl font-black text-white font-mono block">348</span>
              <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Capacidad actual: 45%
              </span>
            </div>

            <div className="p-5 rounded-3xl bg-[#121217] border border-zinc-800 space-y-1">
              <span className="text-xs text-zinc-400">Validados por GPS</span>
              <span className="text-3xl font-black text-[#F39200] font-mono block">214</span>
              <span className="text-[11px] text-zinc-400">61.5% del total</span>
            </div>

            <div className="p-5 rounded-3xl bg-[#121217] border border-zinc-800 space-y-1">
              <span className="text-xs text-zinc-400">Validados por QR Puerta</span>
              <span className="text-3xl font-black text-amber-300 font-mono block">134</span>
              <span className="text-[11px] text-zinc-400">38.5% del total</span>
            </div>
          </div>

          {/* QR Generator */}
          <div className="p-6 rounded-3xl bg-[#121217] border border-zinc-800 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-white font-display">
                  QR Oficial de Puerta para Esta Noche
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Los clientes que no tengan señal de GPS pueden escanear este código en el ingreso.
                </p>
              </div>

              <button
                onClick={handleGenerateNewQr}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-white text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#F39200]" />
                Rotar Código QR
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80">
              <div className="bg-white p-4 rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-lg">
                <QrCode className="w-28 h-28 text-black" />
                <span className="text-[9px] font-mono text-black font-bold mt-1">
                  CACHENGUEOO MZA
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-zinc-500 block">Token Activo Actual:</span>
                  <span className="font-mono text-sm font-black text-[#F39200] bg-zinc-900 px-3 py-1 rounded-lg border border-zinc-800 inline-block mt-0.5">
                    {activeQrToken}
                  </span>
                </div>
                <p className="text-zinc-400 leading-relaxed text-[11px]">
                  Podés proyectar este código en las pantallas de acceso a Cachengueoo o imprimirlo en los
                  banners de fila para que la gente ingrese con su presencia validada.
                </p>
              </div>
            </div>
          </div>

          {/* Active Users */}
          <div className="p-6 rounded-3xl bg-[#121217] border border-zinc-800 space-y-4">
            <h3 className="text-base font-bold text-white font-display">
              Usuarios Validados en Cachengueoo ({MOCK_MATCH_PROFILES.length})
            </h3>

            <div className="divide-y divide-zinc-800/80">
              {MOCK_MATCH_PROFILES.map((usr) => (
                <div key={usr.userId} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <img
                      src={usr.avatarUrl}
                      alt={usr.fullName}
                      className="w-10 h-10 rounded-full object-cover border border-zinc-700"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h4 className="font-bold text-white">{usr.fullName}</h4>
                      <p className="text-[11px] text-zinc-400">{usr.lastPresenceCheck}</p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 font-semibold text-[10px]">
                    Activo en Pista 🔥
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: EVENTOS */}
      {adminTab === 'eventos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white font-display">Gestión de Noches y Eventos</h3>
            <button
              onClick={() => setShowNewEventModal(true)}
              className="px-3.5 py-2 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#F39200]/20"
            >
              <Plus className="w-4 h-4" />
              Cargar Evento
            </button>
          </div>

          <div className="space-y-3">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="p-5 rounded-3xl bg-[#121217] border border-zinc-800 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-bold text-white font-display truncate">
                        {evt.title}
                      </h4>
                      {evt.isFeatured && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[9px] uppercase border border-amber-500/30 flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                          DESTACADA EN INICIO
                        </span>
                      )}
                      {evt.isActiveTonight && (
                        <span className="px-2 py-0.5 rounded-full bg-[#F39200] text-black font-black text-[9px] uppercase">
                          ACTIVO HOY 🔥
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-300">
                      <span className="flex items-center gap-1 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-[#F39200]" />
                        {evt.dateStr}
                      </span>
                      {evt.timeRange && (
                        <span className="flex items-center gap-1 text-zinc-400 font-mono text-[11px]">
                          <Clock className="w-3 h-3 text-[#F39200]" />
                          {evt.timeRange}
                        </span>
                      )}
                    </div>

                    {evt.djs && evt.djs.length > 0 && (
                      <p className="text-[11px] text-zinc-400 flex items-center gap-1">
                        <Music className="w-3 h-3 text-[#F39200]" />
                        <span className="text-zinc-500">Lineup:</span>
                        <span className="text-zinc-300 font-mono">{evt.djs.join(' · ')}</span>
                      </p>
                    )}

                    {evt.passlineUrl && (
                      <a
                        href={evt.passlineUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-[#F39200] hover:underline flex items-center gap-1 truncate max-w-sm"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">{evt.passlineUrl}</span>
                      </a>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleFeatured(evt.id)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all flex items-center gap-1 ${
                        evt.isFeatured
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                          : 'bg-zinc-900 border-zinc-700 hover:border-amber-400 text-zinc-300'
                      }`}
                      title="Destacar o no esta fecha en la pantalla de Inicio"
                    >
                      <Star className={`w-3 h-3 ${evt.isFeatured ? 'fill-amber-400 text-amber-400' : ''}`} />
                      {evt.isFeatured ? 'Destacada' : 'Destacar'}
                    </button>

                    {events.length > 1 && (
                      <button
                        onClick={() => handleDeleteEvent(evt.id)}
                        className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-red-400 cursor-pointer"
                        title="Eliminar evento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-zinc-400 block font-medium">Regla de Presencia:</span>
                    <span className="text-[11px] text-zinc-500">
                      Método requerido para habilitar Match y beneficios.
                    </span>
                  </div>

                  <div className="flex gap-1.5">
                    {(
                      [
                        { id: 'GPS_OR_QR', label: 'GPS o QR' },
                        { id: 'GPS_ONLY', label: 'Solo GPS' },
                        { id: 'QR_ONLY', label: 'Solo QR' },
                        { id: 'GPS_AND_QR', label: 'Ambos (GPS+QR)' },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => handleModeChange(evt.id, m.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          evt.validationMode === m.id
                            ? 'bg-[#F39200] text-black'
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: CONTROL ENTRADAS */}
      {adminTab === 'entradas' && (
        <div className="p-6 rounded-3xl bg-[#121217] border border-zinc-800 space-y-5">
          <div>
            <h3 className="text-base font-bold text-white font-display">
              Validador de Entradas en Puerta
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Ingresá o escaneá el código QR de la entrada del cliente para validar el ingreso.
            </p>
          </div>

          <form onSubmit={handleVerifyTicket} className="flex gap-2">
            <input
              type="text"
              placeholder="Ej: CACHE-TKT-VIP-991823-2026"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              className="flex-1 h-12 px-4 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono text-xs focus:outline-none focus:border-[#F39200]"
            />
            <button
              type="submit"
              className="px-6 h-12 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#F39200]/20"
            >
              <ScanLine className="w-4 h-4" />
              Validar Entrada
            </button>
          </form>

          {scanResult && (
            <div
              className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
                scanResult.success
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                  : 'bg-red-950/40 border-red-500/50 text-red-200'
              }`}
            >
              {scanResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              )}
              <div>
                <p className="font-bold text-sm">
                  {scanResult.success ? 'Entrada Validada' : 'No Habilitado'}
                </p>
                <p className="mt-0.5">{scanResult.message}</p>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-zinc-800/80">
            <span className="text-[11px] text-zinc-400 block mb-2 font-medium">
              Entradas de prueba para probar el validador:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setScanInput('CACHE-TKT-VIP-991823-2026')}
                className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-[11px] hover:border-zinc-600 cursor-pointer"
              >
                CACHE-TKT-VIP-991823-2026 (Entrada Mateo)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: USUARIOS & MATCH */}
      {adminTab === 'usuarios' && (
        <div className="p-6 rounded-3xl bg-[#121217] border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white font-display">Usuarios Registrados</h3>
              <p className="text-xs text-zinc-400">Control de perfiles, presencia y reportes de Match.</p>
            </div>
            <span className="text-xs font-mono text-[#F39200]">
              {MOCK_MATCH_PROFILES.length + 1} perfiles en sistema
            </span>
          </div>

          <div className="divide-y divide-zinc-800">
            {MOCK_MATCH_PROFILES.map((usr) => (
              <div key={usr.userId} className="py-3.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <img
                    src={usr.avatarUrl}
                    alt={usr.fullName}
                    className="w-11 h-11 rounded-2xl object-cover border border-zinc-700"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h4 className="font-bold text-white font-display">{usr.fullName} ({usr.nickname})</h4>
                    <p className="text-[11px] text-zinc-400">{usr.age} años · Trago: {usr.drinkFavorite}</p>
                    <p className="text-[10px] text-emerald-400 mt-0.5">● Presencia verificada en Cachengueoo</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => alert(`Usuario ${usr.nickname} verificado en sistema.`)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-[11px] cursor-pointer"
                  >
                    Detalles
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: CUMPLEAÑOS */}
      {adminTab === 'cumpleanos' && (
        <div className="p-6 rounded-3xl bg-[#121217] border border-zinc-800 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white font-display">
              Solicitudes de Cumpleaños Recibidas
            </h3>
            <p className="text-xs text-zinc-400">
              Coordinación de listas de invitados, champagne de cortesía y mesas VIP.
            </p>
          </div>

          <div className="space-y-3">
            {birthdays.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white font-display">{req.name}</h4>
                    <p className="text-xs text-zinc-400">
                      Fecha: {req.date} · {req.guestCount} invitados
                    </p>
                    <p className="text-[11px] text-zinc-300 mt-1">
                      {req.instagram && <span className="mr-2">IG: <strong className="text-[#F39200]">@{req.instagram.replace(/^@/, '')}</strong></span>}
                      {req.phone && <span className="mr-2">WA: <strong className="text-white">{req.phone}</strong></span>}
                      <span>Email: {req.email}</span>
                    </p>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                      req.status === 'approved'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                        : req.status === 'contacted'
                        ? 'bg-amber-950 text-amber-400 border border-amber-500/40'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {req.status}
                  </span>
                </div>

                {req.notes && (
                  <p className="text-xs text-zinc-400 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80">
                    Nota: {req.notes}
                  </p>
                )}

                <div className="flex gap-2 pt-1 border-t border-zinc-800 text-xs">
                  <button
                    onClick={() => handleBirthdayStatus(req.id, 'approved')}
                    className="px-3 py-1 rounded-lg bg-emerald-950/60 border border-emerald-600/40 text-emerald-400 text-xs font-semibold hover:bg-emerald-900/60 cursor-pointer"
                  >
                    Aprobar y Asignar Mesa
                  </button>
                  <button
                    onClick={() => handleBirthdayStatus(req.id, 'contacted')}
                    className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white text-xs cursor-pointer"
                  >
                    Marcar Contactado
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: CONFIGURACIÓN GEOGRÁFICA */}
      {adminTab === 'venue' && (
        <div className="p-6 rounded-3xl bg-[#121217] border border-zinc-800 space-y-5">
          <div>
            <h3 className="text-base font-bold text-white font-display">
              Configuración Geográfica del Local (Mendoza)
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Definición central de VENUE_LOCATION sin hardcodear en componentes.
            </p>
          </div>

          {venueSavedNotice && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Configuración de ubicación guardada con éxito en el sistema central.
            </div>
          )}

          <form onSubmit={handleSaveVenue} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-400 block mb-1">Nombre del Local</label>
                <input
                  type="text"
                  value={venueConfig.name}
                  onChange={(e) => setVenueState({ ...venueConfig, name: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-[#F39200]"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Ciudad y Provincia</label>
                <input
                  type="text"
                  value={`${venueConfig.city}, ${venueConfig.province}`}
                  onChange={(e) => {
                    const parts = e.target.value.split(',');
                    setVenueState({
                      ...venueConfig,
                      city: parts[0]?.trim() || 'Mendoza',
                      province: parts[1]?.trim() || 'Mendoza',
                    });
                  }}
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-[#F39200]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-zinc-400 block mb-1">Latitud</label>
                <input
                  type="number"
                  step="any"
                  value={venueConfig.latitude}
                  onChange={(e) =>
                    setVenueState({ ...venueConfig, latitude: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono focus:outline-none focus:border-[#F39200]"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Longitud</label>
                <input
                  type="number"
                  step="any"
                  value={venueConfig.longitude}
                  onChange={(e) =>
                    setVenueState({ ...venueConfig, longitude: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono focus:outline-none focus:border-[#F39200]"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Radio Permitido (metros)</label>
                <input
                  type="number"
                  value={venueConfig.radiusMeters}
                  onChange={(e) =>
                    setVenueState({
                      ...venueConfig,
                      radiusMeters: parseInt(e.target.value) || 150,
                    })
                  }
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono focus:outline-none focus:border-[#F39200]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="h-11 px-5 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-bold text-xs cursor-pointer transition-colors"
            >
              Guardar Configuración Geográfica
            </button>
          </form>
        </div>
      )}

      {/* TAB: SUPABASE LIVE CONNECTOR */}
      {adminTab === 'supabase' && (
        <div className="p-6 rounded-3xl bg-[#121217] border border-zinc-800 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-[#F39200]" />
                <h3 className="text-base font-bold text-white font-display">
                  Conexión con Supabase (PostgreSQL & Auth)
                </h3>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Ingresá tus credenciales de Supabase para activar la sincronización real con la nube.
              </p>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                sbConfig.isConfigured
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
              }`}
            >
              {sbConfig.isConfigured ? 'Supabase Configurado' : 'Modo Mock Local'}
            </span>
          </div>

          <form onSubmit={handleSaveAndTestSupabase} className="space-y-4 text-xs">
            <div>
              <label className="text-zinc-400 block mb-1">
                Project URL (VITE_SUPABASE_URL)
              </label>
              <input
                type="text"
                placeholder="https://xyzabcdefghijklm.supabase.co"
                value={sbUrlInput}
                onChange={(e) => setSbUrlInput(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono text-xs focus:outline-none focus:border-[#F39200]"
              />
            </div>

            <div>
              <label className="text-zinc-400 block mb-1">
                Anon Public Key (VITE_SUPABASE_ANON_KEY)
              </label>
              <input
                type="password"
                placeholder="eyJh..."
                value={sbKeyInput}
                onChange={(e) => setSbKeyInput(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono text-xs focus:outline-none focus:border-[#F39200]"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="h-11 px-6 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#F39200]/20"
              >
                <Check className="w-4 h-4" />
                Guardar y Probar Conexión
              </button>

              {sbConfig.isConfigured && (
                <button
                  type="button"
                  onClick={() => {
                    clearSupabaseConfig();
                    setSbConfig(getSupabaseConfig());
                    setSbUrlInput('');
                    setSbKeyInput('');
                    setSbTestResult(null);
                  }}
                  className="h-11 px-4 rounded-xl bg-zinc-900 border border-zinc-800 text-red-400 hover:text-red-300 text-xs font-semibold cursor-pointer"
                >
                  Desconectar
                </button>
              )}
            </div>
          </form>

          {/* Test connection report */}
          {sbTestResult && (
            <div
              className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
                sbTestResult.success
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                  : 'bg-amber-950/40 border-amber-500/50 text-amber-200'
              }`}
            >
              {sbTestResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              )}
              <div>
                <p className="font-bold">
                  {sbTestResult.success ? 'Conexión Exitosa' : 'Aviso de Configuración'}
                </p>
                <p className="mt-0.5 leading-relaxed">{sbTestResult.message}</p>
              </div>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 text-[11px] text-zinc-400 space-y-2">
            <span className="font-bold text-white block">Script de Migración SQL:</span>
            <p>
              El archivo <code className="text-[#F39200]">src/config/supabase.schema.sql</code> contiene la estructura
              de base de datos completa con RLS para copiar y pegar en el SQL Editor de tu proyecto en Supabase.
            </p>
          </div>
        </div>
      )}

      {/* CREATE EVENT MODAL MANUAL */}
      {showNewEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#121217] border border-zinc-800 rounded-3xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#F39200] tracking-wider block">
                  Panel de Noches y Fechas
                </span>
                <h4 className="text-base font-bold text-white font-display mt-0.5">
                  Cargar Evento
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowNewEventModal(false)}
                className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4 text-xs">
              {/* 1. PEGAR LINK DE PASSLINE (LO PRIMERO QUE DEBE SALIR) */}
              <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-[#F39200]/40 space-y-1.5 shadow-sm">
                <label className="text-zinc-200 block font-bold flex items-center gap-1.5 text-xs">
                  <ExternalLink className="w-4 h-4 text-[#F39200]" />
                  Pegar link de Passline
                </label>
                <input
                  type="url"
                  placeholder="https://www.passline.com/eventos/..."
                  value={newEventLink}
                  onChange={(e) => handlePasslineLinkChange(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-[#F39200] placeholder-zinc-500"
                  autoFocus
                />
                <p className="text-[11px] text-zinc-400 leading-snug">
                  Detecta automáticamente el nombre de la fiesta al pegar el enlace. Podés editarlo libremente en el campo de abajo.
                </p>
              </div>

              {/* 2. NOMBRE DEL EVENTO (RECOPILADO PERO EDITABLE) */}
              <div>
                <label className="text-zinc-300 block mb-1 font-bold">
                  Nombre del Evento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: CACHENGUEOO · FIESTA DE PRIMAVERA"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-semibold text-xs focus:outline-none focus:border-[#F39200]"
                />
              </div>

              {/* 3. FECHA Y HORARIO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 block mb-1 font-bold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#F39200]" />
                    Fecha del Evento *
                  </label>
                  <input
                    type="date"
                    required
                    value={newEventDateIso}
                    onChange={(e) => handleDateIsoChange(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs focus:outline-none focus:border-[#F39200]"
                  />
                  {newEventDateStr && (
                    <p className="text-[11px] text-[#F39200] font-medium mt-1">
                      {newEventDateStr}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-zinc-300 block mb-1 font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#F39200]" />
                    Horario
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 23:00 — 06:00 hs"
                    value={newEventTimeRange}
                    onChange={(e) => setNewEventTimeRange(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs focus:outline-none focus:border-[#F39200]"
                  />
                </div>
              </div>

              {/* 4. LINEUP (DJS / ARTISTAS) */}
              <div>
                <label className="text-zinc-300 block mb-1 font-bold flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-[#F39200]" />
                  Lineup (separar por comas)
                </label>
                <input
                  type="text"
                  placeholder="Ej: DJ Valen Romero, DJ Facu Gómez, Cachengue All Stars"
                  value={newEventLineup}
                  onChange={(e) => setNewEventLineup(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs focus:outline-none focus:border-[#F39200]"
                />
              </div>

              {/* 5. CARGAR IMAGEN / FLYER DEL EVENTO */}
              <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-zinc-200 font-bold flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-[#F39200]" />
                    Flyer / Imagen del Evento
                  </label>
                  <span className="text-[10px] text-zinc-500">
                    Archivo propio o 4 banners predeterminados
                  </span>
                </div>

                {/* Previsualización del flyer actual */}
                <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden border border-zinc-700 shadow-md">
                  <img
                    src={newEventFlyerUrl}
                    alt="Previsualización de flyer"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-black/75 backdrop-blur-md text-[10px] font-bold text-[#F39200] border border-white/10">
                    Flyer Seleccionado
                  </div>
                </div>

                {/* Botón para subir imagen desde el dispositivo */}
                <div>
                  <label className="w-full h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-[#F39200] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all">
                    <Upload className="w-4 h-4 text-[#F39200]" />
                    Cargar imagen desde tu dispositivo (Galería / Archivos)
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Las 4 opciones predeterminadas de banners */}
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1.5">
                    O elegir entre 4 opciones de banners:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {FOUR_PRESET_FLYERS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setNewEventFlyerUrl(item.url)}
                        className={`aspect-video rounded-xl overflow-hidden border-2 transition-all cursor-pointer relative group ${
                          newEventFlyerUrl === item.url
                            ? 'border-[#F39200] scale-[1.02] shadow-md shadow-[#F39200]/25'
                            : 'border-zinc-800 opacity-60 hover:opacity-100'
                        }`}
                        title={item.label}
                      >
                        <img
                          src={item.url}
                          alt={item.label}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute inset-x-0 bottom-0 bg-black/85 text-[9px] font-bold text-zinc-200 truncate px-1.5 py-1 text-center">
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 6. OPCIONES DE VISUALIZACIÓN & FECHA DESTACADA */}
              <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-2.5">
                <span className="text-[10px] uppercase font-bold text-[#F39200] tracking-wider block">
                  Visibilidad en la App
                </span>

                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="setAsFeatured"
                    checked={newEventIsFeatured}
                    onChange={(e) => setNewEventIsFeatured(e.target.checked)}
                    className="rounded bg-zinc-900 border-zinc-700 text-[#F39200] focus:ring-0 cursor-pointer w-4 h-4"
                  />
                  <label
                    htmlFor="setAsFeatured"
                    className="text-zinc-200 text-xs font-semibold cursor-pointer select-none"
                  >
                    ⭐ Destacar esta fecha en la pantalla de Inicio
                  </label>
                </div>


                {/* Aviso de borrado automático de 12 horas */}
                <div className="pt-2 border-t border-zinc-800/80 flex items-center gap-2 text-[11px] text-zinc-400">
                  <Clock className="w-3.5 h-3.5 text-[#F39200] shrink-0" />
                  <span>
                    Pasadas 12 horas de la fecha y hora de finalización del evento, se borrará automáticamente de la app.
                  </span>
                </div>
              </div>

              {/* BOTONES DE ACCIÓN */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewEventModal(false)}
                  className="flex-1 h-11 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-extrabold cursor-pointer transition-all shadow-md shadow-[#F39200]/25 flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Publicar Evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
