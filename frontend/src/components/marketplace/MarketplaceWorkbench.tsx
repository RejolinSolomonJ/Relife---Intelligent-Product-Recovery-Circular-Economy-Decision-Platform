'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { formatINR } from '../../lib/formatters';
import { fetchMarketplaceComponents, fetchMarketplaceBuyers, allocateComponent } from '../../lib/api';
import { ComponentCardItem, BuyerInfo } from '../../lib/types';
import {
  ShoppingBag,
  Cpu,
  Sparkles,
  CheckCircle2,
  Download,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  MapPin,
  RefreshCw,
} from 'lucide-react';

export function MarketplaceWorkbench() {
  const [components, setComponents] = useState<ComponentCardItem[]>([]);
  const [buyers, setBuyers] = useState<BuyerInfo[]>([]);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCondition, setSelectedCondition] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [selectedCompForModal, setSelectedCompForModal] = useState<ComponentCardItem | null>(null);
  const [allocationBuyerId, setAllocationBuyerId] = useState<number | null>(null);
  const [allocationNotes, setAllocationNotes] = useState<string>('');
  const [isAllocating, setIsAllocating] = useState<boolean>(false);

  const loadMarketplace = async () => {
    setIsLoading(true);
    try {
      const [compsData, buyersData] = await Promise.all([
        fetchMarketplaceComponents({
          component_type: selectedType === 'all' ? undefined : selectedType,
          condition: selectedCondition === 'all' ? undefined : selectedCondition,
        }),
        fetchMarketplaceBuyers()
      ]);
      setComponents(compsData);
      setBuyers(buyersData);
    } catch (err: any) {
      console.error('Failed to load marketplace:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMarketplace();
  }, [selectedType, selectedCondition]);

  const handleOpenAllocate = (comp: ComponentCardItem) => {
    setSelectedCompForModal(comp);
    setAllocationBuyerId(comp.matched_buyer ? comp.matched_buyer.id : (buyers[0]?.id || 1));
    setAllocationNotes(`Harvested sub-assembly quality passed OEM bench testing.`);
  };

  const handleConfirmAllocate = async () => {
    if (!selectedCompForModal || !allocationBuyerId) return;
    setIsAllocating(true);
    try {
      const res = await allocateComponent(selectedCompForModal.id, allocationBuyerId, allocationNotes);
      setActionMessage(`Allocated ${res.component_type} to ${res.allocated_to}! Order ID: ${res.transaction_id}`);
      setSelectedCompForModal(null);
      loadMarketplace();
      setTimeout(() => setActionMessage(null), 5000);
    } catch (err: any) {
      alert(`Allocation failed: ${err.message}`);
    } finally {
      setIsAllocating(false);
    }
  };

  const totalDemandValue = components.reduce((acc, c) => acc + (c.is_harvested ? 0 : c.indicative_revenue), 0);
  const availableCount = components.filter(c => !c.is_harvested).length;
  const transactedCount = components.filter(c => c.is_harvested).length;

  const exportManifest = () => {
    const csvContent = "data:text/csv;charset=utf-8," +
      ["ID,Return_ID,Product,Component,Condition,Est_Value,Indicative_Revenue,Matched_Buyer,Status"].join(",") + "\n" +
      components.map(c => [
        c.id,
        c.return_id,
        `"${c.product_name}"`,
        c.component_type,
        c.condition,
        c.estimated_value,
        c.indicative_revenue,
        `"${c.matched_buyer?.name || 'Unmatched'}"`,
        c.is_harvested ? "Transacted" : "Available"
      ].join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relife_b2b_component_manifest_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {actionMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#073E2E] shrink-0" />
            <span className="font-semibold">{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-emerald-700 hover:text-emerald-950 font-bold ml-4">✕</button>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Available Harvest Lots">
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-3xl font-extrabold font-mono text-[#073E2E]">{availableCount}</span>
            <span className="text-[11px] text-slate-500 font-medium">lots listed</span>
          </div>
          <p className="text-[10px] text-emerald-700 mt-1 flex items-center gap-1 font-semibold">
            <Sparkles className="w-3 h-3" />
            <span>100% bench tested & paired</span>
          </p>
        </Card>

        <Card title="Matched B2B Pipeline Value">
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-3xl font-extrabold font-mono text-emerald-700">{formatINR(totalDemandValue)}</span>
            <span className="text-[11px] text-slate-500 font-medium font-mono">{transactedCount} sold</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Sample indicative partner bids</p>
        </Card>

        <Card title="Certified B2B Buyers">
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-3xl font-extrabold font-mono text-sky-700">{buyers.length || 4}</span>
            <span className="text-[11px] text-slate-500 font-medium">active hubs</span>
          </div>
          <p className="text-[10px] text-sky-700 mt-1 flex items-center gap-1 font-semibold">
            <Building2 className="w-3 h-3" />
            <span>Refurbishers & Repair Chains</span>
          </p>
        </Card>

        <Card title="Avg Partner Realization">
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-3xl font-extrabold font-mono text-purple-700">93.8%</span>
            <span className="text-[11px] text-slate-500 font-medium">of fair value</span>
          </div>
          <p className="text-[10px] text-purple-700 mt-1 flex items-center gap-1 font-semibold">
            <ShieldCheck className="w-3 h-3" />
            <span>Verified circular buyers only</span>
          </p>
        </Card>
      </div>

      {/* Main Marketplace Card */}
      <Card
        title="Reusable Electronic Sub-Assemblies & B2B Match Engine"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportManifest}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-[#073E2E] border border-slate-200 text-xs font-semibold cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export B2B Manifest</span>
            </button>
            <button
              type="button"
              onClick={loadMarketplace}
              className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        }
      >
        {/* Filter Bar */}
        <div className="pt-2 pb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 font-mono text-[10px] mr-1 uppercase">Component:</span>
            {[
              { id: 'all', label: 'All Lots' },
              { id: 'display', label: 'Displays' },
              { id: 'motherboard', label: 'Motherboards' },
              { id: 'ram', label: 'RAM' },
              { id: 'storage', label: 'SSD / Storage' },
              { id: 'battery', label: 'Batteries' },
              { id: 'camera_module', label: 'Cameras' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedType(tab.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  selectedType === tab.id
                    ? 'bg-[#073E2E] text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-mono text-[10px] uppercase">Condition:</span>
            {['all', 'Grade A', 'Grade B'].map(cond => (
              <button
                key={cond}
                onClick={() => setSelectedCondition(cond)}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all ${
                  selectedCondition === cond
                    ? 'bg-emerald-100 text-[#073E2E] font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {cond === 'all' ? 'Any Grade' : cond}
              </button>
            ))}
          </div>
        </div>

        {/* Component Grid */}
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#073E2E]" />
            <span>Matching harvestable lots with circular buyer networks...</span>
          </div>
        ) : components.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No components match the selected filter criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
            {components.map(comp => (
              <div
                key={comp.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  comp.is_harvested
                    ? 'bg-slate-50 border-slate-200 opacity-75'
                    : 'bg-white border-slate-200 hover:border-[#073E2E]/40 hover:shadow-md'
                }`}
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider flex items-center gap-1.5">
                      <Cpu className="w-3 h-3 text-[#073E2E]" />
                      <span>{comp.component_type}</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        comp.condition === 'Grade A'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {comp.condition}
                      </span>
                      {comp.is_harvested && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                          Transacted
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Device Title */}
                  <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-1">
                    {comp.product_name}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                    Source: {comp.return_id} • {comp.category}
                  </p>

                  {/* Financials */}
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block font-medium">Estimated Value</span>
                      <span className="text-xs font-mono font-bold text-slate-700">{formatINR(comp.estimated_value)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-emerald-700 block font-medium">Indicative B2B Bid</span>
                      <span className="text-sm font-mono font-extrabold text-[#073E2E]">{formatINR(comp.indicative_revenue)}</span>
                    </div>
                  </div>

                  {/* Matched Buyer Details */}
                  {comp.matched_buyer ? (
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-50/80 border border-slate-200 text-[11px] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">Top Matched Buyer</span>
                        <span className="text-[10px] font-mono font-extrabold text-sky-700">
                          {comp.match_score}% Match
                        </span>
                      </div>
                      <p className="font-bold text-slate-800">{comp.matched_buyer.name}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 text-slate-400" />
                          <span>{comp.matched_buyer.location}</span>
                        </span>
                        <span className="text-emerald-700 font-semibold">
                          {comp.matched_buyer.demand_rating} Demand
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 p-2 rounded-xl bg-slate-50 text-[10px] text-slate-400 text-center">
                      Searching regional partner network...
                    </div>
                  )}

                  <p className="text-[9px] text-slate-400 italic mt-2">
                    * Sample assumption based on secondary parts index.
                  </p>
                </div>

                {/* Action Button */}
                <div className="pt-3 mt-3 border-t border-slate-100">
                  {comp.is_harvested ? (
                    <button
                      type="button"
                      disabled
                      className="w-full py-2 rounded-xl bg-slate-100 text-slate-500 text-xs font-semibold cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                      <span>Transacted to Circular Partner</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenAllocate(comp)}
                      className="w-full py-2 rounded-xl bg-[#073E2E] hover:bg-[#0A533E] text-white font-bold text-xs shadow-sm active:scale-[0.99] cursor-pointer transition-all flex items-center justify-center gap-1.5"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Allocate & Issue Order ({formatINR(comp.indicative_revenue)})</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Allocation Modal */}
      {selectedCompForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-[24px] w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#073E2E]" />
                <h3 className="font-bold text-sm text-slate-900">Allocate Harvested Sub-Assembly</h3>
              </div>
              <button
                onClick={() => setSelectedCompForModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-[10px] text-slate-400 uppercase font-mono">Component Lot</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">
                  {selectedCompForModal.product_name} - {selectedCompForModal.component_type}
                </p>
                <div className="flex gap-4 mt-2 font-mono text-[11px]">
                  <span>Condition: <strong className="text-emerald-700">{selectedCompForModal.condition}</strong></span>
                  <span>Est Fair Value: <strong className="text-slate-800">{formatINR(selectedCompForModal.estimated_value)}</strong></span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Select Circular Buyer Partner</label>
                <select
                  value={allocationBuyerId || ''}
                  onChange={(e) => setAllocationBuyerId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs outline-none focus:border-[#073E2E]"
                >
                  {buyers.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.buyer_type}) — {b.location} [Bid: {Math.round(b.bid_price_factor * 100)}%]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Technician Lot Release Notes</label>
                <textarea
                  rows={2}
                  value={allocationNotes}
                  onChange={(e) => setAllocationNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 text-xs outline-none focus:border-[#073E2E]"
                  placeholder="Bench diagnostic details, serialization pairing..."
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-900 text-[11px]">
                Upon confirmation, an electronic B2B Purchase Order will be generated, and the sub-assembly will be marked as Transacted in the closed-loop recovery audit ledger.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedCompForModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isAllocating}
                onClick={handleConfirmAllocate}
                className="px-5 py-2 rounded-xl bg-[#073E2E] hover:bg-[#0A533E] text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
              >
                {isAllocating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing Transaction...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm B2B Allocation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
