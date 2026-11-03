import React, { useState } from 'react';
import { X, Send, CheckCircle2, AlertCircle, Sparkles, MessageCircle, Instagram, HelpCircle } from 'lucide-react';
import { submitRPApplication, sanitizeWhatsApp } from '../../services/rpService';
import { UserProfile, RPApplication } from '../../types';

interface RPApplicationModalProps {
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onApplicationSubmitted: (app: RPApplication) => void;
}

export const RPApplicationModal: React.FC<RPApplicationModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onApplicationSubmitted,
}) => {
  const [fullName, setFullName] = useState(currentUser.fullName || '');
  const [whatsapp, setWhatsapp] = useState(currentUser.phone || '');
  const [instagram, setInstagram] = useState(currentUser.instagram?.replace(/^@/, '') || '');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Por favor ingresa tu nombre y apellido completo.');
      return;
    }

    const cleanPhone = sanitizeWhatsApp(whatsapp);
    if (!cleanPhone || cleanPhone.length < 8) {
      setErrorMessage('Ingresa un número de WhatsApp válido (ej: 2615651192 o +54 9 261...).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitRPApplication(
        currentUser.id,
        fullName.trim(),
        cleanPhone,
        instagram.trim(),
        notes.trim(),
        currentUser.email
      );

      if (res.success && res.application) {
        setIsSuccess(true);
        onApplicationSubmitted(res.application);
      } else {
        setErrorMessage(res.error || 'Ocurrió un error al enviar tu postulación.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#121217] border border-amber-500/30 rounded-3xl w-full max-w-lg p-6 sm:p-7 space-y-5 shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#F39200]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#F39200]/15 border border-[#F39200]/40 flex items-center justify-center text-[#F39200]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#F39200] tracking-wider block">
                POSTULACIÓN OFICIAL
              </span>
              <h3 className="text-base font-black text-white font-display uppercase tracking-tight">
                Quiero ser Relación Pública (RP)
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSuccess ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-white">¡Solicitud enviada con éxito!</h4>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                El equipo administrativo de Cachengueoo revisará tu solicitud. En cuanto sea aprobada, se activará tu pestaña <strong className="text-amber-400">"Perfil Pública"</strong> con tu enlace personalizado y tus links de Passline.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-extrabold text-xs cursor-pointer transition-all shadow-md"
            >
              Entendido
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-zinc-400 leading-relaxed">
              Sumate al equipo de promotores de Cachengueoo. Al ser RP obtendrás tu propia URL de afiliado, podrás cargar tus enlaces de Passline por cada fecha y recibir consultas directas a tu WhatsApp.
            </p>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/50 flex items-start gap-2.5 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-300">Nombre y Apellido *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej: Ignacio Vichi"
                className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-[#F39200]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                Número de WhatsApp *
              </label>
              <input
                type="tel"
                required
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="Ej: 2615651192 o +54 9 261..."
                className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-[#F39200]"
              />
              <span className="text-[10px] text-zinc-500 block">
                Acá te escribirán los clientes que quieran reservar mesa o festejar su cumple con tu enlace.
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                <Instagram className="w-3.5 h-3.5 text-pink-400" />
                Instagram (Opcional)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-bold">@</span>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="tu_usuario"
                  className="w-full h-11 pl-8 pr-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-[#F39200]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
                Información adicional o experiencia (Opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Contanos si ya vendiste entradas, de qué zona sos o cómo planeás promocionar..."
                className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-[#F39200] resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white text-xs font-bold cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-[#F39200]/20 disabled:opacity-50 transition-all"
              >
                {isSubmitting ? (
                  <span>Enviando...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar Solicitud</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
