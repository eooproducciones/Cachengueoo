import React from 'react';
import {
  Home,
  Ticket,
  Flame,
  Gift,
  User,
  MessageSquareQuote,
  MessageCircle,
  LucideIcon,
  Heart,
  Sparkles,
} from 'lucide-react';

interface BottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  isInsideVenue: boolean;
  isInMatchMode?: boolean;
  unreadCount?: number;
  matchesCount?: number;
}

interface NavTabItem {
  id: string;
  label: string;
  icon: LucideIcon;
  isSpecial?: boolean;
  badge?: number;
  action: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onTabChange,
  isInsideVenue,
  isInMatchMode = false,
  unreadCount = 0,
  matchesCount = 0,
}) => {
  // Tabs en modo Match (Menú Match dedicado)
  const matchTabs: NavTabItem[] = [
    {
      id: 'inicio',
      label: 'Inicio',
      icon: Home,
      action: () => onTabChange('inicio'),
    },
    {
      id: 'notitas',
      label: 'Notitas',
      icon: MessageSquareQuote,
      action: () => onTabChange('match_notitas'),
    },
    {
      id: 'match',
      label: 'Match',
      icon: Flame,
      isSpecial: true,
      action: () => onTabChange('match_pista'),
    },
    {
      id: 'matches',
      label: 'Matches',
      icon: Heart,
      badge: matchesCount,
      action: () => onTabChange('match_matches'),
    },
    {
      id: 'perfil',
      label: 'Mi Perfil',
      icon: User,
      action: () => onTabChange('match_perfil'),
    },
  ];

  // Tabs en modo General (Menú Normal de la App)
  const generalTabs: NavTabItem[] = [
    {
      id: 'inicio',
      label: 'Inicio',
      icon: Home,
      action: () => onTabChange('inicio'),
    },
    {
      id: 'entradas',
      label: 'Entradas',
      icon: Ticket,
      action: () => onTabChange('entradas'),
    },
    {
      id: 'match',
      label: 'Match',
      icon: Flame,
      isSpecial: true,
      action: () => onTabChange('match'),
    },
    {
      id: 'beneficios',
      label: 'Beneficios',
      icon: Gift,
      action: () => onTabChange('beneficios'),
    },
    {
      id: 'perfil',
      label: 'Perfil',
      icon: User,
      action: () => onTabChange('perfil'),
    },
  ];

  const tabs = isInMatchMode ? matchTabs : generalTabs;

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 pb-safe select-none ${
        isInMatchMode
          ? 'bg-[#0a0714]/95 backdrop-blur-xl border-t border-purple-500/30 shadow-[0_-8px_30px_rgba(168,85,247,0.18)]'
          : 'bg-[#09090b]/95 backdrop-blur-lg border-t border-zinc-800/80'
      }`}
    >
      {/* Detalle visual superior de Modo Match: sutil línea gradiente neón */}
      {isInMatchMode && (
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-purple-500/50 via-rose-500/80 to-purple-500/50 pointer-events-none" />
      )}

      <div
        className={`grid grid-cols-5 items-center ${
          isInMatchMode ? 'h-[68px] px-2 gap-1.5' : 'h-16 px-2'
        } max-w-md mx-auto`}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          let isActive = false;

          if (isInMatchMode) {
            if (tab.id === 'inicio') isActive = currentTab === 'inicio';
            else if (tab.id === 'notitas') isActive = currentTab === 'match_notitas';
            else if (tab.id === 'match') isActive = currentTab === 'match' || currentTab === 'match_pista';
            else if (tab.id === 'matches') isActive = currentTab === 'match_matches';
            else if (tab.id === 'perfil') isActive = currentTab === 'perfil' || currentTab === 'match_perfil';
          } else {
            isActive = currentTab === tab.id;
          }

          // BOTÓN ESPECIAL CENTRAL: MATCH (Llama de fuego naranja/dorada)
          if (tab.isSpecial) {
            return (
              <button
                key={tab.id}
                onClick={tab.action}
                className="relative flex flex-col items-center justify-center min-h-[44px] min-w-[44px] cursor-pointer group -mt-5"
                aria-label="Cachengueoo Match"
              >
                <div
                  className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
                    isActive
                      ? 'bg-gradient-to-tr from-[#EA580C] to-[#F39200] text-black shadow-lg shadow-[#F39200]/50 scale-105 ring-4 ring-[#0a0714]'
                      : isInsideVenue
                      ? 'bg-gradient-to-tr from-[#EA580C] to-[#F39200] text-black ring-4 ring-[#0a0714]'
                      : 'bg-zinc-800 text-zinc-300 hover:text-white ring-4 ring-[#09090b]'
                  }`}
                >
                  <Icon className="w-6 h-6 stroke-[2.4]" />
                  {/* Indicador en vivo si está adentro y NO estamos en modo match (para no duplicar el círculo titilando) */}
                  {isInsideVenue && !isInMatchMode && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-black"></span>
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] font-bold tracking-tight mt-1 transition-colors ${
                    isActive ? 'text-[#F39200]' : 'text-zinc-400'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          }

          // DISEÑO EXCLUSIVO DE "NOTITAS" EN MODO MATCH (Violeta Neón, más grande, cápsula luminosa)
          if (isInMatchMode && tab.id === 'notitas') {
            return (
              <button
                key={tab.id}
                onClick={tab.action}
                className={`relative flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-300 cursor-pointer group active:scale-95 ${
                  isActive
                    ? 'bg-gradient-to-b from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-600/40 ring-2 ring-purple-300/50 scale-105 border border-purple-300/40'
                    : 'bg-[#180e2b]/85 border border-purple-500/40 hover:border-purple-300 text-purple-200 hover:text-white shadow-sm shadow-purple-950/40'
                }`}
                aria-label="Notitas en Modo Match"
                title="Notitas en vivo"
              >
                <div className="relative flex items-center justify-center">
                  <Icon
                    className={`w-5.5 h-5.5 transition-transform duration-200 ${
                      isActive
                        ? 'scale-110 drop-shadow-md stroke-[2.4]'
                        : 'text-purple-300 group-hover:scale-105 stroke-[2.2]'
                    }`}
                  />
                  {/* Indicador de destello neón */}
                  <span
                    className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                      isActive ? 'bg-amber-300 shadow-sm shadow-amber-300' : 'bg-purple-400'
                    }`}
                  />
                </div>
                <span
                  className={`text-[10.5px] font-black tracking-tight mt-0.5 leading-tight transition-colors ${
                    isActive ? 'text-white drop-shadow-sm' : 'text-purple-200'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          }

          // DISEÑO EXCLUSIVO DE "MATCHES" EN MODO MATCH (Rosa Neón / Pasión, más grande, cápsula luminosa)
          if (isInMatchMode && tab.id === 'matches') {
            return (
              <button
                key={tab.id}
                onClick={tab.action}
                className={`relative flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-300 cursor-pointer group active:scale-95 ${
                  isActive
                    ? 'bg-gradient-to-b from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-600/40 ring-2 ring-rose-300/50 scale-105 border border-rose-300/40'
                    : 'bg-[#2b0d1e]/85 border border-rose-500/40 hover:border-rose-300 text-rose-200 hover:text-white shadow-sm shadow-rose-950/40'
                }`}
                aria-label="Matches de Esta Noche"
                title="Tus matches"
              >
                <div className="relative flex items-center justify-center">
                  <Icon
                    className={`w-5.5 h-5.5 transition-transform duration-200 ${
                      isActive
                        ? 'scale-110 drop-shadow-md fill-white stroke-white'
                        : 'fill-rose-500/30 stroke-rose-300 stroke-[2.2] group-hover:scale-105'
                    }`}
                  />
                  {/* Badge de contador con animación si hay matches */}
                  {tab.badge !== undefined && tab.badge > 0 ? (
                    <span className="absolute -top-1.5 -right-2 px-1.5 min-w-[17px] h-4 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[9px] font-black flex items-center justify-center border border-black shadow-md animate-pulse">
                      {tab.badge}
                    </span>
                  ) : (
                    <span
                      className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                        isActive ? 'bg-white' : 'bg-rose-400'
                      }`}
                    />
                  )}
                </div>
                <span
                  className={`text-[10.5px] font-black tracking-tight mt-0.5 leading-tight transition-colors ${
                    isActive ? 'text-white drop-shadow-sm' : 'text-rose-200'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          }

          // BOTONES REGULARES (Inicio y Perfil en Modo Match, o todos los ítems en Modo General)
          return (
            <button
              key={tab.id}
              onClick={tab.action}
              className="relative flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-1 cursor-pointer transition-colors group"
              aria-label={tab.label}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive
                      ? 'text-[#F39200] scale-110'
                      : isInMatchMode
                      ? 'text-zinc-400 group-hover:text-zinc-200'
                      : 'text-zinc-400 group-hover:text-zinc-200'
                  }`}
                />
                {tab.id === 'perfil' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#F39200]"></span>
                )}
              </div>
              <span
                className={`text-[10px] tracking-tight mt-1 transition-colors ${
                  isActive
                    ? 'text-[#F39200] font-bold'
                    : 'text-zinc-400 font-medium'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

