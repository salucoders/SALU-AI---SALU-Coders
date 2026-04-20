import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, X, ArrowRight } from 'lucide-react';

interface PasscodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PasscodeModal({ isOpen, onClose, onSuccess }: PasscodeModalProps) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const savedConfig = localStorage.getItem('salu_secret_config');
    let correctPasscode = 'salu786'; // Default

    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        if (parsed.secretPasscode) {
          correctPasscode = parsed.secretPasscode;
        }
      } catch (e) {}
    }

    if (passcode === correctPasscode) {
      setError(false);
      setPasscode('');
      onSuccess();
    } else {
      setError(true);
      setTimeout(() => setError(false), 500);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
          >
            <div className="p-8">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <Lock className="w-6 h-6 text-slate-900" />
              </div>
              
              <div className="text-center mb-8">
                <h2 className="text-xl font-black text-slate-900">Security Gate</h2>
                <p className="text-sm text-slate-500 font-medium">Enter secret key to proceed</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <input
                    autoFocus
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full px-4 py-4 bg-slate-50 border ${
                      error ? 'border-red-500 animate-shake' : 'border-slate-200'
                    } rounded-2xl focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all text-center text-xl tracking-widest font-mono`}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 group"
                >
                  Unlock Intelligence
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </form>
            </div>

            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
