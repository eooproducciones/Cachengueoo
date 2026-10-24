import React, { useState } from 'react';
import {
  Plus,
  Clock,
  Trash2,
  Heart,
  Sparkles,
  X,
  MessageSquareQuote,
} from 'lucide-react';
import { MatchProfile, NightStory, UserProfile } from '../../types';
import { formatTimeRemaining } from '../../utils/timeAgo';
import { MOCK_NIGHT_STORIES } from '../../data/mockData';
import { NightCameraModal } from './NightCameraModal';
import { StoryViewerModal } from './StoryViewerModal';

interface NightNotesViewProps {
  currentUser: UserProfile;
  profiles: MatchProfile[];
  eventTitle: string;
  onUpdateMyNote: (text: string) => void;
  onSelectProfileForMatch: (profile: MatchProfile) => void;
  onInviteDrink?: (profile: MatchProfile) => void;
}

export const NightNotesView: React.FC<NightNotesViewProps> = ({
  currentUser,
  profiles,
  onUpdateMyNote,
  onSelectProfileForMatch,
}) => {
  // Modal de Crear Notita
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteInput, setNoteInput] = useState('');

  // Historias / Instantáneas de la noche
  const [stories, setStories] = useState<NightStory[]>(MOCK_NIGHT_STORIES);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [viewerStoryIndex, setViewerStoryIndex] = useState<number | null>(null);

  // Estado local para corazones de las notitas de los perfiles (inicia en 0 reales)
  const [profileNotesHearts, setProfileNotesHearts] = useState<Record<string, { count: number; userLiked: boolean }>>(() => {
    const initial: Record<string, { count: number; userLiked: boolean }> = {};
    profiles.forEach((p) => {
      if (p.nightNote) {
        initial[p.userId] = {
          count: p.nightNote.hearts || 0,
          userLiked: false,
        };
      }
    });
    return initial;
  });

  // Corazones reales acumulados hoy (comienza en 0, sin valores ficticios)
  const [myCollectedHearts, setMyCollectedHearts] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(`cachengueoo_user_hearts_${currentUser.id}`);
      if (stored !== null) return Number(stored) || 0;
    } catch (e) {
      console.error(e);
    }
    return currentUser.nightNote?.hearts || 0;
  });

  // Manejador para publicar nueva notita
  const handlePublishNote = (text = noteInput) => {
    if (!text.trim()) return;
    onUpdateMyNote(text.trim());
    setNoteInput('');
    setIsNoteModalOpen(false);
  };

  // Manejador para eliminar notita
  const handleDeleteNote = () => {
    onUpdateMyNote('');
    setNoteInput('');
  };

  // Publicar nueva historia instantánea
  const handlePublishStory = (newStory: NightStory) => {
    setStories((prev) => [newStory, ...prev]);
  };

  // Eliminar historia
  const handleDeleteStory = (storyId: string) => {
    setStories((prev) => prev.filter((s) => s.id !== storyId));
  };

  // Dejar corazón en una historia
  const handleHeartStory = (storyId: string) => {
    setStories((prev) =>
      prev.map((s) => {
        if (s.id === storyId) {
          const newHearts = (s.hearts || 0) + 1;
          if (s.userId === currentUser.id) {
            setMyCollectedHearts((c) => {
              const next = c + 1;
              try {
                localStorage.setItem(`cachengueoo_user_hearts_${currentUser.id}`, String(next));
              } catch (e) {
                console.error(e);
              }
              return next;
            });
          }
          return { ...s, hearts: newHearts };
        }
        return s;
      })
    );
  };

  // Dejar corazón en la notita de otra persona
  const handleHeartNote = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // No disparar clic del box hacia el perfil
    setProfileNotesHearts((prev) => {
      const current = prev[userId] || { count: 0, userLiked: false };
      const nextLiked = !current.userLiked;
      const nextCount = nextLiked ? current.count + 1 : Math.max(0, current.count - 1);
      
      // Si el corazón es para el usuario actual
      if (userId === currentUser.id) {
        setMyCollectedHearts(nextCount);
        try {
          localStorage.setItem(`cachengueoo_user_hearts_${currentUser.id}`, String(nextCount));
        } catch (err) {
          console.error(err);
        }
      } else {
        try {
          const otherCurrent = Number(localStorage.getItem(`cachengueoo_user_hearts_${userId}`)) || 0;
          const otherNext = nextLiked ? otherCurrent + 1 : Math.max(0, otherCurrent - 1);
          localStorage.setItem(`cachengueoo_user_hearts_${userId}`, String(otherNext));
        } catch (err) {
          console.error(err);
        }
      }

      return {
        ...prev,
        [userId]: { count: nextCount, userLiked: nextLiked },
      };
    });
  };

  // Historia activa del usuario actual
  const myActiveStory = stories.find((s) => s.userId === currentUser.id);

  // Perfiles que tienen notita activa
  const profilesWithNotes = profiles.filter((p) => Boolean(p.nightNote));

  // Calcular minutos restantes de una historia
  const getStoryMinutesRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(1, Math.round(diff / (60 * 1000)));
  };

  return (
    <div className="h-full w-full max-w-md mx-auto flex flex-col overflow-hidden bg-[#09090b] select-none">
      {/* Riel superior estilo Instagram Notes & Stories */}
      <div className="shrink-0 px-4 pt-3 pb-2 border-b border-zinc-800/60 bg-[#0d0d12]/95 space-y-2.5">
        {/* Carrusel con burbuja de Tu Notita (como en Instagram) y las historias circulares GRANDES */}
        <div className="flex items-start gap-4 overflow-x-auto pb-1.5 pt-1 scrollbar-none">
          {/* Burbuja exacta al diseño de Instagram Notes:
              Foto de perfil grande, burbuja de pensamiento "Tu notita" arriba y botón (+) blanco */}
          <div className="flex flex-col items-center shrink-0 relative">
            {/* Burbuja de pensamiento de Instagram */}
            <div
              onClick={() => {
                setNoteInput(currentUser.nightNote?.text || '');
                setIsNoteModalOpen(true);
              }}
              className="mb-1 cursor-pointer group active:scale-95 transition-transform"
              title={currentUser.nightNote ? 'Ver tu notita' : 'Escribir tu notita'}
            >
              <div className="relative px-3 py-1.5 rounded-2xl bg-zinc-800/95 border border-zinc-700/80 text-center shadow-lg group-hover:border-[#F39200] transition-colors max-w-[96px]">
                <p className="text-[11px] font-bold text-zinc-100 truncate">
                  {currentUser.nightNote ? currentUser.nightNote.text : 'Tu notita'}
                </p>
                {/* Rabito de la nube de pensamiento */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-zinc-800 border-r border-b border-zinc-700/80"></div>
                <div className="absolute -bottom-2 left-[44%] w-1 h-1 rounded-full bg-zinc-800"></div>
              </div>
            </div>

            {/* Avatar grande del usuario con botón + para Instantánea */}
            <div className="relative">
              <div
                onClick={() => {
                  if (myActiveStory) {
                    const idx = stories.findIndex((s) => s.id === myActiveStory.id);
                    if (idx !== -1) setViewerStoryIndex(idx);
                  } else {
                    setIsCameraOpen(true);
                  }
                }}
                className={`w-18 h-18 sm:w-20 sm:h-20 rounded-full p-1 cursor-pointer active:scale-95 transition-transform ${
                  myActiveStory
                    ? 'bg-gradient-to-tr from-[#F39200] via-rose-500 to-amber-300 ring-2 ring-[#F39200]/50'
                    : 'border-2 border-zinc-700 hover:border-zinc-500'
                }`}
              >
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.nickname}
                  referrerPolicy="no-referrer"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>

              {/* Botón (+) estilo Instagram: si tocan el +, abre para agregar instantánea */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCameraOpen(true);
                }}
                className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-white text-black flex items-center justify-center shadow-xl border-2 border-black hover:scale-110 active:scale-90 transition-transform cursor-pointer"
                title="Agregar instantánea"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
              </button>
            </div>

            <span className="text-[11px] text-zinc-300 font-bold mt-1 truncate max-w-[80px] text-center">
              {currentUser.nickname}
            </span>
          </div>

          {/* Burbujas de Historias de los demás usuarios (Círculos GRANDES como solicitado) */}
          {stories
            .filter((s) => s.userId !== currentUser.id)
            .map((story) => {
              const minutes = getStoryMinutesRemaining(story.expiresAt);
              return (
                <div
                  key={story.id}
                  onClick={() => {
                    const idx = stories.findIndex((s) => s.id === story.id);
                    if (idx !== -1) setViewerStoryIndex(idx);
                  }}
                  className="flex flex-col items-center shrink-0 cursor-pointer group active:scale-95 transition-transform pt-7"
                >
                  <div className="relative">
                    <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full p-1 bg-gradient-to-tr from-[#F39200] via-rose-500 to-amber-300 ring-2 ring-[#F39200]/40 group-hover:scale-105 transition-transform shadow-lg">
                      <img
                        src={story.userAvatar}
                        alt={story.userName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full rounded-full object-cover border-2 border-black"
                      />
                    </div>
                    <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-black/95 border border-[#F39200] text-[#F39200] font-black text-[10px] shadow-md">
                      {minutes}m
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-300 font-semibold mt-1 truncate max-w-[76px] text-center">
                    {story.userName}
                  </span>
                </div>
              );
            })}
        </div>

        {/* Sección sobria: Hoy recogiste X corazones + regla de 1 hora */}
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-900/70 border border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-500">
              <Heart className="w-3.5 h-3.5 fill-rose-500" />
            </div>
            <div className="text-[11px] text-zinc-300 leading-tight">
              Hoy recogiste <span className="font-black text-rose-400">{myCollectedHearts} corazones</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
            <Clock className="w-3 h-3 text-[#F39200]" />
            <span>Se borran en 1 h o al salir</span>
          </div>
        </div>
      </div>

      {/* Lista de Notitas de la Noche
          - Sin foto de perfil en el box (solo nombre, edad, en cuanto se borra y la notita)
          - Al tocar la caja lleva directo al perfil (desapareció el botón "ver perfil")
          - Permite dejar un corazón en la notita
      */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-2.5">
        {profilesWithNotes.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-3">
            <MessageSquareQuote className="w-10 h-10 text-zinc-600 mx-auto" />
            <h4 className="text-sm font-bold text-white font-display">Todavía no hay notitas en la fiesta</h4>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
              Tocá el botón superior "+" para publicar tu notita y romper el hielo con la gente que está en Cachengueoo.
            </p>
          </div>
        ) : (
          profilesWithNotes.map((profile) => {
            const note = profile.nightNote;
          if (!note) return null;

          const heartsInfo = profileNotesHearts[profile.userId] || {
            count: note.hearts || 4,
            userLiked: false,
          };
          const timeLeft = formatTimeRemaining(note.createdAt);

          return (
            <div
              key={profile.userId}
              onClick={() => onSelectProfileForMatch(profile)}
              className="p-3.5 rounded-2xl bg-[#121217] border border-zinc-800 hover:border-[#F39200]/60 active:scale-[0.99] cursor-pointer transition-all shadow-md group"
            >
              {/* Encabezado: Nombre, Edad, Tiempo restante para borrarse y Botón Corazón */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-baseline gap-2">
                  <h4 className="text-sm font-black text-white group-hover:text-[#F39200] font-display transition-colors">
                    {profile.nickname || profile.fullName}
                  </h4>
                  <span className="text-xs text-zinc-400 font-light">{profile.age} años</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Tiempo exacto que le queda a la nota */}
                  <span className="text-[10px] text-[#F39200] font-bold flex items-center gap-1 bg-[#F39200]/10 px-2 py-0.5 rounded-full border border-[#F39200]/25">
                    <Clock className="w-3 h-3" />
                    <span>Se borra en {timeLeft}</span>
                  </span>

                  {/* Botón de Corazón en la notita */}
                  <button
                    type="button"
                    onClick={(e) => handleHeartNote(profile.userId, e)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black transition-all cursor-pointer ${
                      heartsInfo.userLiked
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 scale-105'
                        : 'bg-zinc-800/80 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800'
                    }`}
                    title="Dejar corazón en esta notita"
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        heartsInfo.userLiked ? 'fill-rose-500 text-rose-500' : ''
                      }`}
                    />
                    <span>{heartsInfo.count}</span>
                  </button>
                </div>
              </div>

              {/* Box de la Notita (limpio, sin foto) */}
              <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800/80 group-hover:border-zinc-700 transition-colors">
                <p className="text-xs sm:text-[13px] text-zinc-100 font-medium leading-relaxed">
                  “{note.text}”
                </p>
              </div>
            </div>
          );
        })
        )}
      </div>

      {/* Modal para Notita:
          - Si no tiene notita: "Nueva Notita"
          - Si ya tiene notita: "Eliminar notita" (sin opción de edición)
      */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#121217] border border-zinc-800 rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
              <div className="flex items-center gap-2">
                <MessageSquareQuote className="w-4 h-4 text-[#F39200]" />
                <h3 className="text-sm font-bold text-white font-display">
                  {currentUser.nightNote ? 'Tu Notita Actual' : 'Nueva Notita'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNoteModalOpen(false)}
                className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {currentUser.nightNote ? (
              /* Ya tiene notita activa: solo se puede ELIMINAR, sin edición */
              <div className="space-y-4">
                <div className="p-3 rounded-2xl bg-zinc-900 border border-[#F39200]/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#F39200] font-black uppercase">
                      Activa en la fiesta
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      Se borra en {formatTimeRemaining(currentUser.nightNote.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-white font-semibold">
                    “{currentUser.nightNote.text}”
                  </p>
                </div>

                <p className="text-[11px] text-zinc-400">
                  Las notitas no se pueden editar. Si querés cambiarla podés eliminarla y escribir una nueva.
                </p>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsNoteModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold text-xs"
                  >
                    Volver
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteNote();
                      setIsNoteModalOpen(false);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar notita</span>
                  </button>
                </div>
              </div>
            ) : (
              /* No tiene notita: Crear "Nueva Notita" */
              <div className="space-y-4">
                <div>
                  <label className="text-zinc-300 text-xs block mb-1 font-medium">
                    ¿Qué estás haciendo ahora?
                  </label>
                  <textarea
                    rows={2}
                    maxLength={70}
                    placeholder="Ej: ¿Quién para bailar hasta el amanecer? 💃"
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-[#F39200]"
                    autoFocus
                  />
                  <span className="text-[10px] text-zinc-500 block text-right mt-1">
                    {noteInput.length}/70 caracteres
                  </span>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => handlePublishNote()}
                    disabled={!noteInput.trim()}
                    className="w-full py-3 rounded-xl bg-[#F39200] hover:bg-[#E08400] disabled:opacity-40 disabled:pointer-events-none text-black text-xs font-black cursor-pointer shadow-lg shadow-[#F39200]/20 active:scale-95 transition-all"
                  >
                    Publicar notita
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Visor de Cámara Instantánea (permite sacar varias fotos) */}
      <NightCameraModal
        currentUser={currentUser}
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onPublishStory={handlePublishStory}
      />

      {/* Visor de Historias en Pantalla Completa (reacciones exclusivas con corazones) */}
      {viewerStoryIndex !== null && (
        <StoryViewerModal
          stories={stories}
          initialIndex={viewerStoryIndex}
          currentUser={currentUser}
          isOpen={viewerStoryIndex !== null}
          onClose={() => setViewerStoryIndex(null)}
          onDeleteStory={handleDeleteStory}
          onHeartStory={handleHeartStory}
        />
      )}
    </div>
  );
};
