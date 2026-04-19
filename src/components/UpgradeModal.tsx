import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Crown, Check, Smartphone, QrCode, Copy, ShieldCheck, MessageCircle, Send } from 'lucide-react';
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

  const WA_NUMBER = "923242571748";
  const WA_TEXT = "Hello! I have just paid Rs. 200 via JazzCash for the SALU AI Plus subscription. Here is my payment screenshot:";
  const WA_URL = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_TEXT)}`;

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(jazzCashNumber);
    notify?.('JazzCash number copied to clipboard', 'success', 2000);
  };

  const handleSendScreenshot = () => {
    window.open(WA_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center p-0 sm:p-4 sm:pt-12">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: "100%" }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-[#F8FAFC] sm:rounded-[2.5rem] rounded-t-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
          >
            {/* Header Area (Sticky) */}
            <div className="relative shrink-0 bg-white border-b border-slate-100 p-6 flex items-center justify-between z-10 rounded-t-[2rem] sm:rounded-t-[2.5rem]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-brand-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
                  <Crown className="w-5 h-5 text-white animate-pulse" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none">
                    {isPaid ? "SALU AI Plus Member" : "SALU AI Plus"}
                  </h2>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-rose-500 mt-1">
                    Premium Access
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600 active:scale-90"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-5 sm:p-8 space-y-6 bg-white relative">
              
              <div className="text-center space-y-2">
                <p className="text-sm sm:text-base text-slate-500 font-medium">
                  {isPaid 
                    ? "Thank you for supporting SALU AI! Need to renew or support more?" 
                    : "Unlock full power with Study Toolbox, Live AI, and 100 daily credits for just Rs. 200/mo."}
                </p>
              </div>

              {/* Benefits Highlight */}
              {!isPaid && (
                <div className="grid grid-cols-2 gap-3">
                  {["Study Toolbox", "100 Credits/Day", "Live AI Mode", "Smart Notes"].map((benefit, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2.5 bg-slate-50/80 rounded-xl border border-slate-100">
                      <div className="w-4 h-4 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-700 truncate">{benefit}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* JazzCash Payment Box */}
              <div className="w-full bg-slate-900 rounded-[2rem] p-6 text-white space-y-6 shadow-xl relative overflow-hidden group border border-slate-800">
                <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/10 blur-3xl rounded-full -mr-20 -mt-20 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/10 blur-2xl rounded-full -ml-16 -mb-16 pointer-events-none" />
                
                <div className="relative z-10 flex flex-col items-center gap-4">
                  <div className="w-full flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                         <Smartphone className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-black uppercase tracking-widest text-slate-200">JazzCash</span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-white">Rs. 200</span>
                      <span className="text-[10px] font-medium text-slate-400 block uppercase tracking-widest">Per Month</span>
                    </div>
                  </div>

                  {qrUrl && (
                    <div className="w-full flex flex-col items-center gap-5 py-4 border-b border-white/5">
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-brand-400 flex items-center gap-2 bg-brand-500/10 px-4 py-2 rounded-full">
                        <QrCode className="w-4 h-4" /> Scan with JazzCash App
                      </span>
                      <div className="bg-white p-3 sm:p-4 rounded-[2rem] shadow-2xl w-full max-w-[220px] aspect-square relative flex items-center justify-center isolate">
                        {/* Scanning frame aesthetic */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-brand-500 rounded-tl-[1.8rem] -translate-x-1 -translate-y-1" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-brand-500 rounded-tr-[1.8rem] translate-x-1 -translate-y-1" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-brand-500 rounded-bl-[1.8rem] -translate-x-1 translate-y-1" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-brand-500 rounded-br-[1.8rem] translate-x-1 translate-y-1" />
                        
                        <img 
                          src={qrUrl} 
                          alt="JazzCash QR" 
                          className="w-full h-full object-contain relative z-10"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>
                  )}

                  <div className="w-full pt-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block text-center mb-3 relative">
                      <span className="bg-slate-900 px-2 relative z-10">Or Send To Account Number</span>
                      <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-slate-800 -z-0" />
                    </span>
                    <button 
                      onClick={handleCopyNumber}
                      className="w-full bg-slate-800 hover:bg-slate-700/80 active:scale-[0.98] transition-all rounded-xl p-4 flex items-center justify-between border border-white/5"
                    >
                      <div className="flex flex-col items-start translate-x-1">
                        <span className="text-xl font-mono font-bold tracking-wider text-brand-400">{jazzCashNumber}</span>
                      </div>
                      <div className="p-2 bg-slate-900/50 rounded-lg text-slate-400">
                        <Copy className="w-4 h-4" />
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Area: Send Screenshot */}
              <div className="bg-emerald-50 rounded-3xl p-5 border border-emerald-100 flex flex-col gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <MessageCircle className="w-24 h-24 text-emerald-900" />
                </div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-2 text-emerald-700 mb-1">
                    <ShieldCheck className="w-5 h-5" />
                    <span className="font-black text-sm uppercase tracking-wide">Manual Activation</span>
                  </div>
                  <p className="text-emerald-800 text-xs sm:text-sm font-medium leading-relaxed">
                    After completing the payment of <b>Rs. 200</b>, kindly send us a screenshot on WhatsApp. The admin will verify and activate your Plus status immediately.
                  </p>
                </div>

                <button 
                  onClick={handleSendScreenshot}
                  className="relative z-10 w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] transition-all text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <Send className="w-4 h-4" />
                  Send Screenshot
                </button>
              </div>

              {/* Footer text space so bottom fits */}
              <div className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest pb-4">
                Need Help? Contact salucoders@gmail.com
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
