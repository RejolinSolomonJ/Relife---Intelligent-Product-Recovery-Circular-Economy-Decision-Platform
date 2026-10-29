'use client';

import React, { useState } from 'react';
import {
  PathwayEvaluationItem,
  EvaluateDecisionResponse,
} from '../../lib/types';
import { formatINR } from '../../lib/formatters';
import {
  Trophy,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  Leaf,
  Clock,
  ShieldAlert,
  ChevronRight,
  Info,
  Sliders,
  Layers,
  Sparkles,
  Award,
} from 'lucide-react';

interface PathwayComparisonPanelProps {
  decisionData: EvaluateDecisionResponse;
  selectedPathway: string;
  onSelectPathway: (pathway: string) => void;
}

export function PathwayComparisonPanel({
  decisionData,
  selectedPathway,
  onSelectPathway,
}: PathwayComparisonPanelProps) {
  const [viewMode, setViewMode] = useState<'cards' | 'matrix'>('cards');

  const pathways = decisionData.ranked_pathways || [];
  const winner = decisionData.winner;

  // Find max values for progress bars normalization
  const maxNrv = Math.max(...pathways.map((p) => p.net_recovery_value), 1000);

  const getPathwayIcon = (name: string) => {
    switch (name) {
      case 'Direct Resale':
        return '🏪';
      case 'Repair':
        return '🔧';
      case 'Refurbishment':
        return '🛠️';
      case 'Component Harvesting':
        return '📦';
      case 'Recycling':
        return '♻️';
      default:
        return '🔄';
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-[28px] p-5 lg:p-6 shadow-[0_2px_14px_rgba(0,0,0,0.03)] space-y-6">
      {/* Header with 5 Parameters Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#073E2E] flex items-center justify-center font-bold">
              <Trophy className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <span>5-Parameter Pathway Comparative Evaluation</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#073E2E] text-white">
                  Best Suitable: {winner.pathway}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Multi-objective ranking across Profit, Environmental Impact, Turnaround Speed, Feasibility Risk, and Circular Fit.
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'cards'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Scorecards
          </button>
          <button
            type="button"
            onClick={() => setViewMode('matrix')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'matrix'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Parameter Matrix
          </button>
        </div>
      </div>

      {/* Winner Spotlight Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/40 border-2 border-[#073E2E]/30 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-[#073E2E] text-white flex items-center gap-1 shadow-xs">
                <Award className="w-3 h-3 text-emerald-300" />
                Rank #1 Algorithmic Winner
              </span>
              <span className="text-xs font-bold text-emerald-900">
                Composite Score: {winner.weighted_score.toFixed(1)} / 100
              </span>
            </div>
            <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span className="text-xl">{getPathwayIcon(winner.pathway)}</span>
              <span>{winner.pathway} is Best Suitable for this asset</span>
            </h4>
            <p className="text-xs text-slate-700 leading-relaxed">
              {decisionData.winner_rationale}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0 w-full lg:w-auto">
            <div className="bg-white/90 backdrop-blur-sm p-2.5 rounded-xl border border-emerald-200 text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">1. Net Value</span>
              <span className="text-xs font-mono font-extrabold text-[#073E2E]">
                {formatINR(winner.net_recovery_value)}
              </span>
            </div>
            <div className="bg-white/90 backdrop-blur-sm p-2.5 rounded-xl border border-emerald-200 text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">2. Eco Score</span>
              <span className="text-xs font-mono font-extrabold text-emerald-700">
                {winner.environmental_score}/100
              </span>
            </div>
            <div className="bg-white/90 backdrop-blur-sm p-2.5 rounded-xl border border-emerald-200 text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">3. Velocity</span>
              <span className="text-xs font-mono font-extrabold text-sky-700">
                {winner.recovery_time_days} Day(s)
              </span>
            </div>
            <div className="bg-white/90 backdrop-blur-sm p-2.5 rounded-xl border border-emerald-200 text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">4. Risk</span>
              <span className="text-xs font-mono font-extrabold text-amber-700">
                {winner.risk_score}% Low
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5-Parameter Breakdown Card Grid */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {pathways.map((p) => {
            const isWinner = p.pathway === winner.pathway;
            const isSelected = p.pathway === selectedPathway;
            const isOverridden = p.is_safety_override;

            return (
              <div
                key={p.pathway}
                onClick={() => onSelectPathway(p.pathway)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'border-[#073E2E] bg-emerald-50/50 shadow-md ring-2 ring-[#073E2E]'
                    : isWinner
                    ? 'border-emerald-300 bg-white shadow-xs hover:border-[#073E2E]'
                    : isOverridden
                    ? 'border-slate-200 bg-slate-50/70 opacity-80 hover:opacity-100'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getPathwayIcon(p.pathway)}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h5 className="text-xs font-bold text-slate-900">{p.pathway}</h5>
                          {isWinner && (
                            <span className="px-1.5 py-0.2 rounded-md bg-[#073E2E] text-white text-[9px] font-mono font-bold">
                              #1
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500">Rank #{p.rank}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-slate-900 block">
                        {p.weighted_score.toFixed(1)} pts
                      </span>
                      {isOverridden ? (
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full inline-block">
                          Disqualified
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full inline-block">
                          Qualified
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 5 Parameters Mini Gauges */}
                  <div className="pt-3 space-y-2 text-[11px]">
                    {/* Parameter 1: Net Recovery Value */}
                    <div>
                      <div className="flex justify-between font-semibold mb-0.5">
                        <span className="text-slate-500">1. Net Value (Profit):</span>
                        <span className="font-mono font-bold text-[#073E2E]">
                          {formatINR(p.net_recovery_value)}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#073E2E] rounded-full"
                          style={{ width: `${Math.min(100, Math.max(8, (p.net_recovery_value / maxNrv) * 100))}%` }}
                        />
                      </div>
                    </div>

                    {/* Parameter 2: Environmental Score */}
                    <div>
                      <div className="flex justify-between font-semibold mb-0.5">
                        <span className="text-slate-500">2. Environmental Score:</span>
                        <span className="font-mono font-bold text-emerald-700">
                          {p.environmental_score}/100
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${p.environmental_score}%` }}
                        />
                      </div>
                    </div>

                    {/* Parameter 3: Recovery Time */}
                    <div>
                      <div className="flex justify-between font-semibold mb-0.5">
                        <span className="text-slate-500">3. Turnaround Speed:</span>
                        <span className="font-mono font-bold text-sky-700">
                          {p.recovery_time_days} day(s)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-sky-500 rounded-full"
                          style={{ width: `${Math.max(15, (1 - p.recovery_time_days / 6) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Parameter 4: Risk Score */}
                    <div>
                      <div className="flex justify-between font-semibold mb-0.5">
                        <span className="text-slate-500">4. Risk / Feasibility:</span>
                        <span className="font-mono font-bold text-amber-700">
                          {p.risk_score}% ({p.risk_score < 15 ? 'Very Low' : p.risk_score < 25 ? 'Moderate' : 'High'})
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${100 - p.risk_score}%` }}
                        />
                      </div>
                    </div>

                    {/* Parameter 5: Circular Fit / Weighted Match */}
                    <div>
                      <div className="flex justify-between font-semibold mb-0.5">
                        <span className="text-slate-500">5. Circular Suitability:</span>
                        <span className="font-mono font-bold text-indigo-700">
                          {p.weighted_score.toFixed(1)}% Match
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${p.weighted_score}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Overridden Alert notice */}
                  {isOverridden && (
                    <div className="mt-3 p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[10px] flex items-start gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>{p.override_reason || 'Safety/condition constraint triggered override.'}</span>
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-mono">
                    Rev: {formatINR(p.expected_revenue)} | Cost: {formatINR(p.expected_cost)}
                  </span>
                  <span className={`font-bold flex items-center gap-1 ${isSelected ? 'text-[#073E2E]' : 'text-slate-600'}`}>
                    <span>View Chennai Supply Chain</span>
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Detailed 5-Parameter Comparison Matrix Table */
        <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-mono text-[10px] uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Pathway</th>
                  <th className="py-3 px-3">1. Net Value (Profit)</th>
                  <th className="py-3 px-3">2. Environmental Impact</th>
                  <th className="py-3 px-3">3. Velocity (Speed)</th>
                  <th className="py-3 px-3">4. Execution Risk</th>
                  <th className="py-3 px-3">5. Circular Suitability</th>
                  <th className="py-3 px-4 text-right">Status / Constraint</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pathways.map((p) => {
                  const isWinner = p.pathway === winner.pathway;
                  const isSelected = p.pathway === selectedPathway;

                  return (
                    <tr
                      key={p.pathway}
                      onClick={() => onSelectPathway(p.pathway)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-emerald-50/80 font-semibold'
                          : isWinner
                          ? 'bg-emerald-50/40'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-4 flex items-center gap-2">
                        <span className="text-lg">{getPathwayIcon(p.pathway)}</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={isWinner ? 'text-[#073E2E] font-bold' : 'text-slate-900'}>
                              {p.pathway}
                            </span>
                            {isWinner && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#073E2E] text-white font-mono font-bold">
                                WINNER
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">Rank #{p.rank}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-[#073E2E]">
                          {formatINR(p.net_recovery_value)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Rev: {formatINR(p.expected_revenue)} - Cost: {formatINR(p.expected_cost)}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-emerald-700">
                          {p.environmental_score} / 100
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {p.environmental_score > 90 ? 'Near Zero Landfill' : 'Partial Salvage'}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-sky-700">
                          {p.recovery_time_days} Business Day(s)
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {p.recovery_time_days <= 1 ? 'Instant Liquidity' : 'Bench Staged'}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-amber-700">
                          {p.risk_score}% Risk
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {p.risk_score < 15 ? 'Safety Verified' : 'Parts/Safety Variance'}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-mono font-extrabold text-indigo-700">
                          {p.weighted_score.toFixed(1)} pts
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Normalized match
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        {p.is_safety_override ? (
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full inline-block">
                              Disqualified
                            </span>
                            <div className="text-[10px] text-amber-700 max-w-xs mt-0.5 truncate">
                              {p.override_reason}
                            </div>
                          </div>
                        ) : isWinner ? (
                          <span className="text-[10px] font-bold text-[#073E2E] bg-emerald-200 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-[#073E2E]" />
                            <span>Rank #1 Winner</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full inline-block">
                            Qualified Option
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
