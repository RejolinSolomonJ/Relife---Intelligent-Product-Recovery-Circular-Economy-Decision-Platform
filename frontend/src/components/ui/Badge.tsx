import React from 'react';
import { ReturnStatus } from '../../lib/types';
import { Sparkles, Wrench, RefreshCw, Layers, Trash2 } from 'lucide-react';

export function StatusChip({ status }: { status: ReturnStatus | string }) {
  if (status === 'Recovered') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
        Recovered
      </span>
    );
  }
  if (status === 'In progress') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-600" />
        In progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
      Needs review
    </span>
  );
}

export function PathwayBadge({ pathway }: { pathway: string }) {
  const styles: Record<string, { bg: string; text: string; border: string; icon: React.ElementType }> = {
    Resale: {
      bg: 'bg-emerald-50',
      text: 'text-[#073E2E]',
      border: 'border-emerald-200',
      icon: Sparkles,
    },
    'Direct Resale': {
      bg: 'bg-emerald-50',
      text: 'text-[#073E2E]',
      border: 'border-emerald-200',
      icon: Sparkles,
    },
    Repair: {
      bg: 'bg-sky-50',
      text: 'text-sky-700',
      border: 'border-sky-200',
      icon: Wrench,
    },
    Refurbish: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      icon: RefreshCw,
    },
    Refurbishment: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      icon: RefreshCw,
    },
    Harvest: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      icon: Layers,
    },
    'Component Harvesting': {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      icon: Layers,
    },
    Recycle: {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      icon: Trash2,
    },
    Recycling: {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      icon: Trash2,
    },
  };

  const config = styles[pathway] || {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: Sparkles,
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${config.bg} ${config.text} ${config.border} shadow-sm`}
    >
      <Icon className="w-3 h-3 shrink-0" />
      <span>{pathway}</span>
    </span>
  );
}
