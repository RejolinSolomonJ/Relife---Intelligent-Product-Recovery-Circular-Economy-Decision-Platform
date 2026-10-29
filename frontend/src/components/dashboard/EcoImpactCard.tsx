'use client';

import React from 'react';
import { Sprout, ArrowRight } from 'lucide-react';
import { formatKg } from '../../lib/formatters';

interface EcoImpactCardProps {
  wasteDivertedKg?: number;
  onExplore?: () => void;
}

export function EcoImpactCard({ wasteDivertedKg = 63.7, onExplore }: EcoImpactCardProps) {
  return (
    <div className="bg-[#E8F5E9] rounded-[24px] p-6 border border-emerald-100 shadow-sm relative overflow-hidden flex flex-col justify-between text-slate-800">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-200/80 text-[#073E2E] flex items-center justify-center font-bold">
              <Sprout className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 font-sans leading-tight">
              E-Waste Diverted
            </h3>
          </div>
          <span className="text-[10px] font-bold text-[#073E2E] bg-emerald-200/60 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
            Eco Target: 30 kg
          </span>
        </div>

        <p className="text-xs text-slate-600 font-sans leading-relaxed">
          Salvation pipelines prevented toxic heavy metals and lithium from entering landfills.
        </p>

        {/* Primary Metric */}
        <div className="flex items-baseline gap-2 pt-1">
          <span className="text-3xl font-extrabold font-mono text-slate-900 tracking-tight">
            {formatKg(wasteDivertedKg)}
          </span>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-200/70 px-2 py-0.5 rounded-full">
            +14.6% vs target
          </span>
        </div>
      </div>

      {/* Button & Rising Graphic */}
      <div className="mt-5 pt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onExplore}
          className="px-4 py-2 rounded-xl bg-[#073E2E] hover:bg-[#0A533E] text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <span>Explore Pathways</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        {/* 4 Rising Green Bars */}
        <div className="flex items-end gap-1.5 h-8 pr-1">
          <div className="w-1.5 h-3 bg-emerald-300 rounded-t-sm" />
          <div className="w-1.5 h-5 bg-emerald-400 rounded-t-sm" />
          <div className="w-1.5 h-7 bg-emerald-500 rounded-t-sm" />
          <div className="w-1.5 h-8 bg-[#073E2E] rounded-t-sm" />
        </div>
      </div>
    </div>
  );
}
