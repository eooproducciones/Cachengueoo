import React, { useState, useEffect } from 'react';
import {
  Gift,
  ExternalLink,
  MessageCircle,
  Copy,
  Check,
  Percent,
  Dumbbell,
  Tag,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { ClubBenefit, UserProfile } from '../../types';
import { benefitService } from '../../services/benefitService';

interface BenefitsViewProps {
  currentUser: UserProfile | null;
}

export const BenefitsView: React.FC<BenefitsViewProps> = () => {
  const [benefits, setBenefits] = useState<ClubBenefit[]>(() => benefitService.getBenefits());
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Escuchar actualizaciones en tiempo real desde el panel de administración
  useEffect(() => {
    const handleUpdate = () => {
      setBenefits(benefitService.getBenefits());
    };
    window.addEventListener('cachengueoo_benefits_updated', handleUpdate);
    return () => {
      window.removeEventListener('cachengueoo_benefits_updated', handleUpdate);
    };
  }, []);

  const activeBenefits = benefits.filter((b) => b.active);

  const handleCopyCode = (code: string, id: string) => {
    try {
      navigator.clipboard.writeText(code);
      setCopiedCodeId(id);
      setTimeout(() => setCopiedCodeId(null), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-4 space-y-5">
      {/* Header Banner */}
      <div className="bg-[#121217] border border-zinc-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-2 mb-1.5">
          <Gift className="w-4 h-4 text-[#F39200]" />
          <span className="text-[10px] uppercase font-bold text-[#F39200] tracking-widest">
            ALIANZAS & BENEFICIOS EXCLUSIVOS
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white font-display uppercase tracking-tight">
          BENEFICIOS <span className="text-[#F39200]">CACHENGUEOO</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-1 max-w-md leading-relaxed">
          Convenios y descuentos exclusivos en las mejores marcas, gimnasios y locales de Mendoza por ser parte de nuestra comunidad.
        </p>
      </div>

      {/* Benefits List */}
      <div className="space-y-5">
        {activeBenefits.length === 0 ? (
          <div className="p-8 rounded-3xl bg-[#121217] border border-zinc-800 text-center space-y-3">
            <Gift className="w-10 h-10 text-zinc-600 mx-auto" />
            <h3 className="text-sm font-bold text-white">Próximamente más beneficios</h3>
            <p className="text-xs text-zinc-500 max-w-xs mx-auto">
              Estamos sumando nuevas alianzas y descuentos exclusivos para vos.
            </p>
          </div>
        ) : (
          activeBenefits.map((benefit) => {
            const isWhatsApp =
              benefit.actionType === 'whatsapp' ||
              benefit.actionUrl.includes('wa.me') ||
              benefit.actionUrl.includes('whatsapp');

            return (
              <div
                key={benefit.id}
                className="bg-[#121217] border border-zinc-800 hover:border-amber-500/50 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 group relative"
              >
                {/* Visual Cover Header with Super Prominent Highlighted Benefit Badge */}
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-zinc-950">
                  <img
                    src={
                      benefit.imageUrl ||
                      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80'
                    }
                    alt={benefit.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  {/* Cinematic gradient overlays for readable contrast */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#121217] via-black/40 to-black/30 pointer-events-none" />

                  {/* Top Category Badge */}
                  <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-white/15 text-[10px] font-bold text-amber-300 shadow-md">
                    <Dumbbell className="w-3.5 h-3.5 text-[#F39200]" />
                    <span>{benefit.category || benefit.tag || 'GIMNASIO & FITNESS'}</span>
                  </div>

                  {/* SUPER PROMINENT HIGHLIGHT BADGE (ej. 10% OFF) */}
                  <div className="absolute top-3.5 right-3.5 z-10 shadow-2xl">
                    <div className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-2xl bg-gradient-to-r from-amber-400 via-[#F39200] to-orange-500 text-black font-black text-sm sm:text-base font-display tracking-wider flex items-center justify-center shadow-xl shadow-[#F39200]/40 border-2 border-amber-300 ring-2 ring-black/40 transform group-hover:scale-105 transition-transform duration-300">
                      <span>{benefit.highlightBadge || '10% OFF'}</span>
                    </div>
                  </div>

                  {/* Title overlay on bottom of image */}
                  <div className="absolute bottom-3.5 left-4 right-4">
                    {benefit.partnerName && benefit.partnerName !== benefit.title && (
                      <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-[#F39200] block mb-0.5 drop-shadow">
                        {benefit.partnerName}
                      </span>
                    )}
                    <h3 className="text-xl sm:text-2xl font-black text-white font-display uppercase tracking-tight leading-tight drop-shadow-md">
                      {benefit.title}
                    </h3>
                  </div>
                </div>

                {/* Card Details */}
                <div className="p-5 space-y-4">
                  {/* Description Box */}
                  <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
                    <p className="text-xs sm:text-[13px] text-zinc-300 leading-relaxed font-normal">
                      {benefit.description}
                    </p>
                  </div>

                  {/* Promo Code Box (OPCIONAL: solo si fue configurado y no está vacío) */}
                  {Boolean(benefit.promoCode && benefit.promoCode.trim().length > 0) && (
                    <div className="p-3.5 rounded-2xl bg-zinc-950/90 border border-dashed border-[#F39200]/40 flex items-center justify-between gap-3 shadow-inner">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[#F39200]/15 border border-[#F39200]/30 flex items-center justify-center text-[#F39200] shrink-0">
                          <Tag className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
                            Código de Descuento
                          </span>
                          <span className="text-sm sm:text-base font-black font-mono text-amber-400 tracking-wider block truncate">
                            {benefit.promoCode}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyCode(benefit.promoCode!, benefit.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95 shadow-md ${
                          copiedCodeId === benefit.id
                            ? 'bg-emerald-500 text-black shadow-emerald-500/25'
                            : 'bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200'
                        }`}
                      >
                        {copiedCodeId === benefit.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-black stroke-[3]" />
                            <span>¡Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Botón de Acción ("Obtener beneficio") */}
                  <div>
                    <a
                      href={benefit.actionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-full h-12 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg active:scale-[0.99] ${
                        isWhatsApp
                          ? 'bg-[#25D366] hover:bg-[#20ba5a] text-black shadow-emerald-950/40 border border-[#25D366]/40'
                          : 'bg-[#F39200] hover:bg-[#E08400] text-black shadow-[#F39200]/25 border border-amber-300/40'
                      }`}
                    >
                      {isWhatsApp ? (
                        <MessageCircle className="w-4 h-4 fill-black text-black shrink-0" />
                      ) : (
                        <ExternalLink className="w-4 h-4 shrink-0" />
                      )}
                      <span>Obtener beneficio</span>
                    </a>
                  </div>

                  {/* Footer note */}
                  <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-500 border-t border-zinc-800/80">
                    <span className="flex items-center gap-1 text-zinc-400">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#F39200]" />
                      Beneficio verificado
                    </span>
                    <span className="text-zinc-500">
                      {benefit.condition || 'Exclusivo Comunidad Cachengueoo'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
