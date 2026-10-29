'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { RecommendationReportResponse } from '../../../lib/types';
import { getRecommendationReport } from '../../../lib/api';
import { formatINR, formatKg } from '../../../lib/formatters';
import {
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  Leaf,
  Clock,
  Printer,
  ArrowLeft,
  Sparkles,
  Award,
  RefreshCw,
} from 'lucide-react';

export default function PassportPage() {
  const params = useParams();
  const returnId = (params?.id as string) || 'REL-DEMO-001';

  const [report, setReport] = useState<RecommendationReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!returnId) return;
    setIsLoading(true);
    getRecommendationReport(returnId)
      .then((data) => {
        setReport(data);
      })
      .catch((err) => {
        console.error('Error fetching passport report:', err);
        setError('Recovery Passport not found for this product identifier.');
      })
      .finally(() => setIsLoading(false));
  }, [returnId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F7F5] text-slate-800 flex flex-col items-center justify-center p-6 space-y-4 font-sans">
        <RefreshCw className="w-10 h-10 animate-spin text-[#073E2E]" />
        <p className="text-sm font-semibold text-slate-600">
          Decrypting Digital Product Recovery Passport...
        </p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-[#F4F7F5] text-slate-800 flex flex-col items-center justify-center p-6 space-y-4 font-sans text-center">
        <ShieldCheck className="w-12 h-12 text-rose-500" />
        <h2 className="text-lg font-bold text-slate-900">Passport Unverified</h2>
        <p className="text-xs text-slate-500 max-w-sm">{error}</p>
        <a
          href="/"
          className="px-4 py-2 rounded-xl bg-[#073E2E] text-xs font-semibold text-white shadow-sm hover:bg-[#0A533E] transition-colors"
        >
          Return to Platform
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7F5] text-slate-800 font-sans p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <a
            href="/"
            className="flex items-center gap-2 text-xs font-bold text-[#073E2E] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to ReLife AI Platform</span>
          </a>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-mono font-bold text-emerald-800 uppercase tracking-wider">
              Cryptographically Verified Passport
            </span>
          </div>
        </div>

        {/* Passport Certificate Card */}
        <div className="bg-white border border-slate-200/90 rounded-[28px] p-6 sm:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.04)] relative overflow-hidden">
          {/* Subtle Watermark */}
          <div className="absolute right-[-20px] bottom-[-20px] text-slate-100/80 pointer-events-none font-bold text-9xl font-mono select-none">
            RELIFE
          </div>

          <div className="space-y-6 relative z-10">
            {/* Certificate Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-mono text-[#073E2E] font-bold tracking-widest uppercase bg-emerald-50 px-2 py-0.5 rounded-md">
                  Open Circular Product Passport (DPP)
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
                  {report.product_name}
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Official reverse logistics and circular disposition certification.
                </p>
              </div>

              <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm shrink-0">
                {report.qr_code_data_url ? (
                  <img
                    src={report.qr_code_data_url}
                    alt="Passport QR"
                    className="w-24 h-24"
                  />
                ) : (
                  <QrCode className="w-24 h-24 text-slate-800" />
                )}
              </div>
            </div>

            {/* Spec Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-slate-200/80">
                <span className="text-[10px] text-slate-400 block font-medium">Product ID:</span>
                <span className="font-mono font-bold text-slate-800 text-xs mt-0.5 block truncate">
                  {report.return_id}
                </span>
              </div>

              <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-slate-200/80">
                <span className="text-[10px] text-slate-400 block font-medium">Category:</span>
                <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                  {report.category}
                </span>
              </div>

              <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-slate-200/80">
                <span className="text-[10px] text-slate-400 block font-medium">Original MSRP:</span>
                <span className="font-mono font-bold text-[#073E2E] text-xs mt-0.5 block">
                  {formatINR(report.purchase_price)}
                </span>
              </div>

              <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-slate-200/80">
                <span className="text-[10px] text-slate-400 block font-medium">Device Age:</span>
                <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                  {report.age_months} Months
                </span>
              </div>
            </div>

            {/* Circular Disposition Winner */}
            <div className="p-5 rounded-2xl bg-[#E8F5E9] border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#073E2E] uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-[#073E2E]" />
                  Validated Disposition Pathway:
                </span>
                <span className="text-xs font-mono font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                  {report.winner.weighted_score.toFixed(1)} / 100 Score
                </span>
              </div>

              <div className="text-xl font-extrabold text-[#073E2E]">
                {report.winner.pathway}
              </div>

              <p className="text-xs text-slate-700 leading-relaxed">
                {report.winner_rationale}
              </p>
            </div>

            {/* Environmental Impact Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Leaf className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Waste Diverted</span>
                  <span className="text-base font-mono font-bold text-slate-900">
                    {formatKg(report.environmental_impact.waste_diverted_kg)}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">CO₂e Avoided</span>
                  <span className="text-base font-mono font-bold text-slate-900">
                    {report.environmental_impact.co2e_avoided_kg} kg
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Lifecycle Extension</span>
                  <span className="text-base font-mono font-bold text-slate-900">
                    +{report.environmental_impact.lifetime_extension_months} Months
                  </span>
                </div>
              </div>
            </div>

            {/* Confidence Stamp */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 font-mono">
              <div>
                <span>Timestamp: </span>
                <span className="text-slate-800 font-semibold">{report.generated_at} UTC</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Model Confidence: </span>
                <span className="text-[#073E2E] font-bold">
                  {report.confidence_breakdown.overall_recommendation_confidence}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Print Button */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-6 py-3 rounded-2xl bg-[#073E2E] hover:bg-[#0A533E] text-white text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Print Official Recovery Passport</span>
          </button>
        </div>
      </div>
    </div>
  );
}
