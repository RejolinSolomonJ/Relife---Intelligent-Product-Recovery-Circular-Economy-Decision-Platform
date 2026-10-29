'use client';

import React, { useState } from 'react';
import { FunctionalTestPayload, FunctionalTestResponse } from '../../lib/types';
import { submitFunctionalTests } from '../../lib/api';
import {
  Cpu,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  Info,
  ArrowRight,
  BatteryCharging,
  Monitor,
  HardDrive,
  Usb,
  Power,
  CircuitBoard,
  Sparkles,
} from 'lucide-react';

interface Step3Props {
  returnId: string;
  onTestsComplete: (data: FunctionalTestResponse) => void;
  testsData: FunctionalTestResponse | null;
}

type TestStatus = 'pass' | 'fail' | 'unknown';

interface TestItemConfig {
  key: keyof FunctionalTestPayload;
  label: string;
  description: string;
  icon: React.ElementType;
}

const TESTS_CONFIG: TestItemConfig[] = [
  {
    key: 'powers_on',
    label: 'Power Sequencing / Fabric Integrity',
    description: 'Electrical boot sequence or textile tensile structural integrity',
    icon: Power,
  },
  {
    key: 'display_ok',
    label: 'Display / Surface Color Fastness',
    description: 'Screen renders clean image or textile color exhibits no bleed/washout',
    icon: Monitor,
  },
  {
    key: 'motherboard_ok',
    label: 'Logic Board / Material Hygiene',
    description: 'PMIC logic circuitry passes diagnostic or fabric is free of chemical contamination',
    icon: CircuitBoard,
  },
  {
    key: 'ram_ok',
    label: 'System RAM / Warp-Weft Yarns',
    description: 'System memory passes verification or textile structural threads are unbroken',
    icon: Cpu,
  },
  {
    key: 'storage_ok',
    label: 'Solid State Storage / Lining',
    description: 'NVMe SSD SMART health 0 bad sectors or internal garment lining intact',
    icon: HardDrive,
  },
  {
    key: 'ports_ok',
    label: 'I/O Ports & Fasteners / Zippers',
    description: 'USB-C/charge pins or zippers, sliders, and button fasteners operate smoothly',
    icon: Usb,
  },
];

