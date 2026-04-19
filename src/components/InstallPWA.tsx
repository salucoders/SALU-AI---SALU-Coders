import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Layers, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePWA } from '../context/PWAContext';

export function InstallPWA() {
  const [show, setShow] = useState(false);
  const { user } = useAuth();
  const { canInstall, installed, install } = usePWA();

  useEffect(() => {
    if (canInstall && !installed) {
      // Delay to avoid overwhelming
      const timer = setTimeout(() => setShow(true), 5000);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [canInstall, installed]);

  const handleInstallClick = async () => {
    try {
      await install();
      setShow(false);
    } catch (err) {
      console.error("Install failed:", err);
    }
  };

  const skipInstall = () => {
    setShow(false);
  };

  // Only show if user is logged in and not already installed
  if (!user || installed) return null;

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed top-4 left-4 right-4 sm:top-6 sm:left-1/2 sm:-translate-x-1/2 sm:w-[400px] z-[200] pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="w-full bg-white/90 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/50 overflow-hidden pointer-events-auto flex items-center p-2.5 pr-4 gap-3 relative"
          >
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shrink-0 border border-brand-100/50 shadow-sm relative overflow-hidden p-2">
              <img 
                src="/assets/logo/salu_logo.png" 
                alt="SALU Logo" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-tr from-rose-500 to-orange-400 rounded-full flex items-center justify-center shadow-sm z-20">
                <Sparkles className="w-2.5 h-2.5 text-white" />
              </div>
            </div>

            <div className="flex-1 min-w-0 py-1">
              <h3 className="text-[13px] font-black text-slate-900 tracking-tight leading-tight mb-0.5">Install SALU AI App</h3>
              <p className="text-[11px] font-medium text-slate-500 truncate">For faster, immersive mobile experience</p>
            </div>

            <button
              onClick={handleInstallClick}
              className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-black transition-all shadow-md active:scale-95 shrink-0"
            >
              Get App
            </button>
            
            <button 
              onClick={skipInstall}
              className="p-1.5 text-slate-300 hover:text-slate-500 hover:bg-slate-100 rounded-full transition-colors absolute top-2 right-2"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
