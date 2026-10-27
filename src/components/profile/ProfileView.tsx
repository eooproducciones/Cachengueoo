import React, { useState } from 'react';
import {
  User,
  Cake,
  Wine,
  Crown,
  Edit3,
  Calendar,
  Instagram,
  GlassWater,
  ShieldCheck,
  LogOut,
  Users,
  Check,
  KeyRound,
  LogIn,
  Plus,
  Trash2,
  Camera,
  Image as ImageIcon,
  Sparkles,
  Music,
  Mail,
  Upload,
  X,
  UserPlus,
  Eye,
  Heart,
  Info,
  Flame,
} from 'lucide-react';
import { UserProfile, UserGender, PreferenceGender } from '../../types';
import {
  ZODIAC_SIGNS,
  MUSIC_GENRES,
  DRINK_OPTIONS,
} from '../../constants/profileOptions';
import { compressImageFile } from '../../utils/imageCompressor';

interface ProfileViewProps {
  currentUser: UserProfile | null;
  onUpdateProfile: (updates: Partial<UserProfile>) => Promise<UserProfile | null> | void;
  onSwitchDemoUser: (role: 'user' | 'admin' | 'valen') => void;
  onNavigateTab: (tab: string) => void;
  onOpenAuthModal: (mode: 'login' | 'register' | 'choice') => void;
  onEnterAdmin?: () => void;
  onLogout: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  onUpdateProfile,
  onNavigateTab,
  onOpenAuthModal,
  onEnterAdmin,
  onLogout,
}) => {
  // ==========================================================
  // ESTADO DESLOGUEADO (POR DEFAULT EN LA SIMULACIÓN)
  // ==========================================================
  if (!currentUser) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-[#121217] border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5 relative overflow-hidden">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#F39200]/20 to-amber-500/10 border border-[#F39200]/40 flex items-center justify-center mx-auto text-[#F39200] shadow-lg shadow-[#F39200]/20">
            <User className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-[#F39200] tracking-widest block">
              CUENTA & PERFIL
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white font-display uppercase tracking-tight">
              PERFIL <span className="text-[#F39200]">CACHENGUEOO</span>
            </h2>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
              Iniciá sesión con tu cuenta o creá tu Cache ID para personalizar tus gustos, fotos de fiesta y activar Match.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={() => onOpenAuthModal('choice')}
              className="w-full h-12 rounded-2xl bg-[#F39200] hover:bg-[#E08400] text-black font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#F39200]/25 active:scale-[0.98] transition-all"
            >
              <LogIn className="w-4 h-4" />
              <span>Iniciar sesión o Crear cuenta</span>
            </button>
          </div>

        </div>
      </div>
    );
  }

  // ==========================================================
  // PERFIL ADMINISTRADOR (PASA DIRECTO AL PANEL DE ADMINISTRADOR)
  // ==========================================================
  if (currentUser.isAdmin || currentUser.role === 'admin') {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-[#121217] border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400 shadow-lg shadow-amber-500/20">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-[#F39200] tracking-widest block">
              CUENTA STAFF
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white font-display uppercase tracking-tight">
              PERFIL DE <span className="text-[#F39200]">ADMINISTRADOR</span>
            </h2>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
              Esta cuenta es de administrador. Pasa directamente al panel de control para crear eventos, alianzas de beneficios y control del boliche.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={() => {
                if (onEnterAdmin) onEnterAdmin();
                else window.location.hash = '#admin';
              }}
              className="w-full h-12 rounded-2xl bg-[#F39200] hover:bg-[#E08400] text-black font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#F39200]/25 active:scale-[0.98] transition-all"
            >
              <KeyRound className="w-4 h-4" />
              <span>Abrir Panel de Administrador</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="w-full h-10 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white text-xs font-bold cursor-pointer transition-colors"
            >
              Cerrar Sesión de Administrador
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // ESTADO LOGUEADO (USUARIO COMÚN)
  // ==========================================================
  const userPhotos =
    currentUser.photos && currentUser.photos.length > 0
      ? currentUser.photos.slice(0, 3)
      : [currentUser.avatarUrl];

  const userDrinks =
    currentUser.drinks && currentUser.drinks.length > 0
      ? currentUser.drinks
      : currentUser.drinkFavorite
      ? currentUser.drinkFavorite.split(/ & | y |, /).filter(Boolean)
      : ['Fernet', 'Skyy'];

  const [isEditing, setIsEditing] = useState(false);
  const [showMatchPreview, setShowMatchPreview] = useState(false);
  const [previewPhotoIndex, setPreviewPhotoIndex] = useState(0);

  // Form states
  const [editFullName, setEditFullName] = useState(currentUser.fullName || '');
  const [editNickname, setEditNickname] = useState(currentUser.nickname || '');
  const [editBirthDate, setEditBirthDate] = useState(currentUser.birthDate || '2001-08-14');
  const [editInstagram, setEditInstagram] = useState(currentUser.instagram || '');
  const [editGender, setEditGender] = useState<UserGender>(currentUser.gender || 'hombre');
  const [editEmail, setEditEmail] = useState(currentUser.email || '');
  const [editPreference, setEditPreference] = useState<PreferenceGender>(currentUser.preference || 'todos');
  const [editZodiacSign, setEditZodiacSign] = useState<string>(currentUser.zodiacSign || 'Leo');
  const [editMusicPreferences, setEditMusicPreferences] = useState<string[]>(
    currentUser.musicPreferences && currentUser.musicPreferences.length > 0
      ? currentUser.musicPreferences
      : ['Reggaeton', 'Cuarteto', 'Cumbia']
  );
  // Selección múltiple en "¿Qué tomás?" (exactamente 2)
  const [editDrinks, setEditDrinks] = useState<string[]>(userDrinks.slice(0, 2));
  const [editBio, setEditBio] = useState(currentUser.bio || '');
  const [editPhotos, setEditPhotos] = useState<string[]>(userPhotos);

  const handleOpenEdit = () => {
    setEditFullName(currentUser.fullName || '');
    setEditNickname(currentUser.nickname || '');
    setEditBirthDate(currentUser.birthDate || '2001-08-14');
    setEditInstagram(currentUser.instagram || '');
    setEditGender(currentUser.gender || 'hombre');
    setEditEmail(currentUser.email || '');
    setEditPreference(currentUser.preference || 'todos');
    setEditZodiacSign(currentUser.zodiacSign || 'Leo');
    setEditMusicPreferences(
      currentUser.musicPreferences && currentUser.musicPreferences.length > 0
        ? currentUser.musicPreferences
        : ['Reggaeton', 'Cuarteto', 'Cumbia']
    );
    setEditDrinks(userDrinks.slice(0, 2));
    setEditBio(currentUser.bio || '');
    setEditPhotos(userPhotos);
    setIsEditing(true);
  };

  const calculateAge = (birthDateString: string): number => {
    if (!birthDateString) return currentUser.age || 21;
    const today = new Date();
    const birthDate = new Date(birthDateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return Math.max(18, age);
  };

  const toggleMusicGenre = (genre: string) => {
    if (editMusicPreferences.includes(genre)) {
      if (editMusicPreferences.length > 1) {
        setEditMusicPreferences(editMusicPreferences.filter((g) => g !== genre));
      }
    } else {
      setEditMusicPreferences([...editMusicPreferences, genre]);
    }
  };

  // Toggle de tragos (permite elegir 2)
  const toggleDrink = (drink: string) => {
    if (editDrinks.includes(drink)) {
      if (editDrinks.length > 1) {
        setEditDrinks(editDrinks.filter((d) => d !== drink));
      }
    } else {
      if (editDrinks.length >= 2) {
        // Reemplaza el segundo para mantener 2
        setEditDrinks([editDrinks[0], drink]);
      } else {
        setEditDrinks([...editDrinks, drink]);
      }
    }
  };

  const handleAddPhoto = (url: string) => {
    if (!url.trim()) return;
    if (editPhotos.length >= 3) return;
    setEditPhotos([...editPhotos, url.trim()].slice(0, 3));
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    if (editPhotos.length <= 1) return;
    setEditPhotos(editPhotos.filter((_, idx) => idx !== indexToRemove));
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      handleAddPhoto(compressed);
    } catch (err) {
      console.warn('Error compressing photo:', err);
    }
    e.target.value = '';
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const newAge = calculateAge(editBirthDate);
      const cleanInsta = editInstagram.trim()
        ? editInstagram.startsWith('@')
          ? editInstagram.trim()
          : `@${editInstagram.trim()}`
        : undefined;

      const formattedDrinks = editDrinks.length > 0 ? editDrinks : ['Fernet', 'Skyy'];

      const updatedData: Partial<UserProfile> = {
        fullName: editFullName.trim(),
        nickname: editNickname.trim(),
        birthDate: editBirthDate,
        age: newAge,
        instagram: cleanInsta,
        gender: editGender,
        email: editEmail.trim(),
        preference: editPreference,
        zodiacSign: editZodiacSign,
        musicPreferences: editMusicPreferences,
        drinks: formattedDrinks,
        drinkFavorite: formattedDrinks.join(' & '),
        bio: editBio.trim(),
        photos: editPhotos,
        avatarUrl: editPhotos[0] || currentUser.avatarUrl,
        interests: [...formattedDrinks, ...editMusicPreferences.slice(0, 2)],
      };

      await onUpdateProfile(updatedData);
      setIsEditing(false);
    } catch (err) {
      console.error('Error al guardar perfil:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-4 space-y-5">
      {/* Profile Header Card */}
      <div className="bg-[#121217] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Subtle orange aura */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-[#F39200]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.fullName}
                referrerPolicy="no-referrer"
                className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-[#F39200]/80 shadow-lg"
              />
              <span
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-black"
                title="Sesión activa"
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white font-display">
                  {currentUser.fullName}
                </h2>
                <span className="text-xs text-amber-400 font-bold">({currentUser.nickname})</span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {currentUser.age} años · {currentUser.email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenEdit}
            className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors shadow-sm"
            title="Editar mi perfil"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        </div>

        {/* Bio & Night Details */}
        <div className="mt-4 pt-4 border-t border-zinc-800/80 space-y-3">
          <p className="text-xs text-zinc-300 leading-relaxed italic">
            "{currentUser.bio || 'Sin descripción aún.'}"
          </p>

          {/* Quick Info Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
            {/* Signo */}
            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-zinc-500 block leading-none">Signo</span>
                <span className="text-xs font-bold text-zinc-200 truncate block">
                  {currentUser.zodiacSign || 'No especificado'}
                </span>
              </div>
            </div>

            {/* ¿Qué tomás? (Muestra las 2 opciones elegidas) */}
            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-2">
              <GlassWater className="w-3.5 h-3.5 text-[#F39200] shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-zinc-500 block leading-none">¿Qué tomás?</span>
                <span className="text-xs font-bold text-amber-300 truncate block">
                  {userDrinks.slice(0, 2).join(' & ')}
                </span>
              </div>
            </div>

            {/* Ver en Match */}
            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-zinc-500 block leading-none">Ver en Match</span>
                <span className="text-xs font-bold text-zinc-200 truncate capitalize block">
                  {currentUser.preference || 'todos'}
                </span>
              </div>
            </div>

            {/* Instagram */}
            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-2">
              <Instagram className="w-3.5 h-3.5 text-pink-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-zinc-500 block leading-none">Instagram</span>
                <span className="text-xs font-bold text-zinc-200 truncate block">
                  {currentUser.instagram || 'No configurado'}
                </span>
              </div>
            </div>
          </div>

          {/* Música que le gusta */}
          <div className="pt-2">
            <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1.5 flex items-center gap-1">
              <Music className="w-3 h-3 text-[#F39200]" />
              ¿Qué música te gusta?
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(currentUser.musicPreferences && currentUser.musicPreferences.length > 0
                ? currentUser.musicPreferences
                : ['Reggaeton', 'Cumbia', 'Cuarteto']
              ).map((m, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 font-medium"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>

          {/* Fotos de Perfil para Modo Match (hasta 3 fotos) */}
          <div className="pt-3 mt-3 border-t border-zinc-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-[#F39200]" />
                Mis fotos en la pista ({userPhotos.length}/3)
              </span>
              <button
                type="button"
                onClick={handleOpenEdit}
                className="text-[10px] text-[#F39200] hover:underline cursor-pointer font-bold"
              >
                Modificar fotos
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {userPhotos.map((photoUrl, idx) => (
                <div
                  key={idx}
                  className="relative aspect-square rounded-2xl overflow-hidden border border-zinc-800 group shadow-md"
                >
                  <img
                    src={photoUrl}
                    alt={`Foto ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-sm text-[9px] font-black text-white">
                    #{idx + 1}
                  </div>
                  {idx === 0 && (
                    <div className="absolute bottom-1.5 inset-x-1.5 text-center px-1 py-0.5 rounded bg-[#F39200]/95 text-[8px] font-black text-black uppercase tracking-wider">
                      Principal
                    </div>
                  )}
                </div>
              ))}
              {userPhotos.length < 3 && (
                <button
                  type="button"
                  onClick={handleOpenEdit}
                  className="aspect-square rounded-2xl border-2 border-dashed border-zinc-700 hover:border-[#F39200] bg-zinc-900/40 flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-[#F39200] transition-colors cursor-pointer group"
                >
                  <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold">Agregar foto</span>
                </button>
              )}
            </div>
          </div>

          {/* BOTÓN DESTACADO: ¿CÓMO ME VEO EN MATCH? & ENTRAR A MATCH */}
          <div className="pt-3 mt-3 border-t border-zinc-800/80 space-y-2">
            <button
              type="button"
              onClick={() => onNavigateTab('match')}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#F39200] via-amber-500 to-[#F39200] hover:from-[#E08400] hover:to-amber-600 text-black font-black text-xs flex items-center justify-between px-4 cursor-pointer shadow-xl shadow-[#F39200]/25 transition-all active:scale-[0.99] group"
            >
              <span className="flex items-center gap-2">
                <Flame className="w-4 h-4 fill-black text-black group-hover:scale-110 transition-transform" />
                <span className="uppercase tracking-tight text-xs font-black">Entrar a Cachengueoo Match</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-black/20 text-black font-black text-[10px]">
                En vivo 🔥 →
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPreviewPhotoIndex(0);
                setShowMatchPreview(true);
              }}
              className="w-full h-10 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800 text-zinc-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] group"
            >
              <Eye className="w-3.5 h-3.5 text-[#F39200] group-hover:scale-110 transition-transform" />
              <span>Cómo me veo en Match</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================== */}
      {/* BOTONES PRINCIPALES: FESTEJAR CUMPLEAÑOS, RESERVAR MESA Y CACHENGUEOO CLUB */}
      {/* ========================================================== */}
      <div className="space-y-2 pt-1">
        <button
          type="button"
          onClick={() => onNavigateTab('cumpleanos')}
          className="w-full p-4 rounded-2xl bg-[#121217] border border-zinc-800 hover:border-zinc-700 flex items-center justify-between text-xs text-white cursor-pointer transition-colors"
        >
          <span className="flex items-center gap-2.5 font-bold">
            <Cake className="w-4 h-4 text-[#F39200]" />
            Festejar mi cumpleaños
          </span>
          <span className="text-zinc-500">→</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('reserva_mesa')}
          className="w-full p-4 rounded-2xl bg-[#121217] border border-zinc-800 hover:border-zinc-700 flex items-center justify-between text-xs text-white cursor-pointer transition-colors"
        >
          <span className="flex items-center gap-2.5 font-bold">
            <Wine className="w-4 h-4 text-[#F39200]" />
            Reservar mesa
          </span>
          <span className="text-zinc-500">→</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('membresia')}
          className="w-full p-4 rounded-2xl bg-[#121217] border border-zinc-800 hover:border-zinc-700 flex items-center justify-between text-xs text-white cursor-pointer transition-colors"
        >
          <span className="flex items-center gap-2.5 font-bold">
            <Crown className="w-4 h-4 text-[#F39200]" />
            Cachengueoo Club
          </span>
          <span className="text-zinc-500">→</span>
        </button>

        {/* Solo para administradores: en perfil de usuario NO estará habilitado */}
        {currentUser.isAdmin && (
          <button
            onClick={() => {
              if (onEnterAdmin) {
                onEnterAdmin();
              } else {
                window.location.hash = '#admin';
              }
            }}
            className="w-full p-4 rounded-2xl bg-zinc-900/90 border border-[#F39200]/40 hover:border-[#F39200] flex items-center justify-between text-xs text-white cursor-pointer transition-all shadow-md group"
          >
            <div className="flex items-center gap-2.5">
              <KeyRound className="w-4 h-4 text-[#F39200] group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <span className="font-bold block text-white">Panel de Administrador</span>
                <span className="text-[11px] text-zinc-400">Crear eventos, beneficios y control del club</span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-[#F39200] text-black text-[11px] font-black group-hover:bg-[#E08400] transition-colors">
              Ingresar →
            </span>
          </button>
        )}

        <button
          onClick={onLogout}
          className="w-full p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 hover:border-red-900/50 flex items-center justify-center gap-2 text-xs text-zinc-400 hover:text-red-400 cursor-pointer transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Cerrar Sesión
        </button>
      </div>

      {/* ========================================================== */}
      {/* EDIT PROFILE MODAL                                         */}
      {/* ========================================================== */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#121217] border border-zinc-800 rounded-3xl w-full max-w-lg p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#F39200] tracking-wider block">
                  CONFIGURACIÓN DE CUENTA
                </span>
                <h3 className="text-base font-bold text-white font-display">
                  Modificar Perfil
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              {/* 1. INFORMACIÓN BÁSICA */}
              <div className="space-y-3 p-3.5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
                <span className="text-[10px] uppercase font-bold text-[#F39200] block tracking-wider">
                  Información General
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-300 block mb-1 font-bold">
                      Nombre completo
                    </label>
                    <input
                      type="text"
                      required
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-[#F39200]"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-300 block mb-1 font-bold">
                      Apodo en pista
                    </label>
                    <input
                      type="text"
                      required
                      value={editNickname}
                      onChange={(e) => setEditNickname(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-[#F39200]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-zinc-300 block mb-1 font-bold">
                      Fecha nacimiento
                    </label>
                    <input
                      type="date"
                      required
                      value={editBirthDate}
                      onChange={(e) => setEditBirthDate(e.target.value)}
                      className="w-full h-10 px-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-[#F39200]"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-300 block mb-1 font-bold">
                      Mi género
                    </label>
                    <select
                      value={editGender}
                      onChange={(e) => setEditGender(e.target.value as UserGender)}
                      className="w-full h-10 px-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-[#F39200]"
                    >
                      <option value="hombre">Hombre</option>
                      <option value="mujer">Mujer</option>
                      <option value="no-binario">No binario</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-zinc-300 block mb-1 font-bold">
                      Instagram
                    </label>
                    <input
                      type="text"
                      placeholder="@usuario"
                      value={editInstagram}
                      onChange={(e) => setEditInstagram(e.target.value)}
                      className="w-full h-10 px-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-[#F39200]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-zinc-300 block mb-1 font-bold">
                    Mail
                  </label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-[#F39200]"
                  />
                </div>
              </div>

              {/* 2. MATCH & GUSTOS (SIGNO, MÚSICA, ¿QUÉ TOMÁS? CON 2 OPCIONES) */}
              <div className="space-y-3 p-3.5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
                <span className="text-[10px] uppercase font-bold text-[#F39200] block tracking-wider">
                  Preferencias & Gustos en la Noche
                </span>

                {/* Ver en Match */}
                <div>
                  <label className="text-zinc-300 block mb-1 font-bold">
                    Ver en Match
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'todos', label: 'Todos' },
                      { id: 'hombres', label: 'Hombres' },
                      { id: 'mujeres', label: 'Mujeres' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setEditPreference(opt.id as PreferenceGender)}
                        className={`h-9 rounded-xl font-bold cursor-pointer transition-all ${
                          editPreference === opt.id
                            ? 'bg-[#F39200] text-black shadow-md'
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Signo */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-zinc-300 font-bold">
                      Signo
                    </label>
                    <span className="text-[10px] text-amber-400 font-bold">
                      {editZodiacSign}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                    {ZODIAC_SIGNS.map((s) => {
                      const isSelected = editZodiacSign === s.name;
                      return (
                        <button
                          key={s.name}
                          type="button"
                          onClick={() => setEditZodiacSign(s.name)}
                          className={`p-1.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                            isSelected
                              ? 'bg-[#F39200]/25 border-[#F39200] text-amber-300 font-bold'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          <span className="text-xs">{s.symbol}</span>
                          <span className="text-[10px] truncate w-full">{s.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ¿Qué música te gusta? */}
                <div>
                  <label className="text-zinc-300 block mb-1 font-bold">
                    ¿Qué música te gusta?
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {MUSIC_GENRES.map((genre) => {
                      const isSelected = editMusicPreferences.includes(genre);
                      return (
                        <button
                          key={genre}
                          type="button"
                          onClick={() => toggleMusicGenre(genre)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1 ${
                            isSelected
                              ? 'bg-[#F39200] text-black'
                              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          <span>{genre}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ¿Qué tomás? (Permite seleccionar 2 opciones) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-zinc-300 font-bold flex items-center gap-1.5">
                      <GlassWater className="w-3.5 h-3.5 text-[#F39200]" />
                      <span>¿Qué tomás?</span>
                    </label>
                    <span className="text-[10px] text-amber-400 font-bold">
                      {editDrinks.length}/2 opciones elegidas: {editDrinks.join(' y ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {DRINK_OPTIONS.map((drink) => {
                      const isSelected = editDrinks.includes(drink);
                      return (
                        <button
                          key={drink}
                          type="button"
                          onClick={() => toggleDrink(drink)}
                          className={`h-9 px-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1 ${
                            isSelected
                              ? 'bg-amber-400 text-black font-extrabold shadow-sm'
                              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          <span>{drink}</span>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3. FOTOS DE PERFIL (HASTA 3) */}
              <div className="space-y-3 p-3.5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-[#F39200] block tracking-wider">
                    Fotos de tu Perfil (Hasta 3 fotos)
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {editPhotos.length}/3 fotos
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((idx) => {
                    const photoUrl = editPhotos[idx];
                    return (
                      <div
                        key={idx}
                        className={`relative aspect-[3/4] rounded-2xl overflow-hidden border-2 flex flex-col items-center justify-center ${
                          photoUrl
                            ? 'border-zinc-700 bg-zinc-950'
                            : 'border-dashed border-zinc-800 bg-zinc-900/50'
                        }`}
                      >
                        {photoUrl ? (
                          <>
                            <img src={photoUrl} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/80 text-[8px] font-black text-white">
                              #{idx + 1}
                            </div>
                            {editPhotos.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(idx)}
                                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/80 hover:bg-rose-600 text-white flex items-center justify-center transition-colors cursor-pointer shadow"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                            {idx === 0 && (
                              <div className="absolute bottom-1 inset-x-1 text-center py-0.5 rounded bg-[#F39200] text-[8px] font-black text-black uppercase">
                                Principal
                              </div>
                            )}
                          </>
                        ) : (
                          <label className="w-full h-full flex flex-col items-center justify-center gap-1 cursor-pointer p-2 text-center hover:bg-zinc-800/40 transition-colors">
                            <Upload className="w-5 h-5 text-zinc-500" />
                            <span className="text-[10px] text-zinc-500 font-bold">Foto {idx + 1}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>

                <label className="w-full h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-[#F39200] text-white font-bold text-[11px] flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm">
                  <Camera className="w-4 h-4 text-[#F39200]" />
                  <span>Subir foto desde tu dispositivo (Cámara / Galería)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* 4. BIOGRAFÍA */}
              <div>
                <label className="text-zinc-300 block mb-1 font-bold">
                  Biografía para Cachengueoo Match
                </label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tu presentación para Match..."
                  className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-[#F39200] resize-none text-xs leading-relaxed"
                />
              </div>

              {/* Botones de acción del modal */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="w-1/3 h-11 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 h-11 rounded-xl bg-[#F39200] hover:bg-[#E08400] disabled:opacity-50 text-black font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#F39200]/25 transition-all"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{isSaving ? 'Guardando en Supabase...' : 'Guardar Cambios'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VISTA PREVIA "¿CÓMO ME VEO EN MATCH?" */}
      {showMatchPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#121217] border border-zinc-800 rounded-3xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl max-h-[92vh]">
            {/* Header modal */}
            <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#F39200]" />
                <span className="text-xs font-bold text-white font-display">
                  Cómo me veo en Match
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowMatchPreview(false)}
                className="w-7 h-7 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tarjeta idéntica a la Pista de Match */}
            <div className="p-3 flex-1 overflow-y-auto">
              <div className="relative aspect-[3/4] w-full rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-xl select-none flex flex-col justify-between">
                {/* Foto activa */}
                <img
                  src={userPhotos[Math.min(previewPhotoIndex, userPhotos.length - 1)]}
                  alt={currentUser.fullName}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
                />

                {/* Zonas de tap para cambiar foto */}
                {userPhotos.length > 1 && (
                  <div className="absolute inset-x-0 top-14 bottom-32 z-10 flex">
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewPhotoIndex((prev) =>
                          prev > 0 ? prev - 1 : userPhotos.length - 1
                        )
                      }
                      className="w-1/2 h-full cursor-pointer focus:outline-none"
                      title="Foto anterior"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewPhotoIndex((prev) => (prev + 1) % userPhotos.length)
                      }
                      className="w-1/2 h-full cursor-pointer focus:outline-none"
                      title="Siguiente foto"
                    />
                  </div>
                )}

                {/* Segmentos de fotos superiores */}
                <div className="relative z-20 p-3 space-y-2">
                  <div className="w-full flex gap-1.5 px-0.5">
                    {userPhotos.map((_, idx) => (
                      <div
                        key={idx}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          idx === previewPhotoIndex
                            ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]'
                            : 'bg-white/35 backdrop-blur-sm'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md border border-white/10 text-zinc-300 text-[10px] shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                      <span>estoy en Cachengueoo</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-[#F39200]/90 text-black text-[9px] font-black uppercase tracking-wider">
                      Tu Perfil
                    </span>
                  </div>
                </div>

                {/* Gradiente inferior con datos del perfil */}
                <div className="relative z-20 p-4 pt-12 bg-gradient-to-t from-black/95 via-black/75 to-transparent space-y-2">
                  <div className="space-y-0.5">
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-xl font-black text-white font-display">
                        {currentUser.fullName}
                      </h3>
                      <span className="text-base text-zinc-300 font-bold">
                        {currentUser.age}
                      </span>
                    </div>
                    {currentUser.nickname && currentUser.nickname !== currentUser.fullName && (
                      <p className="text-xs text-[#F39200] font-semibold">
                        "{currentUser.nickname}"
                      </p>
                    )}
                  </div>

                  {/* Chips: Tragos y Signo */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {userDrinks.slice(0, 2).map((drink, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md border border-[#F39200]/40 text-[#F39200] text-[10px] font-bold flex items-center gap-1"
                      >
                        <GlassWater className="w-2.5 h-2.5" />
                        {drink}
                      </span>
                    ))}
                    {currentUser.zodiacSign && (
                      <span className="px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md border border-amber-400/40 text-amber-300 text-[10px] font-bold flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                        {currentUser.zodiacSign}
                      </span>
                    )}
                  </div>

                  {/* Biografía */}
                  {currentUser.bio && (
                    <p className="text-[11px] text-zinc-200 line-clamp-2 italic leading-relaxed pt-0.5">
                      "{currentUser.bio}"
                    </p>
                  )}

                  {/* Botones simulados de Match */}
                  <div className="flex items-center justify-center gap-4 pt-2">
                    <div className="w-11 h-11 rounded-full bg-zinc-950/80 border border-zinc-700 text-rose-400 flex items-center justify-center text-xs font-bold opacity-80">
                      ✕
                    </div>
                    <div className="w-13 h-13 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center shadow-lg opacity-80">
                      <Heart className="w-6 h-6 fill-emerald-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer con botón cerrar */}
            <div className="p-3 bg-zinc-950/70 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowMatchPreview(false)}
                className="w-full h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-bold text-xs cursor-pointer transition-colors"
              >
                Cerrar Vista Previa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
