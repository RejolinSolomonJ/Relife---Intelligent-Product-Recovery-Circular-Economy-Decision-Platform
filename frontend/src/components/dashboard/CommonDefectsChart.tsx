'use client';

import React from 'react';
import { DefectCategoryItem } from '../../lib/types';
import { Card } from '../ui/Card';
import { ChartSkeleton } from '../ui/Skeleton';
import {
  BatteryWarning,
  Sparkles,
  ShieldAlert,
  Cpu,
  PackageX,
} from 'lucide-react';

interface CommonDefectsChartProps {
  data: DefectCategoryItem[];
  isLoading: boolean;
  selectedDefect?: string | null;
  onSelectDefect?: (defect: string) => void;
}

const DEFECT_CONFIG: Record<
  string,
  { color: string; bg: string; icon: React.ElementType }
> = {
  'Battery fault': { color: 'text-amber-700', bg: 'bg-amber-50 border border-amber-200', icon: BatteryWarning },
  Crack: { color: 'text-rose-700', bg: 'bg-rose-50 border border-rose-200', icon: ShieldAlert },
  Scratch: { color: 'text-emerald-700', bg: 'bg-emerald-50 border border-emerald-200', icon: Sparkles },
  Dent: { color: 'text-sky-700', bg: 'bg-sky-50 border border-sky-200', icon: Cpu },
  'Missing part': { color: 'text-purple-700', bg: 'bg-purple-50 border border-purple-200', icon: PackageX },
};

export function CommonDefectsChart({
  data,
  isLoading,
  selectedDefect,
  onSelectDefect,
}: CommonDefectsChartProps) {
  if (isLoading) {
    return (
      <Card title="Top Defect Categories" subtitle="Hardware failure taxonomy">
        <ChartSkeleton height="h-64" />
      </Card>
    );
  }

  return (
    <Card
      title="Common Defect Categories"
      action={
        <span className="text-xs font-mono text-slate-400">
          OpenCV Classified
        </span>
      }
      className="h-full flex flex-col justify-between"
    >
      <div className="space-y-3.5 py-1">
        {data.map((item) => {
          const cfg = DEFECT_CONFIG[item.category] || {
            color: 'text-slate-700',
            bg: 'bg-slate-100 border border-slate-200',
            icon: Cpu,
          };
          const Icon = cfg.icon;
          const isSelected = selectedDefect?.toLowerCase() === item.category.toLowerCase();

          return (
            <div
              key={item.category}
              onClick={() => onSelectDefect && onSelectDefect(item.category)}
              className={`p-2.5 rounded-2xl transition-all cursor-pointer ${
                isSelected ? 'bg-emerald-50 ring-1 ring-[#073E2E]' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-xl ${cfg.bg} ${cfg.color} shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 text-xs block">
                      {item.category}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {item.count} items recorded
                    </span>
                  </div>
                </div>

                <span className="font-bold font-mono text-slate-700 text-xs">
                  {item.percentage}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#073E2E] h-full rounded-full transition-all duration-300"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
