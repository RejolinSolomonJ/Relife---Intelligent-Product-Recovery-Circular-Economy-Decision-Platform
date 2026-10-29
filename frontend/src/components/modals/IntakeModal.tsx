'use client';

import React, { useState, useEffect } from 'react';
import { ProductItem, CreateReturnPayload } from '../../lib/types';
import { fetchProducts, createReturn } from '../../lib/api';
import { X, PlusCircle, CheckCircle2, AlertCircle, ScanLine, Sparkles, Camera } from 'lucide-react';
import { formatINR } from '../../lib/formatters';
import { useNavigation } from '../../context/NavigationContext';

interface IntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function IntakeModal({ isOpen, onClose, onSuccess }: IntakeModalProps) {
  const { setActiveTab } = useNavigation();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [returnReason, setReturnReason] = useState<string>('Customer return - cosmetic inspection');
  const [defectCategory, setDefectCategory] = useState<string>('scratch');
  const [defectSeverity, setDefectSeverity] = useState<string>('minor');
  const [defectDesc, setDefectDesc] = useState<string>('Light hairline scratch on outer surface');
  const [needsReview, setNeedsReview] = useState<boolean>(false);
  const [reviewReason, setReviewReason] = useState<string>('Low defect confidence score');
  const [requiredTest, setRequiredTest] = useState<string>('Manual optical microscope check');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchProducts().then((prods) => {
        setProducts(prods);
        if (prods.length > 0 && !selectedProductId) {
          setSelectedProductId(prods[0].id);
        }
      });
      setFeedback(null);
    }
  }, [isOpen, selectedProductId]);

  if (!isOpen) return null;

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;

    setIsSubmitting(true);
    setFeedback(null);

    const payload: CreateReturnPayload = {
      product_id: selectedProductId,
      return_reason: returnReason,
      defect_category: defectCategory,
      defect_severity: defectSeverity,
      defect_description: defectDesc,
      needs_human_review: needsReview,
      review_reason: needsReview ? reviewReason : undefined,
      required_test: needsReview ? requiredTest : undefined,
    };

    try {
      const res = await createReturn(payload);
      setFeedback(`Return ${res.return_id} registered successfully! Assigned pathway: ${res.recommended_pathway}`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setFeedback(`Failed to register return: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#073E2E] flex items-center justify-center">
              <ScanLine className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-sans">
                Quick Product Return Intake
              </h3>
              <p className="text-[11px] text-slate-400">
                Register device, evaluate defect taxonomy, and trigger AI triage
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto text-xs">
          {/* Direct Camera Inspection CTA */}
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/90 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 text-slate-800">
              <div className="w-7 h-7 rounded-lg bg-emerald-200/80 text-[#073E2E] flex items-center justify-center shrink-0">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-slate-900 block">Want Live Camera Optical Inspection?</span>
                <span className="text-[10px] text-slate-500">Capture with webcam, check fabric / electronics & run OpenCV</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                setActiveTab('inspections');
              }}
              className="px-3 py-1.5 rounded-xl bg-[#073E2E] hover:bg-[#0A533E] text-white font-bold text-xs transition-colors shrink-0 shadow-xs cursor-pointer"
            >
              Open Camera →
            </button>
          </div>
          {feedback && (
            <div
              className={`p-3 rounded-xl flex items-center gap-2 ${
                feedback.includes('successfully')
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {feedback.includes('successfully') ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="font-medium text-xs">{feedback}</span>
            </div>
          )}

          {/* Select Product */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5">Select Product Catalog Model</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#073E2E]"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.category}] {p.brand} {p.model} ({formatINR(p.msrp_inr, true)})
                </option>
              ))}
            </select>
            {selectedProduct && (
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                <span>Weight: {selectedProduct.weight_kg} kg</span>
                <span>Original MSRP: {formatINR(selectedProduct.msrp_inr, false)}</span>
              </div>
            )}
          </div>

          {/* Return Reason */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5">Return Reason</label>
            <select
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#073E2E]"
            >
              <option value="Customer return - cosmetic inspection">Customer return - cosmetic inspection</option>
              <option value="Buyer remorse / unopened packaging">Buyer remorse / unopened packaging</option>
              <option value="Battery discharge / thermal fault">Battery discharge / thermal fault</option>
              <option value="Transit handling impact / cracked casing">Transit handling impact / cracked casing</option>
              <option value="Missing component accessory">Missing component accessory</option>
              <option value="Automated optical inspection anomaly">Automated optical inspection anomaly</option>
            </select>
          </div>

          {/* Defect Classification */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">Defect Category</label>
              <select
                value={defectCategory}
                onChange={(e) => setDefectCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#073E2E]"
              >
                <option value="scratch">Scratch (Surface wear)</option>
                <option value="crack">Crack (Housing / Glass)</option>
                <option value="dent">Dent (Frame impact)</option>
                <option value="battery fault">Battery / Power Fault</option>
                <option value="missing part">Missing Accessory / Part</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">Severity</label>
              <select
                value={defectSeverity}
                onChange={(e) => setDefectSeverity(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#073E2E]"
              >
                <option value="minor">Minor (Cosmetic only)</option>
                <option value="moderate">Moderate (Module repair)</option>
                <option value="severe">Severe (Salvage / Harvest)</option>
              </select>
            </div>
          </div>

          {/* Defect Description */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5">Inspection Notes</label>
            <input
              type="text"
              value={defectDesc}
              onChange={(e) => setDefectDesc(e.target.value)}
              placeholder="e.g. Minor scratches near bezel, display intact"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#073E2E]"
            />
          </div>

          {/* Human Review Checkbox */}
          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={needsReview}
                onChange={(e) => setNeedsReview(e.target.checked)}
                className="w-4 h-4 rounded text-[#073E2E] focus:ring-[#073E2E] border-slate-300"
              />
              <span className="font-semibold text-slate-800">
                Flag for Technician Bench Test Review
              </span>
            </label>
            {needsReview && (
              <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200/60 space-y-2">
                <div>
                  <span className="text-[10px] text-amber-800 font-bold block mb-1">Review Reason</span>
                  <input
                    type="text"
                    value={reviewReason}
                    onChange={(e) => setReviewReason(e.target.value)}
                    className="w-full bg-white border border-amber-200 rounded-lg px-2.5 py-1 text-slate-800 text-xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-amber-800 font-bold block mb-1">Required Diagnostic</span>
                  <input
                    type="text"
                    value={requiredTest}
                    onChange={(e) => setRequiredTest(e.target.value)}
                    className="w-full bg-white border border-amber-200 rounded-lg px-2.5 py-1 text-slate-800 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedProductId}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#073E2E] hover:bg-[#053023] text-white font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Evaluating...' : 'Ingest & Route Return'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

