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
import { UserProfile } from './types';
import { CheckCircle2 } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('inicio');
  const [isAdminView, setIsAdminView] = useState<boolean>(() => {
    return window.location.hash === '#admin' || window.location.pathname === '/admin';
  });
  const [isPresenceModalOpen, setIsPresenceModalOpen] = useState<boolean>(false);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { user, updateProfile, switchDemoUser, logout } = useAuth();
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

  const events = eventService.getEvents();
  const benefits = benefitService.getBenefits();
  const matchesCount = matchService.getMatches().length;

  // Al cambiar de pestaña, asegura que la pantalla se desplace al principio absoluto
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.body.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [currentTab]);

  // Escuchar cambios de hash para acceder al panel administrativo únicamente mediante URL (#admin)
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#admin' || window.location.pathname === '/admin') {
        setIsAdminView(true);
      } else {
        setIsAdminView(false);
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleExitAdmin = () => {
    setIsAdminView(false);
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
    showToast(`¡Bienvenido, ${loggedUser.nickname}! Sesión activa en Cachengueoo.`);
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
          onTabChange={(tab) => {
            setIsAdminView(false);
            setCurrentTab(tab);
          }}
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
          <AdminDashboard />
        ) : (
          <>
            {currentTab === 'inicio' && (
              <HomeView
                currentUser={user}
                presence={presence}
                tonightEvent={currentEvent}
                upcomingEvents={events}
                benefits={benefits}
                onNavigateTab={setCurrentTab}
                onOpenPresenceModal={() => setIsPresenceModalOpen(true)}
                onOpenQrScanner={() => setIsQrScannerOpen(true)}
              />
            )}

            {currentTab === 'entradas' && <TicketsView currentUser={user} />}

            {/* MÓDULO CACHENGUEOO MATCH (CON MENÚ MATCH Y SUBPESTAÑAS) */}
            {isMatchMode && currentTab !== 'match_perfil' && (
              <MatchView
                currentUser={user}
                isInsideVenue={isInside}
                onOpenPresenceModal={() => setIsPresenceModalOpen(true)}
                eventTitle={currentEvent.title}
                onUpdateUserProfile={updateProfile}
                matchSubTab={matchSubTab}
                onNavigateMatchSubTab={(sub) => {
                  if (sub === 'pista') setCurrentTab('match_pista');
                  else if (sub === 'notitas') setCurrentTab('match_notitas');
                  else if (sub === 'matches') setCurrentTab('match_matches');
                }}
                onNavigateToGeneralTab={setCurrentTab}
              />
            )}

            {currentTab === 'beneficios' && <BenefitsView currentUser={user} />}

            {(currentTab === 'perfil' || currentTab === 'match_perfil') && (
              <ProfileView
                currentUser={user}
                onUpdateProfile={updateProfile}
                onSwitchDemoUser={switchDemoUser}
                onNavigateTab={(tab) => {
                  if (tab === 'match') setCurrentTab('match_pista');
                  else setCurrentTab(tab);
                }}
                onOpenAuthModal={(m) => {
                  setAuthModalMode(m);
                  setIsAuthModalOpen(true);
                }}
                onEnterAdmin={() => setIsAdminView(true)}
                onLogout={() => {
                  logout();
                  showToast('Sesión cerrada.');
                }}
              />
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
          onTabChange={(tab) => {
            setIsAdminView(false);
            setCurrentTab(tab);
          }}
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
        validationMode={currentEvent.validationMode}
        onCheckGps={async () => {
          await checkGpsPresence();
          showToast('Ubicación comprobada');
        }}
        isChecking={isChecking}
        errorMessage={errorMessage}
        onOpenQrScanner={() => {
          setIsPresenceModalOpen(false);
          setIsQrScannerOpen(true);
        }}
        onSimulatePresence={(inside, method) => {
          simulatePresence(inside, method);
          showToast(
            inside
              ? '🔥 Presencia en Cachengueoo simulada con éxito'
              : '📍 Simulación afuera activada'
          );
        }}
        onResetPresence={() => {
          resetPresence();
          showToast('Presencia restablecida');
        }}
      />

      {/* Modal de Escaneo de QR */}
      <QrScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        onSuccess={handleQrSuccess}
      />

      {/* Modal de Autenticación */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        initialMode={authModalMode}
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
