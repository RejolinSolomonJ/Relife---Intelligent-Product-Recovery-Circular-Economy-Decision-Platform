'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PathwayDistributionItem } from '../../lib/types';
import { Card } from '../ui/Card';
import { ChartSkeleton } from '../ui/Skeleton';
import { formatINR } from '../../lib/formatters';
import { ChevronDown } from 'lucide-react';

interface PathwayDistributionChartProps {
  data: PathwayDistributionItem[];
  totalValue?: number;
  isLoading: boolean;
  selectedPathway?: string | null;
  onSelectPathway?: (pathway: string) => void;
}

const FINORA_PATHWAY_COLORS: Record<string, string> = {
  Resale: '#073E2E',
  Repair: '#0284C7',
  Refurbish: '#F59E0B',
  Harvest: '#8B5CF6',
  Recycle: '#EC4899',
};

export function PathwayDistributionChart({
  data,
  totalValue = 1515517,
  isLoading,
  selectedPathway,
  onSelectPathway,
}: PathwayDistributionChartProps) {
  if (isLoading) {
    return (
      <Card title="Recovery Overview">
        <ChartSkeleton height="h-64" />
      </Card>
    );
  }

  const enrichedData = data.map((item) => ({
    ...item,
    color: FINORA_PATHWAY_COLORS[item.name] || '#073E2E',
    estimatedValue: Math.round((totalValue * item.percentage) / 100),
  }));

  const totalLakhs = (totalValue / 100000).toFixed(2);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xl text-xs">
          <div className="flex items-center gap-2 mb-1 pb-1 border-b border-slate-100">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="font-bold text-slate-900 text-xs">{item.name} Pathway</span>
          </div>
          <div className="text-xs text-slate-600 space-y-0.5 font-mono">
            <div className="flex justify-between gap-4">
              <span>Volume:</span>
              <span className="font-bold text-slate-900">{item.count} returns ({item.percentage}%)</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Recovered:</span>
              <span className="font-bold text-[#073E2E]">{formatINR(item.estimatedValue)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card
      title="Recovery Overview"
      action={
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-600 cursor-pointer">
          <span>This Month</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </div>
      }
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
        {/* Donut Chart with Center Text */}
        <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={enrichedData}
                cx="50%"
                cy="50%"
                innerRadius={54}
                outerRadius={78}
                paddingAngle={3}
                dataKey="count"
                cursor="pointer"
                onClick={(_, index) => {
                  if (onSelectPathway) {
                    onSelectPathway(enrichedData[index].name);
                  }
                }}
              >
                {enrichedData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke="none"
                    opacity={selectedPathway && selectedPathway !== entry.name ? 0.35 : 1}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Center Callout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-base sm:text-lg font-black font-mono text-slate-900 tracking-tight leading-tight">
              ₹{totalLakhs} L
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              Total Recovered
            </span>
          </div>
        </div>

        {/* Legend on Right */}
        <div className="flex-1 w-full space-y-2 text-xs">
          {enrichedData.map((item) => {
            const isSelected = selectedPathway === item.name;
            const valInLakhs = (item.estimatedValue / 100000).toFixed(2);

            return (
              <button
                key={item.name}
                type="button"
                onClick={() => onSelectPathway && onSelectPathway(item.name)}
                className={`w-full flex items-center justify-between p-1.5 rounded-xl transition-all text-left ${
                  isSelected ? 'bg-emerald-50 ring-1 ring-[#073E2E]' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-semibold text-slate-800 text-xs">{item.name}</span>
                </div>

                <div className="flex items-center gap-3 font-mono text-[11px]">
                  <span className="text-slate-400">{item.percentage}%</span>
                  <span className="font-bold text-slate-700">₹{valInLakhs} L</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
