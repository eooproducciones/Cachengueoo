import React, { useState } from 'react';
import { Plus, X, Check, MessageSquareHeart } from 'lucide-react';
import { MatchProfile, UserProfile } from '../../types';
import { formatTimeAgo } from '../../utils/timeAgo';

interface NightNotesBarProps {
  currentUser: UserProfile;
  profiles: MatchProfile[];
  onUpdateMyNote: (noteText: string) => void;
  onSelectProfile?: (profile: MatchProfile) => void;
}

const NOTE_PRESETS = [
  'En la barra VIP con un Fernet 🍸',
  '¿Quién para bailar cachengue? 💃',
  'Perdí a mis amigos en la pista 😂',
  'Team Gin Tonic hoy 🍹',
  'Recién llegué a Cachengueoo 🔥',
  'Si suena reggaeton viejo avisen 🔊',
];

export const NightNotesBar: React.FC<NightNotesBarProps> = ({
  currentUser,
  profiles,
  onUpdateMyNote,
  onSelectProfile,
}) => {
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteInput, setNoteInput] = useState(currentUser.nightNote?.text || '');

  const handleSaveNote = (textToSave = noteInput) => {
    if (!textToSave.trim()) return;
    onUpdateMyNote(textToSave.trim());
    setIsNoteModalOpen(false);
  };

  return (
    <div className="w-full shrink-0 my-0.5 select-none">
      {/* Horizontal reel de notitas estilo Instagram */}
      <div className="flex items-start gap-2 overflow-x-auto no-scrollbar py-0.5 px-0.5">
        {/* Ítem 1: Mi Notita (Usuario actual) */}
        <div className="flex flex-col items-center shrink-0 w-14 text-center relative group">
          {/* Burbuja estilo Instagram con tiempo transcurrido */}
          <button
            type="button"
            onClick={() => {
              setNoteInput(currentUser.nightNote?.text || '');
              setIsNoteModalOpen(true);
            }}
            className="w-full relative mb-0.5 cursor-pointer transition-transform hover:scale-105"
            title="Escribir tu notita"
          >
            <div className="bg-zinc-900 border border-[#F39200]/60 text-white rounded-lg px-1 py-0.5 shadow-md text-center max-w-[62px] mx-auto min-h-[22px] flex flex-col justify-center items-center">
              {currentUser.nightNote ? (
                <>
                  <p className="text-[8px] font-semibold leading-tight truncate w-full text-zinc-100">
                    {currentUser.nightNote.text}
                  </p>
                  <span className="text-[6.5px] text-[#F39200] font-black uppercase leading-none mt-0.5">
                    {formatTimeAgo(currentUser.nightNote.createdAt)}
                  </span>
                </>
              ) : (
                <span className="text-[8px] text-[#F39200] font-bold flex items-center gap-0.5 leading-none py-0.5">
                  <Plus className="w-2 h-2" /> Notita
                </span>
              )}
            </div>
            {/* Puntero de la burbuja hacia el avatar */}
            <div className="w-1.5 h-1.5 bg-zinc-900 border-r border-b border-[#F39200]/60 rotate-45 -mt-0.5 mx-auto"></div>
          </button>

          {/* Avatar compacto con botón '+' */}
          <div
            onClick={() => {
              setNoteInput(currentUser.nightNote?.text || '');
              setIsNoteModalOpen(true);
            }}
            className="relative cursor-pointer"
          >
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.nickname}
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full object-cover border border-[#F39200] ring-1 ring-black"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#F39200] text-black font-black text-[8px] flex items-center justify-center border border-black shadow-sm">
              +
            </span>
          </div>

          <span className="text-[8px] text-zinc-300 font-bold mt-0.5 truncate max-w-full leading-tight">
            Tu notita
          </span>
        </div>

        {/* Ítems siguientes: Clubbers activos en la pista con sus notitas y tiempo */}
        {profiles.map((profile) => {
          const note = profile.nightNote;

          return (
            <div
              key={profile.userId}
              onClick={() => onSelectProfile && onSelectProfile(profile)}
              className="flex flex-col items-center shrink-0 w-14 text-center relative cursor-pointer group"
            >
              {/* Burbuja de estado con tiempo transcurrido */}
              <div className="w-full relative mb-0.5 transition-transform group-hover:scale-105">
                <div className="bg-zinc-900/95 border border-zinc-700/80 text-white rounded-lg px-1 py-0.5 shadow-md text-center max-w-[62px] mx-auto min-h-[22px] flex flex-col justify-center items-center">
                  <p className="text-[8px] font-semibold leading-tight truncate w-full text-zinc-200">
                    {note ? note.text : 'En Cachengueoo 🔥'}
                  </p>
                  <span className="text-[6.5px] text-[#F39200] font-bold uppercase leading-none mt-0.5">
                    {note ? formatTimeAgo(note.createdAt) : 'en vivo'}
                  </span>
                </div>
                {/* Puntero de la burbuja */}
                <div className="w-1.5 h-1.5 bg-zinc-900/95 border-r border-b border-zinc-700/80 rotate-45 -mt-0.5 mx-auto"></div>
              </div>

              {/* Avatar con badge verde de presencia */}
              <div className="relative">
                <img
                  src={profile.avatarUrl}
                  alt={profile.fullName}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full object-cover border border-zinc-700 group-hover:border-[#F39200] transition-colors ring-1 ring-black"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-black"></span>
              </div>

              <span className="text-[8px] text-zinc-400 font-medium mt-0.5 truncate max-w-full group-hover:text-white leading-tight">
                {profile.nickname}
              </span>
            </div>
          );
        })}
      </div>

      {/* Modal para crear / editar la notita */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#121217] border border-zinc-800 rounded-3xl w-full max-w-sm p-5 space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
              <div className="flex items-center gap-2">
                <MessageSquareHeart className="w-4 h-4 text-[#F39200]" />
                <h3 className="text-sm font-bold text-white font-display">
                  Tu Notita en Cachengueoo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNoteModalOpen(false)}
                className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Vista previa en vivo con tiempo */}
            <div className="flex flex-col items-center justify-center py-1">
              <div className="bg-zinc-900 border border-[#F39200] rounded-2xl px-3.5 py-1.5 text-center max-w-[220px] shadow-lg">
                <p className="text-xs text-white font-medium">
                  {noteInput.trim() || 'Escribí lo que estás haciendo...'}
                </p>
                <span className="text-[9px] text-[#F39200] block mt-0.5 font-bold">
                  hace unos segundos · Mendoza
                </span>
              </div>
              <div className="w-2.5 h-2.5 bg-zinc-900 border-r border-b border-[#F39200] rotate-45 -mt-1"></div>
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.nickname}
                className="w-11 h-11 rounded-full object-cover border-2 border-[#F39200] mt-1 shadow-md"
              />
            </div>

            <div>
              <label className="text-zinc-300 text-xs block mb-1 font-medium">
                ¿Qué estás haciendo ahora en Cachengueoo?
              </label>
              <input
                type="text"
                maxLength={60}
                placeholder="Ej: En la barra VIP buscando Fernet 🍸"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-[#F39200]"
                autoFocus
              />
              <span className="text-[10px] text-zinc-500 block text-right mt-1">
                {noteInput.length}/60 caracteres
              </span>
            </div>

            {/* Ideas rápidas */}
            <div>
              <span className="text-[10px] text-zinc-400 block mb-1 font-medium">
                Ideas rápidas de la noche:
              </span>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {NOTE_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setNoteInput(preset)}
                    className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 text-[10px] cursor-pointer text-left"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-1 flex gap-2">
              <button
                type="button"
                onClick={() => handleSaveNote()}
                disabled={!noteInput.trim()}
                className="flex-1 h-10 rounded-xl bg-[#F39200] hover:bg-[#E08400] disabled:opacity-40 text-black font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-[#F39200]/20 active:scale-95 transition-all"
              >
                <Check className="w-4 h-4" />
                Publicar Notita
              </button>
              {currentUser.nightNote && (
                <button
                  type="button"
                  onClick={() => {
                    onUpdateMyNote('');
                    setIsNoteModalOpen(false);
                  }}
                  className="px-3 h-10 rounded-xl bg-zinc-900 border border-zinc-800 text-red-400 hover:text-red-300 text-xs font-semibold cursor-pointer"
                >
                  Borrar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
