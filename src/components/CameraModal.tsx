import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, MoreVertical, RefreshCw, AlertCircle, Sparkles, Grid } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64: string) => void;
}

export function CameraModal({ isOpen, onClose, onCapture }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showGrid, setShowGrid] = useState(false);

  const startCamera = async () => {
    try {
      setError(null);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      let newStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
          audio: false
        });
      } catch (fallbackErr) {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }
      
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
        setError("Camera permission denied. Click 'Open in New Tab' if in preview.");
      } else if (err.name === 'NotFoundError') {
        setError("No camera found on this device.");
      } else {
        setError("Failed to access camera. Please try again.");
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setShowOptionsMenu(false);
    }
    return () => stopCamera();
  }, [isOpen, facingMode]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    setShowOptionsMenu(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !stream) return;
    
    setIsCapturing(true);
    setShowFlash(true);

    setTimeout(() => {
      setShowFlash(false);
    }, 200);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (context) {
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const base64 = canvas.toDataURL('image/jpeg', 0.85);
      onCapture(base64);
      onClose();
    }
    setIsCapturing(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-2xl flex flex-col justify-between items-center p-3 sm:p-6 select-none overflow-hidden">
          {/* Top subtle bar */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md flex items-center justify-between py-2 px-4 z-20"
          >
            <div className="flex items-center gap-2 text-white/80 font-medium text-xs">
              <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              <span>SALU Vision AI</span>
            </div>
            <div className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/10">
              {facingMode === 'user' ? 'Front Cam' : 'Rear Cam'}
            </div>
          </motion.div>

          {/* Main Rounded Viewfinder Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-sm sm:max-w-md mx-auto flex-1 min-h-[65vh] max-h-[80vh] rounded-[36px] overflow-hidden bg-zinc-950 border border-white/15 shadow-2xl flex flex-col justify-between my-auto"
          >
            {/* Flash Effect Overlay */}
            {showFlash && (
              <div className="absolute inset-0 bg-white z-40 animate-pulse" />
            )}

            {/* Error or Video */}
            {error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-zinc-950">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 text-red-400">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <p className="text-white text-sm font-semibold max-w-xs mb-6">{error}</p>
                <button
                  onClick={startCamera}
                  className="px-6 py-2.5 bg-white text-zinc-950 rounded-xl font-bold text-xs hover:bg-zinc-200 transition-all cursor-pointer"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={cn(
                    "absolute inset-0 w-full h-full object-cover transition-transform duration-300",
                    facingMode === 'user' && "scale-x-[-1]"
                  )}
                />

                {!stream && (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-10">
                    <div className="w-10 h-10 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                  </div>
                )}

                {/* Optional Grid Lines Overlay */}
                {showGrid && (
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none z-10 opacity-30">
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-white" />
                    <div className="border-r border-white" />
                    <div />
                  </div>
                )}
              </>
            )}

            {/* Options Dropdown Menu */}
            <AnimatePresence>
              {showOptionsMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-20 right-6 z-30 w-48 bg-zinc-900/90 backdrop-blur-xl border border-white/15 rounded-2xl p-2 shadow-2xl text-white space-y-1"
                >
                  <button
                    onClick={toggleCamera}
                    className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-xl hover:bg-white/10 transition-colors text-left"
                  >
                    <RefreshCw className="w-4 h-4 text-brand-400" />
                    <span>Flip Camera</span>
                  </button>
                  <button
                    onClick={() => setShowGrid(prev => !prev)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-xl hover:bg-white/10 transition-colors text-left"
                  >
                    <Grid className="w-4 h-4 text-amber-400" />
                    <span>{showGrid ? 'Hide Grid' : 'Show Grid'}</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Controls Overlay at Bottom of Viewfinder */}
            <div className="relative z-20 w-full p-6 pt-12 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between mt-auto">
              {/* Back Button (Left) */}
              <button
                onClick={onClose}
                type="button"
                className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 text-white flex items-center justify-center hover:bg-black/80 active:scale-95 transition-all shadow-xl cursor-pointer"
                title="Back / Close"
              >
                <ChevronLeft className="w-6 h-6 stroke-[2.5px]" />
              </button>

              {/* Shutter Capture Button (Center) */}
              <button
                onClick={capturePhoto}
                disabled={!stream || isCapturing}
                type="button"
                className={cn(
                  "w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white p-1 border-4 border-zinc-700/80 shadow-2xl flex items-center justify-center transition-all cursor-pointer active:scale-90",
                  (!stream || isCapturing) ? "opacity-50 cursor-not-allowed" : "hover:scale-105"
                )}
                title="Take Photo"
              >
                <div className="w-full h-full rounded-full border-2 border-zinc-300 bg-white" />
              </button>

              {/* Options Button (Right) */}
              <button
                onClick={() => setShowOptionsMenu(prev => !prev)}
                type="button"
                className={cn(
                  "w-12 h-12 rounded-full backdrop-blur-xl border text-white flex items-center justify-center transition-all active:scale-95 shadow-xl cursor-pointer",
                  showOptionsMenu 
                    ? "bg-white/20 border-white/40" 
                    : "bg-black/60 border-white/20 hover:bg-black/80"
                )}
                title="Camera Options"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </motion.div>

          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </AnimatePresence>
  );
}

