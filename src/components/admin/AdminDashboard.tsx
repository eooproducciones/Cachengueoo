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
  Pencil,
  Tag,
  Percent,
  MessageCircle,
  LogOut,
  ArrowLeft,
  Eye,
  Ban,
  UserCheck,
  Instagram,
  Sparkles,
  GlassWater,
} from 'lucide-react';
import { ClubEvent, ValidationMode, VenueConfig, BirthdayRequest, ClubBenefit } from '../../types';
import { eventService } from '../../services/eventService';
import { presenceService } from '../../services/presenceService';
import { ticketService } from '../../services/ticketService';
import { benefitService } from '../../services/benefitService';
import { birthdayService } from '../../services/birthdayService';
import { authService } from '../../services/authService';
import { getVenueConfig, saveVenueConfig } from '../../config/venue';
import { getSupabaseClient } from '../../services/supabaseClient';
import { passlineParser, FOUR_PRESET_FLYERS } from '../../services/passlineParser';
import { VenueMapEditor } from './VenueMapEditor';
import { unpackProfileInterests } from '../../utils/profileMetadata';

// Imágenes de alta resolución predeterminadas para aliados comerciales
export const PRESET_BENEFIT_IMAGES = [
  {
    label: 'Gimnasio & Fitness (SportClub)',
    url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Gastronomía / Bar / Resto',
    url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Indumentaria / Ropa / Moda',
    url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Barbería / Peluquería / Estética',
    url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80',
  },
];

