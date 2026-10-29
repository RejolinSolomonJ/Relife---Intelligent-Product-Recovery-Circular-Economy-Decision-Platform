'use client';

import React, { useState } from 'react';
import { KPIs } from '../../lib/types';
import { formatINR } from '../../lib/formatters';
import {
  Send,
  PlusCircle,
  Cpu,
  ArrowRightLeft,
  QrCode,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';

interface HeroBannerProps {
  kpis: KPIs | null;
  isLoading: boolean;
  onOpenIntake: () => void;
  onRunTriage: () => void;
  onOpenReviewQueue: () => void;
  onOpenTransfer: () => void;
}

export function HeroBanner({
  kpis,
  isLoading,
  onOpenIntake,
  onRunTriage,
  onOpenReviewQueue,
  onOpenTransfer,
}: HeroBannerProps) {
  const [showBalance, setShowBalance] = useState<boolean>(true);
  const valueRecovered = kpis?.value_recovered_inr || 1515517;
  const growthPct = kpis?.value_recovered_change_pct || 18.2;

  const quickActions = [
    {
      label: 'Scan Product',
      icon: Send,
      iconColor: 'text-[#073E2E]',
      circleBg: 'bg-[#DCFCE7] hover:bg-[#BBF7D0]',
      action: onOpenIntake,
    },
    {
      label: 'Add Return',
      icon: PlusCircle,
      iconColor: 'text-slate-800',
      circleBg: 'bg-slate-100 hover:bg-slate-200',
      action: onOpenIntake,
    },
    {
      label: 'Run Triage',
      icon: Cpu,
      iconColor: 'text-[#8B5CF6]',
      circleBg: 'bg-[#F3E8FF] hover:bg-[#E9D5FF]',
      action: onRunTriage,
    },
    {
      label: 'Transfer',
      icon: ArrowRightLeft,
      iconColor: 'text-[#0284C7]',
      circleBg: 'bg-[#E0F2FE] hover:bg-[#BAE6FD]',
      action: onOpenTransfer,
    },
    {
      label: 'Review Queue',
      icon: QrCode,
      iconColor: 'text-[#EA580C]',
      circleBg: 'bg-[#FFEDD5] hover:bg-[#FED7AA]',
      action: onOpenReviewQueue,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Finora Forest Green Hero Card */}
      <div className="relative bg-gradient-to-br from-[#063F2F] via-[#074735] to-[#0A533E] rounded-[28px] p-6 sm:p-7 text-white shadow-[0_4px_20px_rgba(7,62,46,0.15)] overflow-hidden">
        {/* Subtle decorative background blur orbs */}
        <div className="absolute -top-12 -right-12 w-52 h-52 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          {/* Left Text & Metrics */}
          <div className="space-y-3.5 max-w-md">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold font-sans tracking-tight text-white flex items-center gap-2">
                <span>Good Afternoon, Ayesha</span>
                <span className="text-lg">☀️</span>
              </h2>
              <p className="text-xs text-emerald-100/90 font-medium leading-relaxed mt-1">
                Circular recovery pipeline is performing at peak efficiency! Here&apos;s today&apos;s inventory overview.
              </p>
            </div>

            {/* Total Balance / Recovered Value */}
            <div className="pt-1 space-y-1">
              <div className="flex items-center gap-2 text-xs text-emerald-200/80 font-medium">
                <span>Total Value Recovered</span>
                <button
                  type="button"
                  onClick={() => setShowBalance(!showBalance)}
                  className="hover:text-white transition-colors"
                  aria-label="Toggle value visibility"
                >
                  {showBalance ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono text-white">
                {showBalance ? formatINR(valueRecovered) : '₹ •••••••'}
              </div>

              <div className="flex items-center gap-2 text-xs pt-0.5">
                <span className="text-emerald-300 font-semibold flex items-center gap-0.5">
                  ↑ {growthPct}% vs. last month
                </span>
                <span className="text-emerald-200/70 text-[11px]">
                  (52 products processed)
                </span>
              </div>
            </div>
          </div>

          {/* Right: Finora Wallet & Coin Graphic with Healthy Badge */}
          <div className="hidden sm:flex flex-col items-end justify-center relative shrink-0">
            {/* Healthy Pill Badge */}
            <div className="mb-3 bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs px-3 py-1 rounded-full flex items-center gap-1.5 font-medium shadow-sm backdrop-blur-sm self-end">
              <Check className="w-3.5 h-3.5 text-emerald-300 stroke-[3]" />
              <span>Healthy</span>
            </div>

            {/* Wallet & Cards Graphic */}
            <div className="relative">
              <div className="w-48 h-30 rounded-2xl bg-gradient-to-tr from-[#053526] to-[#0D6E50] border border-emerald-400/20 shadow-xl p-3.5 flex flex-col justify-between transform rotate-1 hover:rotate-0 transition-transform">
                <div className="flex justify-between items-center">
                  <div className="w-7 h-5 rounded bg-amber-400/90 shadow-inner" />
                  <span className="text-[10px] font-mono text-emerald-200/90 uppercase tracking-widest font-bold">
                    ReLife AI
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-mono text-emerald-100 tracking-wider">
                    •••• 2026
                  </span>
                </div>
              </div>

              {/* Floating Gold Coin Left */}
              <div className="absolute -bottom-2 -left-3 w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-900 font-extrabold flex items-center justify-center text-xs shadow-lg border-2 border-[#073E2E]">
                ₹
              </div>

              {/* Floating Gold Coin Right */}
              <div className="absolute -top-1 -right-2 w-6 h-6 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-200 text-slate-900 font-extrabold flex items-center justify-center text-[10px] shadow-md border-2 border-[#073E2E]">
                ₹
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Finora Unified White Quick Action Bar */}
      <div className="bg-white border border-slate-200/80 rounded-[24px] p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        <div className="grid grid-cols-5 gap-2 sm:gap-4 items-center justify-items-center">
          {quickActions.map((action, i) => {
            const Icon = action.icon;
            return (
              <button
                key={i}
                type="button"
                onClick={action.action}
                className="flex flex-col items-center justify-center gap-2 group cursor-pointer w-full text-center"
              >
                <div
                  className={`w-12 h-12 rounded-full ${action.circleBg} flex items-center justify-center shadow-sm group-hover:scale-105 transition-all duration-200`}
                >
                  <Icon className={`w-5 h-5 ${action.iconColor} transition-transform`} />
                </div>
                <span className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 leading-tight">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
