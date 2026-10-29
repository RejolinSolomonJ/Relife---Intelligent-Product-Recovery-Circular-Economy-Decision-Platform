'use client';

import React, { useState } from 'react';
import {
  RegisterProductResponse,
  ImageInspectionResponse,
  FunctionalTestResponse,
  EvaluateDecisionResponse,
} from '../../lib/types';
import { Step1Registration } from './Step1Registration';
import { Step2ImageInspection } from './Step2ImageInspection';
import { Step3FunctionalTests } from './Step3FunctionalTests';
import { Step4CostEstimation } from './Step4CostEstimation';
import { Step5DecisionEngine } from './Step5DecisionEngine';
import { Step6HumanReview } from './Step6HumanReview';
import { Step7Report } from './Step7Report';
import {
  PlusCircle,
  ScanEye,
  CheckCircle2,
  DollarSign,
  Award,
  ShieldAlert,
  FileText,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';

const STEPS = [
  { id: 1, name: 'Registration', icon: PlusCircle },
  { id: 2, name: 'Vision Inspection', icon: ScanEye },
  { id: 3, name: 'Functional Tests', icon: CheckCircle2 },
  { id: 4, name: 'Cost Estimation', icon: DollarSign },
  { id: 5, name: 'Decision Engine', icon: Award },
  { id: 6, name: 'Human Review', icon: ShieldAlert },
  { id: 7, name: 'Explainable Report', icon: FileText },
];

export function RecoveryWizard() {
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Workflow state shared across steps
  const [returnId, setReturnId] = useState<string>('REL-DEMO-001');
  const [registeredData, setRegisteredData] = useState<RegisterProductResponse | null>(null);
  const [inspectionData, setInspectionData] = useState<ImageInspectionResponse | null>(null);
  const [testsData, setTestsData] = useState<FunctionalTestResponse | null>(null);
  const [decisionData, setDecisionData] = useState<EvaluateDecisionResponse | null>(null);

  // Quick 2-Minute Demo Trigger
  const handleLoadDemoScenario = () => {
    setReturnId('REL-DEMO-001');
    setCurrentStep(1);
  };

  const handleRegistered = (data: RegisterProductResponse) => {
    setReturnId(data.return_id);
    setRegisteredData(data);
    setCurrentStep(2);
  };

  const handleInspectionComplete = (data: ImageInspectionResponse) => {
    setInspectionData(data);
    setCurrentStep(3);
  };

  const handleTestsComplete = (data: FunctionalTestResponse) => {
    setTestsData(data);
    setCurrentStep(4);
  };

  const handleProceedToDecision = () => {
    setCurrentStep(5);
  };

  const handleDecisionComplete = (data: EvaluateDecisionResponse) => {
    setDecisionData(data);
    if (data.human_review_required) {
      setCurrentStep(6);
    } else {
      setCurrentStep(7);
    }
  };

  const handleReviewResolved = () => {
    setCurrentStep(7);
  };

  return (
    <div className="space-y-6">
      {/* 2-Minute Hackathon Demo Banner */}
      <div className="p-4 rounded-2xl bg-[#E8F5E9] border border-emerald-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-200 text-[#073E2E] flex items-center justify-center font-bold shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900 block text-xs">
              2-Minute Fast-Track Demo Scenario (Laptop Cracked Screen)
            </span>
            <span className="text-slate-600 text-[11px]">
              Preset MacBook Pro 14 return with cracked display panel, passing battery and motherboard tests.
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLoadDemoScenario}
          className="px-4 py-2 rounded-xl bg-[#073E2E] hover:bg-[#0A533E] text-white font-bold text-xs shadow-sm transition-all shrink-0 cursor-pointer"
        >
          Load Laptop Demo Scenario
        </button>
      </div>

      {/* Top Stepper Container */}
      <div className="p-6 rounded-[24px] bg-white border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Circular Product Recovery Pipeline
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Active Evaluation ID: <span className="font-mono font-bold text-[#073E2E]">{returnId}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setCurrentStep(1);
                setReturnId('REL-DEMO-001');
                setRegisteredData(null);
                setInspectionData(null);
                setTestsData(null);
                setDecisionData(null);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Stepper Steps Progress Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pt-1">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentStep(step.id)}
                className={`p-2.5 rounded-2xl text-left border transition-all flex flex-col justify-between ${
                  isActive
                    ? 'bg-[#073E2E] border-[#073E2E] text-white shadow-md'
                    : isCompleted
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-semibold'
                    : 'bg-slate-50 border-slate-200/80 text-slate-500 hover:text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono font-bold">0{step.id}</span>
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : isCompleted ? 'text-[#073E2E]' : 'text-slate-400'}`} />
                </div>
                <div className="text-[11px] font-bold truncate">{step.name}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step View Content */}
      <div className="transition-all duration-200">
        {currentStep === 1 && (
          <Step1Registration
            onRegistered={handleRegistered}
            registeredData={registeredData}
          />
        )}

        {currentStep === 2 && (
          <Step2ImageInspection
            returnId={returnId}
            onInspectionComplete={handleInspectionComplete}
            inspectionData={inspectionData}
          />
        )}

        {currentStep === 3 && (
          <Step3FunctionalTests
            returnId={returnId}
            onTestsComplete={handleTestsComplete}
            testsData={testsData}
          />
        )}

        {currentStep === 4 && (
          <Step4CostEstimation
            returnId={returnId}
            onProceedToDecision={handleProceedToDecision}
          />
        )}

        {currentStep === 5 && (
          <Step5DecisionEngine
            returnId={returnId}
            onDecisionComplete={handleDecisionComplete}
            decisionData={decisionData}
          />
        )}

        {currentStep === 6 && (
          <Step6HumanReview
            returnId={returnId}
            decisionData={decisionData}
            onReviewResolved={handleReviewResolved}
          />
        )}

        {currentStep === 7 && (
          <Step7Report returnId={returnId || 'REL-DEMO-001'} />
        )}
      </div>

      {/* Bottom Step Pagination Controls */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200 text-xs">
        <button
          type="button"
          disabled={currentStep === 1}
          onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
          className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 font-semibold flex items-center gap-1.5 shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Previous Step</span>
        </button>

        <span className="font-mono text-slate-400 text-xs font-semibold">
          Step {currentStep} of {STEPS.length}
        </span>

        <button
          type="button"
          disabled={currentStep === STEPS.length}
          onClick={() => setCurrentStep((prev) => Math.min(STEPS.length, prev + 1))}
          className="px-4 py-2 rounded-xl bg-[#073E2E] hover:bg-[#0A533E] text-white font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-40"
        >
          <span>Next Step</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
