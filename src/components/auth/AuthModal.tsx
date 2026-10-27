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
  Eye,
  EyeOff,
  Camera,
  Upload,
  Trash2,
  MapPin,
  Music,
  Flame,
  Check,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { UserGender, PreferenceGender, UserProfile } from '../../types';
import { authService } from '../../services/authService';
import { getSupabaseClient } from '../../services/supabaseClient';
import { CachengueooLogo } from '../common/CachengueooLogo';
import {
  ZODIAC_SIGNS,
  MUSIC_GENRES,
  DRINK_OPTIONS,
} from '../../constants/profileOptions';
import { compressImageFile } from '../../utils/imageCompressor';

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
  initialMode?: 'login' | 'register' | 'choice' | 'verify' | 'register_step_1';
  isInsideVenue?: boolean;
  onCheckGps?: () => Promise<void>;
  onProceedToMatch?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'choice',
  isInsideVenue = false,
  onCheckGps,
  onProceedToMatch,
}) => {
  const [currentView, setCurrentView] = useState<AuthModalView>('choice');
  const [authProvider, setAuthProvider] = useState<'gmail' | 'email'>('gmail');
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
  const [regBirthDate, setRegBirthDate] = useState('');
  const [regInstagram, setRegInstagram] = useState('');
  const [regGender, setRegGender] = useState<UserGender>('hombre');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRepeatPassword, setRegRepeatPassword] = useState('');

  // Step 2: Match & Gustos
  const [regPreference, setRegPreference] = useState<PreferenceGender>('todos');
  const [regZodiacSign, setRegZodiacSign] = useState<string>('');
  const [regMusicPreferences, setRegMusicPreferences] = useState<string[]>([]);
  const [regDrinks, setRegDrinks] = useState<string[]>([]);

  // Step 3: Fotos & Bio
  const [regPhotos, setRegPhotos] = useState<string[]>([]);
  const [regBio, setRegBio] = useState('');

  // Usuario creado recientemente para la verificación
  const [registeredUser, setRegisteredUser] = useState<UserProfile | null>(null);

  // Detección y prevención de cuentas duplicadas en el registro
  const [existingAccountFound, setExistingAccountFound] = useState<UserProfile | null>(null);
  const [existingPasswordInput, setExistingPasswordInput] = useState('');
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessNotice(null);
      setForgotSent(false);
      setIsSubmitting(false);
      setExistingAccountFound(null);
      setExistingPasswordInput('');

      const currentUser = authService.getCurrentUser();
      const flowIntent =
        sessionStorage.getItem('cachengueoo_flow_intent') ||
        localStorage.getItem('cachengueoo_flow_intent');

      // Intentar cargar el correo de Google si la sesión ya está iniciada en Supabase
      const client = getSupabaseClient();
      if (client) {
        client.auth.getUser().then(({ data }) => {
          if (data?.user?.email) {
            setRegEmail((prev) => (!prev || prev.includes('usuario.cache') ? data.user.email! : prev));
          }
        });
      }

      if (initialMode === 'register_step_1' || flowIntent === 'configure_cache_id') {
        setCurrentView('register_step_1');
        setAuthProvider('gmail');
        if (currentUser) {
          if (currentUser.email && !currentUser.email.includes('usuario.cache')) {
            setRegEmail(currentUser.email);
          }
          if (currentUser.fullName) setRegFullName(currentUser.fullName);
          if (currentUser.nickname) setRegNickname(currentUser.nickname);
          if (currentUser.birthDate && currentUser.birthDate !== '2001-01-01') {
            setRegBirthDate(currentUser.birthDate);
          }
          if (currentUser.gender) setRegGender(currentUser.gender);
          if (currentUser.instagram) setRegInstagram(currentUser.instagram);
          if (currentUser.avatarUrl && regPhotos.length === 0) {
            setRegPhotos([currentUser.avatarUrl]);
          }
        }
      } else if (initialMode === 'verify') {
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

  // Sincronizar datos si el usuario de Supabase/Google llega con el modal ya abierto en el wizard
  useEffect(() => {
    if (isOpen && currentView === 'register_step_1') {
      const u = authService.getCurrentUser();
      if (u) {
        if (u.email && (!regEmail || regEmail.includes('usuario.cache'))) setRegEmail(u.email);
        if (u.fullName && !regFullName) setRegFullName(u.fullName);
        if (u.nickname && !regNickname) setRegNickname(u.nickname);
        if (
          u.birthDate &&
          u.birthDate !== '2001-01-01' &&
          u.birthDate !== '2000-01-01' &&
          !regBirthDate
        ) {
          setRegBirthDate(u.birthDate);
        }
        if (
          u.avatarUrl &&
          !u.avatarUrl.includes('images.unsplash.com') &&
          regPhotos.length === 0
        ) {
          setRegPhotos([u.avatarUrl]);
        }
        if (u.drinks && u.drinks.length > 0 && regDrinks.length === 0) {
          setRegDrinks(u.drinks);
        }
        if (u.zodiacSign && !regZodiacSign) {
          setRegZodiacSign(u.zodiacSign);
        }
        if (
          u.musicPreferences &&
          u.musicPreferences.length > 0 &&
          regMusicPreferences.length === 0
        ) {
          setRegMusicPreferences(u.musicPreferences);
        }
      }
    }
  }, [
    isOpen,
    currentView,
    regEmail,
    regFullName,
    regNickname,
    regBirthDate,
    regPhotos.length,
    regDrinks.length,
    regZodiacSign,
    regMusicPreferences.length,
  ]);

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
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (regPhotos.length >= 3) {
      setErrorMessage('Podés colocar hasta 3 fotos como máximo.');
      return;
    }
    try {
      const compressed = await compressImageFile(file);
      setRegPhotos([...regPhotos, compressed].slice(0, 3));
      setErrorMessage(null);
    } catch (err) {
      console.warn('Error compressing photo:', err);
    }
    e.target.value = '';
  };

  // Eliminar foto en Step 3
  const handleRemovePhoto = (index: number) => {
    setRegPhotos(regPhotos.filter((_, i) => i !== index));
    setErrorMessage(null);
  };

  // Iniciar sesión o registro directo con Google OAuth
  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setExistingAccountFound(null);

    // Timeout de seguridad para evitar que quede cargando infinitamente si se cancela o bloquea
    const safetyTimeout = setTimeout(() => {
      setIsSubmitting(false);
    }, 6000);

    try {
      // Registrar la intención de configurar el Cache ID al retornar
      sessionStorage.setItem('cachengueoo_flow_intent', 'configure_cache_id');
      localStorage.setItem('cachengueoo_flow_intent', 'configure_cache_id');
      const res = await authService.signInWithGoogle();
      if (!res.success) {
        clearTimeout(safetyTimeout);
        setErrorMessage(res.message || 'Error al conectar con Google.');
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      clearTimeout(safetyTimeout);
      setErrorMessage(err instanceof Error ? err.message : 'Error al conectar con Google');
      setIsSubmitting(false);
    }
  };

  // Seleccionar proveedor de registro (Solo Gmail o Correo electrónico)
  const handleSelectProvider = (provider: 'gmail' | 'email') => {
    setAuthProvider(provider);
    setErrorMessage(null);
    setExistingAccountFound(null);

    if (provider === 'gmail') {
      const u = authService.getCurrentUser();
      if (u?.email && !u.email.includes('usuario.cache')) {
        setRegEmail(u.email);
      }
    } else {
      if (regEmail.includes('usuario.cache')) {
        setRegEmail('');
      }
    }

    setCurrentView('register_step_1');
  };

  // Avanzar a Step 2: Validación estricta y obligatoria de todos los campos del Paso 1
  const handleProceedToStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setExistingAccountFound(null);

    const cleanFullName = regFullName.trim();
    const cleanNickname = regNickname.trim();
    const cleanEmail = regEmail.trim().toLowerCase();

    if (!cleanFullName) {
      setErrorMessage('El nombre completo es obligatorio.');
      return;
    }

    if (!cleanNickname) {
      setErrorMessage('El apodo es obligatorio.');
      return;
    }

    if (!regBirthDate) {
      setErrorMessage('La fecha de nacimiento es obligatoria.');
      return;
    }

    if (!calculatedAge || calculatedAge < 18) {
      setErrorMessage('Debés tener 18 años o más para ingresar a Cachengueoo.');
      return;
    }

    if (!regGender) {
      setErrorMessage('Por favor seleccioná tu género.');
      return;
    }

    if (!cleanEmail) {
      setErrorMessage('El correo electrónico es obligatorio.');
      return;
    }

    // Validación básica de formato de correo
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage('Por favor ingresá un correo electrónico válido.');
      return;
    }

    // Verificar si el correo ya está registrado en Cachengueoo para evitar cuentas duplicadas
    const currentUser = authService.getCurrentUser();
    const currentUserId = currentUser?.id;
    const isCurrentUserEmail = Boolean(
      (currentUser?.email && currentUser.email.trim().toLowerCase() === cleanEmail) ||
      authProvider === 'gmail'
    );

    // Si el usuario se autenticó con Gmail o está utilizando su propio correo verificado,
    // NUNCA debe bloquearse con error de "ya está registrado", ya que es su propia cuenta legítima configurando su Cache ID.
    if (!isCurrentUserEmail && authProvider !== 'gmail') {
      setIsCheckingEmail(true);
      try {
        const emailCheck = await authService.checkEmailExists(cleanEmail, currentUserId);
        if (
          emailCheck.exists &&
          emailCheck.profile &&
          emailCheck.profile.id !== currentUserId &&
          emailCheck.isConfigured
        ) {
          setIsCheckingEmail(false);
          setExistingAccountFound(emailCheck.profile);
          return;
        }
      } catch {
        // Continuar si falla la verificación de red
      } finally {
        setIsCheckingEmail(false);
      }
    }

    // Para registro con correo electrónico, la contraseña es obligatoria
    if (authProvider !== 'gmail') {
      if (!regPassword || regPassword.length < 4) {
        setErrorMessage('La contraseña es obligatoria (mínimo 4 caracteres).');
        return;
      }

      if (!regRepeatPassword) {
        setErrorMessage('Por favor confirmá tu contraseña.');
        return;
      }

      if (regPassword !== regRepeatPassword) {
        setErrorMessage('Las contraseñas no coinciden. Por favor corroboralas.');
        return;
      }
    }

    setCurrentView('register_step_2');
  };

  // Ingresar directamente a la cuenta existente detectada sin crear duplicado
  const handleLoginExistingAccount = async () => {
    if (!existingPasswordInput.trim()) {
      setErrorMessage('Por favor ingresá tu contraseña.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await authService.loginWithCredentials(regEmail, existingPasswordInput);
      if (res.success && res.user) {
        localStorage.setItem('cachengueoo_cache_id_created', 'true');
        sessionStorage.removeItem('cachengueoo_flow_intent');
        localStorage.removeItem('cachengueoo_flow_intent');
        onAuthSuccess(res.user);
        onClose();
      } else {
        setErrorMessage(res.message || 'Contraseña incorrecta.');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al ingresar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Avanzar a Step 3: Validación estricta y obligatoria de todos los campos del Paso 2
  const handleProceedToStep3 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!regPreference) {
      setErrorMessage('Seleccioná a quién querés ver en Match (Todos, Hombres o Mujeres).');
      return;
    }

    if (!regZodiacSign || !regZodiacSign.trim()) {
      setErrorMessage('El signo zodiacal es obligatorio. Por favor seleccioná tu signo.');
      return;
    }

    if (!regMusicPreferences || regMusicPreferences.length === 0) {
      setErrorMessage('Seleccioná al menos un género musical de tu preferencia.');
      return;
    }

    if (!regDrinks || regDrinks.length === 0) {
      setErrorMessage('Seleccioná al menos un trago en ¿Qué tomás? (podés elegir hasta 2).');
      return;
    }

    setCurrentView('register_step_3');
  };

  // Finalizar creación: "Crear Cache ID" (Validación estricta y obligatoria del Paso 3)
  const handleCreateCacheId = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!regPhotos || regPhotos.length === 0 || !regPhotos[0]) {
      setErrorMessage('La foto principal de tu perfil es obligatoria. Por favor subí tu foto.');
      return;
    }

    const cleanBio = regBio.trim();
    if (!cleanBio) {
      setErrorMessage('La biografía es obligatoria. Contá algo breve sobre vos.');
      return;
    }

    setIsSubmitting(true);

    try {
      const chosenDrinks = regDrinks.length > 0 ? regDrinks : ['Fernet'];
      const currentUser = authService.getCurrentUser();
      const currentId = currentUser?.id || `usr_cache_${Date.now()}`;

      const newCacheIdUser: UserProfile = {
        id: currentId,
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
        bio: cleanBio,
        drinks: chosenDrinks,
        drinkFavorite: chosenDrinks.join(' & '),
        zodiacSign: regZodiacSign,
        musicPreferences: regMusicPreferences,
        instagram: regInstagram.trim()
          ? regInstagram.startsWith('@')
            ? regInstagram.trim()
            : `@${regInstagram.trim()}`
          : undefined,
        createdAt: currentUser?.createdAt || new Date().toISOString(),
        authProvider,
      };

      if (authProvider === 'gmail') {
        const updatedUser = await authService.updateProfile(newCacheIdUser);
        const userToUse = updatedUser || newCacheIdUser;
        localStorage.setItem('cachengueoo_cache_id_created', 'true');
        sessionStorage.removeItem('cachengueoo_flow_intent');
        localStorage.removeItem('cachengueoo_flow_intent');
        setRegisteredUser(userToUse);
        onAuthSuccess(userToUse);
        setCurrentView('register_success');
        return;
      }

      const regResult = await authService.registerUser(newCacheIdUser, regPassword);
      const userToUse = regResult.user || newCacheIdUser;
      localStorage.setItem('cachengueoo_cache_id_created', 'true');
      sessionStorage.removeItem('cachengueoo_flow_intent');
      localStorage.removeItem('cachengueoo_flow_intent');
      setRegisteredUser(userToUse);
      onAuthSuccess(userToUse);

      setCurrentView('register_success');
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
        onClose();
        return;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-x-hidden min-w-0">
      <div className="bg-[#121217] border border-zinc-800 rounded-3xl w-full max-w-lg p-3.5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto overflow-x-hidden shadow-2xl relative min-w-0 box-border">
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
        {/* VIEW 2: PROVIDER SELECTION (GMAIL O CORREO ELECTRÓNICO)     */}
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
              Podés registrarte rápidamente usando tu cuenta de Google o con tu correo electrónico y contraseña:
            </p>

            <div className="space-y-3 pt-1">
              {/* Opción 1: Crear con Gmail / Google */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                className="w-full p-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/50 flex items-center justify-between cursor-pointer transition-all group shadow-sm text-left disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-zinc-700 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                      Continuar con Gmail / Google
                    </h4>
                    <span className="text-[11px] text-zinc-400 block">
                      Ingreso instantáneo con tu cuenta de Google
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </button>

              {/* Opción 2: Crear con Correo electrónico */}
              <button
                type="button"
                onClick={() => handleSelectProvider('email')}
                className="w-full p-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/50 flex items-center justify-between cursor-pointer transition-all group shadow-sm text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Mail className="w-5 h-5 text-[#F39200]" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                      Crear con correo electrónico
                    </h4>
                    <span className="text-[11px] text-zinc-400 block">
                      Registrate con tu mail y una contraseña segura
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
                className="text-xs text-zinc-400 hover:text-white underline cursor-pointer"
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
          <form onSubmit={handleProceedToStep2} className="space-y-4 pt-1 w-full min-w-0 overflow-x-hidden box-border">
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

            <div className="space-y-3.5 text-xs min-w-0 w-full">
              {/* Nombre completo */}
              <div className="min-w-0 w-full">
                <label className="text-zinc-300 block mb-1 font-bold">
                  <span>Nombre completo <span className="text-red-400">*</span></span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="Ej: Sofía Martínez"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    className="w-full min-w-0 max-w-full h-10 pl-9 pr-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-none focus:border-[#F39200]"
                  />
                </div>
              </div>

              {/* Apodo y Fecha de Nacimiento en Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0 w-full">
                {/* Apodo */}
                <div className="min-w-0">
                  <label className="text-zinc-300 block mb-1 font-bold">
                    Apodo <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Sofi"
                    value={regNickname}
                    onChange={(e) => setRegNickname(e.target.value)}
                    className="w-full min-w-0 max-w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-none focus:border-[#F39200]"
                  />
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    Es el nombre con el que aparecerás en Match.
                  </span>
                </div>

                {/* Fecha de Nacimiento */}
                <div className="min-w-0">
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
                      className="w-full min-w-0 max-w-full h-10 pl-9 pr-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-none focus:border-[#F39200]"
                    />
                  </div>
                </div>
              </div>

              {/* Instagram & Mi Género */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0 w-full">
                {/* Instagram */}
                <div className="min-w-0">
                  <label className="text-zinc-300 block mb-1 font-bold flex items-center gap-1">
                    <Instagram className="w-3.5 h-3.5 text-pink-400" />
                    <span>Instagram</span>
                  </label>
                  <input
                    type="text"
                    placeholder="@usuario"
                    value={regInstagram}
                    onChange={(e) => setRegInstagram(e.target.value)}
                    className="w-full min-w-0 max-w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-none focus:border-[#F39200]"
                  />
                </div>

                {/* Mi Género */}
                <div className="min-w-0">
                  <label className="text-zinc-300 block mb-1 font-bold">
                    Mi género <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={regGender}
                    onChange={(e) => setRegGender(e.target.value as UserGender)}
                    className="w-full min-w-0 max-w-full h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-none focus:border-[#F39200]"
                  >
                    <option value="hombre">Hombre</option>
                    <option value="mujer">Mujer</option>
                  </select>
                </div>
              </div>

              {/* Mail */}
              <div className="min-w-0 w-full">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-zinc-300 font-bold">
                    Mail <span className="text-red-400">*</span>
                  </label>
                  {authProvider === 'gmail' && (
                    <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Vinculado con Google
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="tu.correo@gmail.com"
                    value={regEmail}
                    onChange={(e) => {
                      setRegEmail(e.target.value);
                      if (existingAccountFound) setExistingAccountFound(null);
                    }}
                    className="w-full min-w-0 max-w-full h-10 pl-9 pr-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-none focus:border-[#F39200]"
                  />
                </div>
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  {authProvider === 'gmail'
                    ? 'Tu correo se cargó automáticamente desde Google. Podés modificarlo manualmente si necesitás.'
                    : 'Ingresá tu correo electrónico principal.'}
                </span>
              </div>

              {/* Contraseña & Repetir Contraseña (Omitido para Google) */}
              {authProvider === 'gmail' ? (
                <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-emerald-500/30 flex items-center justify-between min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">Acceso verificado con Google</p>
                      <p className="text-[11px] text-zinc-400 truncate">Tu cuenta está protegida con tu sesión de Google</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 shrink-0">
                    Verificado
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0 w-full">
                  {/* Contraseña */}
                  <div className="min-w-0">
                    <label className="text-zinc-300 block mb-1 font-bold">
                      Contraseña <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder=""
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="w-full min-w-0 max-w-full h-10 pl-9 pr-9 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-none focus:border-[#F39200]"
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
                  <div className="min-w-0">
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
                        placeholder=""
                        value={regRepeatPassword}
                        onChange={(e) => setRegRepeatPassword(e.target.value)}
                        className={`w-full min-w-0 max-w-full h-10 pl-9 pr-9 rounded-xl bg-zinc-900 border text-white font-medium focus:outline-none ${
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
              )}

              {/* AVISO DE CUENTA EXISTENTE DETECTADA (EVITAR DUPLICADOS) */}
              {existingAccountFound && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-xs space-y-3 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-white text-sm">
                        ¡Este correo ya está registrado en Cachengueoo!
                      </h4>
                      <p className="text-zinc-300 text-xs mt-1 leading-relaxed">
                        Encontramos la cuenta de <strong className="text-white">{existingAccountFound.nickname || existingAccountFound.fullName}</strong> ({existingAccountFound.email}). No hace falta crear otra cuenta, podés ingresar directamente a tu perfil existente.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-amber-500/20 space-y-2.5">
                    {authProvider === 'gmail' ? (
                      <button
                        type="button"
                        onClick={() => {
                          onAuthSuccess(existingAccountFound);
                          onClose();
                        }}
                        className="w-full h-11 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-[#F39200]/25"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Ingresar directamente a mi perfil existente</span>
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-[11px] text-zinc-400">
                          Ingresá tu contraseña para acceder a tu perfil:
                        </p>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                          <input
                            type="password"
                            placeholder="Contraseña de tu cuenta"
                            value={existingPasswordInput}
                            onChange={(e) => setExistingPasswordInput(e.target.value)}
                            className="w-full min-w-0 max-w-full h-10 pl-9 pr-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-medium focus:outline-none focus:border-[#F39200]"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={handleLoginExistingAccount}
                            className="flex-1 h-10 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-[#F39200]/25 disabled:opacity-50"
                          >
                            <LogIn className="w-4 h-4" />
                            <span>{isSubmitting ? 'Ingresando...' : 'Ingresar a mi perfil'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setLoginEmail(existingAccountFound.email);
                              setCurrentView('login');
                            }}
                            className="px-3 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold cursor-pointer"
                          >
                            Ir al Login
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Botón Siguiente Paso */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isCheckingEmail}
                className="w-full h-11 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-[#F39200]/25 disabled:opacity-60"
              >
                <span>{isCheckingEmail ? 'Verificando cuenta...' : 'Siguiente: Gustos & Match'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* ========================================================== */}
        {/* WIZARD STEP 2: MATCH & GUSTOS (SIGNO, MÚSICA, TRAGO)      */}
        {/* ========================================================== */}
        {currentView === 'register_step_2' && (
          <form onSubmit={handleProceedToStep3} className="space-y-4 pt-1 w-full min-w-0 overflow-x-hidden box-border">
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

            <div className="space-y-4 text-xs min-w-0 w-full">
              {/* 1. Ver en Match (todos, hombres, mujeres) */}
              <div className="min-w-0 w-full">
                <label className="text-zinc-300 block mb-1.5 font-bold flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#F39200]" />
                  <span>Ver en Match <span className="text-red-400">*</span></span>
                </label>
                <div className="grid grid-cols-3 gap-2 w-full min-w-0">
                  {[
                    { id: 'todos', label: 'Todos' },
                    { id: 'hombres', label: 'Hombres' },
                    { id: 'mujeres', label: 'Mujeres' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setRegPreference(opt.id as PreferenceGender)}
                      className={`h-9 rounded-xl font-bold cursor-pointer transition-all min-w-0 truncate ${
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
              <div className="min-w-0 w-full">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-zinc-300 font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#F39200]" />
                    <span>Signo <span className="text-red-400">*</span></span>
                  </label>
                  <span className="text-[10px] text-zinc-400 font-medium">
                    Seleccionado: <strong className="text-amber-400">{regZodiacSign || 'Ninguno'}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 w-full min-w-0">
                  {ZODIAC_SIGNS.map((s) => {
                    const isSelected = regZodiacSign === s.name;
                    return (
                      <button
                        key={s.name}
                        type="button"
                        onClick={() => setRegZodiacSign(s.name)}
                        className={`p-1.5 sm:p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 min-w-0 w-full overflow-hidden ${
                          isSelected
                            ? 'bg-gradient-to-b from-[#F39200]/25 to-amber-500/10 border-[#F39200] text-amber-300 font-bold ring-1 ring-[#F39200]/50'
                            : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                        }`}
                      >
                        <span className="text-sm">{s.symbol}</span>
                        <span className="text-[10px] sm:text-[10.5px] leading-tight truncate w-full block text-center">{s.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. ¿QUÉ MÚSICA TE GUSTA? */}
              <div className="min-w-0 w-full">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-zinc-300 font-bold flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5 text-[#F39200]" />
                    <span>¿Qué música te gusta? <span className="text-red-400">*</span></span>
                  </label>
                  <span className="text-[10px] text-zinc-400">
                    {regMusicPreferences.length} seleccionados
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 w-full min-w-0">
                  {MUSIC_GENRES.map((genre) => {
                    const isSelected = regMusicPreferences.includes(genre);
                    return (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => toggleMusicGenre(genre)}
                        className={`px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1 min-w-0 max-w-full truncate ${
                          isSelected
                            ? 'bg-[#F39200] text-black shadow-sm'
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3] shrink-0" />}
                        <span className="truncate">{genre}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. ¿QUÉ TOMÁS? (SELECCIÓN DE 2 OPCIONES) */}
              <div className="min-w-0 w-full">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-zinc-300 font-bold flex items-center gap-1.5">
                    <GlassWater className="w-3.5 h-3.5 text-[#F39200]" />
                    <span>¿Qué tomás? (Elegí hasta 2) <span className="text-red-400">*</span></span>
                  </label>
                  <span className="text-[10px] text-amber-400 font-bold">
                    {regDrinks.length}/2 opciones elegidas: {regDrinks.join(' y ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full min-w-0">
                  {DRINK_OPTIONS.map((drink) => {
                    const isSelected = regDrinks.includes(drink);
                    return (
                      <button
                        key={drink}
                        type="button"
                        onClick={() => toggleDrink(drink)}
                        className={`h-9 px-2 sm:px-2.5 rounded-xl text-[11px] sm:text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 min-w-0 truncate ${
                          isSelected
                            ? 'bg-amber-400 text-black shadow-md font-extrabold'
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <span className="truncate">{drink}</span>
                        {isSelected && <Check className="w-3 h-3 stroke-[3] shrink-0" />}
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
          <form onSubmit={handleCreateCacheId} className="space-y-4 pt-1 w-full min-w-0 overflow-x-hidden box-border">
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
                    Tu foto
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

            <div className="space-y-4 text-xs min-w-0 w-full">
              {/* Fotos (hasta 3 fotos) */}
              <div className="min-w-0 w-full">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-zinc-300 font-bold flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-[#F39200]" />
                    <span>Fotos de tu perfil (foto 1 obligatoria) <span className="text-red-400">*</span></span>
                  </label>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {regPhotos.length}/3 fotos
                  </span>
                </div>

                {/* Slots de fotos */}
                <div className="grid grid-cols-3 gap-2 sm:gap-2.5 w-full min-w-0">
                  {[0, 1, 2].map((idx) => {
                    const photoUrl = regPhotos[idx];
                    const isRequired = idx === 0;
                    return (
                      <div
                        key={idx}
                        className={`relative aspect-[3/4] rounded-2xl overflow-hidden border-2 flex flex-col items-center justify-center transition-all min-w-0 w-full ${
                          photoUrl
                            ? 'border-[#F39200]/80 bg-zinc-950 shadow-md'
                            : isRequired
                            ? 'border-dashed border-[#F39200]/60 bg-[#F39200]/5 hover:bg-[#F39200]/10'
                            : 'border-dashed border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/40'
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
                              title="Eliminar foto"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <label className="w-full h-full flex flex-col items-center justify-center gap-1.5 cursor-pointer p-2 text-center transition-colors">
                            <Upload className={`w-5 h-5 ${isRequired ? 'text-[#F39200]' : 'text-zinc-500'}`} />
                            <div className="leading-tight">
                              <span className={`text-[10px] font-bold block ${isRequired ? 'text-amber-400' : 'text-zinc-400'}`}>
                                Foto {idx + 1}
                              </span>
                              <span className={`text-[8.5px] block ${isRequired ? 'text-amber-500/90 font-extrabold uppercase' : 'text-zinc-600'}`}>
                                {isRequired ? 'Obligatoria' : 'Opcional'}
                              </span>
                            </div>
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
                  <label className="w-full h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-[#F39200] text-white font-bold text-[11px] flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm">
                    <Camera className="w-4 h-4 text-[#F39200]" />
                    <span>Subir foto desde tu dispositivo (Cámara / Galería)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-zinc-300 text-[11px] leading-relaxed flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-[#F39200] shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-white">Foto real obligatoria:</strong> Para activar tu Cache ID y el modo Match, debés subir al menos 1 foto tuya. Podés agregar hasta 3 fotos para mostrar tu mejor estilo en la noche.
                  </p>
                </div>
              </div>

              {/* Biografía */}
              <div className="min-w-0 w-full">
                <label className="text-zinc-300 block mb-1 font-bold">
                  Biografía <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Contá algo sobre vos, cómo te gusta salir o con qué tema no te sentás..."
                  value={regBio}
                  onChange={(e) => setRegBio(e.target.value)}
                  className="w-full min-w-0 max-w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-none focus:border-[#F39200] leading-relaxed resize-none text-xs box-border"
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

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-zinc-800"></div>
                <span className="flex-shrink mx-3 text-[10px] text-zinc-500 uppercase font-bold tracking-wider">o</span>
                <div className="flex-grow border-t border-zinc-800"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                className="w-full h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-white font-bold text-xs flex items-center justify-center gap-2.5 cursor-pointer transition-all shadow-sm disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continuar con Google / Gmail</span>
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
                Para activar <strong className="text-white">Cachengueoo Match</strong> corroboramos que estés físicamente dentro del boliche mediante GPS.
              </p>
            </div>

            {/* Validación EXCLUSIVA mediante GPS */}
            <div className="pt-2">
              <button
                type="button"
                onClick={async () => {
                  if (onCheckGps) {
                    await onCheckGps();
                  }
                  onClose();
                }}
                className="w-full p-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-[#F39200]/60 hover:border-[#F39200] cursor-pointer transition-all flex items-center justify-between group shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F39200]/15 border border-[#F39200]/30 flex items-center justify-center text-[#F39200] shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-bold text-white group-hover:text-amber-300">
                      Validar ubicación por GPS
                    </h4>
                    <span className="text-[10px] text-zinc-400">Comprobá tu presencia con un toque</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
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
                ¡CACHE ID CREADO CON ÉXITO!
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white font-display uppercase tracking-tight">
                ¡BIENVENIDO, {registeredUser?.nickname || 'AMIGO'}!
              </h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                Tu perfil de Cache ID ya está registrado. Podés ver o editar tu perfil cuando quieras, o activar Match si estás en la fiesta.
              </p>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => {
                  if (onProceedToMatch) onProceedToMatch();
                  onClose();
                }}
                className="w-full h-12 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#F39200]/25 transition-all"
              >
                <Flame className="w-4 h-4 fill-black" />
                <span>Entrar a Cachengueoo Match (GPS)</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold text-xs flex items-center justify-center cursor-pointer transition-all"
              >
                Ver mi perfil
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
