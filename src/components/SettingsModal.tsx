import React, { useState, useRef, useEffect } from 'react';
import { X, User, Camera, Save, Check, Palette, Heart, HeartOff, School, Sparkles, Briefcase, Smile, Zap, Wand2, Volume2, UserCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPreferences, Persona } from '../types';
import { cn } from '../lib/utils';
import { useUserProfile } from '../context/UserProfileContext';
import { useNotification } from '../context/NotificationContext';

export function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { preferences, updatePreferences, loading } = useUserProfile();
  const { notify } = useNotification();
  const [localPrefs, setLocalPrefs] = useState<UserPreferences>(preferences);
  const [isSaved, setIsSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && !loading) {
      setLocalPrefs(preferences);
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
      notify('Settings saved successfully', 'success', 2000);
      setTimeout(() => {
        setIsSaved(false);
        onClose();
      }, 1000);
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

  const personas: { id: Persona; label: string; icon: any; color: string; description: string; recommendedVoice: 'male' | 'female' }[] = [
    { id: 'professional', label: 'Professional', icon: Briefcase, color: 'text-slate-600 bg-slate-50', description: 'Formal & Precise', recommendedVoice: 'male' },
    { id: 'friendly', label: 'Friendly', icon: Smile, color: 'text-emerald-600 bg-emerald-50', description: 'Warm & Approachable', recommendedVoice: 'female' },
    { id: 'witty', label: 'Witty', icon: Zap, color: 'text-amber-600 bg-amber-50', description: 'Clever & Humorous', recommendedVoice: 'male' },
    { id: 'encouraging', label: 'Encouraging', icon: Heart, color: 'text-rose-600 bg-rose-50', description: 'Supportive & Positive', recommendedVoice: 'female' },
    { id: 'creative', label: 'Creative', icon: Wand2, color: 'text-purple-600 bg-purple-50', description: 'Imaginative & Artistic', recommendedVoice: 'female' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full md:w-[480px] h-full bg-slate-50 shadow-2xl overflow-hidden flex flex-col z-10"
          >
            {/* Header */}
            <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-20">
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-semibold text-slate-800">Settings</h2>
              <button 
                onClick={handleSave}
                disabled={isSaved}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                  isSaved ? "bg-emerald-500 text-white" : "bg-slate-900 text-white hover:bg-slate-800"
                )}
              >
                {isSaved ? 'Saved' : 'Save'}
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8 custom-scrollbar">
              
              {/* Profile Section */}
              <section className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Profile</h3>
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-6">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-full bg-slate-100 border-4 border-white shadow-md overflow-hidden flex items-center justify-center">
                        {localPrefs.profilePicture ? (
                          <img 
                            src={localPrefs.profilePicture || null} 
                            alt="Profile" 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <User className="w-10 h-10 text-slate-300" />
                        )}
                      </div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 p-2 bg-slate-900 text-white rounded-full shadow-lg hover:bg-slate-800 transition-colors border-2 border-white"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1.5">Display Name</label>
                      <input
                        type="text"
                        value={localPrefs.name || ''}
                        onChange={(e) => setLocalPrefs(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Your name"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1.5">Language</label>
                      <div className="flex flex-wrap gap-2">
                        {languages.map((lang) => (
                          <button
                            key={lang}
                            onClick={() => setLocalPrefs(prev => ({ ...prev, language: lang as any }))}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
                              localPrefs.language === lang
                                ? "bg-slate-900 border-slate-900 text-white"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            )}
                          >
                            {lang}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Appearance Section */}
              <section className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Appearance</h3>
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-6">
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-2">Theme Mode</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['light', 'dark', 'system'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setLocalPrefs(prev => ({ ...prev, theme: t }))}
                          className={cn(
                            "py-2 rounded-lg border text-sm font-medium transition-colors capitalize",
                            localPrefs.theme === t
                              ? "bg-slate-900 border-slate-900 text-white"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-2">Accent Color</label>
                    <div className="flex flex-wrap gap-3">
                      {accentColors.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setLocalPrefs(prev => ({ ...prev, accentColor: color.value }))}
                          className={cn(
                            "w-8 h-8 rounded-full transition-transform flex items-center justify-center",
                            localPrefs.accentColor === color.value ? "scale-110 ring-2 ring-offset-2 ring-slate-400" : "hover:scale-105"
                          )}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        >
                          {localPrefs.accentColor === color.value && <Check className="w-4 h-4 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* AI Personality Section */}
              <section className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">AI Personality</h3>
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1.5 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-brand-500" /> Assistant Name
                    </label>
                    <input
                      type="text"
                      value={localPrefs.assistantName || 'SALU AI'}
                      onChange={(e) => setLocalPrefs(prev => ({ ...prev, assistantName: e.target.value }))}
                      placeholder="e.g. SALU AI"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-slate-800 text-sm"
                    />
                    <p className="mt-1 text-[10px] text-slate-400 font-medium italic">What the AI will call itself when addressing you.</p>
                  </div>

                  <div className="space-y-2">
                    {personas.map((persona) => {
                      const Icon = persona.icon;
                      const isActive = localPrefs.persona === persona.id;
                      return (
                        <button
                          key={persona.id}
                          onClick={() => setLocalPrefs(prev => ({ 
                            ...prev, 
                            persona: persona.id,
                            voice: persona.recommendedVoice 
                          }))}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left border",
                            isActive 
                              ? "bg-slate-50 border-slate-300" 
                              : "bg-white border-transparent hover:bg-slate-50"
                          )}
                        >
                          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500")}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-slate-800 text-sm">{persona.label}</div>
                            <div className="text-xs text-slate-500">{persona.description}</div>
                          </div>
                          {isActive && <Check className="w-5 h-5 text-slate-900" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <label className="text-xs font-medium text-slate-600 block mb-2 flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5" /> Live Voice
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setLocalPrefs(prev => ({ ...prev, voice: 'male' }))}
                        className={cn(
                          "flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors",
                          localPrefs.voice === 'male'
                            ? "bg-slate-900 border-slate-900 text-white"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        <User className="w-4 h-4" /> Male
                      </button>
                      <button
                        onClick={() => setLocalPrefs(prev => ({ ...prev, voice: 'female' }))}
                        className={cn(
                          "flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors",
                          localPrefs.voice === 'female'
                            ? "bg-slate-900 border-slate-900 text-white"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        <UserCircle className="w-4 h-4" /> Female
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Academic Section */}
              <section className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Academic Info</h3>
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1.5">Department</label>
                    <input
                      type="text"
                      value={localPrefs.department || ''}
                      onChange={(e) => setLocalPrefs(prev => ({ ...prev, department: e.target.value }))}
                      placeholder="e.g. Computer Science"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-slate-800 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1.5">Class / Year</label>
                    <input
                      type="text"
                      value={localPrefs.class || ''}
                      onChange={(e) => setLocalPrefs(prev => ({ ...prev, class: e.target.value }))}
                      placeholder="e.g. BSCS 4th Year"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-slate-800 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1.5 flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-rose-500" /> Likes
                    </label>
                    <textarea
                      value={localPrefs.likes || ''}
                      onChange={(e) => setLocalPrefs(prev => ({ ...prev, likes: e.target.value }))}
                      placeholder="Topics you enjoy..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-slate-800 text-sm resize-none h-20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1.5 flex items-center gap-1.5">
                      <HeartOff className="w-3.5 h-3.5 text-slate-400" /> Dislikes
                    </label>
                    <textarea
                      value={localPrefs.dislikes || ''}
                      onChange={(e) => setLocalPrefs(prev => ({ ...prev, dislikes: e.target.value }))}
                      placeholder="Topics to avoid..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-slate-800 text-sm resize-none h-20"
                    />
                  </div>
                </div>
              </section>

              <div className="h-4" /> {/* Bottom padding */}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
