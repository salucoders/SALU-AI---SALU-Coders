import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight, 
  ChevronLeft, 
  X, 
  GraduationCap, 
  Code, 
  Video, 
  User, 
  School,
  MessageSquare,
  Plus,
  Settings,
  Mic,
  Crown
} from 'lucide-react';
import { cn } from '../lib/utils';
import { LOGO_URL, APP_NAME } from '../constants';

interface Step {
  title: string;
  description: string;
  icon: React.ReactNode;
  targetId?: string;
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
}

const steps: Step[] = [
  {
    title: `Welcome to ${APP_NAME}`,
    description: `Your advanced AI companion designed for the SALU community. Let's take a quick tour of the core features.`,
    icon: <img src={LOGO_URL} alt="Logo" className="w-8 h-8 object-contain" referrerPolicy="no-referrer" />,
    position: 'center'
  },
  {
    title: "Specialized AI Modes",
    description: "Switch between Student, Developer, Creator, Assistant, and SALU modes to get tailored assistance for your specific needs.",
    icon: <GraduationCap className="w-8 h-8 text-blue-500" />,
    targetId: 'mode-selector',
    position: 'right'
  },
  {
    title: "Start New Conversations",
    description: "Keep your topics organized by starting a new chat for every new subject or project.",
    icon: <Plus className="w-8 h-8 text-slate-900" />,
    targetId: 'new-chat-button',
    position: 'right'
  },
  {
    title: "Smart Chat Input",
    description: "Type your messages, upload images for analysis, or use voice input to interact with the AI naturally.",
    icon: <MessageSquare className="w-8 h-8 text-emerald-500" />,
    targetId: 'chat-input-area',
    position: 'top'
  },
  {
    title: "Personalize Your Experience",
    description: "Customize your name, profile picture, and AI persona in the settings to make SALU AI truly yours.",
    icon: <Settings className="w-8 h-8 text-orange-500" />,
    targetId: 'settings-button',
    position: 'right'
  },
  {
    title: "Choose Your Plan",
    description: `Start with the Free plan to explore, or grab ${APP_NAME} Plus with JazzCash for 100 daily credits and exclusive Study Toolbox features.`,
    icon: <Crown className="w-8 h-8 text-amber-500" />,
    position: 'center'
  }
];

interface OnboardingProps {
  onComplete: () => void;
  onUpgradeRequest?: () => void;
}

export function Onboarding({ onComplete, onUpgradeRequest }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  useEffect(() => {
    const updateCoords = () => {
      const step = steps[currentStep];
      if (step.targetId) {
        const element = document.getElementById(step.targetId);
        if (element) {
          const rect = element.getBoundingClientRect();
          setCoords({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
          });
        }
      } else {
        setCoords(null);
      }
    };

    updateCoords();
    const element = steps[currentStep].targetId ? document.getElementById(steps[currentStep].targetId!) : null;
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    window.addEventListener('resize', updateCoords);
    return () => window.removeEventListener('resize', updateCoords);
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto"
        onClick={onComplete}
      />

      {/* Highlight Hole */}
      <AnimatePresence>
        {coords && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle at ${coords.left + coords.width / 2}px ${coords.top + coords.height / 2}px, transparent ${Math.max(coords.width, coords.height) / 1.5}px, rgba(15, 23, 42, 0.6) 0px)`
            }}
          />
        )}
      </AnimatePresence>

      {/* Modal */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className={cn(
          "relative w-full max-w-sm bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl overflow-hidden pointer-events-auto mx-4",
          step.position === 'center' ? '' : 'absolute'
        )}
        style={coords ? {
          top: step.position === 'top' ? coords.top - 320 : step.position === 'bottom' ? coords.top + coords.height + 20 : undefined,
          left: step.position === 'left' ? coords.left - 400 : step.position === 'right' ? coords.left + coords.width + 20 : undefined,
          // Fallback if it goes off screen
          transform: 'none'
        } : {}}
      >
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center shadow-sm border border-slate-100">
              {step.icon}
            </div>
            <button 
              onClick={onComplete}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-brand-50 text-brand-600 text-[10px] font-black uppercase tracking-widest rounded-full">
                Step {currentStep + 1} of {steps.length}
              </span>
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
              {step.title}
            </h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              {step.description}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch gap-3 pt-4">
            {currentStep > 0 && currentStep !== steps.length - 1 && (
              <button
                onClick={handlePrev}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-4 bg-slate-50 text-slate-600 rounded-2xl font-bold hover:bg-slate-100 transition-all border border-slate-200"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
            
            {currentStep !== steps.length - 1 ? (
              <button
                onClick={handleNext}
                className="flex-[2] flex items-center justify-center gap-2 px-4 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black shadow-lg shadow-slate-900/20 transition-all group"
              >
                Next Step
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            ) : (
              // Final Step: Plan Selection
              <>
                <button
                  onClick={onComplete}
                  className="flex-1 flex items-center justify-center px-4 py-4 bg-slate-50 text-slate-600 rounded-2xl font-bold hover:bg-slate-100 transition-all border border-slate-200"
                >
                  Start Free
                </button>
                <button
                  onClick={onUpgradeRequest || onComplete}
                  className="flex-1 flex items-center justify-center px-4 py-4 bg-gradient-to-r from-amber-500 to-rose-600 text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg"
                >
                  Get SALU Plus
                </button>
              </>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 bg-slate-100 w-full overflow-hidden">
          <motion.div 
            className="h-full bg-brand-500"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </motion.div>
    </div>
  );
}
