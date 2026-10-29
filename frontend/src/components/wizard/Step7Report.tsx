'use client';

import React, { useState, useEffect } from 'react';
import { RecommendationReportResponse } from '../../lib/types';
import { getRecommendationReport } from '../../lib/api';
import { formatINR, formatKg } from '../../lib/formatters';
import {
  FileText,
  Printer,
  Download,
  CheckCircle2,
  Award,
  Sparkles,
  QrCode,
  ShieldCheck,
  TrendingUp,
  Leaf,
  Clock,
  RefreshCw,
  Info,
  ExternalLink,
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

interface Step7Props {
  returnId: string;
}

const PATHWAY_CHART_COLORS: Record<string, string> = {
  'Direct Resale': '#10B981',
  Repair: '#0284C7',
  Refurbishment: '#F59E0B',
  'Component Harvesting': '#8B5CF6',
  Recycling: '#073E2E',
};

export function Step7Report({ returnId }: Step7Props) {
  const [report, setReport] = useState<RecommendationReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!returnId) return;
    setIsLoading(true);
    getRecommendationReport(returnId)
      .then((res) => {
        setReport(res);
      })
      .catch((err) => {
        console.error('Failed to load report:', err);
        setError('Failed to generate recommendation report.');
      })
      .finally(() => setIsLoading(false));
  }, [returnId]);

  const handlePrintPdf = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200/90 rounded-[24px] p-12 text-center text-slate-500 space-y-3 font-sans">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#073E2E]" />
        <p className="text-sm font-bold text-slate-900">Synthesizing Explainable Recommendation Report...</p>
        <p className="text-xs text-slate-400">Compiling computer vision inferences, bench tests, and circular economics</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="bg-white border border-slate-200/90 rounded-[24px] p-8 text-center text-rose-600 space-y-2 font-sans">
        <p className="text-sm font-bold">{error || 'Report generation error.'}</p>
      </div>
    );
  }

  const chartData = report.ranked_pathways.map((p) => ({
    name: p.pathway,
    nrv: Math.max(0, p.net_recovery_value),
    revenue: p.expected_revenue,
    cost: p.expected_cost,
    color: PATHWAY_CHART_COLORS[p.pathway] || '#073E2E',
    isSafetyOverride: p.is_safety_override,
    isWinner: p.rank === 1,
  }));

  return (
    <div className="space-y-6 font-sans print:m-0 print:p-0">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200/90 p-4 rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] print:hidden">
        <div>
          <span className="text-[10px] font-mono text-[#073E2E] uppercase tracking-wider font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
            Certified Circular Disposition
          </span>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 mt-1">
            <FileText className="w-5 h-5 text-[#073E2E]" />
            <span>Product Recovery Recommendation Report</span>
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrintPdf}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#073E2E] hover:bg-[#0A533E] text-white text-xs font-bold shadow-md active:scale-[0.98] transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-300" />
            <span>Download Report as PDF</span>
          </button>
        </div>
      </div>

      {/* Hero Winner Banner */}
      <div className="p-6 rounded-[28px] bg-[#E8F5E9] border border-emerald-300 shadow-[0_4px_20px_rgba(7,62,46,0.08)] relative overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#073E2E] text-white font-mono font-bold text-xs uppercase tracking-wider shadow-sm">
                Rank #1 Recommendation
              </span>
              <span className="text-xs font-mono text-emerald-800 font-bold">
                Return ID: {report.return_id}
              </span>
            </div>

            <h2 className="text-2xl font-black text-[#073E2E] mt-1">
              Recommended Pathway: {report.winner.pathway}
            </h2>

            <p className="text-xs text-slate-700 leading-relaxed font-sans">
              {report.winner_rationale}
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-200 text-right shrink-0 shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono block font-bold">
              Net Recovery Value
            </span>
            <span className="text-2xl font-mono font-extrabold text-[#073E2E]">
              {formatINR(report.winner.net_recovery_value)}
            </span>
            <div className="text-[10px] text-slate-500 mt-1">
              Rev: {formatINR(report.winner.expected_revenue)} • Cost: {formatINR(report.winner.expected_cost)}
            </div>
          </div>
        </div>

        {/* 3 Separate Confidence Ratings */}
        <div className="mt-5 pt-4 border-t border-emerald-200/80 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-white border border-emerald-100 shadow-sm">
            <span className="text-[10px] text-slate-400 block font-medium">Optical Defect Confidence:</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-base font-bold font-mono text-[#073E2E]">
                {report.confidence_breakdown.detection_confidence}%
              </span>
              <span className="text-[10px] text-slate-400">OpenCV Preprocessed</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-emerald-100 shadow-sm">
            <span className="text-[10px] text-slate-400 block font-medium">Hardware Condition Confidence:</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-base font-bold font-mono text-sky-700">
                {report.confidence_breakdown.condition_confidence}%
              </span>
              <span className="text-[10px] text-slate-400">Bench Diagnostics</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-emerald-100 shadow-sm">
            <span className="text-[10px] text-slate-400 block font-medium">Overall Decision Confidence:</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-base font-bold font-mono text-emerald-700">
                {report.confidence_breakdown.overall_recommendation_confidence}%
              </span>
              <span className="text-[10px] text-slate-400">Multi-Criteria Score</span>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Chart & Passport QR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Net Value Comparison Bar Chart (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#073E2E]" />
                <span>5-Pathway Comparative Net Recovery Value (₹ INR)</span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Comparative yield analysis showing profit realization after operational overhead
              </p>
            </div>
            <span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
              estimated
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 60, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#94A3B8"
                  fontSize={10}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#64748B"
                  fontSize={11}
                  width={110}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Net Value']}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: '16px',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  }}
                />
                <Bar dataKey="nrv" radius={[0, 8, 8, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isWinner ? '#073E2E' : entry.isSafetyOverride ? '#CBD5E1' : entry.color}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Digital Product Passport Badge (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <QrCode className="w-4 h-4 text-[#073E2E]" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                Recovery Passport
              </h4>
            </div>

            <div className="flex justify-center p-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
              {report.qr_code_data_url ? (
                <img
                  src={report.qr_code_data_url}
                  alt="Recovery Passport QR"
                  className="w-32 h-32"
                />
              ) : (
                <div className="w-32 h-32 flex items-center justify-center text-xs text-slate-400">
                  QR Pending
                </div>
              )}
            </div>

            <div className="text-center">
              <span className="text-xs font-mono font-bold text-slate-800 block">
                {report.return_id}
              </span>
              <a
                href={`/passport/${report.return_id}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#073E2E] font-bold hover:underline inline-flex items-center gap-1 mt-1"
              >
                <span>Open Public Passport Page</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-1.5 text-[11px] pt-2 border-t border-slate-100">
              <div className="flex justify-between text-slate-600">
                <span>Waste Diverted:</span>
                <span className="font-mono text-emerald-800 font-bold">
                  {formatKg(report.environmental_impact.waste_diverted_kg)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>CO₂e Avoided:</span>
                <span className="font-mono text-emerald-800 font-bold">
                  {report.environmental_impact.co2e_avoided_kg} kg
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Life Extension:</span>
                <span className="font-mono text-slate-800 font-bold">
                  +{report.environmental_impact.lifetime_extension_months} months
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fallback Rationale: Why Others Ranked Lower */}
      <div className="bg-white border border-slate-200/90 rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
          <Info className="w-4 h-4 text-[#073E2E]" />
          <span>Why Other Pathways Ranked Lower</span>
        </h4>
        <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 text-xs font-sans text-slate-700 whitespace-pre-line leading-relaxed">
          {report.fallback_rationale}
        </div>
      </div>
    </div>
  );
}
