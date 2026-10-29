'use client';

import React, { useState, useEffect } from 'react';
import { getPathwayEconomics } from '../../lib/api';
import { formatINR } from '../../lib/formatters';
import {
  DollarSign,
  TrendingUp,
  Tag,
  Info,
  Layers,
  ArrowRight,
  ShieldCheck,
  PackageCheck,
  RefreshCw,
  Cpu,
} from 'lucide-react';

interface Step4Props {
  returnId: string;
  onProceedToDecision: () => void;
}

export function Step4CostEstimation({ returnId, onProceedToDecision }: Step4Props) {
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'costs' | 'components'>('costs');

  useEffect(() => {
    if (!returnId) return;
    setIsLoading(true);
    getPathwayEconomics(returnId)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        console.error('Error fetching economics:', err);
        setError('Failed to compute itemized pathway economics.');
      })
      .finally(() => setIsLoading(false));
  }, [returnId]);

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#073E2E]" />
        <p className="text-sm font-semibold text-white">Calculating Multi-Pathway Operational Cost Models...</p>
        <p className="text-xs text-slate-500">Retrieving parts tariffs, bench labor, and secondary market indices</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-red-400 space-y-2">
        <p className="text-sm font-semibold">{error || 'No cost data available.'}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-xs text-[#073E2E] underline"
        >
          Retry Cost Retrieval
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Honesty & Benchmark Notice */}
      <div className="bg-[#181926] border border-amber-500/30 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 text-amber-300">
          <Info className="w-4 h-4 shrink-0 text-[#073E2E]" />
          <span>
            <strong>Honesty Rule:</strong> All cost and revenue figures are based on model pricing feeds. Every figure is clearly tagged as <span className="font-mono text-[#073E2E] bg-[#252836] px-1.5 py-0.5 rounded">sample assumption</span>.
          </span>
        </div>
        <span className="px-2.5 py-0.5 rounded-md bg-[#252836] text-[10px] font-mono text-[#073E2E] border border-[#FFC21A]/30 shrink-0">
          Step 4 of 7
        </span>
      </div>

      {/* Tabs: Pathway Operational Costs vs Harvestable Sub-Assemblies */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('costs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'costs'
                ? 'bg-slate-100 text-slate-700 text-[#073E2E] border border-[#FFC21A]/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Itemized Pathway Costs & Revenues
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('components')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'components'
                ? 'bg-slate-100 text-slate-700 text-[#073E2E] border border-[#FFC21A]/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Harvestable Component Salvage Values
          </button>
        </div>

        <span className="text-[11px] font-mono text-slate-400">
          Base SKU MSRP: <strong className="text-white">{formatINR(data.purchase_price)}</strong>
        </span>
      </div>

      {activeTab === 'costs' ? (
        /* Pathway Comparison Table */
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-wider font-mono">
                  <th className="pb-3 font-semibold">Circular Pathway</th>
                  <th className="pb-3 font-semibold">Expected Revenue</th>
                  <th className="pb-3 font-semibold">Parts Cost</th>
                  <th className="pb-3 font-semibold">Operational Costs</th>
                  <th className="pb-3 font-semibold">Total Cost</th>
                  <th className="pb-3 font-semibold">Net Recovery Value</th>
                  <th className="pb-3 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E202E]">
                {data.pathway_economics.map((item: any, idx: number) => {
                  const b = item.cost_breakdown;
                  const operationalSum = (b.labor_cost || 0) + (b.testing_cost || 0) + (b.cleaning_cost || 0) + (b.handling_cost || 0) + (b.storage_cost || 0) + (b.transport_cost || 0);

                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-[#181926] transition-colors ${
                        item.is_safety_override ? 'opacity-50 bg-red-950/10' : ''
                      }`}
                    >
                      <td className="py-3.5 pr-4">
                        <div className="font-bold text-white text-xs">{item.pathway}</div>
                        <div className="text-[10px] text-slate-400">Turnaround: ~{item.recovery_time_days} days</div>
                      </td>

                      <td className="py-3.5 pr-4 font-mono font-semibold text-emerald-400">
                        {formatINR(item.expected_revenue)}
                        <span className="block text-[9px] text-slate-500 font-sans">sample assumption</span>
                      </td>

                      <td className="py-3.5 pr-4 font-mono text-slate-300">
                        {formatINR(b.parts_cost || 0)}
                        <span className="block text-[9px] text-slate-500 font-sans">estimated</span>
                      </td>

                      <td className="py-3.5 pr-4 text-slate-300">
                        <span className="font-mono">{formatINR(operationalSum)}</span>
                        <span className="block text-[9px] text-slate-500">
                          Labor ₹{b.labor_cost} • Test ₹{b.testing_cost} • Freight ₹{b.transport_cost}
                        </span>
                      </td>

                      <td className="py-3.5 pr-4 font-mono text-red-300">
                        {formatINR(item.expected_cost)}
                        <span className="block text-[9px] text-slate-500 font-sans">estimated</span>
                      </td>

                      <td className="py-3.5 pr-4">
                        <span className={`text-sm font-bold font-mono ${item.net_recovery_value > 0 ? 'text-[#073E2E]' : 'text-slate-400'}`}>
                          {formatINR(item.net_recovery_value)}
                        </span>
                        <span className="block text-[9px] text-slate-500">
                          NRV = Revenue - Cost
                        </span>
                      </td>

                      <td className="py-3.5 text-center">
                        {item.is_safety_override ? (
                          <span className="inline-block px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-500/40 text-[10px] font-semibold">
                            Disqualified
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-semibold">
                            Viable
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
      ) : (
        /* Harvestable Components Table */
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#073E2E]" />
                <span>B2B Secondary Component Salvage Matrix</span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Component value yields after bench diagnostic validation
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[#073E2E]">
              Tagged: Sample Assumptions
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(data.harvestable_components).map(([compName, comp]: [string, any]) => {
              const isViable = comp.salvage_value_inr > 0;
              return (
                <div
                  key={compName}
                  className={`p-3.5 rounded-xl border transition-all text-xs ${
                    isViable
                      ? 'bg-slate-50 border-slate-200 text-white'
                      : 'bg-red-950/20 border-red-500/20 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold capitalize text-sm">{compName}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        isViable ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-red-950 text-red-300'
                      }`}
                    >
                      {comp.condition}
                    </span>
                  </div>

                  <div className="mt-2 flex justify-between items-baseline">
                    <span className="text-[11px] text-slate-400">Indicative Value:</span>
                    <span className="text-sm font-mono font-bold text-[#073E2E]">
                      {formatINR(comp.salvage_value_inr)}
                    </span>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between text-[10px] text-slate-500">
                    <span>Demand: {comp.market_demand || 'High'}</span>
                    <span>Sample benchmark</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Button to Proceed to Step 5 Decision Engine */}
      <button
        type="button"
        onClick={onProceedToDecision}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#073E2E] to-[#0A533E] text-slate-950 font-bold text-xs tracking-wide shadow-lg hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        <span>Proceed to Step 5: Multi-Criteria Decision Engine</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

