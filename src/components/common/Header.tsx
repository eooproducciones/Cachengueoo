import React from 'react';
import { CachengueooLogo } from './CachengueooLogo';
import { ArrowLeft } from 'lucide-react';
import { UserProfile } from '../../types';

interface HeaderProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  isAdmin: boolean;
  onExitAdmin: () => void;
  currentUser?: UserProfile | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  isAdmin,
  onExitAdmin,
  currentUser,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#09090b]/95 backdrop-blur-md border-b border-zinc-800/80 px-3.5 sm:px-6 h-15 sm:h-16 flex items-center justify-between transition-colors overflow-hidden select-none">
      {/* Zona 1: Logo Wordmark Cachengueoo con protagonismo en móvil (Click lleva al Inicio) */}
      <div className="flex items-center gap-2.5 min-w-0">
        {isAdmin && (
          <button
            onClick={onExitAdmin}
            className="flex items-center gap-1.5 text-xs font-bold text-[#F39200] hover:text-white cursor-pointer px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 active:scale-95 transition-all shrink-0"
            title="Volver a la App"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden xs:inline">Volver</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            if (isAdmin) onExitAdmin();
            onTabChange('inicio');
            window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
            document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
            document.body.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
          }}
          className="focus:outline-none flex items-center gap-2 text-left cursor-pointer active:scale-95 transition-all shrink-0 group"
          aria-label="Ir al Inicio de Cachengueoo"
          title="Ir al Inicio de Cachengueoo"
        >
          <CachengueooLogo size="md" className="group-hover:opacity-90 transition-opacity py-0.5" />
        </button>
      </div>

      {/* Zona 2: Enlaces Desktop (solo en pantallas grandes) */}
      {!isAdmin && (
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <button
            onClick={() => onTabChange('inicio')}
            className={`transition-colors cursor-pointer ${
              currentTab === 'inicio' ? 'text-white font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Inicio
          </button>
          <button
            onClick={() => onTabChange('entradas')}
            className={`transition-colors cursor-pointer ${
              currentTab === 'entradas' ? 'text-white font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Entradas
          </button>
          <button
            onClick={() => onTabChange('match')}
            className={`transition-colors flex items-center gap-1.5 cursor-pointer ${
              currentTab === 'match'
                ? 'text-[#F39200] font-bold'
                : 'text-zinc-400 hover:text-[#F39200]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#F39200] animate-pulse"></span>
            Match
          </button>
          <button
            onClick={() => onTabChange('beneficios')}
            className={`transition-colors cursor-pointer ${
              currentTab === 'beneficios' ? 'text-white font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Beneficios
          </button>
          <button
            onClick={() => onTabChange('membresia')}
            className={`transition-colors cursor-pointer ${
              currentTab === 'membresia' ? 'text-white font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Cachengueoo Club
          </button>
          <button
            onClick={() => onTabChange('cumpleanos')}
            className={`transition-colors cursor-pointer ${
              currentTab === 'cumpleanos' ? 'text-white font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Mi Cumple
          </button>
        </nav>
      )}

      {/* Zona 3: Lado derecho */}
      <div className="flex items-center gap-2">
        {isAdmin ? (
          <span className="px-2.5 py-1 rounded-full bg-[#F39200]/15 border border-[#F39200]/30 text-[#F39200] text-[10px] font-black uppercase tracking-wider">
            PANEL STAFF
          </span>
        ) : currentUser ? (
          <button
            onClick={() => onTabChange('perfil')}
            className="flex items-center gap-2 cursor-pointer p-1 rounded-full hover:ring-2 hover:ring-[#F39200]/40 transition-all active:scale-95"
            aria-label="Ir a Mi Perfil"
          >
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.nickname}
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full object-cover border border-zinc-700"
            />
            {currentUser.isAdmin && (
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-[#F39200]/20 text-[#F39200] text-[10px] font-bold border border-[#F39200]/30">
                Admin
              </span>
            )}
          </button>
        ) : (
          <button
            onClick={() => onTabChange('perfil')}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-[#F39200]/50 text-xs font-bold text-zinc-300 hover:text-white cursor-pointer transition-colors"
          >
            Ingresar
          </button>
        )}
      </div>
    </header>
  );
};
