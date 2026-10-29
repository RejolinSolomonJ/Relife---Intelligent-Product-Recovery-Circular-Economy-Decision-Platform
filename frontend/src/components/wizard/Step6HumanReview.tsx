'use client';

import React, { useState } from 'react';
import { EvaluateDecisionResponse } from '../../lib/types';
import { resolveHumanReview } from '../../lib/api';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Stethoscope,
  ArrowRight,
  ClipboardCheck,
  Check,
  Sparkles,
  Info,
} from 'lucide-react';

interface Step6Props {
  returnId: string;
  decisionData: EvaluateDecisionResponse | null;
  onReviewResolved: () => void;
}

export function Step6HumanReview({
  returnId,
  decisionData,
  onReviewResolved,
}: Step6Props) {
  const [selectedPathway, setSelectedPathway] = useState<string>(
    decisionData?.winner.pathway || 'Repair'
  );
  const [notes, setNotes] = useState<string>(
    'Technician executed required diagnostic checklist; verified physical integrity.'
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [resolvedSuccess, setResolvedSuccess] = useState<boolean>(false);

  const isReviewRequired = decisionData?.human_review_required ?? false;
  const requiredTests = decisionData?.required_tests ?? [];

  const handleResolve = async (action: 'confirm' | 'override') => {
    if (!returnId) return;
    setIsSubmitting(true);

    try {
      await resolveHumanReview(returnId, {
        action: action === 'confirm' ? 'pass' : 'override',
        pathway: selectedPathway,
        notes: notes,
      });
      setResolvedSuccess(true);
      setTimeout(() => {
        onReviewResolved();
      }, 1000);
    } catch (err) {
      console.error('Failed to resolve review:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {isReviewRequired ? (
        <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 shadow-xl space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-[#073E2E]">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Human Review Triggered — Bench Inspection Required
              </h3>
              <p className="text-xs text-amber-300/90 mt-0.5">
                Automated triage flagged low optical confidence or unresolved test variables. Product cannot proceed to secondary disposition without technician sign-off.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Automated Verification Cleared
              </h3>
              <p className="text-xs text-emerald-300/90 mt-0.5">
                All visual captures and functional bench tests meet minimum 70% confidence thresholds. No manual escalation required.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-900/60 border border-emerald-500/40 text-xs font-bold text-emerald-300 font-mono">
            Direct Routing Approved
          </span>
        </div>
      )}

      {/* Required Diagnostic Checklist Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-[#073E2E]" />
            <span>Prescribed Technician Bench Actions</span>
          </h4>
          <span className="text-[11px] font-mono text-slate-400">
            {requiredTests.length} Protocol Steps
          </span>
        </div>

        {requiredTests.length > 0 ? (
          <div className="space-y-2.5">
            {requiredTests.map((t, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-50 border border-amber-500/30 flex items-start gap-3 text-xs"
              >
                <div className="w-5 h-5 rounded-full bg-amber-500/20 text-[#073E2E] flex items-center justify-center font-bold font-mono text-[10px] shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <div className="flex-1 text-slate-200 font-medium">
                  {t}
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-amber-300 font-mono shrink-0">
                  Required
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            No diagnostic tests pending. Optical defect confidence and electrical checklists verified complete.
          </p>
        )}

        {/* Technician Sign-Off Form */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <h5 className="text-xs font-bold text-white flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-[#073E2E]" />
            <span>Technician Resolution & Pathway Override</span>
          </h5>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Confirmed Recovery Pathway
              </label>
              <select
                value={selectedPathway}
                onChange={(e) => setSelectedPathway(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-white text-xs focus:border-[#073E2E] focus:outline-none transition-colors"
              >
                <option value="Direct Resale">Direct Resale (Grade A)</option>
                <option value="Repair">Repair (Targeted Modular Fix)</option>
                <option value="Refurbishment">Refurbishment (Full Renewal)</option>
                <option value="Component Harvesting">Component Harvesting</option>
                <option value="Recycling">Recycling (Smelting & Metals Recovery)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Technician Inspection Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-white text-xs focus:border-[#073E2E] focus:outline-none transition-colors"
                placeholder="Physical multimeter or optical verification results"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleResolve('confirm')}
              disabled={isSubmitting || resolvedSuccess}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#073E2E] to-[#0A533E] text-slate-950 font-bold text-xs tracking-wide shadow-lg hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {resolvedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Review Confirmed! Proceeding to Report...</span>
                </>
              ) : (
                <>
                  <span>Confirm Tests & Sign Off on Decision</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

