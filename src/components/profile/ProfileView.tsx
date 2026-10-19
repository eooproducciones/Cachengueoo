import React, { useState } from 'react';
import {
  User,
  Ticket,
  Flame,
  Gift,
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
} from 'lucide-react';
import { UserProfile, UserTicket, MatchPair } from '../../types';
import { membershipService } from '../../services/membershipService';
import { ticketService } from '../../services/ticketService';
import { matchService } from '../../services/matchService';

interface ProfileViewProps {
  currentUser: UserProfile;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
  onSwitchDemoUser: (role: 'mateo' | 'valen' | 'admin') => void;
  onNavigateTab: (tab: string) => void;
  onOpenAuthModal: (mode: 'login' | 'register') => void;
  onEnterAdmin?: () => void;
  onLogout: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  onUpdateProfile,
  onSwitchDemoUser,
  onNavigateTab,
  onOpenAuthModal,
  onEnterAdmin,
  onLogout,
}) => {
  const userPhotos = currentUser.photos && currentUser.photos.length > 0
    ? currentUser.photos.slice(0, 3)
    : [currentUser.avatarUrl];

  const [isEditing, setIsEditing] = useState(false);
  const [photoInputUrl, setPhotoInputUrl] = useState('');
  const [editForm, setEditForm] = useState({
    nickname: currentUser.nickname,
    bio: currentUser.bio,
    drinkFavorite: currentUser.drinkFavorite,
    instagram: currentUser.instagram || '',
    avatarUrl: currentUser.avatarUrl,
    photos: userPhotos,
  });

  const membership = membershipService.getUserMembership(currentUser.id);
  const tickets = ticketService.getUserTickets();
  const matches = matchService.getMatches();

  const handleAddPhoto = (url: string) => {
    if (!url.trim()) return;
    if (editForm.photos.length >= 3) return;
    const updated = [...editForm.photos, url.trim()].slice(0, 3);
    setEditForm({
      ...editForm,
      photos: updated,
      avatarUrl: updated[0] || editForm.avatarUrl,
    });
    setPhotoInputUrl('');
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    if (editForm.photos.length <= 1) return;
    const updated = editForm.photos.filter((_, idx) => idx !== indexToRemove);
    setEditForm({
      ...editForm,
      photos: updated,
      avatarUrl: updated[0] || editForm.avatarUrl,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        handleAddPhoto(result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      ...editForm,
      avatarUrl: editForm.photos[0] || editForm.avatarUrl,
      photos: editForm.photos,
    });
    setIsEditing(false);
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-4 space-y-5">
      {/* Profile Header Card */}
      <div className="bg-[#121217] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Subtle orange aura */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-[#F39200]/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.fullName}
                referrerPolicy="no-referrer"
                className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-[#F39200]/80 shadow-lg"
              />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-black" title="Activo"></span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white font-display">
                  {currentUser.fullName}
                </h2>
                <span className="text-xs text-zinc-400">({currentUser.nickname})</span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {currentUser.age} años · {currentUser.email}
              </p>

              {membership.status === 'active' && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-2 rounded-full bg-amber-500/15 border border-amber-500/30 text-[#F39200] text-[10px] font-bold">
                  <Crown className="w-3 h-3" />
                  <span>{membership.planName}</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setIsEditing(true)}
            className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            title="Editar perfil"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        </div>

        {/* Bio & Details */}
        <div className="mt-4 pt-4 border-t border-zinc-800/80 space-y-3">
          <p className="text-xs text-zinc-300 leading-relaxed italic">
            "{currentUser.bio || 'Sin descripción aún.'}"
          </p>

          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
            <div className="flex items-center gap-1.5 text-[#F39200]">
              <GlassWater className="w-3.5 h-3.5" />
              <span className="font-semibold">{currentUser.drinkFavorite}</span>
            </div>

            {currentUser.instagram && (
              <div className="flex items-center gap-1.5 text-zinc-300">
                <Instagram className="w-3.5 h-3.5" />
                <span>{currentUser.instagram}</span>
              </div>
            )}
          </div>

          {/* Interests tags */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {currentUser.interests.map((tag, i) => (
              <span
                key={i}
                className="px-2.5 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Fotos de Perfil para Modo Match (hasta 3 fotos) */}
          <div className="pt-3 mt-3 border-t border-zinc-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-[#F39200]" />
                Mis fotos de perfil ({userPhotos.length}/3)
              </span>
              <span className="text-[10px] text-zinc-400 bg-zinc-900 px-2.5 py-0.5 rounded-full border border-zinc-800 font-medium">
                {userPhotos.length} {userPhotos.length === 1 ? 'línea' : 'líneas'} en Match
              </span>
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
                  onClick={() => setIsEditing(true)}
                  className="aspect-square rounded-2xl border-2 border-dashed border-zinc-700 hover:border-[#F39200] bg-zinc-900/40 flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-[#F39200] transition-colors cursor-pointer group"
                >
                  <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold">Subir foto</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Account Activity Summary Matrix */}
      <div className="grid grid-cols-3 gap-2.5">
        <button
          onClick={() => onNavigateTab('entradas')}
          className="p-3.5 rounded-2xl bg-[#121217] border border-zinc-800 hover:border-zinc-700 text-center transition-all cursor-pointer group"
        >
          <Ticket className="w-5 h-5 text-[#F39200] mx-auto mb-1 group-hover:scale-110 transition-transform" />
          <span className="text-base font-black text-white font-mono block">
            {tickets.length}
          </span>
          <span className="text-[10px] text-zinc-400 font-medium">Entradas</span>
        </button>

        <button
          onClick={() => onNavigateTab('match')}
          className="p-3.5 rounded-2xl bg-[#121217] border border-zinc-800 hover:border-zinc-700 text-center transition-all cursor-pointer group"
        >
          <Flame className="w-5 h-5 text-[#F39200] mx-auto mb-1 group-hover:scale-110 transition-transform" />
          <span className="text-base font-black text-white font-mono block">
            {matches.length}
          </span>
          <span className="text-[10px] text-zinc-400 font-medium">Matches</span>
        </button>

        <button
          onClick={() => onNavigateTab('membresia')}
          className="p-3.5 rounded-2xl bg-[#121217] border border-zinc-800 hover:border-zinc-700 text-center transition-all cursor-pointer group"
        >
          <Crown className="w-5 h-5 text-[#F39200] mx-auto mb-1 group-hover:scale-110 transition-transform" />
          <span className="text-base font-black text-white font-mono block">
            {membership.status === 'active' ? 'VIP' : 'Free'}
          </span>
          <span className="text-[10px] text-zinc-400 font-medium">Club</span>
        </button>
      </div>

      {/* Switch Demo Perspective (Allows testing Match between Mateo and Valen) */}
      <div className="p-4 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Users className="w-4 h-4 text-[#F39200]" />
            Cambiar Cuenta Demo para Probar
          </span>
          <span className="text-[10px] text-zinc-500">Testing Interactivo</span>
        </div>
        <p className="text-[11px] text-zinc-400 leading-tight">
          Cambiá entre usuarios de prueba para verificar cómo se ve el Match y Chat desde ambas perspectivas:
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onSwitchDemoUser('mateo')}
            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              currentUser.id === 'usr_me_01'
                ? 'bg-[#F39200] text-black border-[#F39200]'
                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white'
            }`}
          >
            {currentUser.id === 'usr_me_01' && <Check className="w-3.5 h-3.5" />}
            Mateo (Usuario Activo)
          </button>

          <button
            onClick={() => onSwitchDemoUser('valen')}
            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              currentUser.id === 'usr_match_01'
                ? 'bg-[#F39200] text-black border-[#F39200]'
                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white'
            }`}
          >
            {currentUser.id === 'usr_match_01' && <Check className="w-3.5 h-3.5" />}
            Valentina (Match Partner)
          </button>
        </div>
      </div>

      {/* Auth Actions: Iniciar Sesión / Registrar otra cuenta */}
      <div className="p-4 rounded-3xl bg-[#121217] border border-zinc-800 space-y-2.5">
        <span className="text-xs font-bold text-white block">Cuenta Única Cachengueoo ID</span>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onOpenAuthModal('login')}
            className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5 text-[#F39200]" />
            Iniciar Sesión
          </button>
          <button
            onClick={() => onOpenAuthModal('register')}
            className="p-2.5 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            Crear Cuenta
          </button>
        </div>
      </div>

      {/* Quick shortcuts */}
      <div className="space-y-2">
        <button
          onClick={() => onNavigateTab('cumpleanos')}
          className="w-full p-4 rounded-2xl bg-[#121217] border border-zinc-800 hover:border-zinc-700 flex items-center justify-between text-xs text-white cursor-pointer transition-colors"
        >
          <span className="flex items-center gap-2.5 font-bold">
            <Calendar className="w-4 h-4 text-[#F39200]" />
            Organizar Mi Cumpleaños en Cachengueoo
          </span>
          <span className="text-zinc-500">→</span>
        </button>

        <button
          onClick={() => onNavigateTab('membresia')}
          className="w-full p-4 rounded-2xl bg-[#121217] border border-zinc-800 hover:border-zinc-700 flex items-center justify-between text-xs text-white cursor-pointer transition-colors"
        >
          <span className="flex items-center gap-2.5 font-bold">
            <Crown className="w-4 h-4 text-[#F39200]" />
            Planes y Membresía Club Cachengueoo
          </span>
          <span className="text-zinc-500">→</span>
        </button>

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
              <span className="text-[11px] text-zinc-400">Crear eventos de Passline y gestión del club</span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-[#F39200] text-black text-[11px] font-black group-hover:bg-[#E08400] transition-colors">
            Ingresar →
          </span>
        </button>

        <button
          onClick={onLogout}
          className="w-full p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 hover:border-red-900/50 flex items-center justify-center gap-2 text-xs text-zinc-400 hover:text-red-400 cursor-pointer transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Cerrar Sesión
        </button>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#121217] border border-zinc-800 rounded-3xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-white font-display">Editar Mi Perfil</h3>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">Apodo / Nickname</label>
                <input
                  type="text"
                  value={editForm.nickname}
                  onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-[#F39200]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-zinc-400 block">Bio para Cachengueoo Match</label>
                  <span
                    className={`text-[10px] font-mono ${
                      editForm.bio.length >= 100 ? 'text-amber-400 font-bold' : 'text-zinc-500'
                    }`}
                  >
                    {editForm.bio.length}/110 (máx. 3 renglones)
                  </span>
                </div>
                <textarea
                  rows={2}
                  maxLength={110}
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value.slice(0, 110) })}
                  placeholder="Tu presentación para Match (máx. 3 renglones)..."
                  className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-[#F39200] resize-none"
                />
                <p className="text-[10px] text-zinc-500 mt-1">
                  Límite de 110 caracteres para que entre completa en 3 renglones en Match sin invadir la foto.
                </p>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Trago Favorito en Barra</label>
                <input
                  type="text"
                  value={editForm.drinkFavorite}
                  onChange={(e) => setEditForm({ ...editForm, drinkFavorite: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-[#F39200]"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Instagram (@usuario)</label>
                <input
                  type="text"
                  value={editForm.instagram}
                  onChange={(e) => setEditForm({ ...editForm, instagram: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-[#F39200]"
                />
              </div>

              {/* Fotos del perfil: hasta 3 fotos para Match */}
              <div className="pt-2 border-t border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-zinc-300 font-bold flex items-center gap-1.5 text-xs">
                    <Camera className="w-3.5 h-3.5 text-[#F39200]" />
                    Fotos para Modo Match ({editForm.photos.length}/3)
                  </label>
                  <span className="text-[10px] text-zinc-400">
                    {editForm.photos.length === 1 ? '1 foto = 1 línea' : `${editForm.photos.length} fotos = ${editForm.photos.length} líneas`}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-tight">
                  En tu perfil podés ingresar hasta 3 fotos. En Match, cada foto genera una línea arriba de tu perfil y la gente puede tocarlas para verlas.
                </p>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  {editForm.photos.map((photoUrl, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-2xl overflow-hidden border border-zinc-700 bg-black/50 shadow-sm"
                    >
                      <img src={photoUrl} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute top-1 left-1 px-1.5 py-0.2 rounded bg-black/80 text-[8px] font-black text-white">
                        #{idx + 1}
                      </div>
                      {editForm.photos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-950/90 border border-rose-500/50 text-rose-300 hover:text-white hover:bg-rose-600 flex items-center justify-center transition-all cursor-pointer shadow-md"
                          title="Eliminar foto"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                      {idx === 0 && (
                        <div className="absolute bottom-1 inset-x-1 text-center py-0.5 rounded bg-[#F39200] text-[8px] font-bold text-black uppercase">
                          Principal
                        </div>
                      )}
                    </div>
                  ))}

                  {editForm.photos.length < 3 && (
                    <label className="aspect-square rounded-2xl border-2 border-dashed border-zinc-700 hover:border-[#F39200] bg-zinc-900/60 flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-[#F39200] transition-colors cursor-pointer group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-bold">Subir</span>
                    </label>
                  )}
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 h-10 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-bold cursor-pointer"
                >
                  Guardar Cambios
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 h-10 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
