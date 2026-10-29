'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ObjectiveWeights, EvaluateDecisionResponse, PathwayEvaluationItem } from '../../lib/types';
import { evaluateDecision } from '../../lib/api';
import { formatINR } from '../../lib/formatters';
import {
  Award,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  TrendingUp,
  Clock,
  Leaf,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  BarChart2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface Step5Props {
  returnId: string;
  onDecisionComplete: (data: EvaluateDecisionResponse) => void;
  decisionData: EvaluateDecisionResponse | null;
}

const PATHWAY_COLORS: Record<string, string> = {
  'Direct Resale': '#10B981',
  Repair: '#0284C7',
  Refurbishment: '#F59E0B',
  'Component Harvesting': '#8B5CF6',
  Recycling: '#073E2E',
};

export function Step5DecisionEngine({
  returnId,
  onDecisionComplete,
  decisionData,
}: Step5Props) {
  const [weights, setWeights] = useState<ObjectiveWeights>({
    profit: 40,
    environment: 30,
    speed: 15,
    risk: 15,
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [localData, setLocalData] = useState<EvaluateDecisionResponse | null>(decisionData);

  const runEvaluation = useCallback(
    async (currentWeights: ObjectiveWeights) => {
      if (!returnId) return;
      setIsLoading(true);
      setError(null);

      try {
        const res = await evaluateDecision(returnId, currentWeights);
        setLocalData(res);
        onDecisionComplete(res);
      } catch (err: any) {
        console.error('Decision evaluation failed:', err);
        setError(err.message || 'Decision engine failed.');
      } finally {
        setIsLoading(false);
      }
    },
    [returnId, onDecisionComplete]
  );

  useEffect(() => {
    runEvaluation(weights);
  }, []);

  const handleSliderChange = (key: keyof ObjectiveWeights, value: number) => {
    const updated = { ...weights, [key]: value };
    setWeights(updated);
    runEvaluation(updated);
  };

  const handleWeightPreset = (preset: 'balanced' | 'max_profit' | 'eco_champion' | 'speed_run') => {
    let newWeights: ObjectiveWeights;
    if (preset === 'max_profit') {
      newWeights = { profit: 70, environment: 10, speed: 10, risk: 10 };
    } else if (preset === 'eco_champion') {
      newWeights = { profit: 20, environment: 60, speed: 10, risk: 10 };
    } else if (preset === 'speed_run') {
      newWeights = { profit: 25, environment: 15, speed: 50, risk: 10 };
    } else {
      newWeights = { profit: 40, environment: 30, speed: 15, risk: 15 };
    }
    setWeights(newWeights);
    runEvaluation(newWeights);
  };

  const chartData = localData?.ranked_pathways.map((p) => ({
    name: p.pathway,
    nrv: Math.max(0, p.net_recovery_value),
    revenue: p.expected_revenue,
    cost: p.expected_cost,
    eco: p.environmental_score,
    isWinner: p.rank === 1,
    isOverride: p.is_safety_override,
  })) || [];

  return (
    <div className="space-y-6 font-sans">
      {/* Objective Weights Control Panel */}
      <div className="bg-white border border-slate-200/90 rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-[#073E2E]" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Multi-Objective Pathway Optimization Sliders
              </h3>
              <p className="text-[11px] text-slate-400">
                Adjust business weights; the 5 recovery parameters recalculate dynamically in real-time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleWeightPreset('balanced')}
              className="text-[11px] font-semibold px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              Balanced
            </button>
            <button
              type="button"
              onClick={() => handleWeightPreset('max_profit')}
              className="text-[11px] font-semibold px-3 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-[#073E2E] border border-emerald-200 transition-colors cursor-pointer"
            >
              Max Profit
            </button>
            <button
              type="button"
              onClick={() => handleWeightPreset('eco_champion')}
              className="text-[11px] font-semibold px-3 py-1 rounded-full bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-colors cursor-pointer"
            >
              Eco Champion
            </button>
            <button
              type="button"
              onClick={() => handleWeightPreset('speed_run')}
              className="text-[11px] font-semibold px-3 py-1 rounded-full bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 transition-colors cursor-pointer"
            >
              Speed Run
            </button>
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
          {/* Profit Weight */}
          <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#073E2E]" />
                Profitability
              </span>
              <span className="font-mono font-bold text-[#073E2E]">{weights.profit}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={weights.profit}
              onChange={(e) => handleSliderChange('profit', parseInt(e.target.value))}
              className="w-full accent-[#073E2E] h-1.5 bg-slate-200 rounded cursor-pointer"
            />
          </div>

          {/* Environmental Weight */}
          <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                ESG / Circularity
              </span>
              <span className="font-mono font-bold text-emerald-700">{weights.environment}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={weights.environment}
              onChange={(e) => handleSliderChange('environment', parseInt(e.target.value))}
              className="w-full accent-emerald-600 h-1.5 bg-slate-200 rounded cursor-pointer"
            />
          </div>

          {/* Speed Weight */}
          <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-600" />
                Turnaround Speed
              </span>
              <span className="font-mono font-bold text-sky-700">{weights.speed}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={weights.speed}
              onChange={(e) => handleSliderChange('speed', parseInt(e.target.value))}
              className="w-full accent-sky-600 h-1.5 bg-slate-200 rounded cursor-pointer"
            />
          </div>

          {/* Risk Penalty */}
          <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                Risk Aversion
              </span>
              <span className="font-mono font-bold text-rose-700">{weights.risk}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={weights.risk}
              onChange={(e) => handleSliderChange('risk', parseInt(e.target.value))}
              className="w-full accent-rose-600 h-1.5 bg-slate-200 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* 5-Pathway Comparison Graph Card */}
      {localData && (
        <div className="bg-white border border-slate-200/90 rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-[#073E2E]" />
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  5-Pathway Comparative Economics & Recovery Yield Graph
                </h4>
                <p className="text-[11px] text-slate-400">
                  Visual comparison of Net Recovery Value (₹ INR) across Direct Resale, Repair, Refurbishment, Component Harvesting, and Recycling
                </p>
              </div>
            </div>
            {isLoading && (
              <span className="text-xs text-[#073E2E] flex items-center gap-1 font-mono">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Re-scoring...
              </span>
            )}
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Net Recovery Value']}
                  contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                />
                <Bar dataKey="nrv" radius={[8, 8, 0, 0]} maxBarSize={48}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isWinner ? '#073E2E' : entry.isOverride ? '#CBD5E1' : '#10B981'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Ranked Pathways Decision Cards */}
      {localData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-[#073E2E]" />
              <span>Ranked Pathway Decisions (Enforced by Condition Constraints)</span>
            </h4>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {localData.ranked_pathways.map((pathway: PathwayEvaluationItem) => {
              const isWinner = pathway.rank === 1;

              return (
                <div
                  key={pathway.pathway}
                  className={`p-4 rounded-2xl border transition-all ${
                    pathway.is_safety_override
                      ? 'bg-slate-50/70 border-slate-200/80 opacity-75'
                      : isWinner
                      ? 'bg-[#E8F5E9] border-emerald-300 shadow-md ring-1 ring-emerald-400/40'
                      : 'bg-white border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs font-mono shrink-0 shadow-sm ${
                          isWinner
                            ? 'bg-[#073E2E] text-white'
                            : pathway.is_safety_override
                            ? 'bg-slate-200 text-slate-600'
                            : 'bg-white border border-slate-200 text-slate-800'
                        }`}
                      >
                        #{pathway.rank}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">{pathway.pathway}</span>
                          {isWinner && (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">
                              Recommended Pathway
                            </span>
                          )}
                          {pathway.is_safety_override && (
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3" />
                              Disqualified
                            </span>
                          )}
                        </div>

                        {pathway.override_reason ? (
                          <p className="text-[11px] text-rose-700 font-medium mt-0.5">
                            Constraint: {pathway.override_reason}
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Turnaround: {pathway.recovery_time_days} days • Risk Score: {pathway.risk_score} • Eco Score: {pathway.environmental_score}/100
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-right">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Weighted Score</span>
                        <span className="text-sm font-mono font-bold text-slate-900">
                          {pathway.weighted_score.toFixed(1)} pts
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Expected Revenue</span>
                        <span className="text-xs font-mono text-emerald-800 font-semibold">
                          {formatINR(pathway.expected_revenue)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Net Recovery Value</span>
                        <span className={`text-base font-mono font-bold ${isWinner ? 'text-[#073E2E]' : 'text-slate-800'}`}>
                          {formatINR(pathway.net_recovery_value)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rationale Callout Card */}
          <div className="p-4 rounded-2xl bg-[#E8F5E9] border border-emerald-200 text-xs space-y-2">
            <div className="font-bold text-[#073E2E] flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="w-4 h-4 text-[#073E2E]" />
              <span>Decision Engine Rationale:</span>
            </div>
            <p className="text-slate-700 leading-relaxed font-sans">{localData.winner_rationale}</p>
          </div>
        </div>
      )}
    </div>
  );
}
