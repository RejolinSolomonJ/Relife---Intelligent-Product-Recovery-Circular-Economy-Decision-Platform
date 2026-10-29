'use client';

import React from 'react';
import { Leaf, Sun } from 'lucide-react';

export function EcoQuoteCard() {
  return (
    <div className="p-6 rounded-[24px] bg-[#E8F5E9] border border-emerald-100 shadow-sm relative overflow-hidden flex flex-col justify-between text-slate-800">
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Sun className="w-5 h-5 text-amber-500 fill-amber-200" />
          <Leaf className="w-4 h-4 text-[#073E2E]" />
        </div>

        <h4 className="text-sm font-bold text-slate-900 font-sans leading-snug">
          &ldquo;Intelligent product recovery, <br /> zero electronic landfill.&rdquo;
        </h4>

        <p className="text-xs text-slate-600 leading-relaxed pt-1">
          Autonomous testing and repair preserves 85% of embedded manufacturing energy across electronics and consumer hardware.
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-emerald-200/60 text-[10px] font-mono text-[#073E2E] font-semibold flex items-center justify-between">
        <span>ReLife AI Protocol</span>
        <span className="text-emerald-800 font-bold">R2v3 Certified</span>
      </div>
    </div>
  );
}
