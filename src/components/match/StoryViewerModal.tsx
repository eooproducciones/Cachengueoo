import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Clock,
  Trash2,
  Heart,
} from 'lucide-react';
import { NightStory, UserProfile } from '../../types';

interface StoryViewerModalProps {
  stories: NightStory[];
  initialIndex: number;
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onDeleteStory?: (storyId: string) => void;
  onHeartStory?: (storyId: string) => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  stories,
  initialIndex,
  currentUser,
  isOpen,
  onClose,
  onDeleteStory,
  onHeartStory,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number }[]>([]);

  const storyDurationMs = 5000;
  const progressIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const currentStory = stories[currentIndex];

  // Temporizador de avance automático de historia
  useEffect(() => {
    if (!isOpen || !currentStory || isPaused) return;

    setProgress(0);
    const stepTime = 50;
    const increment = (stepTime / storyDurationMs) * 100;

    progressIntervalRef.current = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + increment;
      });
    }, stepTime);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isOpen, currentIndex, currentStory, isPaused]);

  if (!isOpen || !currentStory) return null;

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    }
  };

  // Reacción ÚNICA con corazones
  const handleSendHeart = () => {
    const id = Date.now() + Math.random();
    const x = Math.random() * 50 + 25; // 25% a 75%
    setFloatingHearts((prev) => [...prev, { id, x }]);

    if (onHeartStory) {
      onHeartStory(currentStory.id);
    }

    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((item) => item.id !== id));
    }, 1600);
  };

  // Calcular tiempo restante para que se borre
  const calculateRemainingMinutes = (expiresAt: string) => {
    const remainingMs = new Date(expiresAt).getTime() - Date.now();
    const remainingMinutes = Math.max(1, Math.round(remainingMs / (60 * 1000)));
    return remainingMinutes;
  };

  const minutesLeft = calculateRemainingMinutes(currentStory.expiresAt);
  const isMine = currentStory.userId === currentUser.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl animate-in fade-in duration-200 select-none">
      <div
        onPointerDown={() => setIsPaused(true)}
        onPointerUp={() => setIsPaused(false)}
        className="relative w-full max-w-sm h-full max-h-[92vh] sm:rounded-3xl overflow-hidden bg-black flex flex-col justify-between border border-zinc-800 shadow-2xl"
      >
        {/* Barras de Progreso Segmentadas Superiores */}
        <div className="absolute top-0 inset-x-0 z-30 p-3 pt-3 flex gap-1 pointer-events-none">
          {stories.map((s, idx) => (
            <div
              key={s.id}
              className="h-1 flex-1 rounded-full bg-white/25 overflow-hidden backdrop-blur-sm"
            >
              <div
                className="h-full bg-white transition-all duration-75"
                style={{
                  width:
                    idx < currentIndex
                      ? '100%'
                      : idx === currentIndex
                      ? `${progress}%`
                      : '0%',
                }}
              ></div>
            </div>
          ))}
        </div>

        {/* Header de la historia (Usuario, Tiempo y Botón Cerrar) */}
        <div className="absolute top-4 inset-x-0 z-30 px-3.5 pt-2 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2.5">
            <img
              src={currentStory.userAvatar}
              alt={currentStory.userName}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-full object-cover border-2 border-[#F39200] shadow-md"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-white font-display">
                  {currentStory.userName}
                </span>
                {isMine && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[#F39200] text-black font-extrabold">
                    Tú
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-[#F39200] font-bold">
                <Clock className="w-3 h-3" />
                <span>Se borra en {minutesLeft} min</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isMine && onDeleteStory && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteStory(currentStory.id);
                  onClose();
                }}
                className="w-8 h-8 rounded-full bg-black/60 border border-red-500/40 text-red-400 hover:text-white hover:bg-red-600/80 flex items-center justify-center cursor-pointer transition-colors"
                title="Eliminar mi historia"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/60 border border-white/20 text-white flex items-center justify-center hover:bg-black/90 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Zonas de navegación por toque (Izquierda = Anterior, Derecha = Siguiente) */}
        <div className="absolute inset-y-16 inset-x-0 z-20 flex">
          <div
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="w-1/3 h-full cursor-pointer"
          ></div>
          <div
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="w-2/3 h-full cursor-pointer"
          ></div>
        </div>

        {/* Contenido Visual de la Historia */}
        <div className="relative flex-1 w-full h-full bg-zinc-950 flex items-center justify-center overflow-hidden">
          {currentStory.mediaType === 'image' ? (
            <img
              src={currentStory.mediaUrl}
              alt={currentStory.userName}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              src={currentStory.mediaUrl}
              autoPlay
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          )}

          {/* Sombra de viñeta inferior para lectura clara */}
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none z-10"></div>

          {/* Partículas de Corazones Flotantes */}
          {floatingHearts.map((item) => (
            <div
              key={item.id}
              style={{ left: `${item.x}%` }}
              className="absolute bottom-20 z-40 text-4xl animate-bounce duration-1000 pointer-events-none drop-shadow-2xl"
            >
              ❤️
            </div>
          ))}
        </div>

        {/* Barra Inferior: Caption y Botón Único de Corazón */}
        <div className="relative z-30 p-4 pb-5 flex flex-col gap-2.5 pointer-events-auto">
          {/* Texto / Caption si existe */}
          {currentStory.caption && (
            <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl px-3.5 py-2 text-white text-xs font-semibold">
              “{currentStory.caption}”
            </div>
          )}

          {/* Botón exclusivo de Reacción Corazón */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-rose-400 font-extrabold flex items-center gap-1.5">
                <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                <span>{currentStory.hearts || 0} corazones</span>
              </span>
            </div>

            <button
              type="button"
              onClick={handleSendHeart}
              className="h-10 px-5 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-black text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-600/30 active:scale-110 transition-transform"
            >
              <Heart className="w-5 h-5 fill-white" />
              <span>Dejar corazón</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
