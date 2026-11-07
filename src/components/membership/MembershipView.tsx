import React, { useState } from 'react';
import { Crown, Check, Sparkles, Clock, AlertCircle } from 'lucide-react';
import { MembershipPlan, UserProfile } from '../../types';
import { membershipService } from '../../services/membershipService';

interface MembershipViewProps {
  currentUser: UserProfile | null;
}

export const MembershipView: React.FC<MembershipViewProps> = () => {
  const [plans] = useState<MembershipPlan[]>(() => membershipService.getPlans());

  return (
    <div className="max-w-xl mx-auto px-4 py-4 space-y-6">
      {/* Club Cachengueoo Banner */}
      <div className="bg-[#121217] border border-amber-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#F39200]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Crown className="w-5 h-5 text-[#F39200]" />
            <span className="text-[10px] uppercase font-bold text-[#F39200] tracking-widest">
              PROGRAMA DE SOCIOS
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-[9px] uppercase tracking-wider animate-pulse">
            Muy pronto
          </span>
        </div>

        <h2 className="text-2xl font-black text-white font-display uppercase tracking-tight">
          CACHENGUEOO <span className="text-[#F39200]">CLUB</span>
        </h2>

        <p className="text-xs text-zinc-300 mt-1 max-w-sm leading-relaxed">
          Acceso preferencial, entradas liberadas todos los fines de semana, descorches en barra VIP y
          experiencias reservadas para nuestra comunidad más fiel de Mendoza.
        </p>

        {/* Noticia de Lanzamiento Próximo */}
        <div className="mt-5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <Clock className="w-5 h-5 text-[#F39200] shrink-0 mt-0.5" />
          <div className="text-xs text-zinc-300 leading-relaxed">
            <span className="font-black text-amber-400 block mb-0.5 uppercase tracking-wider text-[11px]">
              ¡MUY PRONTO!
            </span>
            Estamos preparando la membresía oficial de Cachengueoo Club con los mejores beneficios de noche en Mendoza. Todavía no está disponible, ¡muy pronto vas a poder asociarte desde acá!
          </div>
        </div>
      </div>

      {/* Plans List Preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
            Adelanto de Planes
          </h3>
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
            Próximamente
          </span>
        </div>

        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`p-5 rounded-3xl bg-[#121217] border transition-all relative overflow-hidden ${
              plan.isPopular
                ? 'border-[#F39200]/70 shadow-lg shadow-[#F39200]/10'
                : 'border-zinc-800'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  {plan.isPopular && (
                    <span className="px-2 py-0.5 rounded-full bg-[#F39200] text-black text-[9px] font-black uppercase tracking-wider">
                      MÁS ELEGIDO
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[9px] font-bold uppercase tracking-wider">
                    Muy pronto
                  </span>
                </div>
                <h4 className="text-lg font-black text-white font-display">{plan.name}</h4>
                <p className="text-xs text-zinc-400">{plan.description}</p>
              </div>

              <div className="text-right">
                <span className="text-xl font-black text-white font-mono block">
                  ${plan.monthlyFee.toLocaleString('es-AR')}
                </span>
                <span className="text-[10px] text-zinc-500 uppercase">/ MES</span>
              </div>
            </div>

            {/* Perks list */}
            <div className="my-4 space-y-2 border-t border-zinc-800/80 pt-3">
              {plan.perks.map((perk, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                  <Check className="w-4 h-4 text-[#F39200] shrink-0 mt-0.5" />
                  <span>{perk}</span>
                </div>
              ))}
            </div>

            <div className="w-full h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-2 bg-zinc-900/90 border border-zinc-800 text-zinc-400 select-none cursor-default">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Muy pronto disponible</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
