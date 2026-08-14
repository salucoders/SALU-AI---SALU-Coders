import React from 'react';
import { Loader2 } from 'lucide-react';
import { LOGO_URL, APP_NAME } from '../constants';

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0A0A0A] text-white">
      <div className="relative flex flex-col items-center">
        {/* Glow effect */}
        <div className="absolute -inset-4 bg-brand-500/20 rounded-full blur-2xl animate-pulse" />
        
        {/* Logo Container */}
        <div className="relative w-20 h-20 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-6 shadow-2xl backdrop-blur-xl">
          <img 
            src={LOGO_URL} 
            alt={APP_NAME} 
            className="w-12 h-12 object-contain"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Brand Name */}
        <h2 className="text-xl font-bold tracking-tight text-white mb-2">
          {APP_NAME}
        </h2>
        
        {/* Loading Spinner & Subtitle */}
        <div className="flex items-center gap-2 text-slate-400 text-xs font-medium tracking-wide">
          <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
          <span>Starting workspace...</span>
        </div>
      </div>
    </div>
  );
}
