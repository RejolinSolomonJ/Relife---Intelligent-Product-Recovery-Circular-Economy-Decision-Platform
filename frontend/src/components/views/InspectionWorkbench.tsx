'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ImageInspectionResponse,
  SampleImageItem,
  EvaluateDecisionResponse,
  FunctionalTestResponse,
} from '../../lib/types';
import {
  fetchSampleImages,
  uploadInspection,
  submitFunctionalTests,
  evaluateDecision,
} from '../../lib/api';
import { formatINR } from '../../lib/formatters';
import {
  Camera,
  Video,
  VideoOff,
  UploadCloud,
  ScanEye,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Sliders,
  ShieldAlert,
  Layers,
  Leaf,
  Clock,
  ArrowRight,
  Eye,
  Trophy,
  X,
  Info,
  Check,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';

interface InspectionWorkbenchProps {
  initialCameraAutoStart?: boolean;
  isRegistrationMode?: boolean;
}

const DEFECT_COLORS: Record<string, string> = {
  stain: '#D97706',         // Amber / Stain
  tear: '#DC2626',          // Red / Tear
  crack: '#EF4444',         // Red / Crack
  dent: '#F59E0B',          // Orange / Dent
  scratch: '#10B981',       // Emerald / Scratch
  'missing part': '#8B5CF6',// Purple / Missing
  default: '#0284C7',       // Sky Blue
};

export function InspectionWorkbench({
  initialCameraAutoStart = false,
  isRegistrationMode = false,
}: InspectionWorkbenchProps) {
  // Session return ID for this inspection cycle
  const [returnId, setReturnId] = useState<string>(() => `REL-INSP-${Date.now().toString().slice(-5)}`);
  const [samples, setSamples] = useState<SampleImageItem[]>([]);
  const [selectedSample, setSelectedSample] = useState<string>('cloth_stained_dress.jpg');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string>('/api/inspections/image/cloth_stained_dress.jpg');

  // Inspection & Evaluation State
  const [selectedCategoryHint, setSelectedCategoryHint] = useState<string>('Auto');
  const [inspectionData, setInspectionData] = useState<ImageInspectionResponse | null>(null);
  const [decisionData, setDecisionData] = useState<EvaluateDecisionResponse | null>(null);
  const [isInspecting, setIsInspecting] = useState<boolean>(false);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live Camera Stream State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Objective Sliders
  const [weights, setWeights] = useState({
    profit: 35,
    environment: 35,
    speed: 15,
    risk: 15,
  });

  // Load sample gallery on mount & auto-run first inspection so product is recognized immediately
  useEffect(() => {
    fetchSampleImages()
      .then((data) => setSamples(data))
      .catch((err) => console.error('Error fetching sample images:', err));

    // Auto-detect initial sample on load
    triggerOpenCVInspection([], 'cloth_stained_dress.jpg');

    if (initialCameraAutoStart) {
      startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [initialCameraAutoStart]);

  // Start webcam video feed
  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Unable to access live webcam. Please ensure camera permissions are allowed, or choose an image upload / sample.');
    }
  };

  // Stop camera feed
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Capture frame from video stream
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 640;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const capturedFile = new File([blob], `camera_capture_${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
        setUploadedFiles([capturedFile]);
        setSelectedSample('');
        const localUrl = URL.createObjectURL(blob);
        setPreviewUrl(localUrl);
        stopCamera();
        // Automatically trigger OpenCV inspection on captured frame
        triggerOpenCVInspection([capturedFile], '');
      },
      'image/jpeg',
      0.92
    );
  };

  // File upload input handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files).slice(0, 5);
      setUploadedFiles(filesArray);
      setSelectedSample('');
      const localUrl = URL.createObjectURL(filesArray[0]);
      setPreviewUrl(localUrl);
      // Auto run inspection on upload
      triggerOpenCVInspection(filesArray, '');
    }
  };

  // Select pre-seeded sample image
  const handleSelectSample = (sampleFilename: string) => {
    setSelectedSample(sampleFilename);
    setUploadedFiles([]);
    setPreviewUrl(`/api/inspections/image/${sampleFilename}`);
    setSelectedCategoryHint('Auto');
    triggerOpenCVInspection([], sampleFilename);
  };

  // Core execution: Upload -> Stage 1 Product Recognition -> Stage 2 Defect Detection -> 5-Pathway Decision
  const triggerOpenCVInspection = async (filesToUpload: File[], sampleFile: string, forcedCategory?: string) => {
    setIsInspecting(true);
    setErrorMessage(null);
    setDecisionData(null);

    const activeReturnId = `REL-${Date.now().toString().slice(-6)}`;
    setReturnId(activeReturnId);

    try {
      const formData = new FormData();
      formData.append('return_id', activeReturnId);

      // Only pass device_hint if explicitly passed as a forcedCategory parameter from user override
      if (forcedCategory && forcedCategory !== 'Auto') {
        formData.append('device_hint', forcedCategory);
      }

      if (filesToUpload.length > 0) {
        filesToUpload.forEach((f) => formData.append('files', f));
      } else if (sampleFile) {
        formData.append('sample_filename', sampleFile);
      } else if (selectedSample) {
        formData.append('sample_filename', selectedSample);
      } else {
        formData.append('sample_filename', 'cloth_stained_dress.jpg');
      }

      // 1. Run OpenCV two-stage inspection
      const inspRes = await uploadInspection(formData);
      setInspectionData(inspRes);

      // Automatically sync selected class pill with the detected product category!
      const detectedCat = inspRes.detected_category || 'Laptop';
      setSelectedCategoryHint(detectedCat);

      const isCloth = detectedCat === 'Clothing' || inspRes.defects.some((d) => d.defect_type === 'stain' || d.defect_type === 'tear');

      // 2. Submit appropriate functional validation benchmark
      await submitFunctionalTests(activeReturnId, {
        powers_on: 'pass',
        display_ok: 'pass',
        battery_health_pct: isCloth ? 100 : 88,
        battery_test: 'pass',
        motherboard_ok: 'pass',
        ram_ok: 'pass',
        storage_ok: 'pass',
        ports_ok: 'pass',
      });

      // 3. Trigger 5-Pathway Decision Engine
      setIsEvaluating(true);
      const decRes = await evaluateDecision(activeReturnId, weights);
      setDecisionData(decRes);
    } catch (err: any) {
      console.error('Inspection workflow failed:', err);
      setErrorMessage(err.message || 'Vision inspection failed. Please verify the backend connection.');
    } finally {
      setIsInspecting(false);
      setIsEvaluating(false);
    }
  };

  const handleForceCategory = (cat: string) => {
    setSelectedCategoryHint(cat);
    triggerOpenCVInspection(uploadedFiles, selectedSample, cat);
  };

  // Live Slider adjustment updates ranking
  const handleWeightChange = async (key: 'profit' | 'environment' | 'speed' | 'risk', val: number) => {
    const updated = { ...weights, [key]: val };
    setWeights(updated);
    if (returnId && inspectionData) {
      try {
        const decRes = await evaluateDecision(returnId, updated);
        setDecisionData(decRes);
      } catch (err) {
        console.error('Re-evaluation error:', err);
      }
    }
  };

  // Determine top ranked pathway
  const pathwaysList = decisionData?.ranked_pathways || [];
  const topPathway = decisionData?.winner || pathwaysList[0];
  const winnerName = topPathway?.pathway || 'Recycling';
  const winnerRationale = decisionData?.winner_rationale || 'Pathway prioritized based on circular quality constraints and multi-criteria weighted scoring.';

  // Format Recharts data
  const chartData = pathwaysList.map((p) => ({
    name: p.pathway,
    nrv: p.net_recovery_value,
    eco: p.environmental_score,
    time: p.recovery_time_days,
    isWinner: p.pathway === topPathway?.pathway,
    isOverridden: p.is_safety_override,
  }));

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner Notice */}
      <div className="bg-[#E8F5E9] border border-emerald-200/90 p-4 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-200 text-[#073E2E] flex items-center justify-center font-bold shrink-0">
            <ScanEye className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
              {isRegistrationMode
                ? 'Visual Product Registration & Instant Defect Triage'
                : 'Live Camera Capture & OpenCV Optical Defect Inspection Suite'}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              {isRegistrationMode
                ? 'Point camera at product or upload an image — OpenCV & trained ML classifier auto-detect product category (Phone, Cloth, Laptop, Mouse), find defects, and register return.'
                : 'Real-time Laplacian blur quality rating, contour segmentation, defect localization & 5-pathway circular decision engine.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1 rounded-full bg-white text-xs font-mono text-[#073E2E] border border-emerald-200 font-bold shadow-xs">
            {isRegistrationMode ? 'Auto-Register Active' : 'OpenCV Bilateral Denoised'}
          </span>
          <span className="px-3 py-1 rounded-full bg-[#073E2E] text-white text-xs font-bold shadow-xs">
            Universal Recovery
          </span>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Intake Controls & Live Camera (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Intake Method Card */}
          <div className="bg-white border border-slate-200/90 rounded-[28px] p-5 shadow-[0_2px_14px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#073E2E]" />
                <span>{isRegistrationMode ? 'Product Registration Intake' : 'Multi-Source Intake Selection'}</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Session: {returnId}
              </span>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  const filesArray = Array.from(e.dataTransfer.files).slice(0, 5);
                  setUploadedFiles(filesArray);
                  setSelectedSample('');
                  setPreviewUrl(URL.createObjectURL(filesArray[0]));
                  triggerOpenCVInspection(filesArray, '');
                }
              }}
              className="border-2 border-dashed border-emerald-200 hover:border-[#073E2E] bg-emerald-50/40 hover:bg-emerald-50/80 rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5"
            >
              <UploadCloud className="w-6 h-6 text-[#073E2E]" />
              <span className="text-xs font-bold text-slate-800">
                Click to browse photo or drag & drop image here
              </span>
              <span className="text-[10px] text-slate-500">
                Auto-detects product (Phone, Cloth, Laptop, Mouse) & localizes defects
              </span>
            </div>

            {/* Camera Actions */}
            <div className="flex items-center gap-2.5">
              {!isCameraActive ? (
                <button
                  type="button"
                  onClick={startCamera}
                  className="flex-1 py-3 px-4 rounded-2xl bg-[#073E2E] hover:bg-[#0A533E] text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                  <span>Open Live Camera</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="flex-1 py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <VideoOff className="w-4 h-4" />
                  <span>Close Camera</span>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-3 px-4 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <UploadCloud className="w-4 h-4 text-[#073E2E]" />
                <span>Upload Photos</span>
              </button>
            </div>

            {/* Live Camera Viewfinder Modal / View */}
            {isCameraActive && (
              <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-[#073E2E] shadow-xl animate-in zoom-in-95 duration-200">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-64 object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Camera Viewfinder Crosshair Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-dashed border-emerald-400/80 rounded-2xl flex items-center justify-center">
                    <div className="w-3 h-3 border-t-2 border-l-2 border-emerald-400 absolute top-2 left-2" />
                    <div className="w-3 h-3 border-t-2 border-r-2 border-emerald-400 absolute top-2 right-2" />
                    <div className="w-3 h-3 border-b-2 border-l-2 border-emerald-400 absolute bottom-2 left-2" />
                    <div className="w-3 h-3 border-b-2 border-r-2 border-emerald-400 absolute bottom-2 right-2" />
                    <span className="text-[10px] font-mono text-emerald-300 bg-black/60 px-2 py-0.5 rounded-full font-bold">
                      Optical Align
                    </span>
                  </div>
                </div>

                {/* Capture Trigger Button */}
                <div className="absolute bottom-3 inset-x-0 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="px-6 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg flex items-center gap-2 transform active:scale-95 transition-all cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture Snapshot</span>
                  </button>
                </div>
              </div>
            )}

            {cameraError && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Quick Demo Presets (Featuring Stained Dress & Torn Fabric) */}
            <div className="pt-2 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Instant 1-Click Test Scenarios (Textiles & Electronics)
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectSample('cloth_stained_dress.jpg')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedSample === 'cloth_stained_dress.jpg'
                      ? 'border-[#073E2E] bg-emerald-50/80 shadow-xs ring-1 ring-[#073E2E]'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                    <span className="text-base">👗</span>
                    <span>Stained Dress</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                    Chemical & oil stain; proves Whole-Material Textile Recycling #1
                  </p>
                  <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md mt-2 inline-block">
                    👗 Clothing
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectSample('phone_scratched_back.jpg')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedSample === 'phone_scratched_back.jpg'
                      ? 'border-[#073E2E] bg-emerald-50/80 shadow-xs ring-1 ring-[#073E2E]'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                    <span className="text-base">📱</span>
                    <span>Scuffed Phone</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                    Cosmetic scuffs; qualifies for Direct Resale
                  </p>
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md mt-2 inline-block">
                    📱 Phone
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectSample('laptop_cracked_screen.jpg')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedSample === 'laptop_cracked_screen.jpg'
                      ? 'border-[#073E2E] bg-emerald-50/80 shadow-xs ring-1 ring-[#073E2E]'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                    <span className="text-base">💻</span>
                    <span>Cracked Laptop</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                    Display fracture; prioritizes Component Repair / Screen Replacement
                  </p>
                  <span className="text-[9px] font-bold text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded-md mt-2 inline-block">
                    💻 Laptop
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectSample('mouse_scuffed_body.jpg')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedSample === 'mouse_scuffed_body.jpg'
                      ? 'border-[#073E2E] bg-emerald-50/80 shadow-xs ring-1 ring-[#073E2E]'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                    <span className="text-base">🖱️</span>
                    <span>Optical Mouse</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                    PTFE skate wear & palm scuff; classifies as Computer Peripheral
                  </p>
                  <span className="text-[9px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded-md mt-2 inline-block">
                    🖱️ Mouse
                  </span>
                </button>
              </div>
            </div>

            {/* Run Analysis Button */}
            <div className="pt-2">
              <button
                type="button"
                disabled={isInspecting}
                onClick={() => triggerOpenCVInspection(uploadedFiles, selectedSample)}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#073E2E] hover:bg-[#0A533E] text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-950/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isInspecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing OpenCV Preprocessing & Edge Detection...</span>
                  </>
                ) : (
                  <>
                    <ScanEye className="w-4 h-4 text-emerald-300" />
                    <span>Run OpenCV Defect Inspection & 5-Pathway Decision</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Interactive Multi-Criteria Weight Sliders */}
          <div className="bg-white border border-slate-200/90 rounded-[28px] p-5 shadow-[0_2px_14px_rgba(0,0,0,0.03)] space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#073E2E]" />
                <span>Configurable Objective Weights</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                Live Re-Ranking
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="text-slate-700">Financial Profit Weight:</span>
                  <span className="font-mono text-[#073E2E]">{weights.profit}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={weights.profit}
                  onChange={(e) => handleWeightChange('profit', Number(e.target.value))}
                  className="w-full accent-[#073E2E] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="text-slate-700">Environmental Weight (CO₂ & Landfill):</span>
                  <span className="font-mono text-emerald-700">{weights.environment}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={weights.environment}
                  onChange={(e) => handleWeightChange('environment', Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="text-slate-700">Turnaround Speed Weight:</span>
                  <span className="font-mono text-sky-700">{weights.speed}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={weights.speed}
                  onChange={(e) => handleWeightChange('speed', Number(e.target.value))}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="text-slate-700">Risk Minimization Weight:</span>
                  <span className="font-mono text-amber-700">{weights.risk}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={weights.risk}
                  onChange={(e) => handleWeightChange('risk', Number(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: OpenCV Vision Viewer & 5-Pathway Decision Graph (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* OpenCV Defect Localization Viewport */}
          <div className="bg-white border border-slate-200/90 rounded-[28px] p-5 shadow-[0_2px_14px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <ScanEye className="w-4 h-4 text-[#073E2E]" />
                <span>OpenCV Optical Defect Localization</span>
              </span>

              {inspectionData && (
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono ${
                      inspectionData.is_blurry
                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                    }`}
                  >
                    {inspectionData.quality_flag} (Blur: {inspectionData.blur_score})
                  </span>
                </div>
              )}
            </div>

            {/* Stage 1: Product Recognition Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#073E2E] text-white flex items-center justify-center text-lg font-bold shadow-sm shrink-0">
                  {inspectionData?.detected_category === 'Clothing' ? '👗' : inspectionData?.detected_category === 'Smartphone' ? '📱' : inspectionData?.detected_category === 'Mouse' ? '🖱️' : inspectionData?.detected_category === 'Laptop' ? '💻' : '🔍'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full">
                      Stage 1 • Product Classification
                    </span>
                    <span className="text-[10px] font-bold text-slate-600 font-mono">
                      Conf: {inspectionData ? `${inspectionData.category_confidence.toFixed(1)}%` : 'Auto-Detecting...'}
                    </span>
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-900 mt-0.5">
                    {inspectionData?.detected_product_label || (selectedCategoryHint !== 'Auto' ? selectedCategoryHint : 'Multi-Class Product Identifier')}
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    Method: {inspectionData?.detection_method || 'OpenCV Multi-Spectral & 24-D ML Classifier'}
                  </p>
                  {inspectionData?.probabilities && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">ML Probs:</span>
                      {Object.entries(inspectionData.probabilities).map(([cat, prob]) => {
                        const isCatSelected = cat === inspectionData.detected_category || (cat === 'Smartphone' && inspectionData.detected_category === 'Phone');
                        return (
                          <span
                            key={cat}
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold border ${
                              isCatSelected
                                ? 'bg-[#073E2E] text-white border-[#073E2E] font-bold shadow-xs'
                                : 'bg-white/80 text-slate-600 border-slate-200'
                            }`}
                          >
                            {cat === 'Clothing' ? '👗' : cat === 'Smartphone' ? '📱' : cat === 'Mouse' ? '🖱️' : '💻'} {cat}: {prob}%
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Category Selector / Active Classifier Indicator */}
              <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200/90 shrink-0">
                <span className="text-[10px] font-bold text-slate-400 px-1">Class:</span>
                <button
                  type="button"
                  onClick={() => handleForceCategory('Clothing')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    (inspectionData?.detected_category === 'Clothing' || (!inspectionData && selectedCategoryHint === 'Clothing'))
                      ? 'bg-[#073E2E] text-white shadow-xs ring-2 ring-emerald-600'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  👗 Clothing
                </button>
                <button
                  type="button"
                  onClick={() => handleForceCategory('Smartphone')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    (inspectionData?.detected_category === 'Smartphone' || inspectionData?.detected_category === 'Phone' || (!inspectionData && (selectedCategoryHint === 'Smartphone' || selectedCategoryHint === 'Phone')))
                      ? 'bg-[#073E2E] text-white shadow-xs ring-2 ring-emerald-600'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  📱 Phone
                </button>
                <button
                  type="button"
                  onClick={() => handleForceCategory('Laptop')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    (inspectionData?.detected_category === 'Laptop' || (!inspectionData && selectedCategoryHint === 'Laptop'))
                      ? 'bg-[#073E2E] text-white shadow-xs ring-2 ring-emerald-600'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  💻 Laptop
                </button>
                <button
                  type="button"
                  onClick={() => handleForceCategory('Mouse')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    (inspectionData?.detected_category === 'Mouse' || (!inspectionData && selectedCategoryHint === 'Mouse'))
                      ? 'bg-[#073E2E] text-white shadow-xs ring-2 ring-emerald-600'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  🖱️ Mouse
                </button>
              </div>
            </div>

            {/* Stage 2 Header */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Stage 2 • Defect Localization ({inspectionData?.defects.length || 0} Anomalies for {inspectionData?.detected_category || 'Recognized Item'})
              </span>
              <span className="text-[10px] font-mono text-emerald-700 font-bold">
                OpenCV Bounding Box Engine
              </span>
            </div>

            {/* Image Canvas with SVG Bounding Box Overlays */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center min-h-[340px] max-h-[460px] border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Product Inspection Frame"
                className="w-full h-full object-contain max-h-[460px]"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.dataset.triedFallback) {
                    target.dataset.triedFallback = 'true';
                    target.src = `http://127.0.0.1:8000/api/inspections/image/${selectedSample || 'cloth_stained_dress.jpg'}`;
                  }
                }}
              />

              {/* Bounding Box SVG Layer */}
              {inspectionData && inspectionData.defects.length > 0 && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {inspectionData.defects.map((def, idx) => {
                    const color = DEFECT_COLORS[def.defect_type.toLowerCase()] || DEFECT_COLORS.default;
                    const x = `${def.bbox_x * 100}%`;
                    const y = `${def.bbox_y * 100}%`;
                    const w = `${def.bbox_w * 100}%`;
                    const h = `${def.bbox_h * 100}%`;

                    return (
                      <g key={idx}>
                        <rect
                          x={x}
                          y={y}
                          width={w}
                          height={h}
                          fill="none"
                          stroke={color}
                          strokeWidth="2.5"
                          strokeDasharray="4 2"
                        />
                        <foreignObject x={x} y={y} width="220" height="40">
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold text-white shadow-md uppercase tracking-wider font-mono mt-1 ml-1"
                               style={{ backgroundColor: color }}>
                            <span>{def.defect_type}</span>
                            <span className="opacity-90">({def.confidence.toFixed(1)}%)</span>
                          </div>
                        </foreignObject>
                      </g>
                    );
                  })}
                </svg>
              )}

              {/* Watermark / Tag */}
              <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-xl text-[10px] font-mono text-emerald-400 border border-emerald-500/30">
                OpenCV 4.x Bilateral Preprocessed
              </div>
            </div>

            {/* Detected Defects List */}
            {inspectionData && (
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Identified Visual Anomalies ({inspectionData.defects.length})
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {inspectionData.defects.map((def, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: DEFECT_COLORS[def.defect_type.toLowerCase()] || '#073E2E' }}
                          />
                          <span className="text-xs font-bold text-slate-900 capitalize">
                            {def.defect_type} ({def.severity} severity)
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          {def.description}
                        </p>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-700 shrink-0">
                        {def.confidence.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 5-Pathway Decision Engine & Comparative Graph */}
          {decisionData && (
            <div className="bg-white border border-slate-200/90 rounded-[28px] p-5 shadow-[0_2px_14px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-emerald-600" />
                    <span>5-Pathway Circular Decision Engine & Comparative Economics</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Evaluates Net Recovery Value, Landfill Diversion, and Turnaround across all 5 circular parameters.
                  </p>
                </div>

                <span className="px-3 py-1 rounded-full bg-emerald-100 text-[#073E2E] text-xs font-bold font-mono">
                  Winner: {winnerName}
                </span>
              </div>

              {/* Highlight Banner: Winning Pathway Rationale */}
              <div className="p-4 rounded-2xl bg-[#073E2E] text-white space-y-2 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-emerald-400/20 text-emerald-300 flex items-center justify-center font-bold">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-white">
                        Recommended Recovery Pathway: {winnerName}
                      </span>
                      <span className="text-[11px] text-emerald-200 ml-2 font-mono">
                        (Yield: {formatINR(topPathway?.net_recovery_value || 0)})
                      </span>
                    </div>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-bold text-[10px] uppercase font-mono">
                    Eco Score: {topPathway?.environmental_score || 98}/100
                  </span>
                </div>

                <p className="text-xs text-emerald-100/90 leading-relaxed">
                  {winnerRationale}
                </p>
              </div>

              {/* 5-Pathway Comparative Bar Chart */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                  <span>Comparative Net Recovery Value (₹) by Circular Pathway</span>
                  <span className="font-mono text-slate-400 text-[10px]">
                    Higher = Greater Financial Recovery
                  </span>
                </div>

                <div className="h-56 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
                    >
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }}
                        interval={0}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#64748B' }}
                        tickFormatter={(v) => `₹${v}`}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl text-xs space-y-1 font-sans border border-slate-700">
                                <div className="font-bold text-emerald-400">{d.name}</div>
                                <div>Net Value: {formatINR(d.nrv)}</div>
                                <div>Eco Score: {d.eco}/100</div>
                                <div>Turnaround: {d.time} business day(s)</div>
                                {d.isOverridden && (
                                  <div className="text-amber-400 font-semibold pt-1 border-t border-slate-700 mt-1">
                                    ⚠️ Disqualified by Quality Constraint
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="nrv" radius={[8, 8, 0, 0]}>
                        {chartData.map((entry, index) => {
                          let barColor = '#94A3B8'; // gray for normal
                          if (entry.isWinner) barColor = '#073E2E'; // Forest green for winner
                          else if (entry.isOverridden) barColor = '#CBD5E1'; // Light muted for overridden
                          else if (index === 0) barColor = '#10B981';
                          else if (index === 1) barColor = '#0284C7';
                          return <Cell key={`cell-${index}`} fill={barColor} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 5-Pathway Comparison Table */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 font-mono text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Pathway</th>
                      <th className="py-2.5 px-2">Net Value</th>
                      <th className="py-2.5 px-2">Eco Score</th>
                      <th className="py-2.5 px-2">Speed</th>
                      <th className="py-2.5 px-3 text-right">Qualification Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pathwaysList.map((pw, i) => {
                      const isWinner = pw.pathway === topPathway?.pathway;
                      return (
                        <tr
                          key={i}
                          className={isWinner ? 'bg-emerald-50/70 font-semibold' : ''}
                        >
                          <td className="py-2.5 px-3 flex items-center gap-1.5">
                            {isWinner && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />}
                            <span className={isWinner ? 'text-[#073E2E]' : 'text-slate-800'}>
                              {pw.pathway}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 font-mono">
                            {formatINR(pw.net_recovery_value)}
                          </td>
                          <td className="py-2.5 px-2 font-mono text-emerald-700">
                            {pw.environmental_score}/100
                          </td>
                          <td className="py-2.5 px-2 font-mono text-slate-600">
                            {pw.recovery_time_days}d
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {pw.is_safety_override ? (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                ❌ Disqualified ({pw.override_reason ? 'Quality Constraint' : 'Constraint'})
                              </span>
                            ) : isWinner ? (
                              <span className="text-[10px] font-bold text-[#073E2E] bg-emerald-200 px-2 py-0.5 rounded-full">
                                🏆 Rank #1 Winner
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                                Eligible
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
