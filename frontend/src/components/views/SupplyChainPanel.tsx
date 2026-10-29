'use client';

import React, { useState, useEffect } from 'react';
import {
  SupplyChainPartner,
  SupplyChainMatchResponse,
  NeededPartItem,
  DispatchRequest,
  DispatchResponse,
} from '../../lib/types';
import {
  fetchSupplyChainMatch,
  fetchSupplyChainPartners,
  dispatchSupplyChainOrder,
} from '../../lib/api';
import { formatINR } from '../../lib/formatters';
import {
  Truck,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  Star,
  Clock,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Cpu,
  Layers,
  Building2,
  ExternalLink,
  ChevronRight,
  PackageCheck,
  Send,
  X,
  Share2,
} from 'lucide-react';

interface SupplyChainPanelProps {
  returnId: string;
  category: string;
  currentPathway: string;
}

export function SupplyChainPanel({
  returnId,
  category,
  currentPathway,
}: SupplyChainPanelProps) {
  const [matchData, setMatchData] = useState<SupplyChainMatchResponse | null>(null);
  const [allPartners, setAllPartners] = useState<SupplyChainPartner[]>([]);
  const [activeTab, setActiveTab] = useState<'recommended' | 'recyclers' | 'components' | 'refurb' | 'resale'>('recommended');
  const [selectedPartFilter, setSelectedPartFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dispatch Action Modal State
  const [dispatchModalPartner, setDispatchModalPartner] = useState<SupplyChainPartner | null>(null);
  const [dispatchActionType, setDispatchActionType] = useState<'dispatch_pickup' | 'order_part' | 'book_refurb' | 'list_resale'>('dispatch_pickup');
  const [dispatchUrgency, setDispatchUrgency] = useState<'instant_express' | 'standard' | 'scheduled'>('instant_express');
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [dispatchSuccessResult, setDispatchSuccessResult] = useState<DispatchResponse | null>(null);

  // Load supply chain matches whenever returnId or currentPathway changes
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);

    Promise.all([
      fetchSupplyChainMatch(returnId).catch((err) => {
        console.warn('Match API warning:', err);
        return null;
      }),
      fetchSupplyChainPartners({ location: 'Chennai' }).catch((err) => {
        console.warn('Partners API warning:', err);
        return [];
      }),
    ])
      .then(([matchRes, partnersRes]) => {
        if (!isMounted) return;
        if (matchRes) setMatchData(matchRes);
        if (partnersRes) setAllPartners(partnersRes);
      })
      .catch((err) => {
        if (isMounted) setErrorMessage(err.message || 'Failed to load supply chain network');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [returnId, currentPathway]);

  // Determine which partners to display based on active tab
  const getFilteredPartners = (): SupplyChainPartner[] => {
    if (activeTab === 'recommended') {
      return matchData?.primary_partners || allPartners.filter((p) => p.pathway === currentPathway);
    }
    if (activeTab === 'recyclers') {
      return allPartners.filter((p) => p.pathway === 'Recycling');
    }
    if (activeTab === 'components') {
      let comps = allPartners.filter((p) => p.pathway === 'Repair');
      if (selectedPartFilter !== 'all') {
        comps = comps.filter((p) => p.part_types.includes(selectedPartFilter) || p.part_types.includes('all'));
      }
      return comps;
    }
    if (activeTab === 'refurb') {
      return allPartners.filter((p) => p.pathway === 'Refurbishment');
    }
    if (activeTab === 'resale') {
      return allPartners.filter((p) => p.pathway === 'Direct Resale' || p.pathway === 'Component Harvesting');
    }
    return allPartners;
  };

  const handleOpenDispatch = (partner: SupplyChainPartner, defaultAction: 'dispatch_pickup' | 'order_part' | 'book_refurb' | 'list_resale' = 'dispatch_pickup') => {
    setDispatchModalPartner(partner);
    setDispatchActionType(defaultAction);
    setDispatchSuccessResult(null);
  };

  const handleConfirmDispatch = async () => {
    if (!dispatchModalPartner) return;
    setIsDispatching(true);
    try {
      const res = await dispatchSupplyChainOrder({
        return_id: returnId,
        partner_id: dispatchModalPartner.id,
        action_type: dispatchActionType,
        urgency: dispatchUrgency,
        item_summary: `${category} recovery triage via ReLife AI`,
      });
      setDispatchSuccessResult(res);
    } catch (err: any) {
      alert(err.message || 'Dispatch booking failed');
    } finally {
      setIsDispatching(false);
    }
  };

  const displayedPartners = getFilteredPartners();
  const neededParts = matchData?.needed_parts || [];

  return (
    <div className="bg-white border border-slate-200/90 rounded-[28px] p-5 lg:p-6 shadow-[0_2px_14px_rgba(0,0,0,0.03)] space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#073E2E] flex items-center justify-center font-bold shrink-0">
            <Truck className="w-5 h-5 text-emerald-800" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Chennai Local Circular Supply Chain & Fulfillment Network
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-[#073E2E] border border-emerald-200">
                Chennai Hub Connected
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live directory of CPCB/TNPCB certified recyclers, Ritchie Street component suppliers, and authorized refurbishment centers in Chennai.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl shrink-0">
          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
          <span>Hub: Guindy / Mount Rd, Chennai</span>
        </div>
      </div>

      {/* Required Replacement Component Detection Alert (e.g. Battery, Display, Switch) */}
      {neededParts.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50/40 border border-amber-200/90 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <h4 className="text-xs font-extrabold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-amber-700" />
                <span>Replacement Component(s) Required ({neededParts.length} detected)</span>
              </h4>
            </div>
            <span className="text-[10px] font-mono text-amber-800 font-bold bg-amber-100/80 px-2 py-0.5 rounded-full">
              Nearest Providers in Ritchie Street & Mount Road
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {neededParts.map((part, idx) => (
              <div
                key={idx}
                className="bg-white/95 backdrop-blur-sm p-3.5 rounded-xl border border-amber-200/80 shadow-xs flex flex-col justify-between gap-2.5"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-emerald-700" />
                      <span className="text-xs font-bold text-slate-900">{part.part_name}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-red-100 text-red-800">
                      {part.urgency}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                    {part.reason}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Est. Cost:</span>
                    <span className="font-mono font-bold text-[#073E2E]">
                      {formatINR(part.estimated_part_cost_inr)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px]">Nearest Chennai Hub:</span>
                    <span className="font-semibold text-slate-700">{part.nearest_supplier_area}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('components');
                      const partner = allPartners.find((p) => p.pathway === 'Repair') || allPartners[0];
                      if (partner) handleOpenDispatch(partner, 'order_part');
                    }}
                    className="py-1.5 px-3 rounded-lg bg-[#073E2E] hover:bg-[#0A533E] text-white text-[11px] font-bold transition-all shadow-xs shrink-0 cursor-pointer"
                  >
                    Order Part Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Tabs: Recommended, Recyclers, Component Providers, Refurb Centers, Resale Outlets */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('recommended')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'recommended'
                ? 'bg-[#073E2E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
            <span>Recommended for {currentPathway}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('recyclers')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'recyclers'
                ? 'bg-[#073E2E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span>♻️ Chennai Recyclers</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('components')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'components'
                ? 'bg-[#073E2E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span>🔌 Ritchie St Parts Hub</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('refurb')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'refurb'
                ? 'bg-[#073E2E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span>🛠️ Refurb Centers (Guindy)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('resale')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'resale'
                ? 'bg-[#073E2E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span>🏪 Re-Commerce Channels</span>
          </button>
        </div>

        {/* Ritchie St Sub-filters for Components */}
        {activeTab === 'components' && (
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-slate-400 font-bold">Filter:</span>
            {['all', 'battery', 'display', 'microswitch', 'motherboard', 'textile'].map((part) => (
              <button
                key={part}
                type="button"
                onClick={() => setSelectedPartFilter(part)}
                className={`px-2 py-0.5 rounded-md font-mono capitalize transition-all cursor-pointer ${
                  selectedPartFilter === part
                    ? 'bg-slate-900 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {part}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Partners List / Card Grid */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin text-[#073E2E]" />
          <span className="text-xs">Locating nearest verified Chennai partners...</span>
        </div>
      ) : displayedPartners.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          No Chennai partners found matching the selected filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedPartners.map((partner) => (
            <div
              key={partner.id}
              className="bg-white border border-slate-200/90 hover:border-emerald-300 rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-all flex flex-col justify-between gap-3"
            >
              <div>
                {/* Partner Card Top */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-extrabold text-slate-900">{partner.name}</h4>
                      {partner.is_authorized && (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md mt-1 inline-block border border-emerald-200/60">
                      {partner.badge_label}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 justify-end font-bold text-xs text-amber-500">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-slate-800 font-mono">{partner.rating}</span>
                      <span className="text-slate-400 text-[10px]">({partner.reviews_count})</span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-emerald-700 block mt-0.5">
                      {partner.distance_km} km away
                    </span>
                  </div>
                </div>

                {/* Location & Address */}
                <div className="mt-2.5 text-[11px] text-slate-600 space-y-1">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{partner.address}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 text-[10px]">
                    <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>Lead Time: {partner.lead_time}</span>
                  </div>
                </div>

                {/* Certifications Pills */}
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {partner.certifications.map((cert, ci) => (
                    <span
                      key={ci}
                      className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[9px] font-mono font-bold"
                    >
                      {cert}
                    </span>
                  ))}
                </div>

                {/* Capabilities */}
                <div className="mt-2 text-[10px] text-slate-500 space-y-0.5">
                  <span className="font-bold text-slate-700">Capabilities: </span>
                  <span>{partner.capabilities.slice(0, 2).join(' • ')}</span>
                </div>
              </div>

              {/* Card Footer: Pricing & Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[9px] text-slate-400 block font-mono">Indicative Rate:</span>
                  <span className="text-xs font-mono font-extrabold text-[#073E2E]">
                    {partner.estimated_pricing_or_payout}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <a
                    href={`tel:${partner.contact_phone}`}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                    title={`Call ${partner.contact_phone}`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>

                  {partner.pathway === 'Repair' ? (
                    <button
                      type="button"
                      onClick={() => handleOpenDispatch(partner, 'order_part')}
                      className="py-1.5 px-3 rounded-xl bg-[#073E2E] hover:bg-[#0A533E] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>Order Part</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : partner.pathway === 'Recycling' ? (
                    <button
                      type="button"
                      onClick={() => handleOpenDispatch(partner, 'dispatch_pickup')}
                      className="py-1.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>Dispatch Pickup</span>
                      <Truck className="w-3.5 h-3.5" />
                    </button>
                  ) : partner.pathway === 'Refurbishment' ? (
                    <button
                      type="button"
                      onClick={() => handleOpenDispatch(partner, 'book_refurb')}
                      className="py-1.5 px-3 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>Book Refurb Bay</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenDispatch(partner, 'list_resale')}
                      className="py-1.5 px-3 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>Direct Resale</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dispatch Action Modal */}
      {dispatchModalPartner && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#073E2E]" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  Chennai Circular Logistics Dispatch
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDispatchModalPartner(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!dispatchSuccessResult ? (
              <div className="space-y-4 text-xs">
                {/* Partner overview */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Designated Partner:</span>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 text-xs">{dispatchModalPartner.name}</span>
                    <span className="font-mono text-emerald-700 font-bold">{dispatchModalPartner.distance_km} km away</span>
                  </div>
                  <p className="text-[11px] text-slate-600">{dispatchModalPartner.address}</p>
                </div>

                {/* Action Type Selection */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Dispatch Action Type:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'dispatch_pickup', label: '🚚 Doorstep Pickup' },
                      { id: 'order_part', label: '🔌 Order Spare Part' },
                      { id: 'book_refurb', label: '🛠️ Book Refurb Bay' },
                      { id: 'list_resale', label: '🏪 Direct Re-Commerce' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDispatchActionType(opt.id as any)}
                        className={`p-2.5 rounded-xl border text-left font-bold transition-all cursor-pointer ${
                          dispatchActionType === opt.id
                            ? 'border-[#073E2E] bg-emerald-50 text-[#073E2E]'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Urgency */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Logistics Priority:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'instant_express', label: '⚡ Hyperlocal (90 min)' },
                      { id: 'standard', label: '📦 Same-Day' },
                      { id: 'scheduled', label: '🗓️ Next Morning' },
                    ].map((urg) => (
                      <button
                        key={urg.id}
                        type="button"
                        onClick={() => setDispatchUrgency(urg.id as any)}
                        className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                          dispatchUrgency === urg.id
                            ? 'border-[#073E2E] bg-emerald-50 text-[#073E2E]'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {urg.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Consent & Safety Notice */}
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 text-[11px] flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#073E2E] shrink-0 mt-0.5" />
                  <span>
                    Auto-generates digital EPR manifest and tracking token. Partner is bound by TNPCB zero-hazardous-spill agreement.
                  </span>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDispatchModalPartner(null)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDispatching}
                    onClick={handleConfirmDispatch}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#073E2E] hover:bg-[#0A533E] text-white font-extrabold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isDispatching ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Confirm Dispatch Order</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Success Confirmation View */
              <div className="space-y-4 text-xs text-center py-2 animate-in zoom-in-95 duration-150">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#073E2E] flex items-center justify-center mx-auto">
                  <PackageCheck className="w-6 h-6 text-emerald-700" />
                </div>

                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">
                    Dispatch Successfully Booked!
                  </h4>
                  <p className="text-slate-600 mt-1">
                    {dispatchSuccessResult.message}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-mono">Consignment ID:</span>
                    <span className="font-mono font-bold text-[#073E2E]">{dispatchSuccessResult.dispatch_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-mono">Estimated Arrival:</span>
                    <span className="font-bold text-slate-800">{dispatchSuccessResult.estimated_arrival_or_pickup}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-mono">Status:</span>
                    <span className="font-mono font-bold text-emerald-700">{dispatchSuccessResult.tracking_status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-mono">Partner Hotline:</span>
                    <span className="font-mono font-bold text-slate-800">{dispatchSuccessResult.contact_hotline}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDispatchModalPartner(null)}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#073E2E] hover:bg-[#0A533E] text-white font-extrabold cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
