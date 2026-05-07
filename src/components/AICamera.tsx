import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCcw, Maximize2, X, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function AICamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (isActive) {
      startCamera();
    }
    return () => stopCamera();
  }, [facingMode, isActive]);

  const startCamera = async () => {
    stopCamera();
    setError(null);
    setIsActive(true);
    try {
      let mediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        });
      } catch (fallbackErr) {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission denied')) {
        setError('Camera permission denied. Please allow camera access in your browser or try opening the app in a new tab.');
      } else {
        setError('Could not access the camera. Please make sure your device has a camera and it is not being used by another application.');
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full aspect-video md:aspect-auto md:h-96 rounded-3xl overflow-hidden bg-black border border-white/10 group flex items-center justify-center">
      {!isActive && !error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 px-6 text-center z-10">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10">
            <Camera className="w-8 h-8 text-white/50" />
          </div>
          <button onClick={() => setIsActive(true)} className="px-8 py-3.5 bg-white text-zinc-900 rounded-2xl font-bold hover:bg-zinc-200 transition-colors flex items-center gap-3 active:scale-95">
            <Play className="w-5 h-5 fill-current" />
            Start Live AI Camera
          </button>
        </div>
      ) : error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 px-6 text-center z-10">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
            <Camera className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-red-400 font-medium max-w-sm">{error}</p>
          <button onClick={startCamera} className="mt-6 px-6 py-2.5 bg-white text-zinc-900 rounded-xl font-bold hover:bg-zinc-200 transition-colors">
            Try Again
          </button>
        </div>
      ) : null}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      
      {isActive && !error && (
        <>
          <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={toggleCamera} className="p-3 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all">
              <RefreshCcw size={20} />
            </button>
            <button onClick={toggleFullscreen} className="p-3 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all">
              <Maximize2 size={20} />
            </button>
          </div>
          
          <div className="absolute bottom-4 left-4 text-white font-bold flex items-center gap-2 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            LIVE AI FEED
          </div>
        </>
      )}
    </div>
  );
}
