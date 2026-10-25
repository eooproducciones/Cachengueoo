import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Flame,
  Check,
  Zap,
  ZapOff,
} from 'lucide-react';
import { NightStory, UserProfile } from '../../types';

interface NightCameraModalProps {
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onPublishStory: (story: NightStory) => void;
}

// Mapear cache en memoria del stream de medios para no re-solicitar permisos ni disparar avisos
let persistentStream: MediaStream | null = null;
let persistentFacingMode: 'user' | 'environment' = 'user';
let persistentAudioTrack: MediaStreamTrack | null = null;

export const NightCameraModal: React.FC<NightCameraModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onPublishStory,
}) => {
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Flash / Linterna
  const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');

  // Estados de grabación y progreso exacto de 8 segundos
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0); // 0 a 1 (0 a 100%)

  // Feedback visual shutter flash al tomar foto
  const [isFlashing, setIsFlashing] = useState(false);

  // Popup mini ventana "Publicado" con efecto zoom
  const [publishedPopup, setPublishedPopup] = useState<{
    visible: boolean;
    mediaUrl: string;
    mediaType: 'image' | 'video';
  }>({
    visible: false,
    mediaUrl: '',
    mediaType: 'image',
  });

  // Referencias de cámara y media
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Referencias para distinguir Tap (Foto) vs Hold (Video) y timer de 8s
  const holdTimerRef = useRef<number | null>(null);
  const isPressedRef = useRef(false);
  const isHoldRef = useRef(false);
  const recordingStartTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Limpiar completamente tracks de cámara y micrófono cuando el modal se cierra
  useEffect(() => {
    if (!isOpen) {
      if (persistentStream) {
        persistentStream.getTracks().forEach((track) => track.stop());
        persistentStream = null;
      }
      if (persistentAudioTrack) {
        persistentAudioTrack.stop();
        persistentAudioTrack = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      setStreamActive(false);
    }
  }, [isOpen]);

  // Iniciar cámara web real cuando se abre el modal
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isMounted = true;
    setCameraError(null);

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Navegador no soporta acceso directo a cámara WebRTC');
        }

        // Si ya tenemos un persistentStream válido para el mismo facingMode, reutilizarlo sin pedir permiso de nuevo
        if (
          persistentStream &&
          persistentStream.active &&
          persistentFacingMode === facingMode
        ) {
          const videoTrack = persistentStream.getVideoTracks()[0];
          if (videoTrack && videoTrack.readyState === 'live') {
            mediaStreamRef.current = persistentStream;
            if (videoRef.current) {
              videoRef.current.srcObject = persistentStream;
              videoRef.current.play().catch(() => {});
            }
            setStreamActive(true);
            return;
          }
        }

        // Si el facingMode cambió o se reinicia, detener ÚNICAMENTE las pistas de video previas.
        // NUNCA detener persistentAudioTrack para evitar que el navegador vuelva a solicitar
        // micrófono o muestre la notificación recurrente "acceso a cámara y micrófono permitidos".
        if (persistentStream) {
          persistentStream.getVideoTracks().forEach((track) => track.stop());
        }
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getVideoTracks().forEach((track) => track.stop());
        }

        let stream: MediaStream | null = null;

        // Si ya contamos con un track de audio activo, solicitar ÚNICAMENTE video (audio: false)
        if (persistentAudioTrack && persistentAudioTrack.readyState === 'live') {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: { ideal: facingMode },
              },
              audio: false,
            });
            stream.addTrack(persistentAudioTrack);
          } catch {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
            if (persistentAudioTrack && persistentAudioTrack.readyState === 'live') {
              stream.addTrack(persistentAudioTrack);
            }
          }
        } else {
          // Apertura inicial: solicitar video y audio una sola vez
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: { ideal: facingMode },
              },
              audio: true,
            });
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
              persistentAudioTrack = audioTrack;
            }
          } catch {
            // Si el audio no está disponible o fue cancelado, solicitar únicamente video
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                video: {
                  facingMode: { ideal: facingMode },
                },
                audio: false,
              });
            } catch {
              stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false,
              });
            }
          }
        }

        if (!isMounted) {
          stream?.getVideoTracks().forEach((t) => t.stop());
          return;
        }

        persistentStream = stream;
        persistentFacingMode = facingMode;
        mediaStreamRef.current = stream;

        if (videoRef.current && stream) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch (playErr) {
            console.warn('Esperando interacción para reproducir video:', playErr);
          }
        }
        setStreamActive(true);
      } catch (err: unknown) {
        console.warn('Acceso a cámara WebRTC:', err);
        setStreamActive(false);
        setCameraError(err instanceof Error ? err.message : 'Error al conectar cámara');
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      // Detener loops de animación y timers
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
    };
  }, [isOpen, facingMode]);

  // Asegurar reproducción fluida si el video se monta o reanuda
  useEffect(() => {
    if (videoRef.current && mediaStreamRef.current) {
      videoRef.current.srcObject = mediaStreamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [streamActive, isOpen]);

  // Manejar alternancia de flash / linterna
  const toggleFlash = async () => {
    const nextMode = flashMode === 'off' ? 'on' : 'off';
    setFlashMode(nextMode);

    if (mediaStreamRef.current) {
      const videoTrack = mediaStreamRef.current.getVideoTracks()[0];
      if (videoTrack && typeof videoTrack.applyConstraints === 'function') {
        try {
          await videoTrack.applyConstraints({
            advanced: [{ torch: nextMode === 'on' } as unknown as MediaTrackConstraintSet],
          });
        } catch (e) {
          console.warn('Linterna no soportada en este dispositivo:', e);
        }
      }
    }
  };

  if (!isOpen) return null;

  // Publicar la historia automáticamente sin salir de instantáneas
  const publishStoryImmediately = (mediaUrl: string, mediaType: 'image' | 'video') => {
    const now = new Date();
    const expires = new Date(now.getTime() + 60 * 60 * 1000); // 1 hora de duración

    const newStory: NightStory = {
      id: `story_${currentUser.id}_${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.nickname || currentUser.fullName,
      userAvatar: currentUser.avatarUrl,
      mediaUrl,
      mediaType,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      isLiveInstant: true,
      hearts: 0,
    };

    onPublishStory(newStory);

    setIsRecording(false);
    setRecordingProgress(0);

    // Mostrar ventana emergente "Publicado" con animación zoom
    setPublishedPopup({
      visible: true,
      mediaUrl,
      mediaType,
    });

    setTimeout(() => {
      setPublishedPopup((prev) => ({ ...prev, visible: false }));
    }, 1600);
  };

  // Capturar frame de foto desde el video feed
  const capturePhotoFrame = (): string => {
    const video = videoRef.current;
    let photoUrl = '';

    if (video && video.videoWidth > 0 && video.videoHeight > 0) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        photoUrl = canvas.toDataURL('image/jpeg', 0.92);
      }
    }

    if (!photoUrl) {
      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 1280;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const grad = ctx.createLinearGradient(0, 0, 0, 1280);
        grad.addColorStop(0, '#1a0b2e');
        grad.addColorStop(0.5, '#09090b');
        grad.addColorStop(1, '#000000');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 720, 1280);

        ctx.fillStyle = 'rgba(243, 146, 0, 0.4)';
        ctx.beginPath();
        ctx.arc(360, 480, 240, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(236, 72, 153, 0.35)';
        ctx.beginPath();
        ctx.arc(460, 720, 220, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ CACHENGUEOO EN VIVO', 360, 560);

        const nowStr = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        ctx.fillText(`Mendoza · ${nowStr} hs`, 360, 620);

        ctx.fillStyle = '#F39200';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('Instantánea en directo de la noche', 360, 670);

        photoUrl = canvas.toDataURL('image/jpeg', 0.88);
      }
    }

    return photoUrl;
  };

  // Función al tocar 1 vez: Dispara foto con shutter y publica automáticamente
  const takePhotoAndPublish = () => {
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 160);

    const photoUrl = capturePhotoFrame();
    if (photoUrl) {
      publishStoryImmediately(photoUrl, 'image');
    }
  };

  // Obtener codec de video soportado
  const getSupportedMimeType = () => {
    if (typeof MediaRecorder === 'undefined') return undefined;
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ];
    for (const t of candidates) {
      if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return undefined;
  };

  // Iniciar filmación de video (sincronizada exactamente a 8000ms con vuelta de 360°)
  const startVideoRecording = () => {
    setIsRecording(true);
    setRecordingProgress(0);
    recordingStartTimeRef.current = performance.now();
    recordedChunksRef.current = [];

    // Bucle suave a 60fps con performance.now para una animación 100% fluida y continua
    const tick = (now: number) => {
      if (!recordingStartTimeRef.current) return;
      const elapsed = now - recordingStartTimeRef.current;
      const progress = Math.min(1, elapsed / 8000);
      setRecordingProgress(progress);

      if (elapsed >= 8000) {
        // Alcanzó los 8 segundos exactos: vuelta completa (100%), termina y publica
        isPressedRef.current = false;
        isHoldRef.current = false;
        stopVideoRecordingAndPublish();
      } else {
        animFrameRef.current = requestAnimationFrame(tick);
      }
    };
    animFrameRef.current = requestAnimationFrame(tick);

    // Grabar con MediaRecorder si está disponible
    if (mediaStreamRef.current && typeof MediaRecorder !== 'undefined') {
      try {
        const mimeType = getSupportedMimeType();
        const recorder = new MediaRecorder(
          mediaStreamRef.current,
          mimeType ? { mimeType } : undefined
        );

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          const mime = mimeType || 'video/webm';
          const blob = new Blob(recordedChunksRef.current, { type: mime });
          if (blob.size > 0) {
            const videoUrl = URL.createObjectURL(blob);
            publishStoryImmediately(videoUrl, 'video');
          } else {
            const fallbackPhoto = capturePhotoFrame();
            publishStoryImmediately(fallbackPhoto, 'image');
          }
        };

        mediaRecorderRef.current = recorder;
        recorder.start(100);
        return;
      } catch (err) {
        console.warn('Error al iniciar MediaRecorder:', err);
      }
    }
  };

  // Detener filmación y publicar
  const stopVideoRecordingAndPublish = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    recordingStartTimeRef.current = null;
    setIsRecording(false);
    setRecordingProgress(0);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
        return;
      } catch {}
    }

    const fallbackPhoto = capturePhotoFrame();
    publishStoryImmediately(fallbackPhoto, 'image');
  };

  // BOTÓN CENTRAL:
  // Tap (1 toque) -> Saca foto
  // Hold (mantener apretado) -> Filma video (hasta 8 segundos exactos con progreso 360°)
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (publishedPopup.visible) return;

    isPressedRef.current = true;
    isHoldRef.current = false;

    // Detectar si mantiene presionado (220ms)
    holdTimerRef.current = window.setTimeout(() => {
      if (isPressedRef.current) {
        isHoldRef.current = true;
        startVideoRecording();
      }
    }, 220);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!isPressedRef.current || publishedPopup.visible) return;
    isPressedRef.current = false;

    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    if (isHoldRef.current) {
      isHoldRef.current = false;
      stopVideoRecordingAndPublish();
    } else {
      takePhotoAndPublish();
    }
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    if (!isPressedRef.current || publishedPopup.visible) return;
    isPressedRef.current = false;

    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    if (isHoldRef.current) {
      isHoldRef.current = false;
      stopVideoRecordingAndPublish();
    }
  };

  const handleNativeCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const type: 'image' | 'video' = file.type.startsWith('video') ? 'video' : 'image';
    publishStoryImmediately(url, type);
    e.target.value = '';
  };

  const toggleFacingMode = async () => {
    const nextMode: 'user' | 'environment' = facingMode === 'user' ? 'environment' : 'user';

    // 1. Intentar cambiar con applyConstraints si el track de video lo soporta (cambio instantáneo sin re-pedir stream)
    const currentVideoTrack = mediaStreamRef.current?.getVideoTracks()[0];
    if (currentVideoTrack && typeof currentVideoTrack.applyConstraints === 'function') {
      try {
        await currentVideoTrack.applyConstraints({
          facingMode: { ideal: nextMode },
        });
        const activeSettings = currentVideoTrack.getSettings ? currentVideoTrack.getSettings() : null;
        if (activeSettings && activeSettings.facingMode === nextMode) {
          persistentFacingMode = nextMode;
          setFacingMode(nextMode);
          return;
        }
      } catch {
        // Fallback al reemplazo suave de pista de video
      }
    }

    // 2. Reemplazo de pista de video: solicitar ÚNICAMENTE video (audio: false) para no disparar nunca
    // la notificación recurrente "acceso a cámara y micrófono permitidos" del navegador
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setFacingMode(nextMode);
        return;
      }

      const newVideoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: nextMode },
        },
        audio: false, // CRÍTICO: audio en false para no volver a evaluar permisos de micrófono
      });

      const newVideoTrack = newVideoStream.getVideoTracks()[0];
      if (newVideoTrack) {
        // Detener ÚNICAMENTE la pista de video vieja
        if (currentVideoTrack) {
          currentVideoTrack.stop();
        }

        const activeStream = mediaStreamRef.current || new MediaStream();
        activeStream.getVideoTracks().forEach((t) => {
          activeStream.removeTrack(t);
          if (t !== newVideoTrack) t.stop();
        });
        activeStream.addTrack(newVideoTrack);

        // Mantener la pista de audio ya concedida si existe y sigue viva
        if (persistentAudioTrack && persistentAudioTrack.readyState === 'live') {
          if (!activeStream.getAudioTracks().includes(persistentAudioTrack)) {
            activeStream.addTrack(persistentAudioTrack);
          }
        }

        mediaStreamRef.current = activeStream;
        persistentStream = activeStream;
        persistentFacingMode = nextMode;
        setFacingMode(nextMode);

        if (videoRef.current) {
          videoRef.current.srcObject = activeStream;
          videoRef.current.play().catch(() => {});
        }
        setStreamActive(true);
      }
    } catch (err) {
      console.warn('Fallback al alternar cámara:', err);
      // Fallback estándar en caso de error en el dispositivo
      setFacingMode(nextMode);
    }
  };

  // Cálculo del contorno circular SVG integrado en el mismo botón:
  // Dimensiones del botón: 84x84px con centro exacto en (42, 42).
  // El contorno exterior tiene radio r = 39.5 con strokeWidth = 5px (diámetro total = 84px).
  // Circunferencia = 2 * PI * 39.5 ≈ 248.1857px
  const BUTTON_RADIUS = 39.5;
  const CIRCUMFERENCE = 2 * Math.PI * BUTTON_RADIUS;
  const strokeDashoffset = CIRCUMFERENCE * (1 - recordingProgress);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black select-none overflow-hidden">
      
      {/* Contenedor principal que llena la pantalla en móvil o se centra con marco en desktop */}
      <div className="relative w-full max-w-md h-full sm:h-[94vh] sm:max-h-[920px] sm:rounded-[42px] overflow-hidden bg-black flex flex-col justify-between">
        
        {/* Flash blanco shutter */}
        {isFlashing && (
          <div className="absolute inset-0 bg-white z-50 pointer-events-none animate-out fade-out duration-200" />
        )}

        {/* Mini ventana / popup "Publicado" con zoom */}
        {publishedPopup.visible && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150 pointer-events-none">
            <div className="relative w-64 max-w-[85%] bg-zinc-900 border border-[#F39200]/60 rounded-3xl p-4 shadow-2xl flex flex-col items-center gap-3 animate-in zoom-in-75 duration-300">
              <div className="w-24 h-36 rounded-2xl overflow-hidden border-2 border-[#F39200] shadow-lg relative bg-black">
                {publishedPopup.mediaType === 'video' ? (
                  <video
                    src={publishedPopup.mediaUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover scale-105"
                  />
                ) : (
                  <img
                    src={publishedPopup.mediaUrl}
                    alt="Publicado"
                    className="w-full h-full object-cover scale-105"
                  />
                )}
                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              </div>

              <div className="text-center space-y-0.5">
                <div className="inline-flex items-center gap-1.5 text-[#F39200] font-black text-xs uppercase tracking-wider font-display">
                  <Flame className="w-3.5 h-3.5 fill-[#F39200]" />
                  <span>¡Publicado!</span>
                </div>
                <p className="text-[10px] text-zinc-400 font-medium">
                  Tu instantánea ya está en vivo en Cachengueoo
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* CABECERA SUPERIOR ESTILO INSTAGRAM:                             */}
        {/* [X]              Nueva instantánea            [Cuadrícula] [Avatar] */}
        {/* ============================================================== */}
        <header className="shrink-0 z-30 pt-3 sm:pt-4 px-4 pb-2.5 flex items-center justify-between text-white">
          {/* Botón cerrar X */}
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-white hover:text-zinc-300 active:scale-95 transition-transform cursor-pointer -ml-1"
            title="Cerrar"
          >
            <X className="w-7 h-7 stroke-[2.2]" />
          </button>

          {/* Título central */}
          <h1 className="text-[17px] font-semibold tracking-tight text-white font-sans text-center">
            Instantánea del Cache
          </h1>

          {/* Acciones derechas: Avatar */}
          <div className="w-10 h-10 flex items-center justify-end">
            <div className="relative">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.nickname || currentUser.fullName}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full object-cover border border-zinc-700 ring-1 ring-black"
              />
              <span className="absolute -top-1 -right-1 px-1 min-w-[15px] h-3.5 rounded-full bg-rose-600 text-white font-black text-[9px] flex items-center justify-center border border-black leading-none">
                3
              </span>
            </div>
          </div>
        </header>

        {/* ============================================================== */}
        {/* VISTA PREVIA DE LA CÁMARA:                                     */}
        {/* RECTÁNGULO CON ESQUINAS AMPLIAS Y MUY REDONDEADAS (rounded-[44px]) */}
        {/* Como en la captura de Instagram, la cámara se recorta dentro    */}
        {/* ============================================================== */}
        <main className="relative flex-1 mx-3 sm:mx-4 my-1 flex items-center justify-center min-h-0">
          
          <div className="relative w-full h-full max-h-[640px] rounded-[44px] overflow-hidden bg-zinc-950 border border-zinc-900/60 shadow-2xl flex items-center justify-center">
            
            {/* Input nativo de respaldo para celular */}
            <input
              ref={nativeCameraInputRef}
              type="file"
              accept="image/*,video/*"
              capture={facingMode === 'user' ? 'user' : 'environment'}
              onChange={handleNativeCameraCapture}
              className="hidden"
            />

            {/* Video Feed real respetando bordes redondeados y sin zoom artificial */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={() => {
                videoRef.current?.play().catch(() => {});
              }}
              className={`w-full h-full object-cover transition-opacity duration-200 rounded-[44px] ${
                streamActive ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
              } ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />

            {/* Fallback limpio cuando WebRTC no está disponible en el entorno */}
            {!streamActive && (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-4 bg-gradient-to-b from-zinc-900 via-black to-zinc-950 rounded-[44px]">
                <div className="w-16 h-16 rounded-3xl bg-[#F39200]/10 border border-[#F39200]/40 flex items-center justify-center text-[#F39200] animate-pulse shadow-lg">
                  <Flame className="w-8 h-8 fill-[#F39200]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white font-sans">
                    Cámara Instantánea
                  </h3>
                  <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                    {cameraError
                      ? 'Tocá abajo para capturar foto o video con la cámara de tu celular.'
                      : 'Conectando con la cámara...'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => nativeCameraInputRef.current?.click()}
                  className="px-4 py-2.5 rounded-xl bg-[#F39200] text-black font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-[#F39200]/20 active:scale-95 transition-all cursor-pointer"
                >
                  <span>Abrir Cámara de tu Celular</span>
                </button>

                <div className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#F39200]" />
                  <span>Captura en vivo · Se publica al instante</span>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* ============================================================== */}
        {/* CONTROLES INFERIORES:                                          */}
        {/* [Flash]            [DISPARADOR INSTAGRAM]              [Rotar] */}
        {/* ============================================================== */}
        <footer className="shrink-0 z-30 pt-3 pb-8 sm:pb-9 flex items-center justify-center">
          
          {/* Fila principal de controles: alineación simétrica y fondo negro limpio */}
          <div className="w-full flex items-center justify-between px-8 sm:px-10 max-w-sm">
            
            {/* 1. BOTÓN FLASH / LINTERNA (idéntico al de la captura de Instagram) */}
            <button
              type="button"
              onClick={toggleFlash}
              className="w-13 h-13 rounded-full bg-[#1c1c1e] text-white flex items-center justify-center active:scale-90 transition-transform cursor-pointer shadow-md"
              title={flashMode === 'on' ? 'Desactivar flash' : 'Activar flash'}
              aria-label="Flash"
            >
              {flashMode === 'on' ? (
                <Zap className="w-6 h-6 fill-amber-400 text-amber-400" />
              ) : (
                <ZapOff className="w-6 h-6 stroke-[2]" />
              )}
            </button>

            {/* 2. ÚNICO BOTÓN DE CAPTURA (ESTILO INSTAGRAM):
                - Un único botón circular blanco, centrado y con contorno exterior gris.
                - Permanece exactamente en la misma posición, mismo tamaño y sin moverse.
                - Al grabar, el contorno gris se va reemplazando progresivamente por un arco de color (360° en 8s).
                - Sin botones superpuestos ni desplazamientos. */}
            <button
              type="button"
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onPointerLeave={handlePointerCancel}
              onContextMenu={(e) => e.preventDefault()}
              className="relative w-[84px] h-[84px] rounded-full flex items-center justify-center cursor-pointer select-none touch-none focus:outline-none"
              aria-label="Capturar foto o mantener presionado para video (8 segundos)"
            >
              {/* SVG que dibuja exactamente el contorno exterior sobre el borde del botón */}
              <svg
                width="84"
                height="84"
                viewBox="0 0 84 84"
                className="absolute inset-0 pointer-events-none"
              >
                {/* 1. Contorno exterior gris inicial (base de 360°) */}
                <circle
                  cx="42"
                  cy="42"
                  r={BUTTON_RADIUS}
                  fill="none"
                  stroke="#52525c"
                  strokeWidth="5"
                />

                {/* 2. Arco de progreso que va reemplazando el contorno gris en sentido horario en 8s */}
                {isRecording && (
                  <circle
                    cx="42"
                    cy="42"
                    r={BUTTON_RADIUS}
                    fill="none"
                    stroke="#F39200"
                    strokeWidth="5"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform="rotate(-90 42 42)"
                  />
                )}
              </svg>

              {/* Centro circular blanco sólido puro (mismo tamaño y posición siempre) */}
              <div className="w-[66px] h-[66px] rounded-full bg-white shadow-sm pointer-events-none" />
            </button>

            {/* 3. BOTÓN ROTAR CÁMARA (ícono de dos flechas curvas de giro idéntico a Instagram) */}
            <button
              type="button"
              onClick={toggleFacingMode}
              className="w-13 h-13 rounded-full bg-[#1c1c1e] text-white flex items-center justify-center active:scale-90 transition-transform cursor-pointer shadow-md group"
              title="Cambiar cámara"
              aria-label="Cambiar cámara"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-6 h-6 stroke-current fill-none stroke-[2.2] transition-transform duration-300 group-hover:rotate-180"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* Flecha curva superior */}
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                {/* Flecha curva inferior */}
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M21 21v-5h-5" />
              </svg>
            </button>
          </div>
        </footer>

      </div>
    </div>
  );
};
