import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ImageIcon, X, Sparkles, Wand2, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { APP_NAME } from '../constants';

interface MagicImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (prompt: string) => void;
}

export const MagicImageModal: React.FC<MagicImageModalProps> = ({ isOpen, onClose, onGenerate }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    onGenerate(prompt.trim());
    setPrompt('');
    onClose();
  };

  const suggestions = [
    { label: "Cyberpunk City", icon: "🏙️" },
    { label: "Astronaut in Ocean", icon: "👨‍🚀" },
    { label: "Forest of Crystals", icon: "💎" },
    { label: "Neon Samurai", icon: "⚔️" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-[2.5rem] shadow-[0_32px_128px_rgba(0,0,0,0.3)] border border-slate-100 overflow-hidden z-[201]"
          >
            <div className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shadow-inner">
                    <ImageIcon className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Magic Image</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{APP_NAME} Vision Engine</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="relative">
                  <textarea
                    autoFocus
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the image you want to create..."
                    className="w-full bg-slate-50 border-none rounded-2xl p-5 text-slate-800 placeholder-slate-400 text-base md:text-lg font-medium resize-none min-h-[140px] focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner"
                  />
                  <div className="absolute bottom-4 right-4 flex items-center gap-2">
                    <div className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Vision Deep Learning</span>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Try these ideas</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPrompt(s.label)}
                        className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-sm font-semibold text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 transition-all active:scale-95"
                      >
                        <span className="mr-2">{s.icon}</span>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!prompt.trim()}
                  className={cn(
                    "w-full h-14 rounded-2xl flex items-center justify-center gap-2 font-black text-sm uppercase tracking-widest transition-all",
                    prompt.trim() 
                      ? "bg-slate-900 text-white shadow-[0_20px_40px_rgba(0,0,0,0.2)] hover:bg-black" 
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  )}
                >
                  Generate Masterpiece
                  <Sparkles className="w-5 h-5 pointer-events-none" />
                </motion.button>
              </form>
            </div>
            
            <div className="bg-slate-50/80 px-8 py-4 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                <Wand2 className="w-3 h-3" />
                Prompt optimization active
              </div>
              <div className="flex items-center gap-4">
                <span className="h-1 w-8 rounded-full bg-slate-200" />
                <span className="h-1 w-8 rounded-full bg-emerald-500" />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
