import React, { useState, useEffect, useRef } from 'react';
import { X, QrCode, CheckCircle2, AlertCircle, Camera, KeyRound } from 'lucide-react';
import { presenceService } from '../../services/presenceService';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const activeNightToken = presenceService.getActiveQrToken();

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setTokenInput('');
      // Intentar iniciar cámara si está disponible
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraActive(true);
      } catch (e) {
        console.warn('Camera access denied or unavailable', e);
        setCameraActive(false);
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleValidate = (codeToTest: string) => {
    const res = presenceService.validateQrCode(codeToTest);
    if (res.success) {
      stopCamera();
      onSuccess(res.message);
      onClose();
    } else {
      setErrorMessage(res.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#121217] border border-zinc-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#F39200]/10 border border-[#F39200]/30 flex items-center justify-center text-[#F39200]">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-display">Escanear QR Cachengueoo</h2>
              <p className="text-[11px] text-zinc-400">Validación de ingreso a la noche</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scanner Viewport */}
        <div className="p-5 space-y-4">
          <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-black border border-zinc-800 flex items-center justify-center group">
            {cameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-zinc-600 gap-2 p-4 text-center">
                <Camera className="w-10 h-10 stroke-[1.5] text-zinc-500" />
                <span className="text-xs text-zinc-400">
                  Cámara no disponible en este dispositivo o permisos no otorgados
                </span>
                <span className="text-[11px] text-zinc-500">
                  Podés validar ingresando el código o con 1 clic abajo
                </span>
              </div>
            )}

            {/* Glowing target reticle */}
            <div className="absolute inset-8 border-2 border-dashed border-[#F39200]/60 rounded-xl pointer-events-none flex items-center justify-center">
              <div className="w-full h-0.5 bg-[#F39200] opacity-75 shadow-[0_0_10px_#F39200] animate-bounce"></div>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Direct One-Click Night Door QR for quick validation */}
          <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[#F39200]" />
                Código de Puerta Oficial:
              </span>
              <span className="font-mono text-[10px] text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded">
                {activeNightToken}
              </span>
            </div>
            <button
              onClick={() => handleValidate(activeNightToken)}
              className="w-full h-10 rounded-lg bg-[#F39200] hover:bg-[#E08400] text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-[#F39200]/10"
            >
              <CheckCircle2 className="w-4 h-4" />
              Validar con QR de Puerta de Hoy
            </button>
          </div>

          {/* Fallback Manual Code Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (tokenInput.trim()) {
                handleValidate(tokenInput.trim());
              }
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder="Ingresar código QR manual..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="flex-1 h-10 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-[#F39200]"
            />
            <button
              type="submit"
              className="px-4 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs cursor-pointer transition-colors"
            >
              Validar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
