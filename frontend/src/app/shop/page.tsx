'use client';

import React from 'react';
import { StorefrontWorkbench } from '../../components/shop/StorefrontWorkbench';
import { Leaf, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ShopPage() {
  return (
    <div className="min-h-screen bg-[#F4F7F5] text-slate-800 flex flex-col font-sans">
      {/* Public Storefront Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 px-6 py-4">
        <div className="max-w-[1700px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-xl bg-[#073E2E] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
                <Leaf className="w-4 h-4 fill-current" />
              </div>
              <div className="flex items-center">
                <span className="font-extrabold text-base tracking-tight text-slate-900">ReLife</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-100 text-[#073E2E] text-[10px] font-bold">Store</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="text-slate-500 hidden sm:inline">
              Sustainable Certified Electronics & Textiles
            </span>
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Ops Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-5 sm:p-6 lg:p-8 max-w-[1700px] w-full mx-auto">
        <StorefrontWorkbench />
      </main>

      <footer className="border-t border-slate-200/80 py-4 px-8 text-xs text-slate-400 bg-white/60 mt-8 text-center">
        ReLife AI Storefront • Circular Product Pre-Enquiry & Reservation Engine • All sample figures labeled
      </footer>
    </div>
  );
}

