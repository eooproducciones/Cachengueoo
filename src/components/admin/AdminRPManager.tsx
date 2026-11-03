import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ShieldCheck,
  Ban,
  RefreshCw,
  ExternalLink,
  MessageCircle,
  Instagram,
  Ticket,
  Eye,
  TrendingUp,
  Search,
  Copy,
  Check,
  Cake,
  Wine,
  Calendar,
  ChevronRight,
  X
} from 'lucide-react';
import { RPApplication, RPProfile, ClubEvent } from '../../types';
import {
  getAllRPApplications,
  getAllRPProfiles,
  approveRPApplication,
  rejectRPApplication,
  setRPStatus,
  getRPEventLinks,
  getRPAnalytics,
  RPAnalyticsSummary
} from '../../services/rpService';
import { eventService } from '../../services/eventService';

interface AdminRPManagerProps {
  adminUserId?: string;
}

export const AdminRPManager: React.FC<AdminRPManagerProps> = ({ adminUserId = 'admin' }) => {
  const [activeSubTab, setActiveSubTab] = useState<'solicitudes' | 'listado' | 'metricas'>('solicitudes');
  const [applications, setApplications] = useState<RPApplication[]>([]);
  const [rpProfiles, setRpProfiles] = useState<RPProfile[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Processing state
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Detail Modal for selected RP
  const [selectedRpDetail, setSelectedRpDetail] = useState<{
    profile: RPProfile;
    links: Record<string, string>;
    analytics: RPAnalyticsSummary;
  } | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [apps, profiles] = await Promise.all([
        getAllRPApplications(),
        getAllRPProfiles(),
      ]);
      setApplications(apps);
      setRpProfiles(profiles);
      setEvents(eventService.getEvents());
    } catch (err) {
      console.error('Error loading RP admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingApps = applications.filter((a) => a.status === 'pending');

  const handleApprove = async (app: RPApplication) => {
    setActionLoadingId(app.id);
    try {
      const res = await approveRPApplication(app, adminUserId);
      if (res.success && res.rpProfile) {
        setSuccessNotice(`¡Solicitud de ${app.fullName} aprobada! Se generó el slug /${res.rpProfile.slug}`);
        await loadData();
        setTimeout(() => setSuccessNotice(null), 4000);
      } else {
        alert(res.error || 'No se pudo aprobar la solicitud.');
      }
    } catch (err: any) {
      alert(err.message || 'Error al aprobar.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (app: RPApplication) => {
    if (!confirm(`¿Estás seguro de rechazar la solicitud de ${app.fullName}?`)) return;
    setActionLoadingId(app.id);
    try {
      const res = await rejectRPApplication(app, adminUserId);
      if (res.success) {
        setSuccessNotice(`Solicitud de ${app.fullName} rechazada.`);
        await loadData();
        setTimeout(() => setSuccessNotice(null), 4000);
      } else {
        alert(res.error || 'No se pudo rechazar la solicitud.');
      }
    } catch (err: any) {
      alert(err.message || 'Error al rechazar.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleStatus = async (profile: RPProfile) => {
    const nextStatus = profile.status === 'approved' ? 'suspended' : 'approved';
    const actionLabel = nextStatus === 'suspended' ? 'suspender' : 'reactivar';

    if (!confirm(`¿Confirmas ${actionLabel} a ${profile.publicName}?`)) return;

    setActionLoadingId(profile.id);
    try {
      const res = await setRPStatus(profile.id, profile.userId, nextStatus);
      if (res.success) {
        setSuccessNotice(`Promotor ${profile.publicName} ${nextStatus === 'suspended' ? 'suspendido' : 'reactivado'}.`);
        await loadData();
        setTimeout(() => setSuccessNotice(null), 4000);
      } else {
        alert(res.error || 'Error al cambiar estado.');
      }
    } catch (err: any) {
      alert(err.message || 'Error.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenDetail = async (profile: RPProfile) => {
    try {
      const [links, analytics] = await Promise.all([
        getRPEventLinks(profile.id),
        getRPAnalytics(profile.id),
      ]);
      setSelectedRpDetail({ profile, links, analytics });
    } catch (err) {
      console.error('Error loading detail for RP:', err);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSlug(text);
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  const originUrl = window.location.origin;

  // Filter profiles based on search
  const filteredProfiles = rpProfiles.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.publicName.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q) ||
      p.whatsapp.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#121217] border border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-[#F39200]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#F39200]/15 border border-[#F39200]/40 flex items-center justify-center text-[#F39200] shadow-md shadow-[#F39200]/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#F39200] tracking-widest block">
                ADMINISTRACIÓN DE PROMOTORES & AFILIADOS
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white font-display uppercase tracking-tight">
                RELACIONES PÚBLICAS <span className="text-[#F39200]">(RP)</span>
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="h-10 px-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>

        {/* Global Notice */}
        {successNotice && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/50 flex items-center gap-2.5 text-xs text-emerald-300 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Sub Navigation */}
        <div className="mt-5 flex items-center gap-2 border-b border-zinc-800 pb-3">
          <button
            type="button"
            onClick={() => setActiveSubTab('solicitudes')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'solicitudes'
                ? 'bg-[#F39200] text-black shadow-md shadow-[#F39200]/25'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Solicitudes Pendientes</span>
            {pendingApps.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black">
                {pendingApps.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('listado')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'listado'
                ? 'bg-[#F39200] text-black shadow-md shadow-[#F39200]/25'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Listado de RPs ({rpProfiles.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('metricas')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'metricas'
                ? 'bg-[#F39200] text-black shadow-md shadow-[#F39200]/25'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Métricas Generales</span>
          </button>
        </div>
      </div>

      {/* 1. VISTA: SOLICITUDES PENDIENTES */}
      {activeSubTab === 'solicitudes' && (
        <div className="bg-[#121217] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-tight">
                Solicitudes de Nuevos Promotores
              </h3>
              <p className="text-xs text-zinc-400">
                Usuarios que presionaron "Quiero ser Relación Pública" y completaron el formulario.
              </p>
            </div>
            <span className="text-xs font-bold text-zinc-400">
              Total pendientes: <strong className="text-white">{pendingApps.length}</strong>
            </span>
          </div>

          {pendingApps.length === 0 ? (
            <div className="py-12 text-center space-y-2 border border-dashed border-zinc-800 rounded-2xl">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-70" />
              <p className="text-xs text-zinc-400">
                No hay solicitudes pendientes en este momento.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {pendingApps.map((app) => {
                const isProcessing = actionLoadingId === app.id;
                return (
                  <div
                    key={app.id}
                    className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700/80 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-white">{app.fullName}</h4>
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[9px] font-bold uppercase">
                            Pendiente
                          </span>
                        </div>
                        {app.userEmail && (
                          <span className="text-[11px] text-zinc-500 block truncate">
                            {app.userEmail}
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-600 block mt-0.5">
                          Enviado el {new Date(app.createdAt).toLocaleDateString()} a las{' '}
                          {new Date(app.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-zinc-300 bg-black/40 p-3 rounded-xl border border-zinc-800">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500 font-semibold flex items-center gap-1.5">
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                          WhatsApp:
                        </span>
                        <a
                          href={`https://wa.me/${app.whatsapp}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          +{app.whatsapp}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      {app.instagram && (
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 font-semibold flex items-center gap-1.5">
                            <Instagram className="w-3.5 h-3.5 text-pink-400" />
                            Instagram:
                          </span>
                          <a
                            href={`https://instagram.com/${app.instagram}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-pink-400 hover:underline"
                          >
                            @{app.instagram}
                          </a>
                        </div>
                      )}

                      {app.notes && (
                        <div className="pt-1.5 border-t border-zinc-800/80 text-[11px] text-zinc-400">
                          <span className="text-zinc-500 font-bold block mb-0.5">Notas / Info:</span>
                          <p className="italic">"{app.notes}"</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleApprove(app)}
                        disabled={isProcessing}
                        className="flex-1 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Aprobar Solicitud</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReject(app)}
                        disabled={isProcessing}
                        className="px-3 h-9 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-red-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Rechazar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. VISTA: LISTADO DE RELACIONES PÚBLICAS */}
      {activeSubTab === 'listado' && (
        <div className="bg-[#121217] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-tight">
                Listado General de Promotores RP
              </h3>
              <p className="text-xs text-zinc-400">
                Visualizá el estado, enlaces personalizados, número de WhatsApp y métricas de cada RP.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o slug..."
                className="w-full h-9 pl-8 pr-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-[#F39200]"
              />
            </div>
          </div>

          {filteredProfiles.length === 0 ? (
            <div className="py-12 text-center space-y-2 border border-dashed border-zinc-800 rounded-2xl">
              <Users className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-xs text-zinc-400">
                {searchQuery ? 'No se encontraron promotores con esa búsqueda.' : 'No hay promotores registrados aún.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-900/90 text-zinc-400 uppercase text-[10px] font-bold border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-3">Promotor</th>
                    <th className="py-3 px-3">Slug / URL Personalizada</th>
                    <th className="py-3 px-3">WhatsApp</th>
                    <th className="py-3 px-3 text-center">Estado</th>
                    <th className="py-3 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredProfiles.map((p) => {
                    const isSuspended = p.status === 'suspended';
                    const fullVanity = `${originUrl}/${p.slug}`;
                    const isCopied = copiedSlug === fullVanity;

                    return (
                      <tr key={p.id} className="hover:bg-zinc-900/50 transition-colors">
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-white text-sm">{p.publicName}</div>
                          <span className="text-[10px] text-zinc-500">
                            Aprobado: {p.approvedAt ? new Date(p.approvedAt).toLocaleDateString() : '—'}
                          </span>
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-amber-400 bg-black/60 px-2 py-0.5 rounded border border-zinc-800 text-[11px]">
                              /{p.slug}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(fullVanity)}
                              className="text-zinc-500 hover:text-white p-1"
                              title="Copiar URL completa"
                            >
                              {isCopied ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <a
                              href={fullVanity}
                              target="_blank"
                              rel="noreferrer"
                              className="text-zinc-500 hover:text-white p-1"
                              title="Abrir URL"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <a
                            href={`https://wa.me/${p.whatsapp}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-400 hover:underline flex items-center gap-1 font-mono"
                          >
                            +{p.whatsapp}
                          </a>
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          {isSuspended ? (
                            <span className="px-2 py-0.5 rounded-full bg-red-950/60 border border-red-500/40 text-red-400 text-[10px] font-black uppercase">
                              Suspendido
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase">
                              Activo
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenDetail(p)}
                              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Eye className="w-3 h-3 text-[#F39200]" />
                              <span>Ver Detalle</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleStatus(p)}
                              className={`p-1.5 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                                isSuspended
                                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                                  : 'bg-red-950/40 border-red-500/40 text-red-300 hover:bg-red-900/60'
                              }`}
                              title={isSuspended ? 'Reactivar RP' : 'Suspender RP'}
                            >
                              {isSuspended ? <ShieldCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. VISTA: MÉTRICAS GENERALES DE AFILIADOS */}
      {activeSubTab === 'metricas' && (
        <div className="bg-[#121217] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-black text-white uppercase tracking-tight">
              Rendimiento Global del Sistema de Relaciones Públicas
            </h3>
            <p className="text-xs text-zinc-400">
              Resumen acumulado de interacciones, tráfico y derivación de ventas generadas por el equipo de promotores.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-center space-y-1">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                Total RPs Activos
              </span>
              <span className="text-2xl font-black text-[#F39200]">
                {rpProfiles.filter((p) => p.status === 'approved').length}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-center space-y-1">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                Eventos Disponibles
              </span>
              <span className="text-2xl font-black text-blue-400">
                {events.filter((e) => e.isAvailableForRp !== false).length}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-center space-y-1">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                Solicitudes Pendientes
              </span>
              <span className="text-2xl font-black text-amber-400">
                {pendingApps.length}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-center space-y-1">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                Promotores Suspendidos
              </span>
              <span className="text-2xl font-black text-red-400">
                {rpProfiles.filter((p) => p.status === 'suspended').length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLE DE RP */}
      {selectedRpDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#121217] border border-amber-500/40 rounded-3xl w-full max-w-xl p-5 sm:p-6 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#F39200] tracking-wider block">
                  DETALLE DEL PROMOTOR
                </span>
                <h3 className="text-lg font-black text-white font-display uppercase tracking-tight">
                  {selectedRpDetail.profile.publicName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRpDetail(null)}
                className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
                <span className="text-lg font-black text-white">{selectedRpDetail.analytics.totalVisits}</span>
                <span className="text-[9px] text-zinc-500 uppercase block font-bold">Visitas</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
                <span className="text-lg font-black text-[#F39200]">{selectedRpDetail.analytics.ticketClicks}</span>
                <span className="text-[9px] text-zinc-500 uppercase block font-bold">Clics Passline</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
                <span className="text-lg font-black text-pink-400">{selectedRpDetail.analytics.birthdayClicks}</span>
                <span className="text-[9px] text-zinc-500 uppercase block font-bold">Cumpleaños</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
                <span className="text-lg font-black text-amber-400">{selectedRpDetail.analytics.reservationClicks}</span>
                <span className="text-[9px] text-zinc-500 uppercase block font-bold">Mesas</span>
              </div>
            </div>

            {/* Enlace Personalizado */}
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                URL de Afiliado
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-amber-400 bg-black/60 px-3 py-1.5 rounded-lg border border-zinc-800 flex-1 truncate select-all">
                  {originUrl}/{selectedRpDetail.profile.slug}
                </span>
                <a
                  href={`${originUrl}/${selectedRpDetail.profile.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="h-8 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Abrir</span>
                </a>
              </div>
            </div>

            {/* Enlaces de Passline cargados por este RP */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Enlaces de Passline configurados por este RP:
              </h4>

              {events.length === 0 ? (
                <p className="text-xs text-zinc-500">No hay eventos en la plataforma.</p>
              ) : (
                <div className="space-y-2">
                  {events.map((ev) => {
                    const link = selectedRpDetail.links[ev.id];
                    return (
                      <div
                        key={ev.id}
                        className="p-3 rounded-xl bg-black/40 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <span className="text-[10px] text-[#F39200] font-bold uppercase block">{ev.dateStr}</span>
                          <h5 className="text-xs font-bold text-white truncate max-w-xs">{ev.title}</h5>
                        </div>

                        {link ? (
                          <a
                            href={link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-emerald-400 font-mono hover:underline flex items-center gap-1 truncate max-w-xs"
                          >
                            {link}
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-[11px] text-zinc-600 italic">
                            Sin enlace personal (Usa el general del club)
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedRpDetail(null)}
                className="w-full h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs cursor-pointer transition-colors"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
