import React, { useState, useEffect } from 'react';
import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { PresenceModal } from './components/presence/PresenceModal';
import { QrScannerModal } from './components/presence/QrScannerModal';
import { AuthModal } from './components/auth/AuthModal';
import { HomeView } from './components/home/HomeView';
import { MatchView } from './components/match/MatchView';
import { TicketsView } from './components/tickets/TicketsView';
import { BenefitsView } from './components/benefits/BenefitsView';
import { ProfileView } from './components/profile/ProfileView';
import { MembershipView } from './components/membership/MembershipView';
import { BirthdayView } from './components/birthday/BirthdayView';
import { TableReservationView } from './components/reservation/TableReservationView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { useAuth } from './hooks/useAuth';
import { usePresence } from './hooks/usePresence';
import { eventService } from './services/eventService';
import { benefitService } from './services/benefitService';
import { matchService } from './services/matchService';
import { UserProfile, ClubEvent, ClubBenefit } from './types';
import { authService } from './services/authService';
import { presenceService, PresenceStatus } from './services/presenceService';
import { syncVenueLocationsFromSupabase, getVenueConfig } from './config/venue';
import { VenueLocation } from './types';
import { CheckCircle2 } from 'lucide-react';
import { OutOfRangeModal } from './components/presence/OutOfRangeModal';
import { purgeMockData } from './utils/cleanMockData';
import { getSupabaseClient } from './services/supabaseClient';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('inicio');
  const [isAdminView, setIsAdminView] = useState<boolean>(() => {
    return window.location.hash === '#admin' || window.location.pathname === '/admin';
  });
  const [isPresenceModalOpen, setIsPresenceModalOpen] = useState<boolean>(false);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<
    'login' | 'register' | 'choice' | 'verify' | 'register_step_1'
  >('choice');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal OUCH! No estas dentro de Cache
  const [isOutOfRangeModalOpen, setIsOutOfRangeModalOpen] = useState<boolean>(false);
  const [outOfRangeDetails, setOutOfRangeDetails] = useState<{
    distanceMeters?: number;
    radiusMeters?: number;
    closestLocationName?: string;
    customMessage?: string;
  }>({});

  const { user, setUser, updateProfile, switchDemoUser, logout } = useAuth();
  const {
    presence,
    isInside,
    isChecking,
    errorMessage,
    venueConfig,
    currentEvent,
    checkGpsPresence,
    simulatePresence,
    resetPresence,
  } = usePresence();

  const [events, setEvents] = useState<ClubEvent[]>(() => eventService.getEvents());
  const [benefits, setBenefits] = useState<ClubBenefit[]>(() => benefitService.getBenefits());
  const matchesCount = matchService.getMatches().length;

  useEffect(() => {
    const handleEventsChange = () => setEvents(eventService.getEvents());
    const handleBenefitsChange = () => setBenefits(benefitService.getBenefits());

    window.addEventListener('cachengueoo_events_updated', handleEventsChange);
    window.addEventListener('cachengueoo_benefits_updated', handleBenefitsChange);
    window.addEventListener('storage', handleEventsChange);
    window.addEventListener('storage', handleBenefitsChange);

    eventService.syncEventsFromSupabase().then(setEvents).catch(() => {});
    benefitService.syncBenefitsFromSupabase().then(setBenefits).catch(() => {});

    const handleToast = (e: any) => {
      if (e.detail) showToast(e.detail);
    };
    window.addEventListener('cachengueoo_show_toast', handleToast);

    return () => {
      window.removeEventListener('cachengueoo_events_updated', handleEventsChange);
      window.removeEventListener('cachengueoo_benefits_updated', handleBenefitsChange);
      window.removeEventListener('storage', handleEventsChange);
      window.removeEventListener('storage', handleBenefitsChange);
      window.removeEventListener('cachengueoo_show_toast', handleToast);
    };
  }, []);

  // Al cambiar de pestaña, asegura que la pantalla se desplace al principio absoluto
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.body.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [currentTab]);

  // Sincronizar locaciones activas desde Supabase al iniciar la app y purgar datos de prueba
  useEffect(() => {
    purgeMockData();
    syncVenueLocationsFromSupabase().catch(() => {});
  }, []);

  // Escuchar cambios de hash para acceder al panel administrativo únicamente mediante URL (#admin)
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#admin' || window.location.pathname === '/admin') {
        setIsAdminView(true);
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Escuchar evento para abrir wizard de configuración de Cache ID (tras registro con Google por primera vez)
  useEffect(() => {
    const handleOpenWizard = () => {
      const currentUser = authService.getCurrentUser();
      const cacheIdCreated = localStorage.getItem('cachengueoo_cache_id_created') === 'true';
      if (!currentUser || !cacheIdCreated) {
        setAuthModalMode('register_step_1');
        setIsAuthModalOpen(true);
      }
    };

    window.addEventListener('cachengueoo_open_cache_id_wizard', handleOpenWizard);

    // Al recargar la página: si el usuario ya está dentro o ya tiene Cache ID, NUNCA abrir el modal
    const currentUser = authService.getCurrentUser();
    const cacheIdCreated = localStorage.getItem('cachengueoo_cache_id_created') === 'true';

    if (currentUser && (cacheIdCreated || (currentUser.fullName && currentUser.avatarUrl))) {
      sessionStorage.removeItem('cachengueoo_flow_intent');
      localStorage.removeItem('cachengueoo_flow_intent');
    } else {
      const flowIntent =
        sessionStorage.getItem('cachengueoo_flow_intent') ||
        localStorage.getItem('cachengueoo_flow_intent');
      if (flowIntent === 'configure_cache_id' && !currentUser) {
        setAuthModalMode('register_step_1');
        setIsAuthModalOpen(true);
      }
    }

    return () => {
      window.removeEventListener('cachengueoo_open_cache_id_wizard', handleOpenWizard);
    };
  }, []);

  const handleExitAdmin = () => {
    setIsAdminView(false);
    setCurrentTab('inicio');
    if (window.location.hash === '#admin') {
      window.history.pushState(null, '', window.location.pathname);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleQrSuccess = (msg: string) => {
    showToast(msg);
  };

  const handleAuthSuccess = (loggedUser: UserProfile) => {
    setUser(loggedUser);
    showToast(`¡Bienvenido, ${loggedUser.nickname}! Sesión activa en Cachengueoo.`);
    if (loggedUser.isAdmin || loggedUser.role === 'admin') {
      setIsAdminView(true);
      setIsAuthModalOpen(false);
    } else {
      setIsAdminView(false);
      if (currentTab === 'perfil' || currentTab === 'match_perfil') {
        setCurrentTab('perfil');
      }
    }
  };

  const handleTabChange = (tab: string) => {
    const activeUser = user || authService.getCurrentUser();
    if (!user && activeUser) {
      setUser(activeUser);
    }

    if (tab === 'perfil' || tab === 'match_perfil') {
      if (!activeUser) {
        setAuthModalMode('choice');
        setIsAuthModalOpen(true);
        setCurrentTab('perfil');
        setIsAdminView(false);
        return;
      }
      if (activeUser.isAdmin || activeUser.role === 'admin') {
        setIsAdminView(true);
        return;
      }
      setIsAdminView(false);
      setCurrentTab(tab === 'match_perfil' ? 'match_perfil' : 'perfil');
      return;
    }

    if (
      tab === 'match' ||
      tab === 'match_pista' ||
      tab === 'match_notitas' ||
      tab === 'match_matches'
    ) {
      if (!activeUser) {
        setAuthModalMode('choice');
        setIsAuthModalOpen(true);
        return;
      }

      // Si no está verificado adentro, o si la presencia ya expiró, ejecutar verificación GPS obligatoria
      const targetSub =
        tab === 'match_notitas'
          ? 'match_notitas'
          : tab === 'match_matches'
          ? 'match_matches'
          : 'match_pista';

      if (!isInside) {
        handleAutoGpsAndOpenMatch(targetSub);
        return;
      }

      setIsAdminView(false);
      setCurrentTab(targetSub);
      return;
    }

    setIsAdminView(false);
    setCurrentTab(tab);
  };

  // Activación obligatoria de Match por GPS en tiempo real
  const handleAutoGpsAndOpenMatch = async (targetTab: string = 'match_pista') => {
    const activeUser = user || authService.getCurrentUser();
    if (!activeUser) {
      setAuthModalMode('choice');
      setIsAuthModalOpen(true);
      return;
    }

    // Si la presencia ya está validada y activa durante la noche, ingresar directo sin volver a pedir GPS
    const currentStored = presenceService.getStoredPresence();
    if (currentStored.isInside) {
      const client = getSupabaseClient();
      if (client && activeUser?.id) {
        Promise.resolve(
          client
            .from('profiles')
            .update({
              is_verified_in_venue: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', activeUser.id)
        ).catch(() => {});
      }
      setIsAdminView(false);
      setCurrentTab(targetTab);
      return;
    }

    // Sincronizar siempre las sedes más recientes desde la nube antes de comprobar
    const freshLocations = await syncVenueLocationsFromSupabase().catch(() => null);
    const currentVenue = getVenueConfig();
    let activeLocations: VenueLocation[] = (currentVenue.locations || []).filter(
      (l: VenueLocation) => l.isActive
    );
    if (activeLocations.length === 0 && freshLocations && freshLocations.length > 0) {
      activeLocations = freshLocations.filter((l) => l.isActive);
    }

    if (activeLocations.length === 0) {
      presenceService.clearPresence();
      window.dispatchEvent(new Event('storage'));
      setOutOfRangeDetails({
        distanceMeters: 0,
        radiusMeters: 200,
        closestLocationName: 'Cachengueoo',
        customMessage: 'No hay sedes o locaciones configuradas para validar presencia.',
      });
      setIsOutOfRangeModalOpen(true);
      return;
    }

    showToast('Comprobando tu ubicación GPS en tiempo real...');
    try {
      const gpsResult = await presenceService.checkRealGeolocation();
      if (gpsResult.isInside) {
        const current = presenceService.getStoredPresence();
        const updated: PresenceStatus = {
          ...current,
          isInside: true,
          methodUsed: 'GPS',
          gpsResult,
          gpsVerified: true,
          validatedAt: new Date().toISOString(),
        };
        presenceService.saveStoredPresence(updated);
        window.dispatchEvent(new Event('storage'));

        // Sincronizar en Supabase para que este perfil aparezca activo a los demás usuarios por 8 horas
        const client = getSupabaseClient();
        if (client && activeUser?.id) {
          Promise.resolve(
            client
              .from('profiles')
              .update({
                is_verified_in_venue: true,
                updated_at: new Date().toISOString(),
              })
              .eq('id', activeUser.id)
          ).catch(() => {});
        }

        showToast(
          `¡Estás en ${gpsResult.matchedLocationName || 'Cachengueoo'}! Cachengueoo Match activado 🔥`
        );
        setIsAdminView(false);
        setCurrentTab(targetTab);
      } else {
        presenceService.clearPresence();
        window.dispatchEvent(new Event('storage'));
        const refLoc = activeLocations[0];
        setOutOfRangeDetails({
          distanceMeters: gpsResult.distanceMeters,
          radiusMeters: refLoc?.radiusMeters || 150,
          closestLocationName: refLoc?.name || 'Cachengueoo Sede Central',
          customMessage:
            gpsResult.message ||
            'Detectamos que estás fuera del radio permitido de Cachengueoo. Para ingresar a Match tenés que estar dentro de Cache.',
        });
        setIsOutOfRangeModalOpen(true);
      }
    } catch (err: unknown) {
      presenceService.clearPresence();
      window.dispatchEvent(new Event('storage'));
      const msg = err instanceof Error ? err.message : 'Error al verificar ubicación por GPS';
      const refLoc = activeLocations[0];
      setOutOfRangeDetails({
        distanceMeters: 0,
        radiusMeters: refLoc?.radiusMeters || 150,
        closestLocationName: refLoc?.name || 'Cachengueoo',
        customMessage: msg,
      });
      setIsOutOfRangeModalOpen(true);
    }
  };

  const handleActivateMatch = () => {
    handleAutoGpsAndOpenMatch('match_pista');
  };

  // Modo Match activo: al entrar a match, el menú inferior cambia a "Menú Match"
  const isMatchMode =
    !isAdminView &&
    (currentTab === 'match' ||
      currentTab === 'match_pista' ||
      currentTab === 'match_notitas' ||
      currentTab === 'match_matches' ||
      currentTab === 'match_perfil');

  // Modo Tinder Deck / Notitas / Matches dentro de la pantalla completa
  const isTinderDeckMode =
    isMatchMode && currentTab !== 'match_perfil';

  // Subpestaña activa dentro de Match
  const matchSubTab: 'pista' | 'notitas' | 'matches' =
    currentTab === 'match_notitas'
      ? 'notitas'
      : currentTab === 'match_matches'
      ? 'matches'
      : 'pista';

  return (
    <div
      className={`bg-[#09090b] text-[#f4f4f5] font-sans selection:bg-[#F39200] selection:text-black overflow-x-hidden ${
        isTinderDeckMode
          ? 'h-dvh max-h-dvh overflow-hidden flex flex-col justify-between'
          : 'min-h-screen flex flex-col'
      }`}
    >
      {/* Top Header: Se oculta completamente en modo Match para brindar la experiencia 100% Tinder */}
      {!isMatchMode && (
        <Header
          currentTab={currentTab}
          onTabChange={handleTabChange}
          isAdmin={isAdminView}
          onExitAdmin={handleExitAdmin}
          currentUser={user}
        />
      )}

      {/* Main Content Area */}
      <main
        className={`w-full max-w-full ${
          isTinderDeckMode
            ? 'h-[calc(100dvh-4.5rem)] max-h-[calc(100dvh-4.5rem)] overflow-hidden pb-0'
            : isMatchMode && currentTab === 'match_perfil'
            ? 'flex-1 pb-24 md:pb-12 overflow-y-auto'
            : 'flex-1 pb-20 md:pb-8 overflow-x-hidden'
        }`}
      >
        {isAdminView ? (
          <AdminDashboard
            onExitAdmin={handleExitAdmin}
            onLogout={() => {
              logout();
              resetPresence();
              setIsAdminView(false);
              setCurrentTab('inicio');
              showToast('Sesión de administrador cerrada.');
            }}
          />
        ) : (
          <>
            {currentTab === 'inicio' && (
              <HomeView
                currentUser={user}
                presence={presence}
                tonightEvent={currentEvent}
                upcomingEvents={events}
                benefits={benefits}
                onNavigateTab={handleTabChange}
                onOpenPresenceModal={() => setIsPresenceModalOpen(true)}
                onOpenQrScanner={() => setIsQrScannerOpen(true)}
                onActivateMatch={handleActivateMatch}
              />
            )}

            {currentTab === 'entradas' && <TicketsView currentUser={user} />}

            {/* MÓDULO CACHENGUEOO MATCH (CON MENÚ MATCH Y SUBPESTAÑAS) */}
            {isMatchMode && currentTab !== 'match_perfil' && user && (
              <MatchView
                currentUser={user}
                isInsideVenue={isInside}
                onOpenPresenceModal={() => setIsPresenceModalOpen(true)}
                eventTitle={currentEvent?.title || 'Cachengueoo Mendoza'}
                onUpdateUserProfile={updateProfile}
                matchSubTab={matchSubTab}
                onNavigateMatchSubTab={(sub) => {
                  if (sub === 'pista') setCurrentTab('match_pista');
                  else if (sub === 'notitas') setCurrentTab('match_notitas');
                  else if (sub === 'matches') setCurrentTab('match_matches');
                }}
                onNavigateToGeneralTab={handleTabChange}
              />
            )}

            {currentTab === 'beneficios' && <BenefitsView currentUser={user} />}

            {(currentTab === 'perfil' || currentTab === 'match_perfil') && (
              ((user && (user.isAdmin || user.role === 'admin')) || authService.getCurrentUser()?.isAdmin) ? (
                <AdminDashboard
                  onExitAdmin={handleExitAdmin}
                  onLogout={() => {
                    logout();
                    resetPresence();
                    setIsAdminView(false);
                    setCurrentTab('inicio');
                    showToast('Sesión de administrador cerrada.');
                  }}
                />
              ) : (
                <ProfileView
                  currentUser={user || authService.getCurrentUser()}
                  onUpdateProfile={updateProfile}
                  onSwitchDemoUser={switchDemoUser}
                  onNavigateTab={(tab) => handleTabChange(tab)}
                  onOpenAuthModal={(m) => {
                    setAuthModalMode(m);
                    setIsAuthModalOpen(true);
                  }}
                  onEnterAdmin={() => setIsAdminView(true)}
                  onLogout={() => {
                    logout();
                    resetPresence();
                    setCurrentTab('inicio');
                    showToast('Sesión cerrada.');
                  }}
                />
              )
            )}

            {currentTab === 'membresia' && <MembershipView currentUser={user} />}

            {currentTab === 'cumpleanos' && <BirthdayView currentUser={user} />}

            {currentTab === 'reserva_mesa' && <TableReservationView currentUser={user} />}

            {/* Pie de página sutil (únicamente en pestañas informativas fuera de Match) */}
            {!isMatchMode && (
              <footer className="mt-8 mb-4 text-center text-xs text-zinc-600 px-4">
                <p className="text-[11px]">CACHENGUEOO · Mendoza, Argentina</p>
              </footer>
            )}
          </>
        )}
      </main>

      {/* Navegación Inferior: Cambia automáticamente a "Menú Match" al entrar en Match */}
      {!isAdminView && (
        <BottomNav
          currentTab={currentTab}
          onTabChange={handleTabChange}
          isInsideVenue={isInside}
          isInMatchMode={isMatchMode}
          matchesCount={matchesCount}
        />
      )}

      {/* Modal de Verificación de Presencia */}
      <PresenceModal
        isOpen={isPresenceModalOpen}
        onClose={() => setIsPresenceModalOpen(false)}
        presence={presence}
        venueConfig={venueConfig}
        onCheckGps={async () => {
          await checkGpsPresence();
          showToast('Ubicación comprobada');
        }}
        isChecking={isChecking}
        errorMessage={errorMessage}
      />

      {/* Modal de Escaneo de QR (solo para escaneo de entradas o tickets por el staff) */}
      <QrScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        onSuccess={handleQrSuccess}
      />

      {/* Modal de Autenticación & Wizard Match */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        initialMode={authModalMode}
        isInsideVenue={isInside}
        onCheckGps={async () => {
          await handleAutoGpsAndOpenMatch();
        }}
        onProceedToMatch={() => {
          const current = presenceService.getStoredPresence();
          if (current.isInside) {
            setCurrentTab('match_pista');
            showToast('🔥 ¡Acceso a Cachengueoo Match!');
          } else {
            handleAutoGpsAndOpenMatch();
          }
        }}
      />

      {/* Modal OUCH! No estas dentro de Cache */}
      <OutOfRangeModal
        isOpen={isOutOfRangeModalOpen}
        onClose={() => setIsOutOfRangeModalOpen(false)}
        onRetryGps={() => {
          setIsOutOfRangeModalOpen(false);
          handleAutoGpsAndOpenMatch();
        }}
        distanceMeters={outOfRangeDetails.distanceMeters}
        radiusMeters={outOfRangeDetails.radiusMeters}
        closestLocationName={outOfRangeDetails.closestLocationName}
        customMessage={outOfRangeDetails.customMessage}
        isChecking={isChecking}
      />

      {/* Notificación Toast flotante */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#121217] border border-[#F39200]/50 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-none">
          <CheckCircle2 className="w-4 h-4 text-[#F39200] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
