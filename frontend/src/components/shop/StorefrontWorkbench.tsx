'use client';

import React, { useState, useEffect } from 'react';
import {
  ShopListingItem,
  WaitlistEnquiryItem,
  DemandPerModelItem,
  ReservationItem,
  ShopNotificationItem,
} from '../../lib/types';
import {
  fetchShopListings,
  publishShopListing,
  createWaitlistEnquiry,
  fetchWaitlistEnquiries,
  fetchReservations,
  confirmReservation,
  releaseReservation,
  triggerExpiryCheck,
  fetchShopNotifications,
  seedShopDemo,
} from '../../lib/api';
import { formatINR } from '../../lib/formatters';
import {
  ShoppingBag,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Bell,
  Layers,
  ArrowRight,
  Filter,
  Search,
  PlusCircle,
  TrendingDown,
  RotateCcw,
  Zap,
  Tag,
  DollarSign,
  Users,
  ShieldCheck,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';

interface StorefrontWorkbenchProps {
  initialSubTab?: 'catalog' | 'enquire' | 'waitlist' | 'reservations';
}

export function StorefrontWorkbench({ initialSubTab = 'catalog' }: StorefrontWorkbenchProps) {
  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'enquire' | 'waitlist' | 'reservations'>(initialSubTab);
  
  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const [listings, setListings] = useState<ShopListingItem[]>([]);
  const [enquiries, setEnquiries] = useState<WaitlistEnquiryItem[]>([]);
  const [demandSummary, setDemandSummary] = useState<DemandPerModelItem[]>([]);
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [notifications, setNotifications] = useState<ShopNotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoBookToggle, setAutoBookToggle] = useState<boolean>(true);

  // Pre-Enquiry Form State
  const [enquiryForm, setEnquiryForm] = useState({
    buyer_name: 'Apex Refurb Tech',
    buyer_email: 'contact@apexrefurb.in',
    buyer_type: 'reseller' as 'customer' | 'reseller',
    category: 'Laptop',
    brand: 'Dell',
    model: 'XPS 13',
    min_condition_grade: 'Refurbished',
    max_budget_inr: 58000,
    quantity_requested: 1,
  });

  // Load all shop data
  const loadShopData = async () => {
    setIsLoading(true);
    try {
      const [listingsData, waitlistData, resData, notifData] = await Promise.all([
        fetchShopListings({ category: selectedCategory === 'All' ? undefined : selectedCategory, search: searchQuery || undefined }),
        fetchWaitlistEnquiries(),
        fetchReservations(),
        fetchShopNotifications(),
      ]);
      setListings(listingsData.listings || []);
      setEnquiries(waitlistData.enquiries || []);
      setDemandSummary(waitlistData.demand_per_model || []);
      setReservations(resData.reservations || []);
      setNotifications(notifData.notifications || []);
    } catch (err: any) {
      console.error('Failed to load shop data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadShopData();
  }, [selectedCategory]);

  const showToast = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 5000);
  };

  // 1. Submit Pre-Enquiry
  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await createWaitlistEnquiry(enquiryForm);
      showToast(res.message);
      loadShopData();
      setActiveSubTab('waitlist');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit pre-enquiry');
    }
  };

  // 2. Demo Trigger: Publish Repaired Dell XPS 13
  const handlePublishDemoDellXPS = async () => {
    try {
      const res = await publishShopListing({
        title: 'Dell XPS 13 (9310) - Certified Refurbished Grade A',
        category: 'Laptop',
        brand: 'Dell',
        model: 'XPS 13',
        condition_grade: 'Grade A',
        price_inr: 48000,
        original_msrp: 115000,
        stock_quantity: 1,
        description: 'Repaired screen assembly & hinge with certified OEM parts. Battery health 92%, diagnostic pass.',
        auto_book_on_publish: autoBookToggle,
        image_url: '/api/inspections/image/laptop_clean_pristine.jpg',
      });
      showToast(res.message);
      loadShopData();
      setActiveSubTab('reservations');
    } catch (err: any) {
      showToast(err.message || 'Publishing failed');
    }
  };

  // 3. Confirm Reservation (Buyer buy now)
  const handleConfirmReservation = async (resId: number) => {
    try {
      const res = await confirmReservation(resId);
      showToast(res.message);
      loadShopData();
    } catch (err: any) {
      showToast(err.message || 'Confirmation failed');
    }
  };

  // 4. Release / Expire Hold (Simulate passing to next waitlist buyer)
  const handleReleaseReservation = async (resId: number) => {
    try {
      const res = await releaseReservation(resId);
      showToast(res.message);
      loadShopData();
    } catch (err: any) {
      showToast(err.message || 'Release failed');
    }
  };

  // 5. Reset & Seed Demo Scenario
  const handleResetDemoSeed = async () => {
    try {
      const res = await seedShopDemo();
      showToast(res.message);
      loadShopData();
    } catch (err: any) {
      showToast(err.message || 'Reset failed');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Toast Alert */}
      {actionMessage && (
        <div className="p-4 rounded-2xl bg-[#073E2E] text-white text-xs font-semibold shadow-lg flex items-center justify-between gap-3 animate-in fade-in duration-200 border border-emerald-400/40">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-emerald-200 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-[#E8F5E9] border border-emerald-200/90 p-5 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#073E2E] text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
            <ShoppingBag className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Circular E-Commerce Storefront & Pre-Enquiry Engine
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-200/70 text-[#073E2E] text-[10px] font-bold font-mono">
                /shop
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Certified refurbished devices and components with auto-booking waitlist, 24-hr stock hold & reverse auction pricing.
            </p>
          </div>
        </div>

        {/* Demo Fast-Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handlePublishDemoDellXPS}
            className="px-3.5 py-2 rounded-xl bg-[#073E2E] hover:bg-[#0A533E] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>Publish Repaired Dell XPS 13</span>
          </button>
          <button
            type="button"
            onClick={handleResetDemoSeed}
            className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Demo Enquiries</span>
          </button>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('catalog')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'catalog'
                ? 'bg-[#073E2E] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            🏪 Storefront Catalog ({listings.length})
          </button>
          <button
            onClick={() => setActiveSubTab('enquire')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'enquire'
                ? 'bg-[#073E2E] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            📝 Pre-Enquire (Waitlist Form)
          </button>
          <button
            onClick={() => setActiveSubTab('waitlist')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'waitlist'
                ? 'bg-[#073E2E] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            📊 Retailer Demand Matrix ({enquiries.length} Waiting)
          </button>
          <button
            onClick={() => setActiveSubTab('reservations')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
              activeSubTab === 'reservations'
                ? 'bg-[#073E2E] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ⏳ Active Holds & Allocations ({reservations.length})
            {reservations.some(r => r.status === 'pending') && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 absolute top-1 right-1" />
            )}
          </button>
        </div>

        {/* Retailer Auto-Book on Publish Switch */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
          <label className="text-[11px] font-bold text-slate-700 cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoBookToggle}
              onChange={(e) => setAutoBookToggle(e.target.checked)}
              className="rounded text-[#073E2E] focus:ring-[#073E2E]"
            />
            <span>Auto-book on publish</span>
          </label>
        </div>
      </div>

      {/* TAB 1: STOREFRONT CATALOG */}
      {activeSubTab === 'catalog' && (
        <div className="space-y-6">
          {/* Search & Category Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Category:
              </span>
              {['All', 'Laptop', 'Smartphone', 'Mouse', 'Component', 'Clothing'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#073E2E] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search models, brands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadShopData()}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#073E2E]"
              />
            </div>
          </div>

          {/* Listings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:border-emerald-300 transition-all group"
              >
                <div>
                  {/* Image & Badges */}
                  <div className="relative rounded-2xl overflow-hidden bg-slate-100 h-44 mb-4 flex items-center justify-center border border-slate-100">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                      <span className="px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-xs text-[10px] font-bold text-slate-800 shadow-xs">
                        {item.condition_grade}
                      </span>
                      {item.is_reverse_auction && (
                        <span className="px-2.5 py-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs animate-pulse">
                          <TrendingDown className="w-3 h-3" /> Reverse Auction
                        </span>
                      )}
                    </div>
                    {item.savings_pct > 0 && (
                      <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold shadow-xs">
                        Save {item.savings_pct}%
                      </span>
                    )}
                  </div>

                  {/* Title & Metadata */}
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    {item.category} • {item.brand}
                  </span>
                  <h3 className="text-sm font-extrabold text-slate-900 mt-0.5 line-clamp-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {item.description}
                  </p>

                  {/* Reverse Auction Live Countdown Banner */}
                  {item.is_reverse_auction && item.auction_info && (
                    <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-xs space-y-1">
                      <div className="flex items-center justify-between text-amber-950 font-bold text-[11px]">
                        <span>Next Price Drop:</span>
                        <span className="font-mono text-red-600">
                          {item.auction_info.seconds_to_next_drop}s (–₹{item.auction_info.step_amount})
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>Floor Price: ₹{item.auction_info.floor_price.toLocaleString()}</span>
                        <span>Start: ₹{item.auction_info.start_price.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pricing & Stock Status */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-lg font-black text-[#073E2E] font-mono block">
                      {formatINR(item.price_inr)}
                    </span>
                    {item.original_msrp > 0 && (
                      <span className="text-[11px] text-slate-400 line-through font-mono">
                        MSRP {formatINR(item.original_msrp)}
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    {item.available_quantity > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {item.available_quantity} Available
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                        <Clock className="w-3.5 h-3.5" />
                        Reserved ({item.reservations_count} on hold)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: PRE-ENQUIRY WAITLIST SUBMISSION */}
      {activeSubTab === 'enquire' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Submit Pre-Enquiry Before Stock is Listed
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Tell us what you want to buy. As soon as a returned/refurbished unit or component is published within your budget, the system auto-reserves stock for you on a 24-hour hold.
              </p>
            </div>

            <form onSubmit={handleEnquirySubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Your Full Name / Entity</label>
                  <input
                    type="text"
                    required
                    value={enquiryForm.buyer_name}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, buyer_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email (For 24h Hold Notification)</label>
                  <input
                    type="email"
                    required
                    value={enquiryForm.buyer_email}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, buyer_email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  />
                </div>
              </div>

              {/* Buyer Type Toggle */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Buyer Type</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                    <input
                      type="radio"
                      name="btype"
                      checked={enquiryForm.buyer_type === 'reseller'}
                      onChange={() => setEnquiryForm({ ...enquiryForm, buyer_type: 'reseller' })}
                      className="text-[#073E2E]"
                    />
                    <span>Reseller / B2B Refurbisher</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                    <input
                      type="radio"
                      name="btype"
                      checked={enquiryForm.buyer_type === 'customer'}
                      onChange={() => setEnquiryForm({ ...enquiryForm, buyer_type: 'customer' })}
                      className="text-[#073E2E]"
                    />
                    <span>Individual Customer</span>
                  </label>
                </div>
              </div>

              {/* Desired Product Specs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={enquiryForm.category}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  >
                    <option value="Laptop">Laptop</option>
                    <option value="Smartphone">Smartphone</option>
                    <option value="Mouse">Mouse / Peripheral</option>
                    <option value="Clothing">Clothing / Textile</option>
                    <option value="Component">Component Assembly</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Brand</label>
                  <input
                    type="text"
                    required
                    value={enquiryForm.brand}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, brand: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Model Keyword</label>
                  <input
                    type="text"
                    required
                    value={enquiryForm.model}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, model: e.target.value })}
                    placeholder="e.g. XPS 13, iPhone 14"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Min Condition Grade</label>
                  <select
                    value={enquiryForm.min_condition_grade}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, min_condition_grade: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  >
                    <option value="Like New">Like New (Grade A+)</option>
                    <option value="Grade A">Grade A</option>
                    <option value="Refurbished">Refurbished</option>
                    <option value="Grade B">Grade B</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Max Budget (₹)</label>
                  <input
                    type="number"
                    required
                    value={enquiryForm.max_budget_inr}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, max_budget_inr: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Units Wanted</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={enquiryForm.quantity_requested}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, quantity_requested: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 font-mono font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-[#073E2E] hover:bg-[#0A533E] text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Register Pre-Enquiry in Auto-Booking Waitlist</span>
              </button>
            </form>
          </div>

          {/* Rules Card */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider font-mono">
              ⚡ How First-Come, First-Served Auto-Booking Works
            </h4>
            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-[#073E2E] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 block">Strict Timestamp Order:</span>
                  Allocations occur strictly in order of enquiry submission. Resellers and customers compete fairly based on arrival time.
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 block">24-Hour Guaranteed Hold:</span>
                  Once matched, your unit is held exclusively for you. No double bookings. If not confirmed in 24 hours, it auto-offers to the next buyer.
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                <Bell className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 block">Instant Multi-Channel Notification:</span>
                  You receive an in-app priority alert and console-logged email with direct checkout link.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RETAILER WAITLIST DEMAND MATRIX */}
      {activeSubTab === 'waitlist' && (
        <div className="space-y-6">
          {/* Aggregated Demand Cards */}
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3 font-mono">
              Aggregated Buyer Demand by Model
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {demandSummary.map((d) => (
                <div
                  key={d.model}
                  className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">
                        {d.category}
                      </span>
                      <span className="text-xs font-bold font-mono text-[#073E2E]">
                        {d.total_waiting} Waiting
                      </span>
                    </div>
                    <h4 className="text-xs font-extrabold text-slate-900 mt-2 line-clamp-1">
                      {d.model}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {d.resellers_count} Resellers • {d.customers_count} Customers
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Avg Budget:</span>
                    <span className="font-extrabold font-mono text-slate-900">
                      ₹{d.avg_budget.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Full Enquiries Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                Detailed Waitlist Queue (First-Come First-Served Timestamp Order)
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {enquiries.length} Registered Enquiries
              </span>
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-mono text-[10px] uppercase">
                  <tr>
                    <th className="p-3">Queue #</th>
                    <th className="p-3">Buyer</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Model Wanted</th>
                    <th className="p-3">Min Grade</th>
                    <th className="p-3">Max Budget</th>
                    <th className="p-3">Qty</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {enquiries.map((e, idx) => (
                    <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-400">#{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-900">{e.buyer_name}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          e.buyer_type === 'reseller' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {e.buyer_type}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-800">{e.brand} {e.model}</td>
                      <td className="p-3 text-slate-600">{e.min_condition_grade}</td>
                      <td className="p-3 font-mono font-bold text-slate-900">₹{e.max_budget_inr.toLocaleString()}</td>
                      <td className="p-3 font-mono">{e.quantity_requested}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          e.status === 'matched' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {e.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400 font-mono text-[11px]">{e.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ACTIVE HOLDS & RESERVATIONS STATUS */}
      {activeSubTab === 'reservations' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  Active Stock Holds (24-Hour Exclusivity Windows)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Buyers must confirm within 24 hours. Unconfirmed holds automatically cascade to the next waitlist person.
                </p>
              </div>

              <button
                type="button"
                onClick={() => triggerExpiryCheck().then(loadShopData)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Run Expiry Cascade</span>
              </button>
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-mono text-[10px] uppercase">
                  <tr>
                    <th className="p-3">Hold ID</th>
                    <th className="p-3">Allocated Product</th>
                    <th className="p-3">Reserved Buyer</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Time Remaining</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reservations.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-400">#{r.id}</td>
                      <td className="p-3 font-bold text-slate-900">{r.listing_title}</td>
                      <td className="p-3">
                        <span className="font-semibold block">{r.buyer_name}</span>
                        <span className="text-[10px] text-slate-400">{r.buyer_email}</span>
                      </td>
                      <td className="p-3 font-mono font-bold text-[#073E2E]">
                        ₹{r.reserved_price_inr.toLocaleString()}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : r.status === 'confirmed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {r.status === 'pending' ? '⏳ Reserved for You' : r.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-600">
                        {r.time_remaining_str}
                      </td>
                      <td className="p-3 text-right">
                        {r.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleConfirmReservation(r.id)}
                              className="px-3 py-1 rounded-lg bg-[#073E2E] hover:bg-[#0A533E] text-white font-bold text-[11px] transition-colors cursor-pointer"
                            >
                              Confirm & Buy Now
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReleaseReservation(r.id)}
                              title="Release hold and pass to next waitlist buyer"
                              className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[11px] transition-colors cursor-pointer"
                            >
                              Release to Next →
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No action needed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {reservations.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                        No active stock reservations. Publish a product to trigger auto-booking!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* In-App Notifications List */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#073E2E]" />
                <span>In-App Auto-Booking Notifications</span>
              </span>
              <span className="text-[10px] text-slate-400">
                Email Dispatch logged to system console
              </span>
            </div>

            <div className="space-y-2">
              {notifications.slice(0, 5).map((n) => (
                <div
                  key={n.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs flex items-start justify-between gap-3"
                >
                  <div>
                    <span className="font-bold text-slate-900 block">{n.title}</span>
                    <p className="text-slate-600 mt-0.5">{n.message}</p>
                    <span className="text-[10px] text-slate-400 mt-1 inline-block font-mono">
                      Recipient: {n.user_email} • {n.created_at}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#073E2E] text-[9px] font-bold uppercase shrink-0">
                    Dispatched
                  </span>
                </div>
              ))}
              {notifications.length === 0 && (
                <p className="text-xs text-slate-400 italic py-2">No notifications yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
