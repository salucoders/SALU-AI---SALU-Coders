import React, { useState, useRef, useEffect } from 'react';
import { X, User, Languages, Camera, Save, Check, Palette, Heart, HeartOff, GraduationCap, School, Sparkles, Briefcase, Smile, Zap, Wand2, Settings as SettingsIcon, ChevronRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPreferences, Persona } from '../types';
import { cn } from '../lib/utils';
import { useUserProfile } from '../context/UserProfileContext';
import { useNotification } from '../context/NotificationContext';

type SettingsSection = 'profile' | 'appearance' | 'ai' | 'academic';

export function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { preferences, updatePreferences, loading } = useUserProfile();
  const { notify } = useNotification();
  const [localPrefs, setLocalPrefs] = useState<UserPreferences>(preferences);
  const [activeSection, setActiveSection] = useState<SettingsSection | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && !loading) {
      setLocalPrefs(preferences);
      if (window.innerWidth >= 768) {
        setActiveSection('profile');
      } else {
        setActiveSection(null);
      }
    }
  }, [isOpen, preferences, loading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setLocalPrefs(prev => ({ ...prev, profilePicture: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    try {
      await updatePreferences(localPrefs);
      setIsSaved(true);
      notify('Profile Preferences Updated', 'success', 2000);
      setTimeout(() => {
        setIsSaved(false);
        onClose();
      }, 1500);
    } catch (error) {
      console.error("Failed to save settings:", error);
      notify('Failed to save settings', 'error', 3000);
    }
  };

  const accentColors = [
    { name: 'Salu Blue', value: '#0ea5e9' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Violet', value: '#8b5cf6' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Slate', value: '#475569' },
    { name: 'Crimson', value: '#dc2626' },
  ];

  const languages = ['English', 'Urdu', 'Sindhi', 'Spanish', 'French', 'German'] as const;

  const personas: { id: Persona; label: string; icon: any; color: string; description: string }[] = [
    { id: 'professional', label: 'Professional', icon: Briefcase, color: 'text-slate-600 bg-slate-50', description: 'Formal & Precise' },
    { id: 'friendly', label: 'Friendly', icon: Smile, color: 'text-emerald-600 bg-emerald-50', description: 'Warm & Approachable' },
    { id: 'witty', label: 'Witty', icon: Zap, color: 'text-amber-600 bg-amber-50', description: 'Clever & Humorous' },
    { id: 'encouraging', label: 'Encouraging', icon: Heart, color: 'text-rose-600 bg-rose-50', description: 'Supportive & Positive' },
    { id: 'creative', label: 'Creative', icon: Wand2, color: 'text-purple-600 bg-purple-50', description: 'Imaginative & Artistic' },
  ];

  const sections: { id: SettingsSection; label: string; icon: any; description: string }[] = [
    { id: 'profile', label: 'General', icon: User, description: 'Name, language, and profile picture' },
    { id: 'appearance', label: 'Personalization', icon: Palette, description: 'Theme colors and visual style' },
    { id: 'ai', label: 'AI Personality', icon: Sparkles, description: 'Tone and style of AI responses' },
    { id: 'academic', label: 'Academic & Data', icon: School, description: 'Department, class, and preferences' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center md:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full h-full md:h-[85vh] md:max-h-[700px] md:max-w-4xl bg-white md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row"
          >
            {/* Sidebar / Menu List */}
            <div className={cn(
              "w-full md:w-80 bg-slate-50/50 border-r border-slate-100 flex flex-col transition-all duration-300",
              activeSection && "hidden md:flex"
            )}>
              <div className="p-6 md:p-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
                    <SettingsIcon className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Settings</h2>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors md:hidden">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              
              <nav className="flex-1 px-4 md:px-6 space-y-2 overflow-y-auto pb-8">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={cn(
                        "w-full flex items-center gap-4 px-5 py-5 rounded-[1.5rem] transition-all text-left group",
                        isActive 
                          ? "bg-white text-slate-900 shadow-md border border-slate-100" 
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      )}
                    >
                      <div className={cn(
                        "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300",
                        isActive ? "bg-slate-900 text-white scale-110" : "bg-white text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600 shadow-sm"
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black tracking-tight">{section.label}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate mt-0.5">{section.description}</p>
                      </div>
                      <ChevronRight className={cn("w-4 h-4 text-slate-300 transition-transform duration-300", isActive && "translate-x-1 text-slate-900")} />
                    </button>
                  );
                })}
              </nav>

              <div className="p-8 border-t border-slate-100 hidden md:block">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                    {localPrefs.profilePicture ? (
                      <img src={localPrefs.profilePicture || null} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 truncate">{localPrefs.name || 'Guest User'}</p>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Standard Tier</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className={cn(
              "flex-1 flex flex-col bg-white overflow-hidden transition-all duration-300",
              !activeSection && "hidden md:flex"
            )}>
              {/* Header */}
              <div className="p-5 md:p-8 border-b border-slate-100 flex items-center gap-4 sticky top-0 bg-white/90 backdrop-blur-md z-20">
                <button 
                  onClick={() => setActiveSection(null)}
                  className="p-2.5 -ml-2 hover:bg-slate-100 rounded-2xl transition-all active:scale-90 md:hidden flex items-center justify-center bg-slate-50 border border-slate-100"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-900" />
                </button>
                <div className="flex-1">
                  <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
                    {sections.find(s => s.id === activeSection)?.label || 'Settings'}
                  </h3>
                </div>
                <button onClick={onClose} className="p-2.5 hover:bg-slate-100 rounded-2xl transition-all hidden md:flex items-center justify-center bg-slate-50 border border-slate-100">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 md:p-10 no-scrollbar">
                <AnimatePresence mode="wait">
                  {activeSection ? (
                    <motion.div
                      key={activeSection}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="max-w-2xl mx-auto space-y-10"
                    >
                      {activeSection === 'profile' && (
                        <div className="space-y-10">
                          <div className="flex flex-col items-center gap-8">
                            <div className="relative group">
                              <div className="w-32 h-32 rounded-[2.5rem] bg-white border-4 border-white shadow-2xl overflow-hidden flex items-center justify-center ring-1 ring-slate-100">
                                {localPrefs.profilePicture ? (
                                  <img 
                                    src={localPrefs.profilePicture || null} 
                                    alt="Profile" 
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover" 
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                                    <User className="w-16 h-16 text-slate-300" />
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute -bottom-2 -right-2 p-3 bg-slate-900 text-white rounded-2xl shadow-xl hover:bg-black transition-all active:scale-90 ring-4 ring-white"
                              >
                                <Camera className="w-5 h-5" />
                              </button>
                              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                            </div>
                            
                            <div className="w-full space-y-6">
                              <div className="space-y-3">
                                <div className="flex flex-col ml-1">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Display Name</label>
                                  <p className="text-[10px] text-slate-400 font-medium mt-0.5 italic">How the AI will address you in conversations.</p>
                                </div>
                                <input
                                  type="text"
                                  value={localPrefs.name}
                                  onChange={(e) => setLocalPrefs(prev => ({ ...prev, name: e.target.value }))}
                                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all outline-none font-bold text-slate-900"
                                />
                              </div>

                              <div className="space-y-3">
                                <div className="flex flex-col ml-1">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preferred Language</label>
                                  <p className="text-[10px] text-slate-400 font-medium mt-0.5 italic">The primary language for AI interactions.</p>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  {languages.map((lang) => (
                                    <button
                                      key={lang}
                                      onClick={() => {
                                        setLocalPrefs(prev => ({ ...prev, language: lang as any }));
                                        notify(`Language set to ${lang}`, 'change', 2000);
                                      }}
                                      className={cn(
                                        "px-4 py-3 rounded-xl border text-xs font-bold transition-all",
                                        localPrefs.language === lang
                                          ? "bg-slate-900 border-slate-900 text-white shadow-lg"
                                          : "bg-white border-slate-100 text-slate-600 hover:border-slate-200"
                                      )}
                                    >
                                      {lang}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeSection === 'appearance' && (
                        <div className="space-y-10">
                          <div className="space-y-4">
                            <div className="flex flex-col ml-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accent Theme</label>
                              <p className="text-[10px] text-slate-400 font-medium mt-0.5 italic">Choose a color that matches your style. This affects buttons and highlights.</p>
                            </div>
                            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                              {accentColors.map((color) => (
                                <button
                                  key={color.value}
                                  onClick={() => {
                                    setLocalPrefs(prev => ({ ...prev, accentColor: color.value }));
                                    notify(`Theme color changed to ${color.name}`, 'change', 2000);
                                  }}
                                  className={cn(
                                    "w-full aspect-square rounded-xl transition-all relative flex items-center justify-center group",
                                    localPrefs.accentColor === color.value ? "ring-4 ring-slate-100 scale-110 shadow-xl" : "hover:scale-105"
                                  )}
                                  style={{ backgroundColor: color.value }}
                                  title={color.name}
                                >
                                  {localPrefs.accentColor === color.value && (
                                    <Check className="w-5 h-5 text-white drop-shadow-md" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                            <h4 className="text-sm font-black text-slate-900">Theme Preview</h4>
                            <div className="flex flex-wrap gap-3">
                              <div className="px-4 py-2 rounded-xl text-white text-xs font-bold shadow-lg" style={{ backgroundColor: localPrefs.accentColor }}>Primary Button</div>
                              <div className="px-4 py-2 rounded-xl border-2 text-xs font-bold" style={{ borderColor: localPrefs.accentColor, color: localPrefs.accentColor }}>Outline Style</div>
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${localPrefs.accentColor}20`, color: localPrefs.accentColor }}>
                                <Sparkles className="w-5 h-5" />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeSection === 'ai' && (
                        <div className="space-y-4">
                          <div className="flex flex-col ml-1 mb-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Personality</label>
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5 italic">Select a tone that fits your current mood or task. You can change this anytime.</p>
                          </div>
                          <div className="grid grid-cols-1 gap-3">
                            {personas.map((persona) => {
                              const Icon = persona.icon;
                              const isActive = localPrefs.persona === persona.id;
                              return (
                                <button
                                  key={persona.id}
                                  onClick={() => {
                                    setLocalPrefs(prev => ({ ...prev, persona: persona.id }));
                                    notify(`AI Personality set to ${persona.label}`, 'change', 2000);
                                  }}
                                  className={cn(
                                    "w-full flex items-center gap-5 p-5 rounded-3xl transition-all text-left border-2",
                                    isActive 
                                      ? "bg-slate-50 border-slate-900 shadow-sm" 
                                      : "bg-white border-slate-50 hover:bg-slate-50 hover:border-slate-100"
                                  )}
                                >
                                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-colors", isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400")}>
                                    <Icon className="w-7 h-7" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className={cn("text-base font-black tracking-tight", isActive ? "text-slate-900" : "text-slate-600")}>
                                        {persona.label}
                                      </span>
                                      {isActive && <div className="w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center"><Check className="w-3.5 h-3.5 text-white stroke-[3px]" /></div>}
                                    </div>
                                    <p className="text-xs text-slate-400 font-medium leading-relaxed">{persona.description}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {activeSection === 'academic' && (
                        <div className="space-y-10">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-3">
                              <div className="flex flex-col ml-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</label>
                                <p className="text-[10px] text-slate-400 font-medium mt-0.5 italic">Helps the AI provide more relevant academic context.</p>
                              </div>
                              <input
                                type="text"
                                value={localPrefs.department}
                                onChange={(e) => setLocalPrefs(prev => ({ ...prev, department: e.target.value }))}
                                placeholder="e.g. Computer Science"
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all outline-none font-bold text-slate-900"
                              />
                            </div>
                            <div className="space-y-3">
                              <div className="flex flex-col ml-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Class / Year</label>
                                <p className="text-[10px] text-slate-400 font-medium mt-0.5 italic">Ensures the AI's explanations are appropriate for your level.</p>
                              </div>
                              <input
                                type="text"
                                value={localPrefs.class}
                                onChange={(e) => setLocalPrefs(prev => ({ ...prev, class: e.target.value }))}
                                placeholder="e.g. BSCS 4th Year"
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all outline-none font-bold text-slate-900"
                              />
                            </div>
                          </div>

                          <div className="space-y-6">
                            <div className="space-y-3">
                              <div className="flex flex-col ml-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                  <Heart className="w-3 h-3 text-rose-500" />
                                  Personalization: Likes
                                </label>
                                <p className="text-[10px] text-slate-400 font-medium mt-0.5 italic">Tell the AI what you enjoy so it can tailor its responses.</p>
                              </div>
                              <textarea
                                value={localPrefs.likes}
                                onChange={(e) => setLocalPrefs(prev => ({ ...prev, likes: e.target.value }))}
                                placeholder="What topics or styles do you enjoy?"
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all outline-none font-bold text-slate-900 resize-none h-32"
                              />
                            </div>
                            <div className="space-y-3">
                              <div className="flex flex-col ml-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                  <HeartOff className="w-3 h-3 text-slate-400" />
                                  Personalization: Dislikes
                                </label>
                                <p className="text-[10px] text-slate-400 font-medium mt-0.5 italic">Let the AI know what to avoid for a better experience.</p>
                              </div>
                              <textarea
                                value={localPrefs.dislikes}
                                onChange={(e) => setLocalPrefs(prev => ({ ...prev, dislikes: e.target.value }))}
                                placeholder="Anything you'd like the AI to avoid?"
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all outline-none font-bold text-slate-900 resize-none h-32"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-300 md:hidden">
                      <p className="text-sm font-medium">Select a category to begin</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer Actions */}
              <div className="p-6 md:p-8 bg-slate-50/50 border-t border-slate-100 flex gap-4 sticky bottom-0 z-10">
                <button
                  onClick={handleSave}
                  disabled={isSaved}
                  className={cn(
                    "flex-1 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl relative overflow-hidden",
                    isSaved
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-900 text-white hover:bg-black shadow-slate-900/20"
                  )}
                >
                  <AnimatePresence mode="wait">
                    {isSaved ? (
                      <motion.div
                        key="saved"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-3"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        >
                          <Check className="w-5 h-5" />
                        </motion.div>
                        Saved Successfully
                      </motion.div>
                    ) : (
                      <motion.div
                        key="save"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-3"
                      >
                        <Save className="w-5 h-5" />
                        Save All Changes
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {isSaved && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: [0, 0.5, 0], scale: [1, 2, 2.5] }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="absolute inset-0 bg-white/20 rounded-full"
                    />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
