'use client';

import React, { useState } from 'react';
import { RegisterProductPayload, RegisterProductResponse } from '../../lib/types';
import { registerProduct } from '../../lib/api';
import { PlusCircle, QrCode, ArrowRight, Sparkles, CheckCircle2, Laptop, Smartphone, AlertTriangle } from 'lucide-react';
import { formatINR } from '../../lib/formatters';

interface Step1Props {
  onRegistered: (data: RegisterProductResponse) => void;
  registeredData: RegisterProductResponse | null;
}

export function Step1Registration({ onRegistered, registeredData }: Step1Props) {
  const [formData, setFormData] = useState<RegisterProductPayload>({
    brand: 'Apple',
    model: 'MacBook Pro 14 (M2 Pro)',
    category: 'Laptop',
    purchase_price: 169900,
    age_months: 7,
    return_reason: 'Cracked screen / cosmetic transit damage',
    warranty_status: 'Active',
    customer_reported_issue: 'Display glass fractured on drop; unit boots and chimed ok',
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fillDemoScenario = (scenarioType: 'laptop_crack' | 'phone_battery' | 'cloth_stained' | 'pristine_resale' | 'blurry_review') => {
    if (scenarioType === 'laptop_crack') {
      setFormData({
        brand: 'Apple',
        model: 'MacBook Pro 14 (M2 Pro)',
        category: 'Laptop',
        purchase_price: 169900,
        age_months: 7,
        return_reason: 'Cracked screen / transit drop',
        warranty_status: 'Active',
        customer_reported_issue: 'Display glass shattered; motherboard and keyboard intact',
      });
    } else if (scenarioType === 'phone_battery') {
      setFormData({
        brand: 'Apple',
        model: 'iPhone 14 Pro',
        category: 'Smartphone',
        purchase_price: 119900,
        age_months: 14,
        return_reason: 'Rapid battery drain / thermal throttling',
        warranty_status: 'Active',
        customer_reported_issue: 'Shuts down below 30% battery charge; minor scratches',
      });
    } else if (scenarioType === 'cloth_stained') {
      setFormData({
        brand: 'Zara / H&M',
        model: 'Summer Floral Maxi Dress',
        category: 'Clothing',
        purchase_price: 4999,
        age_months: 2,
        return_reason: 'Severe chemical/liquid stain & seam tear',
        warranty_status: 'Expired',
        customer_reported_issue: 'Deep wine/chemical stain on fabric weave with ruptured seam; routes to whole-material recycling',
      });
    } else if (scenarioType === 'pristine_resale') {
      setFormData({
        brand: 'Apple',
        model: 'MacBook Air M2',
        category: 'Laptop',
        purchase_price: 114900,
        age_months: 2,
        return_reason: 'Buyer remorse / sealed box opened once',
        warranty_status: 'Active',
        customer_reported_issue: 'Customer bought wrong specification; zero blemishes',
      });
    } else {
      setFormData({
        brand: 'Google',
        model: 'Pixel 7 Pro',
        category: 'Smartphone',
        purchase_price: 72900,
        age_months: 10,
        return_reason: 'Intermittent optical sensor issue',
        warranty_status: 'Active',
        customer_reported_issue: 'Camera photo appears out of focus; unknown board state',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await registerProduct(formData);
      onRegistered(response);
    } catch (err: any) {
      console.error('Registration failed:', err);
      setError(err.message || 'Failed to register product intake');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Scenario Fillers */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#073E2E]" />
          <span className="text-xs font-semibold text-slate-300">Quick Hackathon Scenarios:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fillDemoScenario('laptop_crack')}
            className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-[#2A2D3D] text-[#073E2E] border border-[#FFC21A]/30 transition-all flex items-center gap-1.5"
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>(Demo) Laptop - Cracked Screen</span>
          </button>
          <button
            type="button"
            onClick={() => fillDemoScenario('phone_battery')}
            className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-[#2A2D3D] text-[#F57C00] border border-[#F57C00]/30 transition-all flex items-center gap-1.5"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Phone - Degraded Battery</span>
          </button>
          <button
            type="button"
            onClick={() => fillDemoScenario('cloth_stained')}
            className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>👗 Clothing - Stained Dress (Recycle)</span>
          </button>
          <button
            type="button"
            onClick={() => fillDemoScenario('pristine_resale')}
            className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-[#2A2D3D] text-emerald-400 border border-emerald-500/30 transition-all"
          >
            Pristine - Direct Resale
          </button>
          <button
            type="button"
            onClick={() => fillDemoScenario('blurry_review')}
            className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-[#2A2D3D] text-cyan-400 border border-cyan-500/30 transition-all"
          >
            Blurry - Needs Review
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Registration Form */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-[#073E2E]" />
                <span>Step 1: Product Registration</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Record product identification, age, and customer-reported issue.
              </p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-slate-300">
              Flow 1 of 7
            </span>
          </div>

          {error && (
            <div className="p-3 mb-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Brand Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-white text-xs focus:border-[#073E2E] focus:outline-none transition-colors"
                  placeholder="e.g. Apple, Dell, Lenovo"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Device Model
                </label>
                <input
                  type="text"
                  required
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-white text-xs focus:border-[#073E2E] focus:outline-none transition-colors"
                  placeholder="e.g. MacBook Pro 14 (M2 Pro)"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Product Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-[#073E2E] focus:outline-none transition-colors"
                >
                  <option value="Laptop">Laptop / Ultrabook</option>
                  <option value="Smartphone">Smartphone</option>
                  <option value="Clothing">Clothing & Apparel (Textiles / Dress)</option>
                  <option value="Audio">Audio & Wearables</option>
                  <option value="Tablet">Tablet</option>
                  <option value="Consumer Electronics">Consumer Electronics</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Original Purchase Price (₹)
                </label>
                <input
                  type="number"
                  required
                  min={1000}
                  step={500}
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-white text-xs focus:border-[#073E2E] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Device Age (Months)
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  max={120}
                  value={formData.age_months}
                  onChange={(e) => setFormData({ ...formData, age_months: parseInt(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-white text-xs focus:border-[#073E2E] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Return Reason
                </label>
                <input
                  type="text"
                  required
                  value={formData.return_reason}
                  onChange={(e) => setFormData({ ...formData, return_reason: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-white text-xs focus:border-[#073E2E] focus:outline-none transition-colors"
                  placeholder="e.g. Screen flickering / transit drop"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  OEM Warranty Status
                </label>
                <select
                  value={formData.warranty_status}
                  onChange={(e) => setFormData({ ...formData, warranty_status: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-white text-xs focus:border-[#073E2E] focus:outline-none transition-colors"
                >
                  <option value="Active">Active OEM Coverage</option>
                  <option value="Expired">Warranty Expired</option>
                  <option value="Void">Void (User Damaged)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Customer-Reported Issue Details
              </label>
              <textarea
                rows={2}
                value={formData.customer_reported_issue}
                onChange={(e) => setFormData({ ...formData, customer_reported_issue: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-white text-xs focus:border-[#073E2E] focus:outline-none transition-colors"
                placeholder="Specific symptoms reported by customer upon return intake"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#073E2E] to-[#0A533E] text-slate-950 font-bold text-xs tracking-wide shadow-lg hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span>Registering & Generating QR Passport...</span>
              ) : (
                <>
                  <span>Register Product & Generate Digital Passport</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Digital Passport Preview Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
              <QrCode className="w-5 h-5 text-[#073E2E]" />
              <h4 className="text-sm font-bold text-white">Digital Product Passport</h4>
            </div>

            {registeredData ? (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-300 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Product Registered Successfully</span>
                </div>

                <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center">
                  <img
                    src={registeredData.qr_code_data_url}
                    alt="Recovery Passport QR Code"
                    className="w-36 h-36 rounded-lg bg-white p-2 shadow-md"
                  />
                  <p className="text-[11px] font-mono text-[#073E2E] font-bold mt-2">
                    {registeredData.return_id}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Scan with camera to open Recovery Passport
                  </p>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Product SKU:</span>
                    <span className="font-mono text-slate-200">{registeredData.product_id}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Item:</span>
                    <span className="font-semibold text-slate-200">{registeredData.brand} {registeredData.model}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">MSRP:</span>
                    <span className="font-semibold text-[#073E2E]">{formatINR(registeredData.purchase_price)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Age:</span>
                    <span className="text-slate-200">{registeredData.age_months} months</span>
                  </div>
                </div>

                <a
                  href={`/passport/${registeredData.return_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-center w-full py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-[#252836] text-xs font-semibold text-slate-200 border border-slate-200 transition-all"
                >
                  View Recovery Passport Page ↗
                </a>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 rounded-xl">
                <QrCode className="w-12 h-12 text-slate-600 mb-2" />
                <p className="text-xs font-semibold text-slate-400">Passport Unassigned</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                  Submit the intake form to generate a unique Return ID and scannable QR passport badge.
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <p className="text-[10px] text-slate-500 text-center">
              * QR code embeds standard circular tracking protocol compliant with open passport standards.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

