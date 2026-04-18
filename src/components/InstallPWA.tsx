import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Layers, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Check if running on iOS
    const isIos = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    };
    
    // Check if already installed
    const isInStandaloneMode = () => ('standalone' in window.navigator) && (window.navigator as any).standalone;

    const handler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Wait a bit before showing to not overwhelm the user right after login
      setTimeout(() => setShow(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  const skipInstall = () => {
    setShow(false);
  };

  // Only show if user is logged in
  if (!user) return null;

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative pointer-events-auto"
          >
            {/* Top accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-400 via-brand-500 to-rose-400" />
            
            <button 
              onClick={skipInstall}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="p-6 pt-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl flex items-center justify-center shadow-inner border border-slate-200 mb-5 relative group">
                <div className="absolute inset-0 bg-brand-500 opacity-0 group-hover:opacity-10 transition-opacity rounded-2xl" />
                <Layers className="w-8 h-8 text-brand-500 shadow-sm" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center border-2 border-white shadow-md">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-slate-800 mb-2">Install SALU AI</h3>
              <p className="text-sm font-medium text-slate-500 mb-6 px-2 leading-relaxed">
                Add SALU AI to your home screen for instant access, better performance, and a native app experience.
              </p>
              
              <div className="flex flex-col sm:flex-row w-full gap-3">
                <button
                  onClick={skipInstall}
                  className="flex-1 px-4 py-3 bg-slate-50 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-100 transition-colors border border-slate-200"
                >
                  Maybe Later
                </button>
                <button
                  onClick={handleInstallClick}
                  className="flex-[1.5] px-4 py-3 bg-brand-500 text-white font-bold text-sm rounded-xl hover:bg-brand-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  Install App
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
