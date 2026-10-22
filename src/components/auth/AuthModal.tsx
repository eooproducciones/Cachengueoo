import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  Calendar,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  GlassWater,
  Heart,
  Users,
  Instagram,
  Smartphone,
  Eye,
  EyeOff,
  Camera,
  Upload,
  Trash2,
  MapPin,
  QrCode,
  Music,
  Flame,
  Check,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { UserGender, PreferenceGender, UserProfile } from '../../types';
import { authService } from '../../services/authService';
import { CachengueooLogo } from '../common/CachengueooLogo';
import {
  ZODIAC_SIGNS,
  MUSIC_GENRES,
  DRINK_OPTIONS,
  PRESET_AVATARS,
} from '../../constants/profileOptions';

export type AuthModalView =
  | 'choice'
  | 'register_provider'
  | 'register_step_1'
  | 'register_step_2'
  | 'register_step_3'
  | 'register_success'
  | 'login'
  | 'forgot_password'
  | 'verify_venue';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserProfile) => void;
  initialMode?: 'login' | 'register' | 'choice' | 'verify';
  isInsideVenue?: boolean;
  onCheckGps?: () => Promise<void>;
  onOpenQrScanner?: () => void;
  onProceedToMatch?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'choice',
  isInsideVenue = false,
  onCheckGps,
  onOpenQrScanner,
  onProceedToMatch,
}) => {
  const [currentView, setCurrentView] = useState<AuthModalView>('choice');
  const [authProvider, setAuthProvider] = useState<'gmail' | 'instagram' | 'phone'>('gmail');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Forgot password form state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Step 1: Información General
  const [regFullName, setRegFullName] = useState('');
  const [regNickname, setRegNickname] = useState('');
  const [regBirthDate, setRegBirthDate] = useState('2002-06-18');
  const [regInstagram, setRegInstagram] = useState('');
  const [regGender, setRegGender] = useState<UserGender>('hombre');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRepeatPassword, setRegRepeatPassword] = useState('');

  // Step 2: Match & Gustos
  const [regPreference, setRegPreference] = useState<PreferenceGender>('todos');
  const [regZodiacSign, setRegZodiacSign] = useState<string>('Leo');
  const [regMusicPreferences, setRegMusicPreferences] = useState<string[]>([
    'Reggaeton',
    'Cuarteto',
    'Cumbia',
  ]);
  const [regDrinks, setRegDrinks] = useState<string[]>(['Fernet', 'Skyy']);

  // Step 3: Fotos & Bio
  const [regPhotos, setRegPhotos] = useState<string[]>([
    PRESET_AVATARS[0].url,
    PRESET_AVATARS[1].url,
  ]);
  const [regBio, setRegBio] = useState('Salgo a disfrutar con amigos y tomar un buen Fernet. Si pinta charla en la pista, avisame.');

  // Usuario creado recientemente para la verificación
  const [registeredUser, setRegisteredUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessNotice(null);
      setForgotSent(false);

      if (initialMode === 'verify') {
        setCurrentView('verify_venue');
      } else if (initialMode === 'login') {
        setCurrentView('login');
      } else if (initialMode === 'register') {
        setCurrentView('register_provider');
      } else {
        setCurrentView('choice');
      }
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  // Cálculo de edad
  const calculateAge = (birthDateString: string): number => {
    if (!birthDateString) return 0;
    const today = new Date();
    const birthDate = new Date(birthDateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return Math.max(0, age);
  };

  const calculatedAge = calculateAge(regBirthDate);
  const isAdult = calculatedAge >= 18;
  const passwordsMatch = regPassword.length > 0 && regPassword === regRepeatPassword;

  // Toggle de género musical
  const toggleMusicGenre = (genre: string) => {
    if (regMusicPreferences.includes(genre)) {
      if (regMusicPreferences.length > 1) {
        setRegMusicPreferences(regMusicPreferences.filter((g) => g !== genre));
      }
    } else {
      setRegMusicPreferences([...regMusicPreferences, genre]);
    }
  };

  // Toggle de tragos (permite elegir 2)
  const toggleDrink = (drink: string) => {
    if (regDrinks.includes(drink)) {
      if (regDrinks.length > 1) {
        setRegDrinks(regDrinks.filter((d) => d !== drink));
      }
    } else {
      if (regDrinks.length >= 2) {
        setRegDrinks([regDrinks[0], drink]);
      } else {
        setRegDrinks([...regDrinks, drink]);
      }
    }
  };

  // Subir foto desde el dispositivo en Step 3
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (regPhotos.length >= 3) {
      setErrorMessage('Podés colocar hasta 3 fotos como máximo.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setRegPhotos([...regPhotos, result].slice(0, 3));
        setErrorMessage(null);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Agregar preset de foto en Step 3
  const handleAddPresetPhoto = (url: string) => {
    if (regPhotos.includes(url)) return;
    if (regPhotos.length >= 3) {
      setRegPhotos([regPhotos[0], regPhotos[1], url]);
    } else {
      setRegPhotos([...regPhotos, url]);
    }
    setErrorMessage(null);
  };

  // Eliminar foto en Step 3
  const handleRemovePhoto = (index: number) => {
    if (regPhotos.length <= 1) {
      setErrorMessage('Debés tener al menos 1 foto en tu perfil.');
      return;
    }
    setRegPhotos(regPhotos.filter((_, i) => i !== index));
    setErrorMessage(null);
  };

  // Seleccionar proveedor de registro
  const handleSelectProvider = (provider: 'gmail' | 'instagram' | 'phone') => {
    setAuthProvider(provider);
    setErrorMessage(null);

    if (provider === 'gmail') {
      if (!regEmail) setRegEmail('usuario.cache@gmail.com');
    } else if (provider === 'instagram') {
      if (!regInstagram) setRegInstagram('@cachenguero_mza');
    } else if (provider === 'phone') {
      if (!regEmail) setRegEmail('2615551234@cachengueoo.com');
    }

    setCurrentView('register_step_1');
  };

  // Avanzar a Step 2
  const handleProceedToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!regFullName.trim() || !regNickname.trim() || !regEmail.trim()) {
      setErrorMessage('Por favor completá los campos obligatorios.');
      return;
    }

    if (!isAdult) {
      setErrorMessage('Debés tener 18 años o más para ingresar a Cachengueoo.');
      return;
    }

    if (regPassword.length < 4) {
      setErrorMessage('La contraseña debe tener al menos 4 caracteres.');
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage('Las contraseñas no coinciden. Por favor corroboralas.');
      return;
    }

    setCurrentView('register_step_2');
  };

  // Avanzar a Step 3
  const handleProceedToStep3 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!regZodiacSign) {
      setErrorMessage('Por favor seleccioná tu signo zodiacal.');
      return;
    }

    if (regMusicPreferences.length === 0) {
      setErrorMessage('Seleccioná al menos un género musical que te guste.');
      return;
    }

    if (regDrinks.length === 0) {
      setErrorMessage('Seleccioná al menos una opción en ¿Qué tomás? (elegí 2).');
      return;
    }

    setCurrentView('register_step_3');
  };

  // Finalizar creación: "Crear Cache ID"
  const handleCreateCacheId = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (regPhotos.length === 0) {
      setErrorMessage('Por favor agregá al menos una foto de perfil.');
      return;
    }

    setIsSubmitting(true);

    try {
      const chosenDrinks = regDrinks.length > 0 ? regDrinks : ['Fernet', 'Skyy'];
      const newCacheIdUser: UserProfile = {
        id: `usr_cache_${Date.now()}`,
        email: regEmail.trim(),
        fullName: regFullName.trim(),
        nickname: regNickname.trim(),
        birthDate: regBirthDate,
        age: calculatedAge,
        avatarUrl: regPhotos[0],
        photos: regPhotos.slice(0, 3),
        gender: regGender,
        preference: regPreference,
        interests: [...chosenDrinks, ...regMusicPreferences.slice(0, 3)],
        bio: regBio.trim() || 'Disfrutando de la noche en Cachengueoo.',
        drinks: chosenDrinks,
        drinkFavorite: chosenDrinks.join(' & '),
        zodiacSign: regZodiacSign,
        musicPreferences: regMusicPreferences,
        instagram: regInstagram.trim()
          ? regInstagram.startsWith('@')
            ? regInstagram.trim()
            : `@${regInstagram.trim()}`
          : undefined,
        createdAt: new Date().toISOString(),
        authProvider,
      };

      await authService.registerUser(newCacheIdUser, regPassword);
      setRegisteredUser(newCacheIdUser);
      onAuthSuccess(newCacheIdUser);

      // Si ya está dentro del boliche, puede pasar directo; si no, vamos a verificación en Cache
      if (isInsideVenue) {
        setCurrentView('register_success');
      } else {
        setCurrentView('verify_venue');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al crear tu Cache ID');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manejar Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await authService.loginWithCredentials(loginEmail, loginPassword);
      if (result.success && result.user) {
        onAuthSuccess(result.user);
        setRegisteredUser(result.user);

        // Si es cuenta de administrador, pasa directo al panel admin
        if (result.user.isAdmin || result.user.role === 'admin') {
          onClose();
          return;
        }

        // Si es cuenta de usuario:
        // "recién ahí tiene que salir la opción de 'Verifiquemos que estás en Cache' (verificamos por gps o por qr)"
        setCurrentView('verify_venue');
      } else {
        setErrorMessage(result.message || 'Credenciales incorrectas');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Recuperar contraseña
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setErrorMessage('Ingresá tu correo electrónico.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await authService.requestPasswordReset(forgotEmail.trim());
      setSuccessNotice(res.message);
      setForgotSent(true);
    } catch {
      setErrorMessage('No pudimos enviar el correo de recuperación. Intentá nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#121217] border border-zinc-800 rounded-3xl w-full max-w-lg p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Global Error Notice */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-red-950/70 border border-red-500/40 text-red-200 text-xs flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* ========================================================== */}
        {/* VIEW 1: CHOICE (INICIAR SESIÓN O CREAR CUENTA)             */}
        {/* ========================================================== */}
        {currentView === 'choice' && (
          <div className="space-y-6 pt-2 pb-2">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#F39200]/20 to-amber-500/10 border border-[#F39200]/40 flex items-center justify-center mx-auto shadow-lg shadow-[#F39200]/20">
                <Flame className="w-7 h-7 text-[#F39200] fill-[#F39200]" />
              </div>
              <span className="text-[10px] uppercase font-bold text-[#F39200] tracking-widest block">
                EXPERIENCIA CACHENGUEOO MATCH
              </span>
              <h3 className="text-2xl font-black text-white font-display uppercase tracking-tight">
                ACTIVAR <span className="text-[#F39200]">MATCH</span>
              </h3>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
                Conectá con personas en la pista esta noche, descubrí gustos en común y compartan una copa.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setCurrentView('register_provider');
                }}
                className="w-full h-13 rounded-2xl bg-[#F39200] hover:bg-[#E08400] text-black font-extrabold text-sm flex items-center justify-center gap-2.5 cursor-pointer shadow-xl shadow-[#F39200]/30 active:scale-[0.98] transition-all"
              >
                <Sparkles className="w-5 h-5 fill-black" />
                <span>Crear cuenta</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setCurrentView('login');
                }}
                className="w-full h-12 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
              >
                <LogIn className="w-4 h-4 text-zinc-400" />
                <span>Iniciar sesión</span>
              </button>
            </div>

            <div className="pt-2 text-center">
              <span className="text-[11px] text-zinc-500 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#F39200]" />
                Verificación exclusiva para personas dentro del boliche
              </span>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* VIEW 2: PROVIDER SELECTION (GMAIL, INSTAGRAM, TELÉFONO)   */}
        {/* ========================================================== */}
        {currentView === 'register_provider' && (
          <div className="space-y-5 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentView('choice')}
                className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#F39200] tracking-wider block">
                  REGISTRO
                </span>
                <h3 className="text-lg font-black text-white font-display">
                  Elegí cómo crear tu cuenta
                </h3>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Podés registrarte rápidamente usando tu cuenta de Google, tu perfil de Instagram o tu número de teléfono móvil:
            </p>

            <div className="space-y-3 pt-1">
              {/* Opción 1: Crear con Gmail */}
              <button
                type="button"
                onClick={() => handleSelectProvider('gmail')}
                className="w-full p-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/50 flex items-center justify-between cursor-pointer transition-all group shadow-sm text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                    <Mail className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                      Crear con Gmail
                    </h4>
                    <span className="text-[11px] text-zinc-400 block">
                      Vinculá tu correo de Google en un paso
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </button>

              {/* Opción 2: Crear con Instagram */}
              <button
                type="button"
                onClick={() => handleSelectProvider('instagram')}
                className="w-full p-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-pink-500/50 flex items-center justify-between cursor-pointer transition-all group shadow-sm text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-yellow-500/20 via-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400 shrink-0">
                    <Instagram className="w-5 h-5 text-pink-400" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-pink-300 transition-colors">
                      Crear con Instagram
                    </h4>
                    <span className="text-[11px] text-zinc-400 block">
                      Mostrá tu @usuario para conectar en redes
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </button>

              {/* Opción 3: Crear con número de teléfono */}
              <button
                type="button"
                onClick={() => handleSelectProvider('phone')}
                className="w-full p-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-emerald-500/50 flex items-center justify-between cursor-pointer transition-all group shadow-sm text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <Smartphone className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                      Crear con número de teléfono
                    </h4>
                    <span className="text-[11px] text-zinc-400 block">
                      Registro ágil mediante SMS o WhatsApp
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </button>
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setCurrentView('login')}
                className="text-xs text-zinc-400 hover:text-white underline"
              >
                ¿Ya tenés cuenta? Iniciar sesión
              </button>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* WIZARD STEP 1: INFORMACIÓN GENERAL                        */}
        {/* ========================================================== */}
        {currentView === 'register_step_1' && (
          <form onSubmit={handleProceedToStep2} className="space-y-4 pt-1">
            {/* Header con indicador de paso */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentView('register_provider')}
                  className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#F39200] tracking-wider block">
                    PASO 1 DE 3 · INFORMACIÓN GENERAL
                  </span>
                  <h3 className="text-base font-black text-white font-display">
                    ¿Cómo te llamás?
                  </h3>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400 px-2 py-0.5 rounded-lg bg-amber-400/10 border border-amber-400/20">
                Paso 1/3
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 to-[#F39200] h-1.5 rounded-full w-1/3 transition-all duration-300" />
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Nombre completo */}
              <div>
                <label className="text-zinc-300 block mb-1 font-bold flex items-center justify-between">
                  <span>Nombre completo <span className="text-red-400">*</span></span>
                  <span className="text-[10px] text-zinc-500">Tal como figura en tu DNI</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="ej. Mateo Rossi"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-none focus:border-[#F39200]"
                  />
                </div>
              </div>

              {/* Apodo y Fecha de Nacimiento en Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Apodo */}
                <div>
                  <label className="text-zinc-300 block mb-1 font-bold">
                    Apodo <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Teo (visible en la pista)"
                    value={regNickname}
                    onChange={(e) => setRegNickname(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-none focus:border-[#F39200]"
                  />
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    Es el nombre con el que aparecerás en Match.
                  </span>
                </div>

                {/* Fecha de Nacimiento */}
                <div>
                  <label className="text-zinc-300 block mb-1 font-bold flex items-center justify-between">
                    <span>Fecha de nacimiento <span className="text-red-400">*</span></span>
                    {calculatedAge > 0 && (
                      <span className={`text-[10px] font-bold ${isAdult ? 'text-emerald-400' : 'text-red-400'}`}>
                        {calculatedAge} años {isAdult ? '✓' : '(menor)'}
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="date"
                      required
                      value={regBirthDate}
                      onChange={(e) => setRegBirthDate(e.target.value)}
                      className="w-full h-10 pl-9 pr-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-none focus:border-[#F39200]"
                    />
                  </div>
                </div>
              </div>

              {/* Instagram & Mi Género */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Instagram */}
                <div>
                  <label className="text-zinc-300 block mb-1 font-bold flex items-center gap-1">
                    <Instagram className="w-3.5 h-3.5 text-pink-400" />
                    <span>Instagram</span>
                  </label>
                  <input
                    type="text"
                    placeholder="@tu_usuario"
                    value={regInstagram}
                    onChange={(e) => setRegInstagram(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-none focus:border-[#F39200]"
                  />
                </div>

                {/* Mi Género */}
                <div>
                  <label className="text-zinc-300 block mb-1 font-bold">
                    Mi género <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={regGender}
                    onChange={(e) => setRegGender(e.target.value as UserGender)}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-none focus:border-[#F39200]"
                  >
                    <option value="hombre">Hombre</option>
                    <option value="mujer">Mujer</option>
                    <option value="no-binario">No binario</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
              </div>

              {/* Mail */}
              <div>
                <label className="text-zinc-300 block mb-1 font-bold">
                  Mail <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="tu.email@gmail.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-none focus:border-[#F39200]"
                  />
                </div>
              </div>

              {/* Contraseña & Repetir Contraseña */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Contraseña */}
                <div>
                  <label className="text-zinc-300 block mb-1 font-bold">
                    Contraseña <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Mínimo 4 caracteres"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full h-10 pl-9 pr-9 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-none focus:border-[#F39200]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Repetir Contraseña con Check de corroboración */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-zinc-300 font-bold">
                      Repetir contraseña <span className="text-red-400">*</span>
                    </label>
                    {regRepeatPassword.length > 0 && (
                      <span
                        className={`text-[10px] font-bold flex items-center gap-0.5 ${
                          passwordsMatch ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {passwordsMatch ? (
                          <>
                            <Check className="w-3 h-3 stroke-[3]" /> Coinciden
                          </>
                        ) : (
                          'No coinciden'
                        )}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type={showRepeatPassword ? 'text' : 'password'}
                      required
                      placeholder="Reescribí tu contraseña"
                      value={regRepeatPassword}
                      onChange={(e) => setRegRepeatPassword(e.target.value)}
                      className={`w-full h-10 pl-9 pr-9 rounded-xl bg-zinc-900 border text-white font-medium focus:outline-none ${
                        regRepeatPassword.length > 0
                          ? passwordsMatch
                            ? 'border-emerald-500/60 focus:border-emerald-500 ring-1 ring-emerald-500/20'
                            : 'border-red-500/60 focus:border-red-500'
                          : 'border-zinc-800 focus:border-[#F39200]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRepeatPassword(!showRepeatPassword)}
                      className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300"
                    >
                      {showRepeatPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Botón Siguiente Paso */}
            <div className="pt-3">
              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-[#F39200]/25"
              >
                <span>Siguiente: Gustos & Match</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* ========================================================== */}
        {/* WIZARD STEP 2: MATCH & GUSTOS (SIGNO, MÚSICA, TRAGO)      */}
        {/* ========================================================== */}
        {currentView === 'register_step_2' && (
          <form onSubmit={handleProceedToStep3} className="space-y-4 pt-1">
            {/* Header con indicador de paso */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentView('register_step_1')}
                  className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#F39200] tracking-wider block">
                    PASO 2 DE 3 · PREFERENCIAS & GUSTOS
                  </span>
                  <h3 className="text-base font-black text-white font-display">
                    Tu vibra en la noche
                  </h3>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400 px-2 py-0.5 rounded-lg bg-amber-400/10 border border-amber-400/20">
                Paso 2/3
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 to-[#F39200] h-1.5 rounded-full w-2/3 transition-all duration-300" />
            </div>

            <div className="space-y-4 text-xs">
              {/* 1. Ver en Match (todos, hombres, mujeres) */}
              <div>
                <label className="text-zinc-300 block mb-1.5 font-bold flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#F39200]" />
                  <span>Ver en Match</span>
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
                      onClick={() => setRegPreference(opt.id as PreferenceGender)}
                      className={`h-9 rounded-xl font-bold cursor-pointer transition-all ${
                        regPreference === opt.id
                          ? 'bg-[#F39200] text-black shadow-md'
                          : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. SIGNO (PONE SIGNO SOLAMENTE EN EL TÍTULO) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-zinc-300 font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#F39200]" />
                    <span>Signo</span>
                  </label>
                  <span className="text-[10px] text-zinc-400 font-medium">
                    Seleccionado: <strong className="text-amber-400">{regZodiacSign}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                  {ZODIAC_SIGNS.map((s) => {
                    const isSelected = regZodiacSign === s.name;
                    return (
                      <button
                        key={s.name}
                        type="button"
                        onClick={() => setRegZodiacSign(s.name)}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                          isSelected
                            ? 'bg-gradient-to-b from-[#F39200]/25 to-amber-500/10 border-[#F39200] text-amber-300 font-bold ring-1 ring-[#F39200]/50'
                            : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                        }`}
                      >
                        <span className="text-sm">{s.symbol}</span>
                        <span className="text-[10.5px] leading-tight truncate w-full">{s.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. ¿QUÉ MÚSICA TE GUSTA? */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-zinc-300 font-bold flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5 text-[#F39200]" />
                    <span>¿Qué música te gusta?</span>
                  </label>
                  <span className="text-[10px] text-zinc-400">
                    {regMusicPreferences.length} seleccionados
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {MUSIC_GENRES.map((genre) => {
                    const isSelected = regMusicPreferences.includes(genre);
                    return (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => toggleMusicGenre(genre)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1 ${
                          isSelected
                            ? 'bg-[#F39200] text-black shadow-sm'
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

              {/* 4. ¿QUÉ TOMÁS? (SELECCIÓN DE 2 OPCIONES) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-zinc-300 font-bold flex items-center gap-1.5">
                    <GlassWater className="w-3.5 h-3.5 text-[#F39200]" />
                    <span>¿Qué tomás? (Elegí 2)</span>
                  </label>
                  <span className="text-[10px] text-amber-400 font-bold">
                    {regDrinks.length}/2 opciones elegidas: {regDrinks.join(' y ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DRINK_OPTIONS.map((drink) => {
                    const isSelected = regDrinks.includes(drink);
                    return (
                      <button
                        key={drink}
                        type="button"
                        onClick={() => toggleDrink(drink)}
                        className={`h-9 px-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                          isSelected
                            ? 'bg-amber-400 text-black shadow-md font-extrabold'
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

            {/* Botones de acción */}
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentView('register_step_1')}
                className="w-1/3 h-11 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white font-medium cursor-pointer"
              >
                Volver
              </button>
              <button
                type="submit"
                className="flex-1 h-11 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-[#F39200]/25"
              >
                <span>Siguiente: Fotos & Bio</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* ========================================================== */}
        {/* WIZARD STEP 3: HASTA 3 FOTOS, BIO Y BOTÓN "CREAR CACHE ID" */}
        {/* ========================================================== */}
        {currentView === 'register_step_3' && (
          <form onSubmit={handleCreateCacheId} className="space-y-4 pt-1">
            {/* Header con indicador de paso */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentView('register_step_2')}
                  className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#F39200] tracking-wider block">
                    PASO 3 DE 3 · FOTOS & BIOGRAFÍA
                  </span>
                  <h3 className="text-base font-black text-white font-display">
                    Tus fotos de fiesta
                  </h3>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400 px-2 py-0.5 rounded-lg bg-amber-400/10 border border-amber-400/20">
                Paso 3/3
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 to-[#F39200] h-1.5 rounded-full w-full transition-all duration-300" />
            </div>

            <div className="space-y-4 text-xs">
              {/* Fotos (hasta 3 fotos) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-zinc-300 font-bold flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-[#F39200]" />
                    <span>Fotos de tu perfil (hasta 3 fotos)</span>
                  </label>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {regPhotos.length}/3 fotos
                  </span>
                </div>

                {/* Slots de fotos */}
                <div className="grid grid-cols-3 gap-2.5">
                  {[0, 1, 2].map((idx) => {
                    const photoUrl = regPhotos[idx];
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
                            <img
                              src={photoUrl}
                              alt={`Foto ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            {idx === 0 && (
                              <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-[#F39200] text-black font-black text-[9px] uppercase tracking-wider shadow">
                                Principal
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(idx)}
                              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/80 hover:bg-red-600 text-white flex items-center justify-center cursor-pointer transition-colors shadow"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <label className="w-full h-full flex flex-col items-center justify-center gap-1 cursor-pointer p-2 text-center hover:bg-zinc-800/40 transition-colors">
                            <Upload className="w-5 h-5 text-zinc-500" />
                            <span className="text-[10px] text-zinc-500 font-bold">
                              Foto {idx + 1}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handlePhotoUpload}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Botón para subir imagen desde el dispositivo */}
                <div className="mt-2.5">
                  <label className="w-full h-9 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-[#F39200] text-white font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-all">
                    <Upload className="w-3.5 h-3.5 text-[#F39200]" />
                    Subir foto desde tu dispositivo (Cámara / Galería)
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Presets rápidos */}
                <div className="mt-2">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                    O elegí fotos sugeridas de fiesta:
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {PRESET_AVATARS.slice(0, 4).map((p, pIdx) => {
                      const isUsed = regPhotos.includes(p.url);
                      return (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => handleAddPresetPhoto(p.url)}
                          className={`relative aspect-square rounded-xl overflow-hidden border cursor-pointer transition-all ${
                            isUsed ? 'border-[#F39200] opacity-50 ring-1 ring-[#F39200]' : 'border-zinc-800 hover:border-zinc-500'
                          }`}
                        >
                          <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
                          {isUsed && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 text-[#F39200] stroke-[3]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Biografía */}
              <div>
                <label className="text-zinc-300 block mb-1 font-bold">
                  Biografía
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Contá algo sobre vos, cómo te gusta salir o con qué tema no te sentás..."
                  value={regBio}
                  onChange={(e) => setRegBio(e.target.value)}
                  className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-none focus:border-[#F39200] leading-relaxed resize-none text-xs"
                />
              </div>
            </div>

            {/* BOTÓN FINAL: "Crear Cache ID" */}
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentView('register_step_2')}
                className="w-1/3 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white font-medium cursor-pointer"
              >
                Volver
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-amber-400 via-[#F39200] to-orange-500 hover:brightness-105 text-black font-black text-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xl shadow-[#F39200]/30 active:scale-[0.98]"
              >
                <Sparkles className="w-4 h-4 fill-black" />
                <span>{isSubmitting ? 'Creando...' : 'Crear Cache ID'}</span>
              </button>
            </div>
          </form>
        )}

        {/* ========================================================== */}
        {/* VIEW 4: LOGIN FORM                                         */}
        {/* ========================================================== */}
        {currentView === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 pt-1">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
              <button
                type="button"
                onClick={() => setCurrentView('choice')}
                className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#F39200] tracking-wider block">
                  ACCESO
                </span>
                <h3 className="text-base font-black text-white font-display">
                  Iniciar sesión
                </h3>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Mail */}
              <div>
                <label className="text-zinc-300 block mb-1 font-bold">
                  Mail o usuario <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="tu.mail@gmail.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-none focus:border-[#F39200]"
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-zinc-300 font-bold">
                    Contraseña <span className="text-red-400">*</span>
                  </label>

                  {/* BOTÓN CHICO: "¿Olvidaste tu contraseña? Recupérala" */}
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(loginEmail);
                      setErrorMessage(null);
                      setCurrentView('forgot_password');
                    }}
                    className="text-[11px] text-[#F39200] hover:underline cursor-pointer font-medium"
                  >
                    ¿Olvidaste tu contraseña? Recupérala
                  </button>
                </div>

                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full h-10 pl-9 pr-9 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-none focus:border-[#F39200]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 space-y-2.5">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-[#F39200]/25"
              >
                <LogIn className="w-4 h-4" />
                <span>{isSubmitting ? 'Ingresando...' : 'Iniciar sesión'}</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentView('register_provider')}
                className="w-full h-10 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 text-[#F39200]" />
                ¿No tenés cuenta? Crear cuenta
              </button>
            </div>
          </form>
        )}

        {/* ========================================================== */}
        {/* VIEW 5: FORGOT PASSWORD                                    */}
        {/* ========================================================== */}
        {currentView === 'forgot_password' && (
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-4 pt-1">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
              <button
                type="button"
                onClick={() => setCurrentView('login')}
                className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#F39200] tracking-wider block">
                  RECUPERACIÓN
                </span>
                <h3 className="text-base font-black text-white font-display">
                  ¿Olvidaste tu contraseña?
                </h3>
              </div>
            </div>

            {forgotSent ? (
              <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">¡Enlace enviado!</h4>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {successNotice ||
                    `Te enviamos un correo a ${forgotEmail} con las instrucciones para recuperar tu cuenta.`}
                </p>
                <button
                  type="button"
                  onClick={() => setCurrentView('login')}
                  className="w-full h-10 rounded-xl bg-[#F39200] text-black font-extrabold text-xs cursor-pointer shadow-md"
                >
                  Volver a Iniciar Sesión
                </button>
              </div>
            ) : (
              <div className="space-y-3.5 text-xs">
                <p className="text-zinc-400 leading-relaxed">
                  Ingresá el correo que registraste o tu cuenta de Gmail. Te enviaremos un enlace seguro para restablecer tu contraseña.
                </p>

                <div>
                  <label className="text-zinc-300 block mb-1 font-bold">
                    Correo electrónico o Gmail
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="email"
                      required
                      placeholder="ej. tu.mail@gmail.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full h-10 pl-9 pr-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-none focus:border-[#F39200]"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-11 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-[#F39200]/25"
                  >
                    <Mail className="w-4 h-4" />
                    <span>{isSubmitting ? 'Enviando enlace...' : 'Recuperar contraseña'}</span>
                  </button>
                </div>
              </div>
            )}
          </form>
        )}

        {/* ========================================================== */}
        {/* VIEW 6: "VERIFIQUEMOS QUE ESTÁS EN CACHE"                  */}
        {/* ========================================================== */}
        {currentView === 'verify_venue' && (
          <div className="space-y-5 pt-1 text-center">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#F39200]/25 to-amber-500/10 border-2 border-[#F39200]/50 flex items-center justify-center mx-auto shadow-xl shadow-[#F39200]/30 animate-pulse">
              <MapPin className="w-8 h-8 text-[#F39200]" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-[#F39200] tracking-widest block">
                COMPROBACIÓN DE PRESENCIA
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white font-display uppercase tracking-tight">
                VERIFIQUEMOS QUE ESTÁS EN CACHE
              </h3>
              <p className="text-xs text-zinc-300 max-w-sm mx-auto leading-relaxed">
                Para activar <strong className="text-white">Cachengueoo Match</strong> corroboramos que estés físicamente dentro del boliche mediante GPS o escaneando el QR oficial.
              </p>
            </div>

            {/* Dos métodos de verificación requeridos: GPS o QR */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-left">
              {/* Opción 1: Verificar por GPS */}
              <button
                type="button"
                onClick={async () => {
                  if (onCheckGps) {
                    await onCheckGps();
                  }
                  onClose();
                }}
                className="p-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-[#F39200] cursor-pointer transition-all flex flex-col justify-between group shadow-lg"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-[#F39200]/15 border border-[#F39200]/30 flex items-center justify-center text-[#F39200]">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-amber-300">
                      Verificar por GPS
                    </h4>
                    <span className="text-[10px] text-zinc-400">Geolocalización directa</span>
                  </div>
                </div>
                <span className="text-[11px] text-zinc-500 group-hover:text-zinc-300">
                  Comprobá tu ubicación en Cachengueoo con un toque.
                </span>
              </button>

              {/* Opción 2: Verificar por QR */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenQrScanner) {
                    onOpenQrScanner();
                  }
                }}
                className="p-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-400 cursor-pointer transition-all flex flex-col justify-between group shadow-lg"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-amber-300">
                      Verificar por QR
                    </h4>
                    <span className="text-[10px] text-zinc-400">Escaneá en barra o puerta</span>
                  </div>
                </div>
                <span className="text-[11px] text-zinc-500 group-hover:text-zinc-300">
                  Escaneá el código QR del boliche con tu cámara.
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* VIEW 7: REGISTER SUCCESS (BIENVENIDA CACHE ID)            */}
        {/* ========================================================== */}
        {currentView === 'register_success' && (
          <div className="space-y-5 pt-2 pb-1 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/20">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-widest block">
                ¡CACHE ID ACTIVADO!
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white font-display uppercase tracking-tight">
                ¡BIENVENIDO A CACHENGUEOO, {registeredUser?.nickname || 'AMIGO'}!
              </h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                Tu perfil de fiesta ha sido generado. Ya podés descubrir a las personas que están en la pista esta noche.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if (onProceedToMatch) onProceedToMatch();
                  onClose();
                }}
                className="w-full h-12 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#F39200]/25 transition-all"
              >
                <Flame className="w-4 h-4 fill-black" />
                <span>Entrar a Cachengueoo Match</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
