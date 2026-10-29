'use client';

import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  ScanEye,
  Sparkles,
  ShoppingBag,
  CheckCircle2,
  FileBarChart2,
  Settings,
  Leaf,
  Sprout,
  Store,
  Users,
  TrendingDown,
  Calculator,
  Bot,
  ArrowRight,
} from 'lucide-react';
import { useNavigation, NavigationTab } from '../../context/NavigationContext';

interface NavItem {
  id: NavigationTab;
  name: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
  { id: 'register', name: 'Register Product', icon: PlusCircle },
  { id: 'inspections', name: 'Inspections', icon: ScanEye },
  { id: 'recommendations', name: 'Recommendations', icon: Sparkles },
  { id: 'shop', name: 'Shop Storefront', icon: Store },
  { id: 'waitlist', name: 'Waitlist & Demand', icon: Users },
  { id: 'pricing', name: 'Dynamic Pricing', icon: TrendingDown },
  { id: 'roi', name: 'ROI Business Case', icon: Calculator },
  { id: 'assistant', name: 'AI Assistant', icon: Bot },
  { id: 'marketplace', name: 'Marketplace', icon: ShoppingBag },
  { id: 'outcomes', name: 'Outcomes', icon: CheckCircle2 },
  { id: 'reports', name: 'Reports', icon: FileBarChart2 },
  { id: 'settings', name: 'Settings', icon: Settings },
];

export function Sidebar() {
  const { activeTab, setActiveTab } = useNavigation();

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none z-30 font-sans shadow-sm">
      <div className="flex flex-col h-full justify-between p-4 overflow-y-auto">
        <div>
          {/* Top Brand Logo */}
          <div
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-3 mb-6 px-2 pt-1 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#073E2E] flex items-center justify-center text-white shadow-md shadow-emerald-950/20 group-hover:scale-105 transition-transform">
              <Leaf className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center">
                <span className="font-extrabold text-base tracking-tight text-slate-900 font-sans">
                  ReLife
                </span>
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-emerald-100 text-[#073E2E] text-[10px] font-bold">
                  AI
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                Smart. Circular. Better Tomorrow.
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-150 cursor-pointer text-left ${
                    isActive
                      ? 'bg-[#073E2E] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sustainability Card */}
        <div className="p-4 rounded-2xl bg-[#E8F5E9] border border-emerald-100 space-y-2.5 mt-6">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#073E2E] flex items-center justify-center">
            <Sprout className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 leading-snug">
              Small steps divert big waste
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Track. Salvage. Restore.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className="w-full py-2 rounded-xl bg-[#073E2E] hover:bg-[#0A533E] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span>Set a Goal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
