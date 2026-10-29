'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DateRange, DashboardResponse, RecentReturnItem, HumanReviewItem } from '../lib/types';
import { fetchDashboardData, runAITriage } from '../lib/api';
import { Header } from '../components/layout/Header';
import { HeroBanner } from '../components/dashboard/HeroBanner';
import { PathwayDistributionChart } from '../components/dashboard/PathwayDistributionChart';
import { ValueOverTimeChart } from '../components/dashboard/ValueOverTimeChart';
import { RecoveryRateGauge } from '../components/dashboard/RecoveryRateGauge';
import { EcoImpactCard } from '../components/dashboard/EcoImpactCard';
import { CommonDefectsChart } from '../components/dashboard/CommonDefectsChart';
import { PredictedVsActualChart } from '../components/dashboard/PredictedVsActualChart';
import { RecentReturnsTable } from '../components/dashboard/RecentReturnsTable';
import { HumanReviewQueue } from '../components/dashboard/HumanReviewQueue';
import { EcoQuoteCard } from '../components/dashboard/EcoQuoteCard';
import { IntakeModal } from '../components/modals/IntakeModal';
import { ReturnDetailModal } from '../components/modals/ReturnDetailModal';
import { ResolveReviewModal } from '../components/modals/ResolveReviewModal';
import { WorkableTabViews } from '../components/views/WorkableTabViews';
import { useNavigation } from '../context/NavigationContext';
import { AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Global search & filter state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedReturn, setSelectedReturn] = useState<RecentReturnItem | null>(null);
  const [selectedReviewItem, setSelectedReviewItem] = useState<HumanReviewItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const {
    activeTab,
    setActiveTab,
    selectedPathwayFilter,
    setSelectedPathwayFilter,
    selectedDefectFilter,
    setSelectedDefectFilter,
    isAddModalOpen,
    setIsAddModalOpen,
  } = useNavigation();

  const loadData = useCallback(async (range: DateRange) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchDashboardData(range);
      setData(response);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(
        'Unable to connect to the ReLife FastAPI backend. Please ensure the backend server is running on port 8000.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(dateRange);
  }, [dateRange, loadData]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleRunTriage = async () => {
    try {
      showToast('Running automated AI diagnostic triage across pending inventory...');
      const res = await runAITriage();
      showToast(res.message || 'AI Triage completed successfully!');
      loadData(dateRange);
    } catch (err: any) {
      showToast(`Triage failed: ${err.message}`);
    }
  };

  const handleOpenReviewQueue = () => {
    const el = document.getElementById('review-queue-card');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      setActiveTab('inspections');
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-[#F4F7F5] text-slate-800 flex flex-col font-sans">
      {/* Top Navigation Bar with Search, Profile & Date Filter */}
      <Header
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        isLoading={isLoading}
      />

      {/* Floating Action Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#073E2E] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom-3 duration-200 border border-emerald-500/40">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-5 sm:p-6 lg:p-7 max-w-[1800px] w-full mx-auto space-y-6">
        {/* Error notification banner if backend is unreachable */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 flex items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <div className="text-xs">
                <span className="font-bold">Connection Notice:</span> {error}
              </div>
            </div>
            <button
              onClick={() => loadData(dateRange)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        )}

        {/* Alternate Dedicated Tab View if a sub-tab is clicked */}
        {activeTab !== 'dashboard' ? (
          <WorkableTabViews onOpenIntake={() => setIsAddModalOpen(true)} />
        ) : (
          /* 3-Column Finora Executive Dashboard Layout */
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Hero Banner + Monthly Bar Chart */}
              <div className="lg:col-span-12 xl:col-span-5 space-y-6 flex flex-col">
                {/* Interactive Finora Hero Card with Quick Action Buttons */}
                <HeroBanner
                  kpis={data?.kpis || null}
                  isLoading={isLoading}
                  onOpenIntake={() => setIsAddModalOpen(true)}
                  onOpenScan={() => setActiveTab('inspections')}
                  onRunTriage={handleRunTriage}
                  onOpenReviewQueue={handleOpenReviewQueue}
                  onOpenTransfer={() => setActiveTab('recommendations')}
                />

                {/* Monthly Recovery Velocity */}
                <ValueOverTimeChart
                  data={data?.value_over_time || []}
                  isLoading={isLoading}
                />
              </div>

              {/* Middle Analytics Column: Recovery Overview Donut + Circular Progress */}
              <div className="lg:col-span-6 xl:col-span-4 space-y-6 flex flex-col">
                {/* Recovery Overview Donut Chart */}
                <PathwayDistributionChart
                  data={data?.pathway_distribution || []}
                  totalValue={data?.kpis?.value_recovered_inr || 1515517}
                  isLoading={isLoading}
                  selectedPathway={selectedPathwayFilter}
                  onSelectPathway={(pw) => {
                    setSelectedPathwayFilter(
                      selectedPathwayFilter === pw ? null : pw
                    );
                  }}
                />

                {/* Circular Recovery Rate Progress Gauge with Yield % & Callout */}
                <RecoveryRateGauge
                  rate={data?.kpis?.recovery_rate_pct || 67.3}
                />
              </div>

              {/* Right Insights Column: E-Waste Diverted + Upcoming Inspections */}
              <div className="lg:col-span-6 xl:col-span-3 space-y-6 flex flex-col">
                {/* E-Waste Diverted Card */}
                <EcoImpactCard
                  wasteDivertedKg={data?.kpis?.waste_diverted_kg || 63.7}
                  onExplore={() => setActiveTab('recommendations')}
                />

                {/* Upcoming Inspections List */}
                <div id="review-queue-card">
                  <HumanReviewQueue
                    queue={data?.human_review_queue || []}
                    isLoading={isLoading}
                    onResolveItem={(item) => setSelectedReviewItem(item)}
                    onViewAll={() => setActiveTab('inspections')}
                  />
                </div>
              </div>
            </div>

            {/* Lower Section: Recent Returns Triage (Full Width) */}
            <RecentReturnsTable
              returns={data?.recent_returns || []}
              isLoading={isLoading}
              onSelectReturn={(item) => setSelectedReturn(item)}
              pathwayFilter={selectedPathwayFilter}
              onClearPathwayFilter={() => setSelectedPathwayFilter(null)}
              defectFilter={selectedDefectFilter}
              onClearDefectFilter={() => setSelectedDefectFilter(null)}
              externalSearchTerm={searchTerm}
              onOpenIntake={() => setIsAddModalOpen(true)}
            />

            {/* Bottom 3-Card Analytics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <CommonDefectsChart
                data={data?.common_defects || []}
                isLoading={isLoading}
                selectedDefect={selectedDefectFilter}
                onSelectDefect={(def) => {
                  setSelectedDefectFilter(
                    selectedDefectFilter === def ? null : def
                  );
                }}
              />

              <PredictedVsActualChart
                data={data?.predicted_vs_actual || []}
                isLoading={isLoading}
              />

              <EcoQuoteCard />
            </div>
          </div>
        )}
      </main>

      {/* Global Clean Professional Footer */}
      <footer className="border-t border-slate-200/80 py-4 px-8 text-xs text-slate-400 bg-white/60 backdrop-blur-sm mt-8">
        <div className="flex flex-col sm:flex-row items-center justify-between max-w-[1800px] mx-auto gap-2">
          <span>ReLife AI • Universal Circular Product Recovery OS</span>
          <span>Enterprise Fleet Recovery Engine</span>
        </div>
      </footer>

      {/* Modal Dialogs */}
      {isAddModalOpen && (
        <IntakeModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false);
            showToast('Return item successfully registered and evaluated!');
            loadData(dateRange);
          }}
        />
      )}

      {selectedReturn && (
        <ReturnDetailModal
          item={selectedReturn}
          onClose={() => setSelectedReturn(null)}
        />
      )}

      {selectedReviewItem && (
        <ResolveReviewModal
          item={selectedReviewItem}
          onClose={() => setSelectedReviewItem(null)}
          onSuccess={() => {
            setSelectedReviewItem(null);
            showToast('Human bench test resolved and pathway updated!');
            loadData(dateRange);
          }}
        />
      )}
    </div>
  );
}
