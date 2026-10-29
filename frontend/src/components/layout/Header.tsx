'use client';

import React, { useState } from 'react';
import { DateRange } from '../../lib/types';
import {
  Search,
  Bell,
  ChevronDown,
  Calendar,
  X,
} from 'lucide-react';

interface HeaderProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  isLoading?: boolean;
}

export function Header({
  dateRange,
  onDateRangeChange,
  searchTerm = '',
  onSearchChange,
  isLoading = false,
}: HeaderProps) {
  const [showNotification, setShowNotification] = useState<boolean>(false);
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);

  const ranges: { id: DateRange; label: string }[] = [
    { id: '7d', label: '7 Days' },
    { id: '30d', label: '30 Days' },
    { id: 'all', label: 'All Time' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-[#F4F7F5]/90 backdrop-blur-md px-6 lg:px-8 py-3.5">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-[1800px] mx-auto">
        {/* Left: Search Bar */}
        <div className="relative w-full sm:w-80 lg:w-[420px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            placeholder="Search all products, serials, defects, or pathways..."
            className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200/90 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#073E2E]/20 focus:border-[#073E2E] shadow-sm transition-all"
          />
          {searchTerm && onSearchChange && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: Date Filter, Notifications & Profile */}
        <div className="flex items-center gap-3 justify-end w-full sm:w-auto">
          {/* Date Range Selector */}
          <div className="flex items-center bg-white p-1 rounded-full border border-slate-200/90 shadow-sm">
            <span className="flex items-center pl-2.5 pr-1 text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
            </span>
            {ranges.map((range) => {
              const active = dateRange === range.id;
              return (
                <button
                  key={range.id}
                  onClick={() => onDateRangeChange(range.id)}
                  disabled={isLoading}
                  className={`px-3.5 py-1 rounded-full text-xs font-semibold tracking-tight transition-all ${
                    active
                      ? 'bg-[#073E2E] text-white font-bold shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
                >
                  {range.label}
                </button>
              );
            })}
          </div>

          {/* Notification Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotification(!showNotification)}
              className="relative p-2.5 rounded-full bg-white border border-slate-200/90 text-slate-600 hover:text-slate-900 shadow-sm transition-all hover:bg-slate-50"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center shadow-sm">
                3
              </span>
            </button>
          </div>

          {/* User Profile */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2.5 pl-1.5 pr-3 py-1 bg-white border border-slate-200/90 rounded-full shadow-sm hover:bg-slate-50 transition-all text-left"
            >
              <div className="w-7 h-7 rounded-full bg-[#10B981] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                AK
              </div>
              <div className="hidden sm:block">
                <span className="block text-xs font-bold text-slate-900 leading-tight">
                  Ayesha Khan
                </span>
                <span className="block text-[10px] text-slate-400 font-medium -mt-0.5">
                  Recovery Lead
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
