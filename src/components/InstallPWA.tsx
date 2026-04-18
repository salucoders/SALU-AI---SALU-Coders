import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Layers, Sparkles, Zap, CheckCircle2 } from 'lucide-react';
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
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 sm:p-6 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full max-w-sm bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden relative pointer-events-auto"
          >
            {/* Top accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-400 via-brand-500 to-rose-400" />
            
            <button 
              onClick={skipInstall}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="p-6 pt-8 flex flex-col items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-brand-50 to-rose-50 rounded-2xl flex items-center justify-center shadow-sm border border-brand-100/50 mb-5 relative group">
                <Layers className="w-8 h-8 text-brand-500" />
                <div className="absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-tr from-rose-500 to-orange-400 rounded-full flex items-center justify-center border-[2.5px] border-white shadow-md">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
              
              <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2 text-center">Install SALU AI</h3>
              <p className="text-sm font-medium text-slate-500 mb-6 text-center leading-relaxed">
                Add SALU AI to your home screen for the ultimate mobile experience.
              </p>
              
              <div className="w-full space-y-3 mb-8 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-brand-600">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">Faster native performance</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">One-tap home screen access</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">Fullscreen immersion</span>
                </div>
              </div>
              
              <div className="flex flex-col w-full gap-3">
                <button
                  onClick={handleInstallClick}
                  className="w-full py-4 bg-slate-900 text-white font-bold text-sm rounded-2xl hover:bg-black transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20 active:scale-[0.98]"
                >
                  <Download className="w-4 h-4" />
                  Install App Now
                </button>
                <button
                  onClick={skipInstall}
                  className="w-full py-3 text-slate-500 font-bold text-sm rounded-2xl hover:bg-slate-50 transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