export function Step3FunctionalTests({
  returnId,
  onTestsComplete,
  testsData,
}: Step3Props) {
  const [testValues, setTestValues] = useState<Record<string, TestStatus>>({
    powers_on: 'pass',
    display_ok: 'fail', // Default to display fail for cracked laptop scenario
    battery_test: 'pass',
    motherboard_ok: 'pass',
    ram_ok: 'pass',
    storage_ok: 'pass',
    ports_ok: 'pass',
  });

  const [batteryHealthPct, setBatteryHealthPct] = useState<number>(91);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const setTest = (key: string, val: TestStatus) => {
    setTestValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleQuickPreset = (
    preset: 'all_pass' | 'laptop_crack' | 'cloth_stained_tear' | 'battery_dead' | 'has_unknowns'
  ) => {
    if (preset === 'all_pass') {
      setTestValues({
        powers_on: 'pass',
        display_ok: 'pass',
        battery_test: 'pass',
        motherboard_ok: 'pass',
        ram_ok: 'pass',
        storage_ok: 'pass',
        ports_ok: 'pass',
      });
      setBatteryHealthPct(98);
    } else if (preset === 'laptop_crack') {
      setTestValues({
        powers_on: 'pass',
        display_ok: 'fail',
        battery_test: 'pass',
        motherboard_ok: 'pass',
        ram_ok: 'pass',
        storage_ok: 'pass',
        ports_ok: 'pass',
      });
      setBatteryHealthPct(91);
    } else if (preset === 'cloth_stained_tear') {
      setTestValues({
        powers_on: 'fail',   // Fabric structural integrity breached
        display_ok: 'fail',  // Severe color stain
        battery_test: 'fail',// Seam tensile failure
        motherboard_ok: 'fail', // Irreversible hygiene contamination
        ram_ok: 'pass',
        storage_ok: 'pass',
        ports_ok: 'pass',    // Buttons/zipper intact
      });
      setBatteryHealthPct(0);
    } else if (preset === 'battery_dead') {
      setTestValues({
        powers_on: 'pass',
        display_ok: 'pass',
        battery_test: 'fail',
        motherboard_ok: 'pass',
        ram_ok: 'pass',
        storage_ok: 'pass',
        ports_ok: 'pass',
      });
      setBatteryHealthPct(58);
    } else {
      setTestValues({
        powers_on: 'pass',
        display_ok: 'unknown',
        battery_test: 'unknown',
        motherboard_ok: 'unknown',
        ram_ok: 'pass',
        storage_ok: 'pass',
        ports_ok: 'unknown',
      });
      setBatteryHealthPct(-1);
    }
  };

  const hasUnknowns = Object.values(testValues).some((v) => v === 'unknown') || batteryHealthPct === -1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnId) {
      setError('Please register a product first.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const payload: FunctionalTestPayload = {
        powers_on: testValues.powers_on,
        display_ok: testValues.display_ok,
        battery_health_pct: batteryHealthPct,
        battery_test: batteryHealthPct < 70 && batteryHealthPct > 0 ? 'fail' : testValues.battery_test,
        motherboard_ok: testValues.motherboard_ok,
        ram_ok: testValues.ram_ok,
        storage_ok: testValues.storage_ok,
        ports_ok: testValues.ports_ok,
        notes: 'Bench diagnostic verification completed.',
      };

      const res = await submitFunctionalTests(returnId, payload);
      onTestsComplete(res);
    } catch (err: any) {
      console.error('Error submitting tests:', err);
      setError(err.message || 'Failed to submit functional tests.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Honesty Notice */}
      <div className="bg-[#E8F5E9] border border-emerald-200 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs text-slate-700">
        <div className="flex items-center gap-2.5 text-emerald-900">
          <Info className="w-4 h-4 shrink-0 text-[#073E2E]" />
          <span>
            <strong>Bench Verification:</strong> Visual inspection alone cannot prove internal structural or electrical state. Testing parameters calibrate pathway risk.
          </span>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-white text-[11px] font-mono text-[#073E2E] border border-emerald-200 font-bold shrink-0">
          Step 3 of 7
        </span>
      </div>

      {/* Quick Presets */}
      <div className="bg-white border border-slate-200/90 p-4 rounded-[24px] flex flex-wrap items-center justify-between gap-3 text-xs shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        <span className="font-bold text-slate-800">Quick Diagnostic Presets:</span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleQuickPreset('laptop_crack')}
            className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#073E2E] text-xs font-bold transition-colors cursor-pointer"
          >
            Laptop: Cracked Screen (Demo)
          </button>
          <button
            type="button"
            onClick={() => handleQuickPreset('cloth_stained_tear')}
            className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold transition-colors cursor-pointer"
          >
            Clothing: Stained Dress / Torn (Recycle)
          </button>
          <button
            type="button"
            onClick={() => handleQuickPreset('battery_dead')}
            className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-orange-800 text-xs font-bold transition-colors cursor-pointer"
          >
            Failed Battery (&lt; 70%)
          </button>
          <button
            type="button"
            onClick={() => handleQuickPreset('all_pass')}
            className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold transition-colors cursor-pointer"
          >
            All Passed (Resale)
          </button>
          <button
            type="button"
            onClick={() => handleQuickPreset('has_unknowns')}
            className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 text-xs font-bold transition-colors cursor-pointer"
          >
            Unknown Tests (Human Review)
          </button>
        </div>
      </div>

      {hasUnknowns && (
        <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-2xl text-sky-800 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-sky-600" />
          <span>
            <strong>Notice:</strong> One or more tests are marked as <strong>Unknown</strong>. This will lower recommendation confidence and automatically route the item to <strong>Human Technician Bench Review</strong>.
          </span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Battery Health Slider Card */}
        <div className="bg-white border border-slate-200/90 rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#073E2E] flex items-center justify-center">
                <BatteryCharging className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Power Storage / Battery Health Retention
                </h4>
                <p className="text-[11px] text-slate-400">
                  Chemical retention capacity or textile seam retention percentage
                </p>
              </div>
            </div>
            <div className="text-right">
              <span
                className={`text-sm font-bold font-mono ${
                  batteryHealthPct >= 80
                    ? 'text-emerald-700'
                    : batteryHealthPct >= 70
                    ? 'text-[#073E2E]'
                    : 'text-rose-600'
                }`}
              >
                {batteryHealthPct > 0 ? `${batteryHealthPct}% Capacity` : 'N/A / Non-Electric'}
              </span>
              <p className="text-[10px] text-slate-400">
                {batteryHealthPct < 70 && batteryHealthPct > 0
                  ? 'Hazard threshold breached'
                  : 'Certified range'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={-1}
                max={100}
                value={batteryHealthPct}
                onChange={(e) => setBatteryHealthPct(parseInt(e.target.value))}
                className="flex-1 accent-[#073E2E] bg-slate-100 h-2 rounded-lg cursor-pointer"
              />
              <span className="text-xs font-mono font-bold w-12 text-center text-slate-800">
                {batteryHealthPct === -1 ? 'N/A' : `${batteryHealthPct}%`}
              </span>
            </div>

            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>Unknown (-1)</span>
              <span>Poor (&lt; 70% Overrides Resale)</span>
              <span>Acceptable (70-79%)</span>
              <span>Optimal (80-100%)</span>
            </div>
          </div>
        </div>

        {/* 6 Core Functional Bench Tests Checklist */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TESTS_CONFIG.map((t) => {
            const Icon = t.icon;
            const currentStatus = testValues[t.key as string] || 'pass';

            return (
              <div
                key={t.key as string}
                className="bg-white border border-slate-200/90 rounded-[24px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[#073E2E] shrink-0 mt-0.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">{t.label}</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5 max-w-[200px] leading-tight">
                      {t.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setTest(t.key as string, 'pass')}
                    className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      currentStatus === 'pass'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Pass</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTest(t.key as string, 'fail')}
                    className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      currentStatus === 'fail'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <XCircle className="w-3 h-3" />
                    <span>Fail</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTest(t.key as string, 'unknown')}
                    className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      currentStatus === 'unknown'
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>Unknown</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 rounded-2xl bg-[#073E2E] hover:bg-[#0A533E] text-white font-bold text-xs tracking-wide shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isLoading ? (
            <span>Computing Condition & Risk Calibration...</span>
          ) : (
            <>
              <span>Save Bench Tests & Evaluate 5 Circular Pathways</span>
              <ArrowRight className="w-4 h-4 text-emerald-300" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
