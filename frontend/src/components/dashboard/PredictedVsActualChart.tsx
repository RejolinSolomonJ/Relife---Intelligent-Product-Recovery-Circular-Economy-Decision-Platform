'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { PredictedVsActualItem } from '../../lib/types';
import { formatINR } from '../../lib/formatters';
import { Card } from '../ui/Card';
import { ChartSkeleton } from '../ui/Skeleton';

interface PredictedVsActualChartProps {
  data: PredictedVsActualItem[];
  isLoading: boolean;
}

export function PredictedVsActualChart({ data, isLoading }: PredictedVsActualChartProps) {
  if (isLoading) {
    return (
      <Card title="Predicted vs. Actual Recovery Value" subtitle="Forecast precision by circular pathway">
        <ChartSkeleton height="h-64" />
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = data.find((d) => d.pathway === label) || (payload[0].payload as PredictedVsActualItem);
      const diff = item.actual_value - item.predicted_value;
      const diffPct = item.predicted_value > 0 ? (diff / item.predicted_value) * 100 : 0;
      const isPositive = diff >= 0;

      return (
        <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xl text-xs font-mono">
          <div className="text-xs font-bold text-slate-900 mb-1.5 pb-1 border-b border-slate-100 flex items-center justify-between">
            <span>{item.pathway} Pathway</span>
            <span className="text-slate-400 font-normal">{item.count} items</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between gap-6 text-slate-600">
              <span>Predicted Value:</span>
              <span className="font-bold text-[#073E2E]">{formatINR(item.predicted_value, false)}</span>
            </div>
            <div className="flex justify-between gap-6 text-slate-600">
              <span>Actual Realized:</span>
              <span className="font-bold text-[#10B981]">{formatINR(item.actual_value, false)}</span>
            </div>
            <div className="pt-1.5 border-t border-slate-100 flex justify-between gap-6 items-center">
              <span className="text-slate-400">Variance:</span>
              <span
                className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                  isPositive ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'
                }`}
              >
                {isPositive ? '+' : ''}{diffPct.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card
      title="Predicted vs. Realized Recovery"
      action={
        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-mono">
          93.4% Precision
        </span>
      }
    >
      <div className="pt-2">
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="pathway"
                stroke="#94A3B8"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#94A3B8"
                fontSize={10}
                tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                formatter={(val) => (val === 'predicted_value' ? 'Predicted Value' : 'Actual Realized')}
              />
              <Bar
                dataKey="predicted_value"
                name="predicted_value"
                fill="#073E2E"
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
              />
              <Bar
                dataKey="actual_value"
                name="actual_value"
                fill="#10B981"
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}
