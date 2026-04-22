import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCcw, Maximize2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function AICamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [facingMode]);

  const startCamera = async () => {
    stopCamera();
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
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
    <div ref={containerRef} className="relative w-full aspect-video md:aspect-auto md:h-96 rounded-3xl overflow-hidden bg-black border border-white/10 group">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      
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
    </div>
  );
}
