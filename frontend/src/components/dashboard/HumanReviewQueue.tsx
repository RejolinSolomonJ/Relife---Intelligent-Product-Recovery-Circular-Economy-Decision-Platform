'use client';

import React from 'react';
import { HumanReviewItem } from '../../lib/types';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import {
  Camera,
  Volume2,
  Smartphone,
  Coffee,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';

interface HumanReviewQueueProps {
  queue: HumanReviewItem[];
  isLoading: boolean;
  onResolveItem?: (item: HumanReviewItem) => void;
  onViewAll?: () => void;
}

export function HumanReviewQueue({
  queue,
  isLoading,
  onResolveItem,
  onViewAll,
}: HumanReviewQueueProps) {
  const getItemIcon = (name: string, index: number) => {
    if (name.includes('GoPro') || name.includes('Cam')) return Camera;
    if (name.includes('JBL') || name.includes('Audio') || name.includes('Sound')) return Volume2;
    if (name.includes('Samsung') || name.includes('iPhone') || name.includes('Pixel')) return Smartphone;
    if (name.includes('Breville') || name.includes('Coffee') || name.includes('Appliance')) return Coffee;
    return Camera;
  };

  const getItemColors = (index: number) => {
    const palette = [
      { bg: 'bg-amber-100 text-amber-700' },
      { bg: 'bg-sky-100 text-sky-700' },
      { bg: 'bg-purple-100 text-purple-700' },
      { bg: 'bg-rose-100 text-rose-700' },
    ];
    return palette[index % palette.length];
  };

  if (isLoading) {
    return (
      <Card title="Upcoming Inspections">
        <div className="space-y-3 py-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // Fallback canonical items from Finora screenshot if queue has fewer items
  const displayItems = queue.length > 0 ? queue.slice(0, 4) : [
    {
      id: 'RET-001',
      return_id: 'RET-001',
      product_name: 'GoPro HERO12 Black 5.3K Action Cam',
      category: 'Cameras',
      reason: 'IMEI / Board barcode label degra...',
      defect_confidence: 91.4,
      recommended_pathway: 'Needs Test',
      required_test: 'Hardware serial interrogation',
      received_date: 'Today',
    },
    {
      id: 'RET-002',
      return_id: 'RET-002',
      product_name: 'JBL Bar 500 Pro Dolby Atmos',
      category: 'Audio',
      reason: 'Liquid ingress marker triggered',
      defect_confidence: 63.8,
      recommended_pathway: 'Needs Test',
      required_test: 'Moisture ingress probe',
      received_date: 'Today',
    },
    {
      id: 'RET-003',
      return_id: 'RET-003',
      product_name: 'Samsung Galaxy S23 Ultra',
      category: 'Smartphones',
      reason: 'Cryptographic display serial mis...',
      defect_confidence: 86.2,
      recommended_pathway: 'Needs Test',
      required_test: 'Display pairing test',
      received_date: 'Today',
    },
    {
      id: 'RET-004',
      return_id: 'RET-004',
      product_name: 'Breville Barista Touch Espresso Machine',
      category: 'Smart Home',
      reason: 'Unusual acoustic anomaly in cool...',
      defect_confidence: 64.1,
      recommended_pathway: 'Needs Test',
      required_test: 'Acoustic chamber test',
      received_date: 'Today',
    },
  ];

  return (
    <Card
      title="Upcoming Inspections"
      action={
        <button
          onClick={onViewAll}
          className="text-xs text-slate-500 hover:text-slate-900 font-semibold flex items-center gap-0.5"
        >
          <span>View All</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      }
    >
      <div className="space-y-3 pt-1">
        {displayItems.map((item, i) => {
          const Icon = getItemIcon(item.product_name, i);
          const color = getItemColors(i);

          return (
            <div
              key={item.id}
              onClick={() => onResolveItem && onResolveItem(item as any)}
              className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-full ${color.bg} flex items-center justify-center shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-800 truncate leading-snug group-hover:text-[#073E2E] transition-colors">
                    {item.product_name}
                  </h4>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    {item.reason}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0 ml-3">
                <span className="block text-xs font-extrabold font-mono text-slate-800">
                  {item.defect_confidence}%
                </span>
                <span className="inline-block text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60 mt-0.5">
                  Needs Test
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
