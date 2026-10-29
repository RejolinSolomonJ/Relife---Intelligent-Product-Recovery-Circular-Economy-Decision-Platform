'use client';

import React from 'react';
import { Card } from '../ui/Card';
import { Award, ChevronRight } from 'lucide-react';

interface RecoveryRateGaugeProps {
  rate?: number;
}

export function RecoveryRateGauge({ rate = 67.3 }: RecoveryRateGaugeProps) {
  const strokeDashoffset = 251.2 - (251.2 * rate) / 100;

  const categories = [
    { name: 'Smart Devices & Mobile', percentage: 74, color: '#10B981' },
    { name: 'Computing & Consoles', percentage: 71, color: '#0284C7' },
    { name: 'Audio & Wearables', percentage: 68, color: '#8B5CF6' },
    { name: 'Home & Smart Appliances', percentage: 64, color: '#F59E0B' },
  ];

  return (
    <Card
      title="Circular Recovery Progress"
      action={
        <button className="text-xs text-slate-500 hover:text-slate-900 font-semibold flex items-center gap-0.5">
          <span>View All</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      }
    >
      <div className="space-y-4 pt-1">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
          {/* Circular Progress Gauge */}
          <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                className="text-slate-100"
                strokeWidth="10"
                stroke="currentColor"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                className="text-[#073E2E]"
                strokeWidth="10"
                strokeDasharray="251.2"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                {rate}%
              </span>
              <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">
                Overall Yield
              </span>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="flex-1 w-full space-y-2 text-xs">
            {categories.map((cat, i) => (
              <div key={i} className="flex items-center justify-between py-0.5">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-slate-700 font-medium text-xs">{cat.name}</span>
                </div>
                <span className="font-bold text-slate-900 font-mono text-xs">{cat.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Motivational Callout Banner */}
        <div className="p-3 rounded-2xl bg-[#E8F5E9] border border-emerald-100 flex items-center gap-2.5 text-xs text-emerald-900">
          <div className="w-6 h-6 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center shrink-0 text-xs font-bold">
            🏆
          </div>
          <p className="text-[11px] text-emerald-800 font-medium leading-relaxed">
            <strong>You&apos;re on track!</strong> You&apos;ve salvaged {rate}% of all returned products across categories without landfill disposal. Keep it up!
          </p>
        </div>
      </div>
    </Card>
  );
}