export interface AdminDashboardProps {
  onExitAdmin?: () => void;
  onLogout?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onExitAdmin, onLogout }) => {
  const [adminTab, setAdminTab] = useState<
    'eventos' | 'beneficios' | 'presencia' | 'entradas' | 'usuarios' | 'cumpleanos' | 'venue'
  >('eventos');

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

  // Benefits state
  const [benefits, setBenefits] = useState<ClubBenefit[]>(() => benefitService.getBenefits());
  const [showNewBenefitModal, setShowNewBenefitModal] = useState(false);
  const [editingBenefitId, setEditingBenefitId] = useState<string | null>(null);
  const [newBenTitle, setNewBenTitle] = useState('');
  const [newBenPartnerName, setNewBenPartnerName] = useState('');
  const [newBenBadge, setNewBenBadge] = useState('10% OFF');
  const [newBenDescription, setNewBenDescription] = useState('');
  const [newBenPromoCode, setNewBenPromoCode] = useState('');
  const [newBenActionUrl, setNewBenActionUrl] = useState('');
  const [newBenActionType, setNewBenActionType] = useState<'whatsapp' | 'web'>('whatsapp');
  const [newBenActionLabel, setNewBenActionLabel] = useState('');
  const [newBenCategory, setNewBenCategory] = useState('Gimnasio & Salud');
  const [newBenImageUrl, setNewBenImageUrl] = useState(
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80'
  );

  // Birthday requests state
  const [birthdays, setBirthdays] = useState<BirthdayRequest[]>(() => birthdayService.getRequests());

  // Registered Users state (real users from Supabase or authService)
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [selectedUserDetail, setSelectedUserDetail] = useState<any | null>(null);
  const [blockedMatchUsers, setBlockedMatchUsers] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('cachengueoo_blocked_match_users') || '[]');
    } catch {
      return [];
    }
  });

  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<ClubEvent | null>(null);
  const [benefitToDelete, setBenefitToDelete] = useState<ClubBenefit | null>(null);

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    const uid = userToDelete.id || userToDelete.userId;
    const email = userToDelete.email;
    setIsDeletingUser(true);
    try {
      await authService.deleteUser(uid, email);
      setRegisteredUsers((prev) =>
        prev.filter((u: any) => (u.id || u.userId) !== uid && (!email || u.email?.toLowerCase() !== email.toLowerCase()))
      );
      if (selectedUserDetail && ((selectedUserDetail.id || selectedUserDetail.userId) === uid || selectedUserDetail.email === email)) {
        setSelectedUserDetail(null);
      }
      setUserToDelete(null);
    } catch (err) {
      console.error('Error al eliminar usuario:', err);
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleToggleBlockMatch = (userId: string, email?: string) => {
    const isCurrentlyBlocked =
      blockedMatchUsers.includes(userId) ||
      (email ? blockedMatchUsers.includes(email.toLowerCase()) : false);

    let nextList: string[];
    if (isCurrentlyBlocked) {
      nextList = blockedMatchUsers.filter(
        (id) => id !== userId && (!email || id !== email.toLowerCase())
      );
    } else {
      nextList = [...blockedMatchUsers, userId];
      if (email && !nextList.includes(email.toLowerCase())) {
        nextList.push(email.toLowerCase());
      }
    }

    setBlockedMatchUsers(nextList);
    localStorage.setItem('cachengueoo_blocked_match_users', JSON.stringify(nextList));
    window.dispatchEvent(
      new CustomEvent('cachengueoo_blocked_users_change', { detail: nextList })
    );

    // Si el modal está abierto para este usuario, actualizar su estado reflejado
    if (selectedUserDetail && (selectedUserDetail.id === userId || selectedUserDetail.email === email)) {
      setSelectedUserDetail({
        ...selectedUserDetail,
        isBlocked: !isCurrentlyBlocked,
      });
    }
  };

  React.useEffect(() => {
    const fetchUsers = async () => {
      const localUsers = authService.getAllUsers();
      const supabase = getSupabaseClient();
      let dbUsers: any[] = [];
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
          if (!error && data) {
            dbUsers = data;
          }
        } catch (e) {
          console.warn('Error loading users from Supabase:', e);
        }
      }

      const mergedMap = new Map<string, any>();
      dbUsers.forEach((u) => {
        const unpacked = unpackProfileInterests(u.interests);
        mergedMap.set(u.id || u.email, {
          ...u,
          fullName: u.full_name || u.fullName,
          nickname: u.nickname || u.full_name,
          zodiacSign: unpacked.zodiacSign || u.zodiac_sign,
          musicPreferences: unpacked.musicPreferences,
          drinks: unpacked.drinks,
          photos:
            Array.isArray(u.photos) && u.photos.length > 0
              ? u.photos
              : [u.avatar_url, ...unpacked.extraPhotos].filter(Boolean),
        });
      });

      localUsers.forEach((u) => {
        const key = u.id || u.email;
        if (mergedMap.has(key)) {
          const existing = mergedMap.get(key);
          mergedMap.set(key, { ...existing, ...u });
        } else {
          mergedMap.set(key, u);
        }
      });

      setRegisteredUsers(Array.from(mergedMap.values()));
    };
    fetchUsers();
  }, [adminTab]);


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
    const newToken = presenceService.generateNewNightQr(activeEvent?.id || 'event_cachengueoo');
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

  // Toggle beneficio activo
  const handleToggleBenefit = (id: string) => {
    benefitService.toggleBenefit(id);
    setBenefits(benefitService.getBenefits());
  };

  // Eliminar beneficio
  const handleDeleteBenefit = (id: string) => {
    benefitService.deleteBenefit(id);
    setBenefits(benefitService.getBenefits());
  };

  // Abrir modal para crear nuevo beneficio
  const handleOpenCreateBenefit = () => {
    setEditingBenefitId(null);
    setNewBenTitle('SportClub · Gimnasio & Fitness');
    setNewBenPartnerName('SportClub');
    setNewBenBadge('10% OFF');
    setNewBenDescription(
      'Por ser parte de Cachengueoo tenés el 10% de descuento en tu cuota de SportClub. Entrá a la web, ingresá el código CACHESPORT o escribí por WhatsApp para activar tu beneficio.'
    );
    // El código de descuento es opcional: si es por WhatsApp no hace falta, si es web se coloca
    setNewBenPromoCode('');
    setNewBenActionUrl(
      'https://wa.me/5492615551234?text=Hola%20SportClub!%20Vengo%20de%20Cachengueoo%20y%20quiero%20el%2010%25%20de%20descuento'
    );
    setNewBenActionType('whatsapp');
    setNewBenActionLabel('Obtener beneficio');
    setNewBenCategory('Gimnasio & Salud');
    setNewBenImageUrl(PRESET_BENEFIT_IMAGES[0].url);
    setShowNewBenefitModal(true);
  };

  // Abrir modal para editar beneficio existente
  const handleOpenEditBenefit = (b: ClubBenefit) => {
    setEditingBenefitId(b.id);
    setNewBenTitle(b.title);
    setNewBenPartnerName(b.partnerName || b.title);
    setNewBenBadge(b.highlightBadge || '10% OFF');
    setNewBenDescription(b.description);
    setNewBenPromoCode(b.promoCode || '');
    setNewBenActionUrl(b.actionUrl);
    setNewBenActionType(
      b.actionType ||
        (b.actionUrl.includes('wa.me') || b.actionUrl.includes('whatsapp') ? 'whatsapp' : 'web')
    );
    setNewBenActionLabel(b.actionLabel || 'Obtener beneficio');
    setNewBenCategory(b.category || 'Gimnasio & Salud');
    setNewBenImageUrl(b.imageUrl || PRESET_BENEFIT_IMAGES[0].url);
    setShowNewBenefitModal(true);
  };

  // Carga de imagen de beneficio desde el dispositivo
  const handleBenefitImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setNewBenImageUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Guardar beneficio (crear nuevo o actualizar existente)
  const handleSaveBenefit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBenTitle.trim() || !newBenActionUrl.trim()) return;

    const formattedUrl = newBenActionUrl.trim().startsWith('http')
      ? newBenActionUrl.trim()
      : `https://${newBenActionUrl.trim()}`;

    const cleanPromoCode = newBenPromoCode.trim();

    const benefitData = {
      title: newBenTitle.trim(),
      partnerName: newBenTitle.trim(),
      highlightBadge: newBenBadge.trim() || '10% OFF',
      description: newBenDescription.trim(),
      promoCode: cleanPromoCode ? cleanPromoCode.toUpperCase() : undefined,
      actionUrl: formattedUrl,
      actionType: newBenActionType,
      actionLabel: newBenActionLabel.trim() || 'Obtener beneficio',
      category: newBenCategory.trim() || 'Gimnasio & Salud',
      imageUrl: newBenImageUrl,
      active: true,
    };

    if (editingBenefitId) {
      benefitService.updateBenefit(editingBenefitId, benefitData);
    } else {
      benefitService.addBenefit(benefitData);
    }

    setBenefits(benefitService.getBenefits());
    setShowNewBenefitModal(false);
    setEditingBenefitId(null);
  };

  // Birthday status change
  const handleBirthdayStatus = (id: string, status: 'pending' | 'approved' | 'contacted') => {
    birthdayService.updateRequestStatus(id, status);
    setBirthdays(birthdayService.getRequests());
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
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onExitAdmin && (
            <button
              type="button"
              onClick={onExitAdmin}
              className="h-10 px-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-[#F39200] text-zinc-200 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm"
              title="Volver a la vista normal de la aplicación"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#F39200]" />
              <span>Volver a la App</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (onLogout) {
                onLogout();
              } else {
                authService.logout();
                window.location.hash = '';
                window.location.reload();
              }
            }}
            className="h-10 px-3.5 rounded-xl bg-red-950/40 border border-red-500/40 hover:bg-red-900/60 text-red-300 hover:text-red-100 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm"
            title="Cerrar sesión de administrador"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>

      {/* Admin Tab Navigation */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar p-1 bg-zinc-900/80 border border-zinc-800 rounded-2xl">
        {[
          { id: 'eventos', label: 'Eventos', icon: Calendar },
          { id: 'beneficios', label: 'Beneficios', icon: Gift },
          { id: 'presencia', label: 'Presencia', icon: MapPin },
          { id: 'entradas', label: 'Control de Entradas', icon: Ticket },
          { id: 'usuarios', label: 'Usuarios', icon: Users },
          { id: 'cumpleanos', label: 'Cumpleaños', icon: Cake },
          { id: 'venue', label: 'Configuración Geográfica', icon: ScanLine },
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
          {(() => {
            const verifiedInside = registeredUsers.filter(
              (u: any) => Boolean(u.is_verified_in_venue || u.isVerified)
            );
            const totalInside = verifiedInside.length;
            const gpsCount = verifiedInside.filter(
              (u: any) => u.presence_method === 'GPS' || u.presenceMethod === 'GPS'
            ).length;
            const qrCount = verifiedInside.filter(
              (u: any) => u.presence_method === 'QR' || u.presenceMethod === 'QR'
            ).length;
            const otherCount = totalInside - gpsCount - qrCount;
            const finalQrCount = qrCount + (otherCount > 0 && gpsCount === 0 ? otherCount : 0);
            const capacityLimit = 800;
            const capacityPct =
              totalInside > 0 ? Math.min(100, Math.round((totalInside / capacityLimit) * 100)) : 0;

            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-3xl bg-[#121217] border border-zinc-800 space-y-1">
                  <span className="text-xs text-zinc-400">Total Personas Adentro</span>
                  <span className="text-3xl font-black text-white font-mono block">{totalInside}</span>
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${totalInside > 0 ? 'bg-emerald-400 animate-ping' : 'bg-zinc-600'}`}></span>
                    Capacidad en vivo: {capacityPct}%
                  </span>
                </div>

                <div className="p-5 rounded-3xl bg-[#121217] border border-zinc-800 space-y-1">
                  <span className="text-xs text-zinc-400">Validados por GPS</span>
                  <span className="text-3xl font-black text-[#F39200] font-mono block">{gpsCount}</span>
                  <span className="text-[11px] text-zinc-400">
                    {totalInside > 0 ? `${Math.round((gpsCount / totalInside) * 100)}% del total` : 'Sin registros aún'}
                  </span>
                </div>

                <div className="p-5 rounded-3xl bg-[#121217] border border-zinc-800 space-y-1">
                  <span className="text-xs text-zinc-400">Validados por QR Puerta</span>
                  <span className="text-3xl font-black text-amber-300 font-mono block">{finalQrCount}</span>
                  <span className="text-[11px] text-zinc-400">
                    {totalInside > 0 ? `${Math.round((finalQrCount / totalInside) * 100)}% del total` : 'Sin registros aún'}
                  </span>
                </div>
              </div>
            );
          })()}

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
              Usuarios Validados en Cachengueoo ({registeredUsers.filter((u: any) => u.is_verified_in_venue).length})
            </h3>

            <div className="divide-y divide-zinc-800/80">
              {registeredUsers.filter((u: any) => u.is_verified_in_venue).length === 0 ? (
                <div className="py-6 text-center text-zinc-500 text-xs">
                  No hay usuarios con presencia activa validada en este momento.
                </div>
              ) : (
                registeredUsers
                  .filter((u: any) => u.is_verified_in_venue)
                  .map((usr: any) => (
                    <div key={usr.id || usr.userId} className="py-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            usr.avatar_url ||
                            usr.avatarUrl ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'
                          }
                          alt={usr.full_name || usr.fullName || usr.nickname}
                          className="w-10 h-10 rounded-full object-cover border border-zinc-700"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <h4 className="font-bold text-white">{usr.full_name || usr.fullName || usr.nickname}</h4>
                          <p className="text-[11px] text-zinc-400">{usr.email || 'Presencia GPS confirmada'}</p>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 font-semibold text-[10px]">
                        Activo en Pista 🔥
                      </span>
                    </div>
                  ))
              )}
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

                    <button
                      type="button"
                      onClick={() => setEventToDelete(evt)}
                      className="p-2 rounded-xl bg-zinc-900 hover:bg-red-950/40 border border-zinc-800 hover:border-red-500/40 text-zinc-500 hover:text-red-400 cursor-pointer transition-colors"
                      title="Eliminar evento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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

      {/* TAB: GESTIÓN DE BENEFICIOS */}
      {adminTab === 'beneficios' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#121217] border border-zinc-800 shadow-xl">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Gift className="w-4 h-4 text-[#F39200]" />
                <span className="text-[10px] uppercase font-bold text-[#F39200] tracking-widest">
                  ALIANZAS & CONVENIOS COMERCIALES
                </span>
              </div>
              <h3 className="text-xl font-black text-white font-display uppercase tracking-tight">
                GESTIÓN DE BENEFICIOS <span className="text-[#F39200]">CACHENGUEOO</span>
              </h3>
            </div>

            <button
              type="button"
              onClick={handleOpenCreateBenefit}
              className="h-11 px-5 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-extrabold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-[#F39200]/25 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Nuevo Beneficio
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-[#121217] border border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-zinc-400 block font-medium">Total Alianzas</span>
                <span className="text-2xl font-black text-white font-mono mt-0.5 block">{benefits.length}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#F39200]/15 border border-[#F39200]/30 flex items-center justify-center text-[#F39200]">
                <Gift className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#121217] border border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-zinc-400 block font-medium">Beneficios Activos</span>
                <span className="text-2xl font-black text-emerald-400 font-mono mt-0.5 block">
                  {benefits.filter((b) => b.active).length}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#121217] border border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-zinc-400 block font-medium">Alianza Principal</span>
                <span className="text-sm font-bold text-white mt-1 block truncate max-w-[150px]">
                  {benefits[0]?.partnerName || 'SportClub'}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
                <Percent className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Benefits Cards List */}
          <div className="space-y-4">
            {benefits.length === 0 ? (
              <div className="p-8 rounded-3xl bg-[#121217] border border-zinc-800 text-center space-y-3">
                <Gift className="w-10 h-10 text-zinc-600 mx-auto" />
                <h4 className="text-sm font-bold text-white">No hay beneficios cargados</h4>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Agregá el beneficio de SportClub u otras alianzas comerciales haciendo click en "Nuevo Beneficio".
                </p>
                <button
                  type="button"
                  onClick={handleOpenCreateBenefit}
                  className="h-10 px-4 rounded-xl bg-[#F39200] text-black font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Cargar Alianza SportClub
                </button>
              </div>
            ) : (
              benefits.map((b) => {
                const isWhatsApp =
                  b.actionType === 'whatsapp' ||
                  b.actionUrl.includes('wa.me') ||
                  b.actionUrl.includes('whatsapp');

                return (
                  <div
                    key={b.id}
                    className="p-5 rounded-3xl bg-[#121217] border border-zinc-800 hover:border-zinc-700/80 transition-all space-y-4 shadow-lg"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      {/* Left: Thumbnail + Title + Highlight badge */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="relative w-24 h-16 rounded-2xl overflow-hidden bg-zinc-900 shrink-0 border border-zinc-800">
                          <img
                            src={b.imageUrl || PRESET_BENEFIT_IMAGES[0].url}
                            alt={b.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-lg bg-gradient-to-r from-amber-400 to-[#F39200] text-black font-black text-[9px] font-display shadow">
                            {b.highlightBadge || '10% OFF'}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-[#F39200]">
                              {b.category || 'Gimnasio & Salud'}
                            </span>
                          </div>
                          <h4 className="text-base font-extrabold text-white truncate font-display">
                            {b.title}
                          </h4>
                          {Boolean(b.promoCode && b.promoCode.trim().length > 0) && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-300 font-mono font-bold mt-0.5">
                              <Tag className="w-3 h-3 text-[#F39200]" />
                              Código: {b.promoCode}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Toggle Active + Edit + Delete */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleToggleBenefit(b.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            b.active
                              ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400'
                              : 'bg-zinc-900 border border-zinc-800 text-zinc-500'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              b.active ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
                            }`}
                          />
                          {b.active ? 'ACTIVO' : 'PAUSADO'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditBenefit(b)}
                          className="h-8 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                          title="Editar beneficio"
                        >
                          <Pencil className="w-3.5 h-3.5 text-[#F39200]" />
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => setBenefitToDelete(b)}
                          className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-red-950/40 border border-zinc-800 hover:border-red-500/40 text-zinc-500 hover:text-red-400 flex items-center justify-center cursor-pointer transition-colors"
                          title="Eliminar beneficio"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Description preview */}
                    <p className="text-xs text-zinc-300 bg-zinc-950/60 p-3 rounded-2xl border border-zinc-900 leading-relaxed font-normal">
                      {b.description}
                    </p>

                    {/* Action link & redirection target */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs border-t border-zinc-800/60">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[11px] text-zinc-500 font-medium">Redirección:</span>
                        <a
                          href={b.actionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white truncate max-w-xs sm:max-w-md group"
                        >
                          {isWhatsApp ? (
                            <MessageCircle className="w-3.5 h-3.5 text-[#25D366] shrink-0" />
                          ) : (
                            <ExternalLink className="w-3.5 h-3.5 text-[#F39200] shrink-0" />
                          )}
                          <span className="truncate underline decoration-zinc-700 underline-offset-2">
                            {b.actionUrl}
                          </span>
                        </a>
                      </div>

                      <span className="text-[11px] font-bold text-zinc-400">
                        Botón: <strong className="text-white">{b.actionLabel || 'Obtener beneficio'}</strong>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
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
        <div className="p-6 rounded-3xl bg-[#121217] border border-zinc-800 space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white font-display">Usuarios Registrados</h3>
              <p className="text-xs text-zinc-400">
                Control de perfiles reales, historial y moderación de acceso a Match.
              </p>
            </div>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[#F39200]">
              {registeredUsers.length} perfiles en sistema
            </span>
          </div>

          {/* BUSCADOR DE USUARIOS */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nombre, apodo, email o instagram..."
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-10 rounded-2xl bg-zinc-900/90 border border-zinc-700/80 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-[#F39200] transition-colors"
            />
            {userSearchQuery && (
              <button
                type="button"
                onClick={() => setUserSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* LISTADO DE USUARIOS */}
          <div className="divide-y divide-zinc-800/80">
            {(() => {
              const query = userSearchQuery.trim().toLowerCase();
              const filtered = registeredUsers.filter((usr: any) => {
                if (!query) return true;
                const name = (usr.full_name || usr.fullName || '').toLowerCase();
                const nick = (usr.nickname || '').toLowerCase();
                const email = (usr.email || '').toLowerCase();
                const ig = (usr.instagram || '').toLowerCase();
                return (
                  name.includes(query) ||
                  nick.includes(query) ||
                  email.includes(query) ||
                  ig.includes(query)
                );
              });

              if (filtered.length === 0) {
                return (
                  <div className="py-12 text-center text-zinc-500 text-xs space-y-2">
                    <Users className="w-8 h-8 text-zinc-600 mx-auto" />
                    <p className="font-bold text-zinc-300">
                      {registeredUsers.length === 0
                        ? 'No hay usuarios registrados por el momento'
                        : `No se encontraron usuarios para "${userSearchQuery}"`}
                    </p>
                    <p className="max-w-xs mx-auto text-zinc-500 text-[11px]">
                      {registeredUsers.length === 0
                        ? 'A medida que los usuarios reales se registren o inicien sesión con su Cache ID, aparecerán en este listado.'
                        : 'Probá buscando con otro nombre, apodo, correo o usuario de Instagram.'}
                    </p>
                  </div>
                );
              }

              return filtered.map((usr: any) => {
                const id = usr.id || usr.userId;
                const name = usr.full_name || usr.fullName || usr.nickname || 'Usuario';
                const nick = usr.nickname || usr.full_name || '';
                const age = usr.age || 23;
                const email = usr.email || '';
                const ig = usr.instagram ? usr.instagram.replace(/^@/, '') : '';
                const drink = usr.drink_favorite || usr.drinkFavorite || 'Fernet con Coca';
                const avatar =
                  usr.avatar_url ||
                  usr.avatarUrl ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';
                const isVerified = Boolean(usr.is_verified_in_venue ?? usr.isVerified ?? false);

                const isBlockedFromMatch =
                  blockedMatchUsers.includes(id) ||
                  (email ? blockedMatchUsers.includes(email.toLowerCase()) : false);

                const unpacked = unpackProfileInterests(usr.interests);
                const zodiac = unpacked.zodiacSign || usr.zodiac_sign || usr.zodiacSign;

                return (
                  <div
                    key={id}
                    className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={avatar}
                        alt={name}
                        className="w-12 h-12 rounded-2xl object-cover border border-zinc-700 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-white font-display text-sm truncate">
                            {name}
                          </h4>
                          {nick && nick !== name && (
                            <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] font-mono">
                              "{nick}"
                            </span>
                          )}
                          {isBlockedFromMatch ? (
                            <span className="px-2 py-0.5 rounded-full bg-red-950/80 border border-red-500/50 text-red-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                              <Ban className="w-3 h-3" />
                              Bloqueado de Match
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                              <UserCheck className="w-3 h-3" />
                              Activo en Match
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
                          {age} años {zodiac ? `· ${zodiac}` : ''} · Trago: <span className="text-zinc-300">{drink}</span>
                        </p>

                        <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-400 flex-wrap">
                          {email && (
                            <span className="text-zinc-400 font-mono truncate max-w-[200px]">
                              {email}
                            </span>
                          )}
                          {ig && (
                            <span className="text-[#F39200] font-bold flex items-center gap-0.5">
                              <Instagram className="w-3 h-3" />@{ig}
                            </span>
                          )}
                          <span
                            className={`flex items-center gap-1 font-medium ${
                              isVerified ? 'text-emerald-400' : 'text-zinc-500'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isVerified ? 'bg-emerald-400' : 'bg-zinc-600'
                              }`}
                            />
                            {isVerified ? 'Adentro' : 'Sin presencia'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* BOTONES DE ACCIÓN */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => setSelectedUserDetail(usr)}
                        className="h-8 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-[#F39200] text-zinc-200 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Ver ficha completa y fotos"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#F39200]" />
                        <span>Ver Detalle</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleBlockMatch(id, email)}
                        className={`h-8 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isBlockedFromMatch
                            ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                            : 'bg-red-950/50 border-red-500/40 text-red-300 hover:bg-red-900/60'
                        }`}
                        title={
                          isBlockedFromMatch
                            ? 'Habilitar a este usuario en Match'
                            : 'Bloquear permanentemente de Match'
                        }
                      >
                        {isBlockedFromMatch ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Desbloquear</span>
                          </>
                        ) : (
                          <>
                            <Ban className="w-3.5 h-3.5 text-red-400" />
                            <span>Bloquear</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setUserToDelete(usr)}
                        className="h-8 px-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 hover:border-red-500 text-red-400 hover:text-white transition-all cursor-pointer flex items-center justify-center shadow-sm"
                        title="Eliminar usuario definitivamente del sistema"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* MODAL: VER DETALLE DE USUARIO Y MODERACIÓN */}
      {selectedUserDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#121217] border border-zinc-800 rounded-3xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Cabecera */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#F39200] tracking-wider block">
                  Ficha Técnica de Usuario
                </span>
                <h4 className="text-base font-bold text-white font-display mt-0.5">
                  {selectedUserDetail.full_name || selectedUserDetail.fullName || selectedUserDetail.nickname || 'Detalle del Perfil'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserDetail(null)}
                className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Galería de fotos (hasta 3 fotos obligatorias/cargadas) */}
            {(() => {
              const unpacked = unpackProfileInterests(selectedUserDetail.interests);
              const avatar =
                selectedUserDetail.avatar_url ||
                selectedUserDetail.avatarUrl ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';
              const rawPhotos = Array.isArray(selectedUserDetail.photos) && selectedUserDetail.photos.length > 0
                ? selectedUserDetail.photos
                : [avatar, ...unpacked.extraPhotos];
              const photos = rawPhotos.filter(Boolean).slice(0, 3);

              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-300">
                      Fotos de Perfil ({photos.length}/3)
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      Subidas por el usuario
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((url: string, idx: number) => (
                      <div
                        key={idx}
                        className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 group"
                      >
                        <img
                          src={url}
                          alt={`Foto ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-[9px] font-bold text-[#F39200]">
                          #{idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Información Personal y Preferencias */}
            {(() => {
              const unpacked = unpackProfileInterests(selectedUserDetail.interests);
              const id = selectedUserDetail.id || selectedUserDetail.userId;
              const email = selectedUserDetail.email || '';
              const isBlocked =
                blockedMatchUsers.includes(id) ||
                (email ? blockedMatchUsers.includes(email.toLowerCase()) : false);

              const name =
                selectedUserDetail.full_name ||
                selectedUserDetail.fullName ||
                selectedUserDetail.nickname ||
                '—';
              const nick = selectedUserDetail.nickname || '—';
              const age = selectedUserDetail.age || '—';
              const birthDate = selectedUserDetail.birth_date || selectedUserDetail.birthDate || '—';
              const zodiac =
                unpacked.zodiacSign ||
                selectedUserDetail.zodiac_sign ||
                selectedUserDetail.zodiacSign ||
                '—';
              const drink =
                selectedUserDetail.drink_favorite ||
                selectedUserDetail.drinkFavorite ||
                (unpacked.drinks.length > 0 ? unpacked.drinks.join(', ') : '—');
              const ig = (selectedUserDetail.instagram || '').replace(/^@/, '');
              const bio =
                selectedUserDetail.bio ||
                selectedUserDetail.description ||
                'Sin biografía configurada.';
              const isVerified = Boolean(
                selectedUserDetail.is_verified_in_venue ??
                  selectedUserDetail.isVerified ??
                  false
              );

              const music =
                unpacked.musicPreferences.length > 0
                  ? unpacked.musicPreferences
                  : Array.isArray(selectedUserDetail.music_preferences)
                  ? selectedUserDetail.music_preferences
                  : [];

              return (
                <div className="space-y-4 text-xs">
                  {/* Grid de Datos */}
                  <div className="grid grid-cols-2 gap-2.5 p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold">
                        Nombre Real
                      </span>
                      <span className="text-white font-bold text-xs">{name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold">
                        Apodo / Sobrenombre
                      </span>
                      <span className="text-[#F39200] font-bold text-xs">"{nick}"</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold">
                        Edad / Cumpleaños
                      </span>
                      <span className="text-zinc-200">
                        {age} años {birthDate !== '—' ? `(${birthDate})` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold">
                        Signo Zodíaco
                      </span>
                      <span className="text-zinc-200">{zodiac}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold">
                        Trago Favorito
                      </span>
                      <span className="text-zinc-200 flex items-center gap-1">
                        <GlassWater className="w-3 h-3 text-[#F39200]" />
                        {drink}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold">
                        Presencia en Fiesta
                      </span>
                      <span
                        className={`font-bold flex items-center gap-1 ${
                          isVerified ? 'text-emerald-400' : 'text-zinc-500'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isVerified ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
                          }`}
                        />
                        {isVerified ? 'Verificado en el boliche' : 'Sin presencia activa'}
                      </span>
                    </div>
                  </div>

                  {/* Redes y Contacto */}
                  <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold">
                        Contacto e Instagram
                      </span>
                      {ig && (
                        <a
                          href={`https://instagram.com/${ig}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-bold text-[#F39200] hover:underline flex items-center gap-1"
                        >
                          <Instagram className="w-3.5 h-3.5" />
                          Ver en Instagram
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <div className="text-zinc-300 font-mono text-[11px] flex flex-col gap-1">
                      {email && <span>Email: {email}</span>}
                      {ig && <span>Instagram: @{ig}</span>}
                    </div>
                  </div>

                  {/* Gustos Musicales */}
                  {music.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1.5">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold block">
                        Géneros Musicales
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {music.map((genre: string, i: number) => (
                          <span
                            key={i}
                            className="px-2.5 py-0.5 rounded-lg bg-zinc-800 text-zinc-300 text-[11px] border border-zinc-700/60"
                          >
                            🎵 {genre}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Biografía */}
                  <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold block">
                      Biografía / Notita
                    </span>
                    <p className="text-zinc-300 italic leading-relaxed text-xs">
                      "{bio}"
                    </p>
                  </div>

                  {/* SECCIÓN DE MODERACIÓN Y BLOQUEO DE MATCH */}
                  <div
                    className={`p-4 rounded-2xl border space-y-3 ${
                      isBlocked
                        ? 'bg-red-950/30 border-red-500/40'
                        : 'bg-zinc-950/80 border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isBlocked ? (
                          <Ban className="w-4 h-4 text-red-400 shrink-0" />
                        ) : (
                          <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                        <span className="text-xs font-bold text-white">
                          Estado en Cachengueoo Match:
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isBlocked
                            ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {isBlocked ? 'Acceso Bloqueado' : 'Habilitado'}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-400 leading-snug">
                      {isBlocked
                        ? 'Este usuario tiene prohibido el ingreso a Match por reportes o mal comportamiento. No puede deslizar ni interactuar, y su perfil fue removido de la baraja de los demás.'
                        : 'Si el usuario tiene un comportamiento inadecuado, podés bloquearlo permanentemente de la sección de Match.'}
                    </p>

                    <button
                      type="button"
                      onClick={() => handleToggleBlockMatch(id, email)}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        isBlocked
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/40'
                          : 'bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-900/40'
                      }`}
                    >
                      {isBlocked ? (
                        <>
                          <UserCheck className="w-4 h-4" />
                          <span>Desbloquear y Permitir Acceso a Match</span>
                        </>
                      ) : (
                        <>
                          <Ban className="w-4 h-4" />
                          <span>Bloquear Permanentemente de Match</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* SECCIÓN DE ELIMINACIÓN DEFINITIVA */}
                  <div className="pt-2 border-t border-zinc-800/80">
                    <button
                      type="button"
                      onClick={() => {
                        const target = selectedUserDetail;
                        setSelectedUserDetail(null);
                        setUserToDelete(target);
                      }}
                      className="w-full py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      <span>Eliminar Usuario de la Plataforma</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Botón Cerrar */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedUserDetail(null)}
                className="w-full h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold text-xs cursor-pointer transition-colors"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ELIMINACIÓN DE USUARIO */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#121217] border border-red-500/40 rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl shadow-red-950/40">
            <div className="w-14 h-14 rounded-2xl bg-red-950/80 border border-red-500/50 flex items-center justify-center mx-auto text-red-400">
              <Trash2 className="w-7 h-7" />
            </div>

            <div className="text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider">
                Zona de Peligro
              </span>
              <h4 className="text-base font-black text-white font-display">
                ¿Eliminar a {userToDelete.full_name || userToDelete.fullName || userToDelete.nickname || 'este usuario'}?
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Esta acción eliminará de forma permanente la cuenta, perfil, fotos y accesos del usuario en la plataforma y base de datos.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-[11px] text-zinc-300 space-y-1">
              <p className="font-semibold text-white">
                {userToDelete.full_name || userToDelete.fullName || userToDelete.nickname}
              </p>
              {userToDelete.email && <p className="text-zinc-400 font-mono text-[10px]">{userToDelete.email}</p>}
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={() => setUserToDelete(null)}
                className="flex-1 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold text-xs cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={handleConfirmDeleteUser}
                className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs cursor-pointer transition-colors shadow-lg shadow-red-950/60 flex items-center justify-center gap-1.5"
              >
                {isDeletingUser ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Borrando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sí, Eliminar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ELIMINACIÓN DE EVENTO */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#121217] border border-red-500/40 rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl shadow-red-950/40">
            <div className="w-14 h-14 rounded-2xl bg-red-950/80 border border-red-500/50 flex items-center justify-center mx-auto text-red-400">
              <Trash2 className="w-7 h-7" />
            </div>

            <div className="text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider">
                Zona de Peligro
              </span>
              <h4 className="text-base font-black text-white font-display">
                ¿Eliminar {eventToDelete.title}?
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Esta acción eliminará de forma permanente el evento de la cartelera y de la base de datos.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-[11px] text-zinc-300 space-y-1">
              <p className="font-semibold text-white">{eventToDelete.title}</p>
              <p className="text-zinc-400 text-[10px]">{eventToDelete.dateStr} · {eventToDelete.timeRange}</p>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setEventToDelete(null)}
                className="flex-1 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold text-xs cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDeleteEvent(eventToDelete.id);
                  setEventToDelete(null);
                }}
                className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs cursor-pointer transition-colors shadow-lg shadow-red-950/60 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sí, Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ELIMINACIÓN DE BENEFICIO */}
      {benefitToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#121217] border border-red-500/40 rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl shadow-red-950/40">
            <div className="w-14 h-14 rounded-2xl bg-red-950/80 border border-red-500/50 flex items-center justify-center mx-auto text-red-400">
              <Trash2 className="w-7 h-7" />
            </div>

            <div className="text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider">
                Zona de Peligro
              </span>
              <h4 className="text-base font-black text-white font-display">
                ¿Eliminar {benefitToDelete.title}?
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Esta acción eliminará de forma permanente el beneficio y sus accesos de la plataforma.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-[11px] text-zinc-300 space-y-1">
              <p className="font-semibold text-white">{benefitToDelete.title}</p>
              <p className="text-zinc-400 text-[10px]">{benefitToDelete.highlightBadge} · {benefitToDelete.partnerName || 'Alianza'}</p>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setBenefitToDelete(null)}
                className="flex-1 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold text-xs cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDeleteBenefit(benefitToDelete.id);
                  setBenefitToDelete(null);
                }}
                className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs cursor-pointer transition-colors shadow-lg shadow-red-950/60 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sí, Eliminar</span>
              </button>
            </div>
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

      {/* TAB: CONFIGURACIÓN GEOGRÁFICA MULTILOCACIÓN CON MAPA INTERACTIVO */}
      {adminTab === 'venue' && (
        <VenueMapEditor
          venueConfig={venueConfig}
          onSaveConfig={(updated) => {
            saveVenueConfig(updated);
            setVenueState(updated);
          }}
        />
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

      {/* CREATE / EDIT BENEFIT MODAL */}
      {showNewBenefitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#121217] border border-zinc-800 rounded-3xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#F39200] tracking-wider block">
                  Gestión de Alianzas
                </span>
                <h4 className="text-base font-bold text-white font-display mt-0.5">
                  {editingBenefitId ? 'Editar Beneficio' : 'Nuevo Beneficio / Alianza'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowNewBenefitModal(false)}
                className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBenefit} className="space-y-4 text-xs">
              {/* 1. TÍTULO (PRIMERO) */}
              <div>
                <label className="text-zinc-300 block mb-1 font-bold">
                  Título <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. SportClub · Gimnasio & Fitness"
                  value={newBenTitle}
                  onChange={(e) => setNewBenTitle(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-none focus:border-[#F39200]"
                />
              </div>

              {/* 2. BENEFICIO RESALTADO (LUEGO DEL TÍTULO) */}
              <div>
                <label className="text-zinc-300 block mb-1 font-bold flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#F39200]" />
                  Beneficio Resaltado <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. 10% OFF, 2x1, 15% OFF"
                  value={newBenBadge}
                  onChange={(e) => setNewBenBadge(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-amber-500/40 text-amber-300 font-black tracking-wide text-xs focus:outline-none focus:border-[#F39200]"
                />
              </div>

              {/* 3. DESCRIPCIÓN DEL BENEFICIO */}
              <div>
                <label className="text-zinc-300 block mb-1 font-bold">
                  Descripción del Beneficio <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Por ser parte de Cachengueoo tenés el 10% de descuento en tu cuota de SportClub. Entrá a la web, ingresá el código CACHESPORT o escribinos por WhatsApp..."
                  value={newBenDescription}
                  onChange={(e) => setNewBenDescription(e.target.value)}
                  className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-none focus:border-[#F39200] leading-relaxed resize-none"
                />
              </div>

              {/* 4. LINK DE REDIRECCIÓN (DONDE LO ENVÍA) */}
              <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-[#F39200]/40 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-white font-black flex items-center gap-1.5 text-xs">
                    <ExternalLink className="w-3.5 h-3.5 text-[#F39200]" />
                    Link de Redirección del Botón <span className="text-red-400">*</span>
                  </label>
                  <span className="text-[10px] text-zinc-400 font-mono">WhatsApp o Web</span>
                </div>

                <input
                  type="text"
                  required
                  placeholder="ej. https://wa.me/5492615551234?text=... o https://sportclub.com.ar"
                  value={newBenActionUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewBenActionUrl(val);
                    if (val.includes('wa.me') || val.includes('whatsapp')) {
                      setNewBenActionType('whatsapp');
                      if (!newBenActionLabel) setNewBenActionLabel('Obtener beneficio');
                    } else if (val.includes('http')) {
                      setNewBenActionType('web');
                      if (!newBenActionLabel) setNewBenActionLabel('Obtener beneficio');
                    }
                  }}
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono text-xs focus:outline-none focus:border-[#F39200]"
                />

                {/* Tipo de Redirección & Botón */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setNewBenActionType('whatsapp');
                      if (!newBenActionLabel) {
                        setNewBenActionLabel('Obtener beneficio');
                      }
                    }}
                    className={`h-9 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      newBenActionType === 'whatsapp'
                        ? 'bg-[#25D366] text-black font-extrabold shadow-sm'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    WhatsApp
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewBenActionType('web');
                      if (!newBenActionLabel) {
                        setNewBenActionLabel('Obtener beneficio');
                      }
                    }}
                    className={`h-9 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      newBenActionType === 'web'
                        ? 'bg-[#F39200] text-black font-extrabold shadow-sm'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Sitio Web
                  </button>
                </div>

                {/* Texto del Botón */}
                <div>
                  <label className="text-zinc-400 block mb-1 text-[11px] font-medium">
                    Texto a mostrar en el botón
                  </label>
                  <input
                    type="text"
                    placeholder="Obtener beneficio"
                    value={newBenActionLabel}
                    onChange={(e) => setNewBenActionLabel(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-[#F39200]"
                  />
                </div>
              </div>

              {/* 5. CÓDIGO PROMOCIONAL Y CATEGORÍA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-zinc-300 font-bold flex items-center gap-1">
                      <Tag className="w-3 h-3 text-[#F39200]" />
                      Código de Descuento (Opcional)
                    </label>
                    <span className="text-[10px] text-zinc-500 font-medium">Solo si tiene web</span>
                  </div>
                  <input
                    type="text"
                    placeholder="ej. CACHESPORT"
                    value={newBenPromoCode}
                    onChange={(e) => setNewBenPromoCode(e.target.value.toUpperCase())}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-amber-300 font-mono font-bold text-xs uppercase focus:outline-none focus:border-[#F39200]"
                  />
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    Dejá vacío si la alianza es solo WhatsApp o no requiere cupón (no saldrá en la tarjeta).
                  </span>
                </div>

                <div>
                  <label className="text-zinc-300 block mb-1 font-bold">
                    Categoría
                  </label>
                  <select
                    value={newBenCategory}
                    onChange={(e) => setNewBenCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-[#F39200]"
                  >
                    <option value="Gimnasio & Salud">Gimnasio & Salud</option>
                    <option value="Gastronomía & Bares">Gastronomía & Bares</option>
                    <option value="Indumentaria & Moda">Indumentaria & Moda</option>
                    <option value="Barbería & Estética">Barbería & Estética</option>
                    <option value="Boliches & Afters">Boliches & Afters</option>
                    <option value="Alianza Exclusiva">Alianza Exclusiva</option>
                  </select>
                </div>
              </div>

              {/* 6. IMAGEN DE PORTADA (CON EJEMPLOS Y SUBIDA DE IMAGEN) */}
              <div className="space-y-3">
                <label className="text-zinc-300 block font-bold">
                  Imagen de Portada <span className="text-red-400">*</span>
                </label>

                {/* Vista previa de la imagen seleccionada o subida */}
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-zinc-700 bg-zinc-950 shadow-md">
                  <img
                    src={newBenImageUrl || PRESET_BENEFIT_IMAGES[0].url}
                    alt="Vista previa portada"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-black/75 backdrop-blur-md text-[10px] font-bold text-[#F39200] border border-white/10">
                    Portada Seleccionada
                  </div>
                </div>

                {/* Botón para subir imagen desde el dispositivo */}
                <div>
                  <label className="w-full h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-[#F39200] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all">
                    <Upload className="w-4 h-4 text-[#F39200]" />
                    Subir imagen desde tu dispositivo (Galería / Archivos)
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBenefitImageFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Ejemplos de imágenes predeterminadas */}
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1.5">
                    O elegir entre las opciones de ejemplo:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PRESET_BENEFIT_IMAGES.map((preset, idx) => {
                      const isSelected = newBenImageUrl === preset.url;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setNewBenImageUrl(preset.url)}
                          className={`relative aspect-video rounded-xl overflow-hidden border-2 text-left cursor-pointer transition-all ${
                            isSelected
                              ? 'border-[#F39200] ring-2 ring-[#F39200]/40'
                              : 'border-zinc-800 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={preset.url}
                            alt={preset.label}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1.5">
                            <span className="text-[10px] text-white font-bold leading-tight line-clamp-1">
                              {preset.label}
                            </span>
                          </div>
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#F39200] text-black flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* BOTONES */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewBenefitModal(false)}
                  className="flex-1 h-11 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-extrabold cursor-pointer transition-all shadow-md shadow-[#F39200]/25 flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {editingBenefitId ? 'Guardar Cambios' : 'Publicar Beneficio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
