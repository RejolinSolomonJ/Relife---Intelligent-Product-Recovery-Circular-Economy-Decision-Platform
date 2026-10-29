'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ImageInspectionResponse,
  SampleImageItem,
  DefectDetectionItem,
} from '../../lib/types';
import { fetchSampleImages, uploadInspection } from '../../lib/api';
import {
  ScanEye,
  Camera,
  UploadCloud,
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldAlert,
  ArrowRight,
  Eye,
  Video,
  X,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface Step2Props {
  returnId: string;
  onInspectionComplete: (data: ImageInspectionResponse) => void;
  inspectionData: ImageInspectionResponse | null;
}

const DEFECT_COLORS: Record<string, string> = {
  stain: '#D97706',         // Amber / Stain
  tear: '#DC2626',          // Crimson / Tear
  crack: '#EF4444',         // Red
  dent: '#F59E0B',          // Orange
  scratch: '#10B981',       // Emerald
  'missing part': '#8B5CF6',// Purple
  default: '#0284C7',       // Sky Blue
};

export function Step2ImageInspection({
  returnId,
  onInspectionComplete,
  inspectionData,
}: Step2Props) {
  const [samples, setSamples] = useState<SampleImageItem[]>([]);
  const [selectedSample, setSelectedSample] = useState<string>('laptop_cracked_screen.jpg');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string>('http://localhost:8000/api/inspections/image/laptop_cracked_screen.jpg');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Live Camera State
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSampleImages()
      .then((data) => {
        setSamples(data);
      })
      .catch((err) => console.error('Error loading sample inspection images:', err));

    return () => {
      stopCamera();
    };
  }, []);

  const handleSelectSample = (filename: string) => {
    setSelectedSample(filename);
    setUploadedFiles([]);
    setPreviewUrl(`http://localhost:8000/api/inspections/image/${filename}`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files).slice(0, 5);
      setUploadedFiles(filesArray);
      setSelectedSample('');
      const localUrl = URL.createObjectURL(filesArray[0]);
      setPreviewUrl(localUrl);
    }
  };

  // Start Live Camera
  const startCamera = async () => {
    setCameraError(null);
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Unable to access camera. Please allow camera permissions or upload an image file.');
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  // Capture Snapshot from Camera
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
      },
      'image/jpeg',
      0.92
    );
  };

  const handleRunInspection = async () => {
    if (!returnId) {
      setError('Please register a product in Step 1 first to generate a Return ID.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('return_id', returnId);

      if (uploadedFiles.length > 0) {
        uploadedFiles.forEach((file) => {
          formData.append('files', file);
        });
      } else if (selectedSample) {
        formData.append('sample_filename', selectedSample);
      } else {
        formData.append('sample_filename', 'laptop_cracked_screen.jpg');
      }

      const res = await uploadInspection(formData);
      onInspectionComplete(res);
    } catch (err: any) {
      console.error('Inspection failed:', err);
      setError(err.message || 'Image inspection failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Honesty Notice Bar */}
      <div className="bg-[#E8F5E9] border border-emerald-200 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs text-slate-700">
        <div className="flex items-center gap-2.5 text-emerald-900">
          <Info className="w-4 h-4 shrink-0 text-[#073E2E]" />
          <span>
            <strong>OpenCV Vision Engine:</strong> Preprocesses images, detects blur, stains, tears, cracks, and calculates multi-parameter recovery pathways.
          </span>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-white text-[11px] font-mono text-[#073E2E] border border-emerald-200 font-bold shrink-0">
          OpenCV + AI Detector
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Image Selector, Camera & Upload (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#073E2E]" />
                <span>Product Photo Intake</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Camera / Upload</span>
            </div>

            {/* Live Camera & Device Upload Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={startCamera}
                className="py-3 px-3 rounded-2xl bg-[#073E2E] hover:bg-[#0A533E] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer group"
              >
                <Video className="w-4 h-4 text-emerald-300 group-hover:scale-110 transition-transform" />
                <span>Live Camera</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-3 px-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <UploadCloud className="w-4 h-4 text-slate-600" />
                <span>Upload Photo</span>
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Quick Sample Selector covering Electronics & Textiles */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  Pre-seeded Sample Scenarios:
                </label>
                <span className="text-[10px] text-slate-400">Instant Demo</span>
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
                {samples.map((s) => {
                  const isSelected = selectedSample === s.filename;
                  const isClothing = s.filename.includes('cloth');
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelectSample(s.filename)}
                      className={`p-2.5 rounded-2xl text-left border transition-all text-xs flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-[#E8F5E9] border-emerald-300 text-[#073E2E] font-bold shadow-sm'
                          : 'bg-[#F8FAFC] border-slate-200/80 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {isClothing && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                              Textile
                            </span>
                          )}
                          <span className="truncate text-xs font-semibold">{s.title}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{s.description}</p>
                      </div>
                      <span className="text-[10px] font-mono capitalize px-2 py-0.5 rounded-full bg-white border border-slate-200 shrink-0">
                        {s.expected_defect}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Run OpenCV Button */}
            <button
              type="button"
              onClick={handleRunInspection}
              disabled={isLoading}
              className="w-full py-3.5 rounded-2xl bg-[#073E2E] hover:bg-[#0A533E] text-white font-bold text-xs tracking-wide shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-300" />
                  <span>Processing OpenCV Inferences...</span>
                </>
              ) : (
                <>
                  <ScanEye className="w-4 h-4 text-emerald-300" />
                  <span>Run OpenCV Inspection & Defect Detection</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Interactive Canvas & Detected Bounding Boxes (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#073E2E]" />
                <h3 className="text-sm font-bold text-slate-900">
                  Visual Analysis & Bounding Box Overlay
                </h3>
              </div>
              {inspectionData && (
                <span
                  className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${
                    inspectionData.is_blurry
                      ? 'bg-rose-50 border-rose-200 text-rose-700'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}
                >
                  Blur: {inspectionData.blur_score} ({inspectionData.quality_flag})
                </span>
              )}
            </div>

            {/* Interactive Image View with Bounding Boxes */}
            <div className="relative w-full aspect-square max-h-[400px] bg-slate-50 rounded-2xl overflow-hidden border border-slate-200/90 flex items-center justify-center">
              {previewUrl ? (
                <div className="relative w-full h-full">
                  <img
                    src={previewUrl}
                    alt="Product Inspection"
                    className="w-full h-full object-contain"
                  />

                  {/* SVG Overlay for Bounding Boxes */}
                  {inspectionData && inspectionData.defects.length > 0 && (
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
                      {inspectionData.defects.map((defect, i) => {
                        const x = defect.bbox_x * 100;
                        const y = defect.bbox_y * 100;
                        const w = defect.bbox_w * 100;
                        const h = defect.bbox_h * 100;
                        const color = DEFECT_COLORS[defect.defect_type] || DEFECT_COLORS.default;

                        return (
                          <g key={i}>
                            <rect
                              x={x}
                              y={y}
                              width={w}
                              height={h}
                              fill={`${color}22`}
                              stroke={color}
                              strokeWidth="1.5"
                              strokeDasharray="2 1"
                            />
                            <rect
                              x={x}
                              y={Math.max(0, y - 6.0)}
                              width={Math.min(w * 1.5, 45)}
                              height="5.6"
                              fill={color}
                              rx="1"
                            />
                            <text
                              x={x + 1}
                              y={Math.max(4.0, y - 1.8)}
                              fill="#FFFFFF"
                              fontSize="3.4"
                              fontWeight="bold"
                              fontFamily="sans-serif"
                            >
                              {defect.defect_type.toUpperCase()} ({defect.confidence}%)
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  )}
                </div>
              ) : (
                <div className="text-center p-6 text-slate-400">
                  <Camera className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
                  <p className="text-xs">No image loaded</p>
                </div>
              )}

              {/* Tag Badge */}
              <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/95 border border-slate-200 text-[10px] font-mono text-[#073E2E] shadow-sm backdrop-blur-sm font-bold">
                OpenCV Inspected
              </div>
            </div>

            {/* Defect Cards List */}
            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
              <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Detected Anomalies ({inspectionData ? inspectionData.defects.length : 0}):</span>
                {inspectionData && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    {inspectionData.model_version}
                  </span>
                )}
              </div>

              {inspectionData && inspectionData.defects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {inspectionData.defects.map((d, idx) => {
                    const color = DEFECT_COLORS[d.defect_type] || DEFECT_COLORS.default;
                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 flex items-start gap-2.5 text-xs shadow-sm"
                      >
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0 mt-0.5 shadow-sm"
                          style={{ backgroundColor: color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-900 capitalize text-xs">
                              {d.defect_type}
                            </span>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[#073E2E]">
                              {d.confidence}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span className="capitalize font-semibold text-slate-600">
                              Severity: {d.severity}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-snug">
                            {d.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : inspectionData ? (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>No exterior defects detected. Material surface meets Grade A certified standard.</span>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Run optical inspection to detect surface cracks, stains, tears, scratches, or missing components.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Live Camera Viewfinder Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-[28px] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-[#073E2E]" />
                <h3 className="text-sm font-bold text-slate-900">
                  Live Camera Product Capture
                </h3>
              </div>
              <button
                onClick={stopCamera}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {cameraError ? (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {cameraError}
                </div>
              ) : (
                <div className="relative aspect-video bg-black rounded-2xl overflow-hidden flex items-center justify-center border border-slate-200">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {/* Viewfinder Target Reticle */}
                  <div className="absolute inset-8 border-2 border-white/60 border-dashed rounded-xl pointer-events-none flex items-center justify-center">
                    <span className="text-[11px] text-white/90 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                      Align product or clothing within frame
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="px-6 py-2.5 rounded-2xl bg-[#073E2E] hover:bg-[#0A533E] text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-emerald-300" />
                  <span>Capture Photo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
