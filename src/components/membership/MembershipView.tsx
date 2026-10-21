import React, { useState } from 'react';
import { Crown, Check, Zap, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import { MembershipPlan, UserMembership, UserProfile } from '../../types';
import { membershipService } from '../../services/membershipService';

interface MembershipViewProps {
  currentUser: UserProfile | null;
}

export const MembershipView: React.FC<MembershipViewProps> = ({ currentUser }) => {
  const userId = currentUser?.id || 'usr_cachenguero_01';
  const [plans] = useState<MembershipPlan[]>(() => membershipService.getPlans());
  const [currentMembership, setCurrentMembership] = useState<UserMembership>(() =>
    membershipService.getUserMembership(userId)
  );
  const [selectedPlanToSubscribe, setSelectedPlanToSubscribe] = useState<MembershipPlan | null>(
    null
  );

  const handleSubscribe = (plan: MembershipPlan) => {
    const updated = membershipService.subscribeToPlan(userId, plan);
    setCurrentMembership(updated);
    setSelectedPlanToSubscribe(null);
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-4 space-y-6">
      {/* Club Cachengueoo Banner */}
      <div className="bg-[#121217] border border-amber-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#F39200]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center gap-2 mb-2">
          <Crown className="w-5 h-5 text-[#F39200]" />
          <span className="text-[10px] uppercase font-bold text-[#F39200] tracking-widest">
            PROGRAMA DE SOCIOS
          </span>
        </div>

        <h2 className="text-2xl font-black text-white font-display uppercase tracking-tight">
          CLUB <span className="text-[#F39200]">CACHENGUEOO</span>
        </h2>

        <p className="text-xs text-zinc-300 mt-1 max-w-sm leading-relaxed">
          Acceso preferencial, entradas liberadas todos los fines de semana, descorches en barra VIP y
          experiencias reservadas para nuestra comunidad más fiel de Mendoza.
        </p>

        {/* Current Active Status Card */}
        {currentMembership.status === 'active' && (
          <div className="mt-5 p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Estado de tu Membresía:</span>
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
                ACTIVA
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white font-display">
                {currentMembership.planName}
              </span>
              <span className="text-xs font-mono text-[#F39200]">
                Renueva: {new Date(currentMembership.renewsAt).toLocaleDateString('es-AR')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Plans List */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider px-1">
          Elegí tu Plan Mensual
        </h3>

        {plans.map((plan) => {
          const isCurrent =
            currentMembership.status === 'active' && currentMembership.planId === plan.id;

          return (
            <div
              key={plan.id}
              className={`p-5 rounded-3xl bg-[#121217] border transition-all ${
                plan.isPopular
                  ? 'border-[#F39200]/70 shadow-lg shadow-[#F39200]/10'
                  : 'border-zinc-800'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  {plan.isPopular && (
                    <span className="px-2 py-0.5 rounded-full bg-[#F39200] text-black text-[9px] font-black uppercase tracking-wider inline-block mb-1.5">
                      MÁS ELEGIDO EN MENDOZA
                    </span>
                  )}
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

              <button
                onClick={() => setSelectedPlanToSubscribe(plan)}
                disabled={isCurrent}
                className={`w-full h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-zinc-800 text-zinc-500 cursor-default'
                    : plan.isPopular
                    ? 'bg-[#F39200] hover:bg-[#E08400] text-black shadow-md shadow-[#F39200]/20'
                    : 'bg-zinc-900 border border-zinc-700 hover:border-white text-white'
                }`}
              >
                {isCurrent ? 'Plan Actual' : 'Suscribirme a este Plan'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Subscription Modal */}
      {selectedPlanToSubscribe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#121217] border border-zinc-800 rounded-3xl w-full max-w-sm p-6 space-y-4">
            <h4 className="text-base font-bold text-white font-display">Confirmar Suscripción</h4>
            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Plan:</span>
                <span className="font-semibold text-white">{selectedPlanToSubscribe.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Cuota mensual:</span>
                <span className="font-mono text-[#F39200] font-bold">
                  ${selectedPlanToSubscribe.monthlyFee.toLocaleString('es-AR')}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 leading-tight">
              Los beneficios se activan inmediatamente en tu cuenta de Cachengueoo. Podés cancelar o pausar
              en cualquier momento.
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => handleSubscribe(selectedPlanToSubscribe)}
                className="w-full h-11 rounded-xl bg-[#F39200] hover:bg-[#E08400] text-black font-bold text-xs cursor-pointer shadow-lg shadow-[#F39200]/20"
              >
                Confirmar y Activar Club
              </button>
              <button
                onClick={() => setSelectedPlanToSubscribe(null)}
                className="w-full h-10 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs cursor-pointer"
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
