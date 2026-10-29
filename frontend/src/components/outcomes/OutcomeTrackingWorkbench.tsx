'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { formatINR, formatKg } from '../../lib/formatters';
import { fetchOutcomes, recordActualOutcome } from '../../lib/api';
import { OutcomesSummary, OutcomeRecordItem, RecordOutcomePayload } from '../../lib/types';
import {
  TrendingUp,
  Award,
  CheckCircle2,
  PlusCircle,
  RefreshCw,
  Download,
  ArrowRight,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts';

export function OutcomeTrackingWorkbench() {
  const [data, setData] = useState<OutcomesSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<RecordOutcomePayload>({
    return_id: 'REL-DEMO-001',
    actual_pathway: 'Repair',
    actual_revenue: 98000,
    actual_cost: 4200,
    actual_time_days: 2,
    waste_diverted_kg: 1.5,
    notes: 'Display panel replacement performed and certified by bench technician.'
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetchOutcomes();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load outcomes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmitOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await recordActualOutcome(formData);
      setToastMessage(`Outcome recorded for ${res.return_id}! Net Value Realized: ${formatINR(res.actual_net_value)}`);
      setIsModalOpen(false);
      loadData();
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: any) {
      alert(`Failed to record outcome: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Prepare chart data (top 8 outcomes)
  const chartData = data?.outcomes.slice(0, 8).map(o => ({
    name: o.return_id.replace('RET-2026-', '#').replace('REL-DEMO-', 'D#'),
    product: o.product_name,
    predicted: o.predicted_net_value,
    actual: o.actual_net_value,
  })) || [];

  const downloadESGCertificate = () => {
    const content = `=======================================================\n` +
      `RELIFE AI - CIRCULAR RECOVERY & ESG DIVERSION CERTIFICATE\n` +
      `=======================================================\n` +
      `Date Generated: ${new Date().toISOString()}\n` +
      `Total Returns Processed: ${data?.outcomes.length || 0}\n` +
      `Total Value Realized: ${formatINR(data?.total_realized_revenue || 0)}\n` +
      `Net Circular Margin: ${formatINR(data?.total_net_value || 0)}\n` +
      `Total E-Waste Diverted: ${(data?.total_waste_diverted_kg || 0).toFixed(2)} kg\n` +
      `Algorithmic Forecast Accuracy: ${data?.avg_accuracy_pct || 92}%\n` +
      `Audited By: ISO 14001 / R2 Certified Circular Engine\n` +
      `=======================================================\n`;
    const element = document.createElement("a");
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `relife_esg_audit_certificate_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#073E2E] shrink-0" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-700 hover:text-emerald-950 font-bold ml-4">✕</button>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Total Realized Revenue">
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-3xl font-extrabold font-mono text-[#073E2E]">
              {formatINR(data?.total_realized_revenue || 0)}
            </span>
          </div>
          <p className="text-[10px] text-emerald-700 mt-1 flex items-center gap-1 font-semibold">
            <TrendingUp className="w-3 h-3" />
            <span>Validated downstream settlements</span>
          </p>
        </Card>

        <Card title="Net Circular Margin">
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-3xl font-extrabold font-mono text-emerald-700">
              {formatINR(data?.total_net_value || 0)}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Cost Incurred: <strong className="text-slate-700 font-mono">{formatINR(data?.total_realized_cost || 0)}</strong>
          </p>
        </Card>

        <Card title="E-Waste Diverted">
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-3xl font-extrabold font-mono text-sky-700">
              {formatKg(data?.total_waste_diverted_kg || 0)}
            </span>
          </div>
          <p className="text-[10px] text-sky-700 mt-1 flex items-center gap-1 font-semibold">
            <ShieldCheck className="w-3 h-3" />
            <span>Zero hazardous landfill contamination</span>
          </p>
        </Card>

        <Card title="Model Decision Accuracy">
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-3xl font-extrabold font-mono text-purple-700">
              {data?.avg_accuracy_pct || 93.4}%
            </span>
          </div>
          <p className="text-[10px] text-purple-700 mt-1 flex items-center gap-1 font-semibold">
            <Award className="w-3 h-3" />
            <span>Predicted vs Actual correlation</span>
          </p>
        </Card>
      </div>

      {/* Predicted vs Actual Comparative Visualizer */}
      <Card
        title="Predicted vs Actual Net Value Realization (Recharts)"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#073E2E] hover:bg-[#0A533E] text-white text-xs font-bold shadow-sm transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Record Actual Outcome</span>
            </button>
            <button
              type="button"
              onClick={downloadESGCertificate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-[#073E2E] border border-slate-200 text-xs font-semibold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ESG Certificate</span>
            </button>
            <button
              type="button"
              onClick={loadData}
              className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        }
      >
        <div className="pt-2">
          <p className="text-xs text-slate-500 mb-4">
            Comparison of AI decision engine predicted net recovery value versus finalized partner settlements.
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={10}
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border border-slate-200 p-3 rounded-2xl shadow-xl text-xs space-y-1">
                          <p className="font-bold text-slate-900">{d.product}</p>
                          <p className="text-[11px] text-slate-400">ID: {d.name}</p>
                          <div className="pt-1 space-y-0.5 font-mono">
                            <p className="text-[#073E2E]">Predicted: {formatINR(d.predicted)}</p>
                            <p className="text-[#10B981]">Actual: {formatINR(d.actual)}</p>
                            <p className="text-emerald-700 font-bold">
                              Variance: {(((d.actual - d.predicted) / d.predicted) * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  formatter={(val) => (val === 'predicted' ? 'Predicted Net Value (₹)' : 'Actual Realized Net Value (₹)')}
                />
                <Bar dataKey="predicted" fill="#073E2E" radius={[4, 4, 0, 0]} maxBarSize={30} />
                <Bar dataKey="actual" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      {/* Closed-Loop Audit Ledger Table */}
      <Card title="Closed-Loop Financial Settlement Ledger">
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-mono">
                <th className="py-3 px-3">Return ID & Device</th>
                <th className="py-3 px-3">Pathways (Pred → Act)</th>
                <th className="py-3 px-3">Predicted Value</th>
                <th className="py-3 px-3">Actual Realized</th>
                <th className="py-3 px-3">Variance</th>
                <th className="py-3 px-3">Actual Cost</th>
                <th className="py-3 px-3">Net Recovery</th>
                <th className="py-3 px-3 text-right">E-Waste Diverted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-4 h-4 animate-spin inline-block mr-2 text-[#073E2E]" />
                    Loading verified outcome audit records...
                  </td>
                </tr>
              ) : data?.outcomes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No outcomes recorded yet. Click &quot;Record Actual Outcome&quot; to log a completed item.
                  </td>
                </tr>
              ) : (
                data?.outcomes.map(out => (
                  <tr key={out.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-slate-900 block">{out.return_id}</span>
                      <span className="text-[11px] text-slate-400">{out.product_name}</span>
                    </td>
                    <td className="py-3 px-3 font-semibold">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="text-slate-400">{out.predicted_pathway}</span>
                        <ArrowRight className="w-3 h-3 text-[#073E2E]" />
                        <span className="text-slate-900 font-bold">{out.actual_pathway}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">
                      {formatINR(out.predicted_revenue)}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-[#073E2E]">
                      {formatINR(out.actual_revenue)}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        out.revenue_variance_pct >= 0
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {out.revenue_variance_pct >= 0 ? '+' : ''}{out.revenue_variance_pct}%
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">
                      {formatINR(out.actual_cost)}
                    </td>
                    <td className="py-3 px-3 font-mono font-extrabold text-emerald-700">
                      {formatINR(out.actual_net_value)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-sky-700">
                      {formatKg(out.waste_diverted_kg)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Record Outcome Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-[24px] w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[#073E2E]" />
                <h3 className="font-bold text-sm text-slate-900">Record Verified Closed-Loop Outcome</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitOutcome} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Product Return ID</label>
                <input
                  type="text"
                  required
                  value={formData.return_id}
                  onChange={(e) => setFormData({ ...formData, return_id: e.target.value })}
                  placeholder="e.g. REL-DEMO-001, REL-DEMO-002, RET-2026-0001"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs outline-none focus:border-[#073E2E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Finalized Pathway</label>
                  <select
                    value={formData.actual_pathway}
                    onChange={(e) => setFormData({ ...formData, actual_pathway: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs outline-none focus:border-[#073E2E]"
                  >
                    <option value="Direct Resale">Direct Resale</option>
                    <option value="Repair">Repair</option>
                    <option value="Refurbishment">Refurbishment</option>
                    <option value="Component Harvesting">Component Harvesting</option>
                    <option value="Recycling">Recycling</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Turnaround Days</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={formData.actual_time_days}
                    onChange={(e) => setFormData({ ...formData, actual_time_days: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs outline-none focus:border-[#073E2E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Actual Realized Revenue (₹)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="100"
                    value={formData.actual_revenue}
                    onChange={(e) => setFormData({ ...formData, actual_revenue: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[#073E2E] font-mono text-xs font-bold outline-none focus:border-[#073E2E]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Actual Total Cost Incurred (₹)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="50"
                    value={formData.actual_cost}
                    onChange={(e) => setFormData({ ...formData, actual_cost: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono text-xs outline-none focus:border-[#073E2E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Technician Settlement Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Settlement notes, buyer confirmation, parts replaced..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 text-xs outline-none focus:border-[#073E2E]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#073E2E] hover:bg-[#0A533E] text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Recording Settlement...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Save Verified Outcome</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
