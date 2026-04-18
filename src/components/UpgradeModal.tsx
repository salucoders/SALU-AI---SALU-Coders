import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Crown, Check, Smartphone, QrCode, Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNotification } from '../context/NotificationContext';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPaid: boolean;
  jazzCashNumber: string;
  qrUrl: string;
}

export function UpgradeModal({ isOpen, onClose, isPaid, jazzCashNumber, qrUrl }: UpgradeModalProps) {
  const { notify } = useNotification();

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(jazzCashNumber);
    notify?.('JazzCash number copied to clipboard', 'success', 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            {/* Header Gradient */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-amber-400 via-brand-500 to-rose-600 opacity-10" />
            
            <div className="relative p-8 md:p-10">
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-brand-500 rounded-3xl flex items-center justify-center shadow-lg shadow-brand-500/20 rotate-3">
                  <Crown className="w-10 h-10 text-white animate-pulse" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                    {isPaid ? "SALU AI Plus Member" : "Join SALU AI Plus"}
                  </h2>
                  <p className="text-slate-500 font-medium">
                    {isPaid 
                      ? "Thank you for supporting SALU AI! Need to renew or support more?" 
                      : "Unlock full power with Study Toolbox, Live AI, and 100 daily credits."}
                  </p>
                </div>

                {/* Benefits List */}
                <div className="grid grid-cols-2 gap-3 w-full">
                  {[
                    "Study Toolbox",
                    "Live AI Mode",
                    "100 Credits/Day",
                    "Media Vault",
                    "Voice Interaction",
                    "Smart Notes"
                  ].map((benefit, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3" />
                      </div>
                      <span className="text-xs font-bold text-slate-700">{benefit}</span>
                    </div>
                  ))}
                </div>

                {/* Payment Box */}
                <div className="w-full bg-slate-900 rounded-[2rem] p-6 text-white space-y-6 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-3xl -mr-16 -mt-16 group-hover:bg-brand-500/20 transition-all duration-700" />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-brand-400">
                      <Smartphone className="w-5 h-5" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">JazzCash Payment</span>
                    </div>
                    <div className="text-2xl font-black text-white">Rs. 200<span className="text-xs font-medium text-slate-500 ml-1">/mo</span></div>
                  </div>

                  <div className="bg-slate-800/50 rounded-2xl p-4 flex items-center justify-between border border-white/5 group/copy active:scale-95 transition-transform" onClick={handleCopyNumber}>
                    <div className="flex flex-col items-start translate-x-1">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Account Number</span>
                      <span className="text-xl font-mono font-bold tracking-wider text-brand-100">{jazzCashNumber}</span>
                    </div>
                    <button className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>

                  {qrUrl && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-slate-400 justify-center">
                        <QrCode className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Scan QR to Pay</span>
                      </div>
                      <div className="aspect-square w-full max-w-[200px] mx-auto bg-white rounded-2xl p-3 shadow-inner relative group/qr">
                        <img 
                          src={qrUrl} 
                          alt="Payment QR" 
                          className="w-full h-full object-contain rounded-lg"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/qr:opacity-100 transition-opacity rounded-2xl flex items-center justify-center backdrop-blur-[2px]">
                           <QrCode className="w-8 h-8 text-white" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest pt-2">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Manual Assignment via Admin Panel
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 font-medium max-w-xs mx-auto">
                  After sending payment, please logout and login again or wait for admin to assign your Plus status. Support: salucoders@gmail.com
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
