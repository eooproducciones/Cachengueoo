import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  GlassWater,
  Heart,
  Users,
  Instagram,
} from 'lucide-react';
import { UserGender, PreferenceGender, UserProfile } from '../../types';
import { authService } from '../../services/authService';
import { CachengueooLogo } from '../common/CachengueooLogo';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserProfile) => void;
  initialMode?: 'login' | 'register';
}

const DRINK_OPTIONS = [
  'Fernet Branca con Coca',
  'Gin Tonic con Frutos Rojos',
  'Aperol Spritz',
  'Vodka con Speed',
  'Campari con Naranja',
  'Cerveza Corona con Lima',
  'Tequila Shot',
];

const INTEREST_OPTIONS = [
  'Cachengue 2010',
  'Reggaeton Viejo',
  'Trap Argentino',
  'RKT',
  'Barra VIP',
  'Pista Principal',
  'After en Chacras',
  'Amigos & Previa',
];

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form
  const [regFullName, setRegFullName] = useState('');
  const [regNickname, setRegNickname] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regBirthDate, setRegBirthDate] = useState('2002-05-15');
  const [regGender, setRegGender] = useState<UserGender>('hombre');
  const [regPreference, setRegPreference] = useState<PreferenceGender>('todos');
  const [regDrink, setRegDrink] = useState(DRINK_OPTIONS[0]);
  const [regInterests, setRegInterests] = useState<string[]>(['Cachengue 2010', 'Barra VIP']);
  const [regAvatar, setRegAvatar] = useState(AVATAR_PRESETS[0]);
  const [regBio, setRegBio] = useState('Listo para salir en Cachengueoo.');
  const [regInstagram, setRegInstagram] = useState('');

  if (!isOpen) return null;

  const calculateAge = (birthDateString: string): number => {
    const today = new Date();
    const birthDate = new Date(birthDateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await authService.loginWithCredentials(loginEmail, loginPassword);
      if (result.success && result.user) {
        onAuthSuccess(result.user);
        onClose();
      } else {
        setErrorMessage(result.message || 'Credenciales incorrectas');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const age = calculateAge(regBirthDate);
    if (age < 18) {
      setErrorMessage('Debés tener 18 años o más para ingresar a Cachengueoo.');
      return;
    }

    if (!regFullName.trim() || !regNickname.trim() || !regEmail.trim()) {
      setErrorMessage('Por favor completá los campos obligatorios.');
      return;
    }

    setIsSubmitting(true);

    try {
      const newUser: UserProfile = {
        id: `usr_${Date.now()}`,
        email: regEmail.trim(),
        fullName: regFullName.trim(),
        nickname: regNickname.trim(),
        birthDate: regBirthDate,
        age,
        avatarUrl: regAvatar,
        gender: regGender,
        preference: regPreference,
        interests: regInterests,
        bio: regBio,
        drinkFavorite: regDrink,
        instagram: regInstagram.trim()
          ? regInstagram.trim().startsWith('@')
            ? regInstagram.trim()
            : `@${regInstagram.trim()}`
          : undefined,
        createdAt: new Date().toISOString(),
      };

      const result = await authService.registerUser(newUser, regPassword);
      if (result.success) {
        onAuthSuccess(newUser);
        onClose();
      } else {
        setErrorMessage(result.message || 'Error al registrar usuario');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al crear la cuenta');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleInterest = (interest: string) => {
    if (regInterests.includes(interest)) {
      setRegInterests(regInterests.filter((i) => i !== interest));
    } else {
      setRegInterests([...regInterests, interest]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#121217] border border-zinc-800 rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/50">
          <div>
            <CachengueooLogo size="sm" />
            <p className="text-[11px] text-zinc-400 mt-0.5">Cuenta Única Cachengueoo ID</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch between Login and Register */}
        <div className="flex border-b border-zinc-800 p-2 gap-2 bg-zinc-950/40">
          <button
            onClick={() => {
              setMode('login');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-[#F39200] text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            onClick={() => {
              setMode('register');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-[#F39200] text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Crear Cuenta Nueva
          </button>
        </div>

        {/* Content form */}
        <div className="p-5 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-950/50 border border-red-800/50 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* MODE LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="tu.email@ejemplo.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full h-11 pl-10 pr-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-[#F39200]"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Contraseña</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full h-11 pl-10 pr-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-[#F39200]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#F39200]/20"
              >
                {isSubmitting ? 'Ingresando...' : 'Entrar a Cachengueoo'}
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Fast 1-click test accounts for immediate evaluation */}
              <div className="pt-3 border-t border-zinc-800 space-y-2">
                <span className="text-[11px] text-zinc-500 block font-medium text-center">
                  Cuentas Demo para Probar en 1 Clic:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const u = authService.loginDemo('mateo');
                      onAuthSuccess(u);
                      onClose();
                    }}
                    className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-[11px] font-semibold text-center cursor-pointer hover:border-zinc-700"
                  >
                    Entrar como Mateo 🍸
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const u = authService.loginDemo('valen');
                      onAuthSuccess(u);
                      onClose();
                    }}
                    className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-[11px] font-semibold text-center cursor-pointer hover:border-zinc-700"
                  >
                    Entrar como Valentina 🔥
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* MODE REGISTER */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-zinc-400 block mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Sofía Morales"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-[#F39200]"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1">Apodo / Nickname</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Sofi"
                    value={regNickname}
                    onChange={(e) => setRegNickname(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-[#F39200]"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Email</label>
                <input
                  type="email"
                  required
                  placeholder="sofi@ejemplo.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-[#F39200]"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Contraseña</label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-[#F39200]"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 flex items-center justify-between">
                  <span>Fecha de Nacimiento (+18 años)</span>
                  <span className="text-[#F39200] font-mono">
                    {calculateAge(regBirthDate)} años
                  </span>
                </label>
                <input
                  type="date"
                  required
                  value={regBirthDate}
                  onChange={(e) => setRegBirthDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-[#F39200]"
                />
              </div>

              {/* Género y Preferencia */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-zinc-400 block mb-1">Mi Género</label>
                  <select
                    value={regGender}
                    onChange={(e) => setRegGender(e.target.value as UserGender)}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-[#F39200]"
                  >
                    <option value="hombre">Hombre</option>
                    <option value="mujer">Mujer</option>
                    <option value="no-binario">No binario</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1">Ver en Match</label>
                  <select
                    value={regPreference}
                    onChange={(e) => setRegPreference(e.target.value as PreferenceGender)}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-[#F39200]"
                  >
                    <option value="todos">Todos</option>
                    <option value="mujeres">Mujeres</option>
                    <option value="hombres">Hombres</option>
                  </select>
                </div>
              </div>

              {/* Trago Favorito */}
              <div>
                <label className="text-zinc-400 block mb-1 flex items-center gap-1">
                  <GlassWater className="w-3.5 h-3.5 text-[#F39200]" />
                  Trago Favorito en Barra
                </label>
                <select
                  value={regDrink}
                  onChange={(e) => setRegDrink(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-[#F39200]"
                >
                  {DRINK_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bio para Match */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-zinc-400 block text-xs">Bio para Cachengueoo Match</label>
                  <span
                    className={`text-[10px] font-mono ${
                      regBio.length >= 100 ? 'text-amber-400 font-bold' : 'text-zinc-500'
                    }`}
                  >
                    {regBio.length}/110 (máx. 3 renglones)
                  </span>
                </div>
                <textarea
                  rows={2}
                  maxLength={110}
                  value={regBio}
                  onChange={(e) => setRegBio(e.target.value.slice(0, 110))}
                  placeholder="Tu presentación corta para Match..."
                  className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-[#F39200] text-xs resize-none"
                />
              </div>

              {/* Instagram */}
              <div>
                <label className="text-zinc-400 block text-xs mb-1">Instagram (opcional)</label>
                <div className="relative">
                  <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={regInstagram}
                    onChange={(e) => setRegInstagram(e.target.value)}
                    placeholder="@tunombre"
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-[#F39200] text-xs"
                  />
                </div>
              </div>

              {/* Avatar Preset Selector */}
              <div>
                <label className="text-zinc-400 block mb-1">Foto de Perfil</label>
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                  {AVATAR_PRESETS.map((av, idx) => (
                    <img
                      key={idx}
                      src={av}
                      alt="Avatar option"
                      onClick={() => setRegAvatar(av)}
                      className={`w-12 h-12 rounded-xl object-cover cursor-pointer transition-all ${
                        regAvatar === av
                          ? 'ring-2 ring-[#F39200] scale-105'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Intereses */}
              <div>
                <label className="text-zinc-400 block mb-1.5">Intereses en Cachengueoo</label>
                <div className="flex flex-wrap gap-1.5">
                  {INTEREST_OPTIONS.map((int) => {
                    const selected = regInterests.includes(int);
                    return (
                      <button
                        type="button"
                        key={int}
                        onClick={() => toggleInterest(int)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                          selected
                            ? 'bg-[#F39200] text-black font-bold'
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {int}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#F39200]/20"
              >
                {isSubmitting ? 'Registrando...' : 'Completar Registro Cachengueoo ID'}
                <Sparkles className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
