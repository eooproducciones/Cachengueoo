import React, { useState } from 'react';
import { Gift, Sparkles, Clock, Wine, Flame, Zap, CheckCircle2, QrCode } from 'lucide-react';
import { ClubBenefit, UserProfile } from '../../types';
import { benefitService } from '../../services/benefitService';

interface BenefitsViewProps {
  currentUser: UserProfile;
}

export const BenefitsView: React.FC<BenefitsViewProps> = ({ currentUser }) => {
  const [benefits] = useState<ClubBenefit[]>(() => benefitService.getBenefits());
  const [selectedTag, setSelectedTag] = useState<string>('TODOS');
  const [redeemingBenefit, setRedeemingBenefit] = useState<ClubBenefit | null>(null);

  const tags = ['TODOS', 'BARRA', 'VIP', 'MEMBRESÍA', 'CUMPLE'];

  const filtered = benefits.filter((b) => {
    if (selectedTag === 'TODOS') return true;
    return b.tag === selectedTag;
  });

  const getIcon = (name: string) => {
    switch (name) {
      case 'Wine':
        return Wine;
      case 'Flame':
        return Flame;
      case 'Zap':
        return Zap;
      default:
        return Sparkles;
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-4 space-y-5">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-amber-950/30 border border-zinc-800 rounded-3xl p-5 relative overflow-hidden">
        <div className="flex items-center gap-2 mb-1.5">
          <Gift className="w-4 h-4 text-[#F39200]" />
          <span className="text-[10px] uppercase font-bold text-[#F39200] tracking-widest">
            BENEFICIOS EXCLUSIVOS
          </span>
        </div>
        <h2 className="text-xl font-black text-white font-display uppercase tracking-tight">
          PROMOCIONES & BARRA <span className="text-[#F39200]">CACHENGUEOO</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-1 max-w-sm">
          Presentá el código en las barras del boliche o activá descuentos directos por estar presente.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedTag === tag
                ? 'bg-[#F39200] text-black shadow-sm'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Benefits List */}
      <div className="space-y-3.5">
        {filtered.map((benefit) => {
          const Icon = getIcon(benefit.iconName);

          return (
            <div
              key={benefit.id}
              className="p-4 sm:p-5 rounded-3xl bg-[#121217] border border-zinc-800 hover:border-zinc-700 transition-all shadow-md relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#F39200]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-[9px] font-bold text-zinc-300">
                        {benefit.tag}
                      </span>
                      {benefit.onlyMembers && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-[#F39200] text-[9px] font-bold">
                          SOLO SOCIOS CLUB
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-white font-display mt-0.5">
                      {benefit.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-medium text-[#F39200] bg-amber-950/30 px-2 py-1 rounded-lg border border-amber-800/30">
                  <Clock className="w-3 h-3" />
                  <span>{benefit.expiryTime}</span>
                </div>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed mb-3">{benefit.description}</p>

              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                <span className="text-[11px] text-zinc-500 truncate max-w-[65%]">
                  {benefit.condition}
                </span>

                <button
                  onClick={() => setRedeemingBenefit(benefit)}
                  className="px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-[#F39200] text-[#F39200] font-bold text-xs cursor-pointer transition-all active:scale-95"
                >
                  Canjear en Barra
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* REDEEM BENEFIT MODAL */}
      {redeemingBenefit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#121217] border border-zinc-800 rounded-3xl w-full max-w-sm p-6 text-center space-y-4">
            <span className="text-[10px] font-bold uppercase text-[#F39200] tracking-widest">
              CANJE DE BENEFICIO · BARRA
            </span>

            <h3 className="text-lg font-black text-white font-display uppercase tracking-tight">
              {redeemingBenefit.title}
            </h3>

            {/* QR Mock code to show bartender */}
            <div className="bg-white p-5 rounded-2xl mx-auto w-48 h-48 flex items-center justify-center shadow-xl">
              <div className="w-full h-full border-4 border-black p-2 flex flex-col items-center justify-center">
                <QrCode className="w-full h-full text-black" />
              </div>
            </div>

            <div className="space-y-1">
              <span className="font-mono text-xs text-[#F39200] font-bold bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                BEN-{redeemingBenefit.id.toUpperCase()}-2026
              </span>
              <p className="text-[11px] text-zinc-400 pt-1">
                Mostrá este código al barman de turno para aplicar la promoción.
              </p>
            </div>

            <button
              onClick={() => setRedeemingBenefit(null)}
              className="w-full h-11 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-bold text-xs cursor-pointer shadow-lg shadow-[#F39200]/20"
            >
              Listo, código canjeado
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
