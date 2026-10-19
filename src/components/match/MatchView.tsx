import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  X,
  Sparkles,
  MessageCircle,
  MapPin,
  GlassWater,
  ShieldAlert,
  RotateCcw,
  CheckCheck,
  Send,
  Flag,
  UserX,
  Info,
  Clock,
  CheckCircle2,
  MessageSquareQuote,
  Instagram,
  ExternalLink,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { MatchPair, MatchProfile, UserProfile } from '../../types';
import { matchService } from '../../services/matchService';
import { DrinkPlusIcon } from '../common/DrinkPlusIcon';
import { NightNotesView } from './NightNotesView';
import { formatTimeAgo, formatTimeRemaining } from '../../utils/timeAgo';

interface MatchViewProps {
  currentUser: UserProfile;
  isInsideVenue: boolean;
  onOpenPresenceModal: () => void;
  eventTitle: string;
  onUpdateUserProfile?: (updates: Partial<UserProfile>) => void;
  matchSubTab?: 'pista' | 'notitas' | 'matches';
  onNavigateMatchSubTab?: (tab: 'pista' | 'notitas' | 'matches') => void;
  onNavigateToGeneralTab?: (tab: string) => void;
}

export const MatchView: React.FC<MatchViewProps> = ({
  currentUser,
  isInsideVenue,
  onOpenPresenceModal,
  eventTitle,
  onUpdateUserProfile,
  matchSubTab = 'pista',
  onNavigateMatchSubTab,
  onNavigateToGeneralTab,
}) => {
  const [profiles, setProfiles] = useState<MatchProfile[]>(() => matchService.getAvailableProfiles());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matches, setMatches] = useState<MatchPair[]>(() => matchService.getMatches());
  const [celebrationMatch, setCelebrationMatch] = useState<MatchPair | null>(null);
  const [selectedChatMatch, setSelectedChatMatch] = useState<MatchPair | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [expandedProfile, setExpandedProfile] = useState<MatchProfile | null>(null);
  const [expandedPhotoIndex, setExpandedPhotoIndex] = useState(0);
  const [drinkInvitationToast, setDrinkInvitationToast] = useState<string | null>(null);

  // Drag gesture states
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const hasDragged = useRef(false);

  // Navegación de fotos del perfil actual (hasta 3 fotos)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isNoteExpanded, setIsNoteExpanded] = useState(false);
  const expandedScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setProfiles(matchService.getAvailableProfiles());
    setMatches(matchService.getMatches());
  }, [matchSubTab]);

  // Al pasar a otro perfil, reiniciar a la primera foto y replegar la notita
  useEffect(() => {
    setCurrentPhotoIndex(0);
    setIsNoteExpanded(false);
  }, [currentIndex]);

  // Al abrir el popup de información, sincronizar la posición del scroll de fotos
  useEffect(() => {
    if (expandedProfile && expandedScrollRef.current) {
      const el = expandedScrollRef.current;
      setTimeout(() => {
        if (el) {
          el.scrollTo({
            left: expandedPhotoIndex * el.clientWidth,
            behavior: 'auto',
          });
        }
      }, 40);
    }
  }, [expandedProfile]);

  const currentProfile = profiles[currentIndex];

  // Fotos del perfil actual (hasta 3 fotos máximo)
  const profilePhotos = currentProfile
    ? (currentProfile.photos && currentProfile.photos.length > 0
        ? currentProfile.photos.slice(0, 3)
        : [currentProfile.avatarUrl])
    : [];
  const safePhotoIndex = Math.min(currentPhotoIndex, Math.max(0, profilePhotos.length - 1));
  const activePhotoUrl = profilePhotos[safePhotoIndex] || currentProfile?.avatarUrl;

  const handlePrevPhoto = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (profilePhotos.length <= 1) return;
    setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : profilePhotos.length - 1));
  };

  const handleNextPhoto = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (profilePhotos.length <= 1) return;
    setCurrentPhotoIndex((prev) => (prev + 1) % profilePhotos.length);
  };

  const handleSwipe = (action: 'like' | 'pass' | 'superlike') => {
    if (!currentProfile) return;

    setSwipeDirection(action === 'pass' ? 'left' : 'right');

    setTimeout(() => {
      const result = matchService.registerSwipe(
        currentUser.id,
        currentProfile,
        action,
        'evt_tonight_01'
      );

      if (result.isMatch && result.newMatch) {
        setCelebrationMatch(result.newMatch);
        setMatches(matchService.getMatches());

        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#F39200', '#FFFFFF', '#10B981'],
        });
      }

      setSwipeDirection(null);
      setDragOffset({ x: 0, y: 0 });
      setCurrentIndex((prev) => prev + 1);
    }, 220);
  };

  const handleInviteDrink = (profileToInvite = currentProfile) => {
    if (!profileToInvite) return;
    setDrinkInvitationToast(`🍸 ¡Le enviaste un trago a ${profileToInvite.nickname}! (${profileToInvite.drinkFavorite})`);
    setTimeout(() => setDrinkInvitationToast(null), 3000);
    handleSwipe('superlike');
  };

  const handleResetCards = () => {
    matchService.resetSwipes();
    setProfiles(matchService.getAvailableProfiles());
    setCurrentIndex(0);
  };

  // Pointer drag gestures
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    hasDragged.current = false;
    startPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      hasDragged.current = true;
    }
    setDragOffset({ x: dx, y: dy });
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (dragOffset.x > 90) {
      handleSwipe('like');
    } else if (dragOffset.x < -90) {
      handleSwipe('pass');
    } else {
      setDragOffset({ x: 0, y: 0 });
    }
  };

  // PANTALLA BLOQUEADA SI NO ESTÁ DENTRO DE CACHENGUEOO
  if (!isInsideVenue) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#121217] border border-zinc-800 rounded-3xl p-6 text-center shadow-2xl relative overflow-hidden">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-700/60 flex items-center justify-center mx-auto mb-3 text-[#F39200]">
            <Heart className="w-7 h-7 fill-[#F39200]" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-semibold text-zinc-300 mb-2">
            <span>CONOCÉ QUIÉN ESTÁ ESTA NOCHE</span>
          </div>

          <h2 className="text-xl font-black text-white font-display uppercase tracking-tight">
            CACHENGUEOO <span className="text-[#F39200]">MATCH</span>
          </h2>

          <p className="text-xs text-zinc-400 mt-2 leading-relaxed max-w-xs mx-auto">
            Para participar debés estar <strong className="text-white">adentro de Cachengueoo</strong> esta
            noche. Validá tu presencia por GPS o escaneá el QR en puerta.
          </p>

          <div className="mt-5 space-y-2">
            <button
              onClick={onOpenPresenceModal}
              className="w-full h-11 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-[#F39200]/20"
            >
              <MapPin className="w-4 h-4" />
              Validar que estoy en Cachengueoo
            </button>
          </div>
        </div>
      </div>
    );
  }

  // VISTA SUBTAB: NOTITAS (Pantalla dedicada con notas grandes y publicar)
  if (matchSubTab === 'notitas') {
    return (
      <NightNotesView
        currentUser={currentUser}
        profiles={profiles}
        eventTitle={eventTitle}
        onUpdateMyNote={(text) => {
          const note = text
            ? { text, createdAt: new Date().toISOString() }
            : undefined;
          if (onUpdateUserProfile) {
            onUpdateUserProfile({ nightNote: note });
          }
        }}
        onSelectProfileForMatch={(profile) => {
          const idx = profiles.findIndex((p) => p.userId === profile.userId);
          if (idx !== -1) setCurrentIndex(idx);
          if (onNavigateMatchSubTab) onNavigateMatchSubTab('pista');
        }}
        onInviteDrink={(profile) => {
          handleInviteDrink(profile);
        }}
      />
    );
  }

  // VISTA SUBTAB: MATCHES Y CHAT
  if (matchSubTab === 'matches') {
    return (
      <div className="h-full w-full max-w-md mx-auto flex flex-col overflow-hidden bg-[#09090b] select-none p-4">
        <div className="shrink-0 flex items-center justify-between pb-3 border-b border-zinc-800">
          <div>
            <h2 className="text-base font-black text-white font-display uppercase tracking-tight">
              Tus Matches de Esta Noche
            </h2>
            <p className="text-[11px] text-zinc-400">
              Personas que hicieron match con vos en <span className="text-[#F39200] font-semibold">{eventTitle}</span>
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[#F39200]/15 border border-[#F39200]/30 text-[#F39200] text-xs font-black">
            {matches.length}
          </span>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pt-3">
          {matches.length === 0 ? (
            <div className="p-8 rounded-3xl bg-[#121217] border border-zinc-800 text-center space-y-3 mt-4">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-[#F39200]">
                <Heart className="w-6 h-6 fill-[#F39200]/30" />
              </div>
              <h3 className="text-sm font-bold text-white font-display">
                Todavía no tenés matches
              </h3>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
                Deslizá a la derecha en la pista o invitales un trago para romper el hielo.
              </p>
              <button
                onClick={() => onNavigateMatchSubTab && onNavigateMatchSubTab('pista')}
                className="px-4 py-2 rounded-xl bg-[#F39200] text-black font-extrabold text-xs cursor-pointer shadow-md shadow-[#F39200]/20"
              >
                Ir a la Pista
              </button>
            </div>
          ) : (
            matches.map((item) => {
              const partner = item.partnerProfile;
              if (!partner) return null;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedChatMatch(item)}
                  className="p-3.5 rounded-2xl bg-[#121217] border border-zinc-800 hover:border-[#F39200]/60 flex items-center gap-3.5 cursor-pointer transition-all active:scale-[0.99] shadow-md group"
                >
                  <div className="relative shrink-0">
                    <img
                      src={partner.avatarUrl}
                      alt={partner.fullName}
                      className="w-13 h-13 rounded-2xl object-cover border border-zinc-700 group-hover:border-[#F39200] transition-colors"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-black" title="En la fiesta"></span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="text-sm font-black text-white font-display truncate">
                        {partner.nickname}, {partner.age}
                      </h4>
                      <span className="text-[10px] text-[#F39200] font-bold">
                        {item.lastMessageAt || 'Ahora'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 truncate">
                      {item.lastMessageSnippet || '¡Nuevo Match en Cachengueoo! Tocá para chatear.'}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal de Chat Privado */}
        {selectedChatMatch && (
          <ChatModal
            match={selectedChatMatch}
            currentUser={currentUser}
            onClose={() => setSelectedChatMatch(null)}
            onOpenInfo={() => {
              if (selectedChatMatch.partnerProfile) {
                setExpandedPhotoIndex(0);
                setExpandedProfile(selectedChatMatch.partnerProfile);
              }
            }}
            onBlockOrReport={() => {
              setSelectedChatMatch(null);
              setMatches(matchService.getMatches());
            }}
          />
        )}
      </div>
    );
  }

  // VISTA SUBTAB: PISTA (CARD 100% TINDER CON FOTO PROTAGÓNICA Y BOTONES DENTRO)
  return (
    <div className="h-full w-full max-w-md mx-auto p-2 sm:p-3 flex flex-col justify-between overflow-hidden select-none">
      {currentProfile ? (
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            transform: `translate3d(${dragOffset.x}px, ${dragOffset.y * 0.25}px, 0) rotate(${
              dragOffset.x * 0.06
            }deg)`,
            cursor: isDragging ? 'grabbing' : 'grab',
            touchAction: 'none',
          }}
          className={`h-full w-full rounded-3xl overflow-hidden border border-zinc-800/90 bg-zinc-950 shadow-2xl relative select-none flex flex-col justify-between transition-transform ${
            !isDragging ? 'duration-200' : ''
          } ${
            swipeDirection === 'left'
              ? '-translate-x-28 -rotate-12 opacity-20'
              : swipeDirection === 'right'
              ? 'translate-x-28 rotate-12 opacity-20'
              : ''
          }`}
        >
          {/* FOTO DE PERFIL A PANTALLA COMPLETA EXACTO COMO TINDER */}
          <img
            key={activePhotoUrl}
            src={activePhotoUrl}
            alt={currentProfile.fullName}
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none transition-opacity duration-200"
          />

          {/* TAP ZONES PARA VER HASTA LAS 3 FOTOS AL TOCAR LA PANTALLA */}
          {profilePhotos.length > 1 && (
            <div className="absolute inset-x-0 top-14 bottom-36 z-15 flex pointer-events-auto">
              <button
                type="button"
                onClick={handlePrevPhoto}
                className="w-1/2 h-full cursor-pointer focus:outline-none"
                aria-label="Ver foto anterior"
                title="Foto anterior"
              />
              <button
                type="button"
                onClick={handleNextPhoto}
                className="w-1/2 h-full cursor-pointer focus:outline-none"
                aria-label="Ver siguiente foto"
                title="Foto siguiente"
              />
            </div>
          )}

          {/* DRAG VISUAL STAMPS */}
          {dragOffset.x > 30 && (
            <div className="absolute top-8 left-6 z-30 border-3 border-emerald-400 text-emerald-400 font-black text-2xl uppercase px-4 py-1 rounded-2xl -rotate-12 bg-black/60 backdrop-blur-md pointer-events-none animate-in zoom-in-75 shadow-2xl">
              LIKE ❤️
            </div>
          )}
          {dragOffset.x < -30 && (
            <div className="absolute top-8 right-6 z-30 border-3 border-rose-500 text-rose-500 font-black text-2xl uppercase px-4 py-1 rounded-2xl rotate-12 bg-black/60 backdrop-blur-md pointer-events-none animate-in zoom-in-75 shadow-2xl">
              PASAR ✕
            </div>
          )}

          {/* PARTE SUPERIOR DENTRO DE LA FOTO: LÍNEAS DE FOTOS + BOTÓN ESTOY EN LA FIESTA */}
          <div className="relative z-20 p-3 flex flex-col gap-2 pointer-events-auto">
            {/* Barra superior de segmentos: 1 a 3 líneas consiguientes a la cantidad de fotos */}
            <div className="w-full flex gap-1.5 px-0.5">
              {profilePhotos.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    idx === safePhotoIndex
                      ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]'
                      : 'bg-white/35 backdrop-blur-sm'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center justify-between">
              {/* INDICADOR SUTIL DE FIESTA: "estoy en ... (nombre fiesta)" no muy grande para no ser invasivo */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md border border-white/10 text-zinc-300 text-[10.5px] shadow-sm max-w-[210px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                <span className="truncate">
                  estoy en <span className="font-semibold text-white">{eventTitle}</span>
                </span>
              </div>

              {/* Botón Info (i) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedPhotoIndex(safePhotoIndex);
                  setExpandedProfile(currentProfile);
                }}
                className="w-8 h-8 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-white flex items-center justify-center cursor-pointer hover:bg-black transition-colors shadow-lg active:scale-95"
                title="Ver perfil completo"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* GRADIENTE INFERIOR OSCURO PARA MÁXIMA LEGIBILIDAD */}
          <div className="absolute inset-x-0 bottom-0 h-[68%] bg-gradient-to-t from-black via-black/75 to-transparent pointer-events-none z-10"></div>

          {/* PARTE INFERIOR DENTRO DE LA FOTO: PERFIL, NOTITA AL LADO DEL NOMBRE, BIO Y BOTONES TINDER */}
          <div className="relative z-20 p-4 pb-3 flex flex-col justify-end space-y-2 pointer-events-auto">
            {/* Nombre, Edad, Verificado Y LA NOTITA AL LADO DEL NOMBRE */}
            <div className="space-y-1.5 w-full min-w-0">
              <div className="flex items-center gap-2 w-full min-w-0">
                <div className="flex items-center gap-1.5 shrink-0 max-w-[55%]">
                  <h3 className="text-xl sm:text-2xl font-black text-white font-display tracking-tight leading-none drop-shadow-md truncate">
                    {currentProfile.nickname} <span className="font-light text-zinc-300">{currentProfile.age}</span>
                  </h3>
                  <span title="Verificado en la fiesta" className="shrink-0">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400 fill-sky-400/20 stroke-[2.5]" />
                  </span>
                </div>

                {/* Notita estrictamente al lado derecho del nombre: si está contraída se ve compacta aquí */}
                {currentProfile.nightNote && !isNoteExpanded && (
                  <div className="shrink min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsNoteExpanded(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/85 backdrop-blur-md border border-[#F39200]/70 text-[11px] text-white shadow-lg transition-all cursor-pointer hover:bg-black hover:border-[#F39200] active:scale-95 text-left max-w-full"
                      title="Toca para ver la notita completa"
                    >
                      <MessageSquareQuote className="w-3.5 h-3.5 text-[#F39200] shrink-0" />
                      <span className="font-medium truncate text-zinc-200">
                        "{currentProfile.nightNote.text}"
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Notita abierta en la misma pantalla: se expande completa con solo una X para sacarla */}
              {currentProfile.nightNote && isNoteExpanded && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="w-full flex items-start gap-2 p-2.5 rounded-2xl bg-black/90 backdrop-blur-md border border-[#F39200] shadow-xl text-left animate-in fade-in duration-150"
                >
                  <MessageSquareQuote className="w-4 h-4 text-[#F39200] shrink-0 mt-0.5" />
                  <p className="text-xs text-zinc-100 font-medium leading-snug flex-1 select-text">
                    "{currentProfile.nightNote.text}"
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsNoteExpanded(false);
                    }}
                    className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center justify-center text-xs shrink-0 cursor-pointer transition-colors"
                    title="Cerrar notita"
                    aria-label="Cerrar notita"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* BIO DE LA PERSONA VISIBLE EN EL MATCH CARD:
                Se ve completa (limitada a 3 renglones en la tarjeta de match) */}
            {currentProfile.bio && (
              <p className="text-xs sm:text-[13px] text-zinc-100/95 font-normal leading-snug drop-shadow-md line-clamp-3 select-text">
                "{currentProfile.bio}"
              </p>
            )}

            {/* Trago favorito e intereses en formato minimalista */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-200">
              <div className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-1 text-[#F39200] text-[10.5px] font-bold">
                <GlassWater className="w-3 h-3 text-[#F39200]" />
                <span>{currentProfile.drinkFavorite}</span>
              </div>

              {currentProfile.interests.slice(0, 2).map((item, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10.5px] font-medium text-zinc-300"
                >
                  {item}
                </span>
              ))}
            </div>

            {/* BOTONES TINDER DENTRO DE LA FOTO DE PERFIL:
                - Pasar (✕): Grande (red)
                - Invitar un trago (🍸+): Sobrio, elegante, centrado, más chico
                - Match (❤️): Grande (emerald / red heart)
            */}
            <div className="pt-2 flex items-center justify-center gap-6 sm:gap-8">
              {/* Botón PASAR (✕) - MÁS GRANDE QUE EL TRAGO */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSwipe('pass');
                }}
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-zinc-950/90 border-2 border-rose-500/80 text-rose-500 hover:text-white hover:bg-rose-600/30 flex items-center justify-center shadow-2xl active:scale-90 transition-all cursor-pointer group"
                aria-label="Pasar"
                title="Pasar"
              >
                <X className="w-8 h-8 stroke-[3] group-hover:scale-110 transition-transform" />
              </button>

              {/* Botón INVITAR UN TRAGO (🍸+) - SOBRIO, ELEGANTE, CENTRADO Y MÁS CHICO */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleInviteDrink();
                }}
                className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-[#121217]/95 border border-[#F39200]/70 hover:border-[#F39200] hover:bg-[#F39200]/15 flex items-center justify-center shadow-xl active:scale-90 transition-all cursor-pointer group"
                aria-label="Invitar un trago"
                title="Invitar un trago (+)"
              >
                <DrinkPlusIcon size={24} />
              </button>

              {/* Botón MATCH / LIKE (❤️) - MÁS GRANDE QUE EL TRAGO */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSwipe('like');
                }}
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-zinc-950/90 border-2 border-emerald-400 text-emerald-400 hover:text-white hover:bg-emerald-600/30 flex items-center justify-center shadow-2xl active:scale-90 transition-all cursor-pointer group"
                aria-label="Match"
                title="Match"
              >
                <Heart className="w-8 h-8 fill-emerald-400 stroke-emerald-400 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Estado vacío cuando se terminaron los perfiles */
        <div className="h-full flex flex-col items-center justify-center p-6 bg-[#121217] border border-zinc-800 rounded-3xl text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#F39200]">
            <Sparkles className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white font-display">
            ¡Viste a todos los perfiles de la fiesta por ahora!
          </h3>
          <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
            A medida que más gente valide su presencia en Cachengueoo, van a aparecer
            nuevos perfiles en la pista.
          </p>
          <button
            onClick={handleResetCards}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-xs font-semibold text-white flex items-center gap-2 cursor-pointer transition-colors shadow-lg"
          >
            <RotateCcw className="w-4 h-4 text-[#F39200]" />
            Volver a revisar perfiles
          </button>
        </div>
      )}

      {/* TOAST DE INVITACIÓN DE TRAGO */}
      {drinkInvitationToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#121217] border border-[#F39200] text-white text-xs font-bold px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <DrinkPlusIcon size={16} />
          <span>{drinkInvitationToast}</span>
        </div>
      )}

      {/* POPUP DE INFORMACIÓN DEL PERFIL (ESTILO POP UP, MISMA SECCIÓN) */}
      {expandedProfile && (() => {
        const expandedPhotos =
          expandedProfile.photos && expandedProfile.photos.length > 0
            ? expandedProfile.photos.slice(0, 3)
            : [expandedProfile.avatarUrl];

        return (
          <div
            onClick={() => setExpandedProfile(null)}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative bg-[#14141a] border border-zinc-700/80 rounded-3xl w-full max-w-sm overflow-hidden p-4 sm:p-5 space-y-3.5 shadow-2xl max-h-[88vh] overflow-y-auto animate-in zoom-in-95 duration-150"
            >
              {/* Botón X arriba a la derecha para salir del popup */}
              <button
                type="button"
                onClick={() => setExpandedProfile(null)}
                className="absolute top-3.5 right-3.5 z-30 w-8 h-8 rounded-full bg-black/80 hover:bg-black border border-white/20 text-white flex items-center justify-center cursor-pointer transition-all shadow-xl active:scale-95"
                title="Cerrar información"
                aria-label="Cerrar información"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>

              {/* Fotos del perfil como en Match: scroll horizontal snap-x con rayitas indicadoras arriba */}
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-zinc-700/80 bg-black shadow-lg">
                <div
                  ref={expandedScrollRef}
                  onScroll={(e) => {
                    const target = e.currentTarget;
                    const width = target.clientWidth;
                    if (width > 0) {
                      const newIdx = Math.round(target.scrollLeft / width);
                      if (newIdx !== expandedPhotoIndex && newIdx >= 0 && newIdx < expandedPhotos.length) {
                        setExpandedPhotoIndex(newIdx);
                      }
                    }
                  }}
                  className="flex w-full h-full overflow-x-auto snap-x snap-mandatory scrollbar-none"
                >
                  {expandedPhotos.map((ph, idx) => (
                    <div key={idx} className="w-full h-full shrink-0 snap-center relative">
                      <img
                        src={ph}
                        alt={`${expandedProfile.fullName} foto ${idx + 1}`}
                        className="w-full h-full object-cover select-none pointer-events-none"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ))}
                </div>

                {/* Líneas indicadoras de fotos arriba (como en Match: consiguientes a la cantidad de fotos) */}
                <div className="absolute top-2.5 inset-x-3 z-20 flex gap-1.5 pointer-events-none">
                  {expandedPhotos.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                        idx === expandedPhotoIndex
                          ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]'
                          : 'bg-white/35 backdrop-blur-sm'
                      }`}
                    />
                  ))}
                </div>

                {/* Tap zones para cambiar de foto al tocar izquierda/derecha además del scroll */}
                {expandedPhotos.length > 1 && (
                  <div className="absolute inset-0 z-10 flex">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const prevIdx =
                          expandedPhotoIndex > 0 ? expandedPhotoIndex - 1 : expandedPhotos.length - 1;
                        setExpandedPhotoIndex(prevIdx);
                        if (expandedScrollRef.current) {
                          expandedScrollRef.current.scrollTo({
                            left: prevIdx * expandedScrollRef.current.clientWidth,
                            behavior: 'smooth',
                          });
                        }
                      }}
                      className="w-1/2 h-full cursor-pointer focus:outline-none"
                      aria-label="Foto anterior"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextIdx = (expandedPhotoIndex + 1) % expandedPhotos.length;
                        setExpandedPhotoIndex(nextIdx);
                        if (expandedScrollRef.current) {
                          expandedScrollRef.current.scrollTo({
                            left: nextIdx * expandedScrollRef.current.clientWidth,
                            behavior: 'smooth',
                          });
                        }
                      }}
                      className="w-1/2 h-full cursor-pointer focus:outline-none"
                      aria-label="Foto siguiente"
                    />
                  </div>
                )}

                {/* Contador discreto cuando hay más de 1 foto */}
                {expandedPhotos.length > 1 && (
                  <div className="absolute bottom-2.5 right-2.5 z-20 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm text-[10px] font-bold text-white pointer-events-none">
                    {expandedPhotoIndex + 1} / {expandedPhotos.length}
                  </div>
                )}
              </div>

              {/* Notita de la persona con "Se borra en ..." */}
              {expandedProfile.nightNote && (
                <div className="p-3 rounded-2xl bg-zinc-900/90 border border-[#F39200]/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-[#F39200] flex items-center gap-1">
                      <MessageSquareQuote className="w-3.5 h-3.5" /> Notita de la noche
                    </span>
                    <span className="text-[10px] text-[#F39200] font-bold flex items-center gap-1 bg-[#F39200]/10 px-2 py-0.5 rounded-full border border-[#F39200]/25">
                      <Clock className="w-3 h-3" />
                      <span>Se borra en {formatTimeRemaining(expandedProfile.nightNote.createdAt)}</span>
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-white leading-relaxed">
                    “{expandedProfile.nightNote.text}”
                  </p>
                </div>
              )}

              {/* Nombre y Edad (sin "hace 2 min via QR" ni "en la fiesta") */}
              <div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-lg font-black text-white font-display">
                    {expandedProfile.fullName}
                  </h3>
                  <span className="text-zinc-400 text-sm">
                    ({expandedProfile.nickname}), {expandedProfile.age}
                  </span>
                </div>
              </div>

              {/* Instagram de la persona */}
              {expandedProfile.instagram && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-[#F39200]/10 border border-pink-500/30">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#F39200] via-[#E1306C] to-[#C13584] flex items-center justify-center text-white shadow-sm shrink-0">
                      <Instagram className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9.5px] uppercase font-bold text-zinc-400 block tracking-wider leading-none mb-0.5">
                        Instagram
                      </span>
                      <span className="text-xs font-bold text-white truncate block">
                        {expandedProfile.instagram.startsWith('@')
                          ? expandedProfile.instagram
                          : `@${expandedProfile.instagram}`}
                      </span>
                    </div>
                  </div>
                  <a
                    href={`https://instagram.com/${expandedProfile.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold transition-colors cursor-pointer shrink-0 ml-2"
                  >
                    <span>Ver perfil</span>
                    <ExternalLink className="w-3 h-3 text-zinc-300" />
                  </a>
                </div>
              )}

              {/* Biografía completa, trago e intereses */}
              <div className="space-y-2.5 text-xs">
                {expandedProfile.bio && (
                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider mb-1">
                      Biografía
                    </span>
                    <p className="text-zinc-200 text-xs leading-relaxed">
                      {expandedProfile.bio}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
                  <div className="w-7 h-7 rounded-lg bg-[#F39200]/15 border border-[#F39200]/30 flex items-center justify-center text-[#F39200] shrink-0">
                    <GlassWater className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px] leading-none mb-0.5">Trago preferido</span>
                    <span className="text-white font-semibold text-xs">{expandedProfile.drinkFavorite}</span>
                  </div>
                </div>

                {expandedProfile.interests && expandedProfile.interests.length > 0 && (
                  <div>
                    <span className="text-zinc-500 block mb-1 text-[10px] uppercase font-bold tracking-wider">
                      Intereses:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {expandedProfile.interests.map((it, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px]"
                        >
                          {it}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL DE CELEBRACIÓN DE MATCH */}
      {celebrationMatch && celebrationMatch.partnerProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg animate-in zoom-in-95 duration-200">
          <div className="max-w-sm w-full bg-[#121217] border border-[#F39200]/40 rounded-3xl p-6 text-center space-y-4 shadow-2xl relative">
            <span className="inline-block px-3 py-0.5 rounded-full bg-[#F39200]/10 border border-[#F39200]/30 text-[#F39200] text-[10px] font-bold tracking-widest uppercase">
              ¡HICIERON MATCH!
            </span>

            <h3 className="text-xl font-black text-white font-display uppercase tracking-tight">
              ESTÁN EN <span className="text-[#F39200]">CACHENGUEOO</span>
            </h3>

            {/* Colisión de avatares */}
            <div className="flex items-center justify-center -space-x-3 py-1">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.fullName}
                className="w-16 h-16 rounded-full object-cover border-2 border-[#F39200] shadow-xl"
                referrerPolicy="no-referrer"
              />
              <div className="w-8 h-8 rounded-full bg-[#F39200] text-black font-black flex items-center justify-center z-10 shadow-md text-sm">
                ❤️
              </div>
              <img
                src={celebrationMatch.partnerProfile.avatarUrl}
                alt={celebrationMatch.partnerProfile.fullName}
                className="w-16 h-16 rounded-full object-cover border-2 border-[#F39200] shadow-xl"
                referrerPolicy="no-referrer"
              />
            </div>

            <p className="text-xs text-zinc-300 max-w-xs mx-auto leading-relaxed">
              Vos y <strong className="text-white">{celebrationMatch.partnerProfile.nickname}</strong> se
              gustaron esta noche. ¿Sale ese primer trago en la barra?
            </p>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  const m = celebrationMatch;
                  setCelebrationMatch(null);
                  setSelectedChatMatch(m);
                }}
                className="w-full h-11 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#F39200]/20"
              >
                <MessageCircle className="w-4 h-4" />
                Escribir ahora por chat
              </button>

              <button
                onClick={() => setCelebrationMatch(null)}
                className="w-full h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium text-xs cursor-pointer hover:text-white"
              >
                Seguir en la Pista
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CHAT CON UN MATCH SELECCIONADO */}
      {selectedChatMatch && (
        <ChatModal
          match={selectedChatMatch}
          currentUser={currentUser}
          onClose={() => setSelectedChatMatch(null)}
          onOpenInfo={() => {
            if (selectedChatMatch.partnerProfile) {
              setExpandedPhotoIndex(0);
              setExpandedProfile(selectedChatMatch.partnerProfile);
            }
          }}
          onBlockOrReport={() => {
            setSelectedChatMatch(null);
            setMatches(matchService.getMatches());
          }}
        />
      )}
    </div>
  );
};

interface ChatModalProps {
  match: MatchPair;
  currentUser: UserProfile;
  onClose: () => void;
  onOpenInfo?: () => void;
  onBlockOrReport: () => void;
}

const ChatModal: React.FC<ChatModalProps> = ({
  match,
  currentUser,
  onClose,
  onOpenInfo,
  onBlockOrReport,
}) => {
  const [messages, setMessages] = useState(() => matchService.getMessages(match.id));
  const [inputText, setInputText] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  const partner = match.partnerProfile;
  if (!partner) return null;

  const handleSend = (textToSend = inputText) => {
    if (!textToSend.trim()) return;

    const newMsg = matchService.sendMessage(
      match.id,
      currentUser.id,
      partner.userId,
      textToSend.trim()
    );

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');

    setTimeout(() => {
      const responses = [
        '¡Genial! Estoy cerca de la barra principal con un gin tonic 😉',
        '¡Dale! ¿De qué parte de Mendoza sos?',
        '¡Reee! Si pasás por la pista avisame 🍸',
      ];
      const randomText = responses[Math.floor(Math.random() * responses.length)];
      const reply = matchService.sendMessage(match.id, partner.userId, currentUser.id, randomText);
      setMessages((prev) => [...prev, reply]);
    }, 1200);
  };

  const handleBlock = () => {
    matchService.blockUser(match.id);
    onBlockOrReport();
  };

  const handleReport = () => {
    matchService.reportUser(match.id, 'Reportado por el usuario en Cachengueoo');
    onBlockOrReport();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#121217] sm:border border-zinc-800 sm:rounded-3xl w-full max-w-md h-full sm:h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Chat Header */}
        <div className="p-3.5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
            <div
              onClick={onOpenInfo}
              className={`flex items-center gap-2.5 min-w-0 ${onOpenInfo ? 'cursor-pointer group' : ''}`}
              title={onOpenInfo ? 'Ver perfil completo e Instagram' : undefined}
            >
              <div className="relative shrink-0">
                <img
                  src={partner.avatarUrl}
                  alt={partner.fullName}
                  className="w-9 h-9 rounded-full object-cover border border-zinc-700 group-hover:border-[#F39200] transition-colors"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-black"></span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-white font-display group-hover:text-[#F39200] transition-colors truncate">
                    {partner.nickname}
                  </h3>
                  {partner.instagram && (
                    <span className="text-[10px] text-pink-400 font-semibold flex items-center gap-0.5 shrink-0">
                      <Instagram className="w-2.5 h-2.5" />
                      {partner.instagram}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[#F39200] truncate">En Cachengueoo ahora · Barra</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onOpenInfo && (
              <button
                type="button"
                onClick={onOpenInfo}
                className="p-1.5 text-zinc-400 hover:text-[#F39200] rounded-lg cursor-pointer transition-colors"
                title="Ver perfil completo e Instagram"
              >
                <Info className="w-4 h-4" />
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4" />
              </button>

                {showMenu && (
                  <div className="absolute right-0 top-10 w-44 bg-[#1a1a24] border border-zinc-700 rounded-xl shadow-xl p-1.5 z-20 space-y-1">
                    <button
                      onClick={handleBlock}
                      className="w-full px-3 py-2 text-left text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg flex items-center gap-2 cursor-pointer"
                    >
                      <UserX className="w-3.5 h-3.5 text-zinc-400" />
                      Bloquear usuario
                    </button>
                    <button
                      onClick={handleReport}
                      className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-red-950/40 rounded-lg flex items-center gap-2 cursor-pointer"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      Reportar conducta
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

        {/* Message Feed */}
        <div className="flex-1 p-3.5 overflow-y-auto space-y-2.5">
          <div className="text-center my-1">
            <span className="px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[9px] text-zinc-400">
              Match producido hoy en Cachengueoo
            </span>
          </div>

          {messages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed ${
                    isMe
                      ? 'bg-[#F39200] text-black font-medium rounded-br-xs'
                      : 'bg-zinc-800/90 text-white rounded-bl-xs'
                  }`}
                >
                  {msg.text}
                </div>
                <div className="flex items-center gap-1 mt-0.5 text-[8.5px] text-zinc-500 px-1">
                  <span>
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {isMe && <CheckCheck className="w-3 h-3 text-zinc-400" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Icebreakers */}
        <div className="px-3 py-1.5 border-t border-zinc-800/60 bg-zinc-950/50 flex gap-1.5 overflow-x-auto no-scrollbar">
          {['¿Sale ese Fernet? 🍸', '¿Dónde estás parada?', '¡Gran tema este! 🔥'].map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSend(prompt)}
              className="px-2.5 py-0.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-300 whitespace-nowrap cursor-pointer transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Message Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-2.5 border-t border-zinc-800/80 bg-zinc-900/40 flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Escribí un mensaje..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 h-10 px-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-[#F39200]"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="w-10 h-10 rounded-xl bg-[#F39200] hover:bg-[#E08400] disabled:opacity-40 text-black flex items-center justify-center transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
