import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatInterface } from './components/ChatInterface';
import { SettingsModal } from './components/SettingsModal';
import { ImageKitGallery } from './components/ImageKitGallery';
import { LoginPage } from './components/LoginPage';
import { Mode, Message, ChatSession, Persona } from './types';
import { sendMessage, sendMessageStream } from './services/gemini';
import { Menu, Settings, Loader2, Plus, ChevronDown, User, Shield, Crown, PanelLeftOpen, Check, Lock } from 'lucide-react';
import { LOGO_URL, APP_NAME, MODES, CREATOR_IMAGE_URL } from './constants';
import { cn } from './lib/utils';
import { useUserProfile } from './context/UserProfileContext';
import { useNotification } from './context/NotificationContext';
import { useAuth } from './context/AuthContext';
import { useSessions } from './context/SessionContext';
import { motion, AnimatePresence } from 'motion/react';
import { onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './lib/firebase';

import { Onboarding } from './components/Onboarding';
import { LiveChatInterface } from './components/LiveChatInterface';
import { AdminPanel } from './components/AdminPanel';
import { Toolbox } from './components/Toolbox';
import { UpgradeModal } from './components/UpgradeModal';
import { InstallPWA } from './components/InstallPWA';

export default function App() {
  const { preferences, loading: profileLoading, isAdmin, isPaid, updatePreferences } = useUserProfile();
  
  useEffect(() => {
    document.documentElement.style.setProperty('--brand-color', preferences.accentColor || '#0ea5e9');
  }, [preferences.accentColor]);
  
  const { user, loading: authLoading } = useAuth();
  
  const { 
    sessions, 
    currentSessionId, 
    setCurrentSessionId, 
    messages, 
    createSession, 
    addMessage, 
    deleteSession, 
    updateSessionTitle, 
    archiveSession,
    clearSessions,
    loading: sessionsLoading
  } = useSessions();
  const { notify } = useNotification();
  
  const [systemConfig, setSystemConfig] = useState({
    publicRegistration: true,
    liveAiMode: true,
    maintenanceMode: false,
    appName: 'SALU Plus',
    welcomeMessage: 'What can I help with?',
    jazzCashNumber: '03000000000',
    paymentQrUrl: ''
  });

  // Broadcast & Config Listener
  useEffect(() => {
    if (!user) return;
    
    // Broadcast
    const unsubscribeBroadcast = onSnapshot(doc(db, 'system', 'broadcast'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.active && data.message) {
          notify(data.message, 'info', 10000);
        }
      }
    }, (error) => {
      console.error("Error listening to broadcast:", error);
    });

    // Config
    const unsubscribeConfig = onSnapshot(doc(db, 'system', 'config'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setSystemConfig(prev => ({
          ...prev,
          publicRegistration: data.publicRegistration ?? prev.publicRegistration,
          liveAiMode: data.liveAiMode ?? prev.liveAiMode,
          maintenanceMode: data.maintenanceMode ?? prev.maintenanceMode,
          appName: data.appName ?? prev.appName,
          welcomeMessage: data.welcomeMessage ?? prev.welcomeMessage,
          jazzCashNumber: data.jazzCashNumber ?? prev.jazzCashNumber,
          paymentQrUrl: data.paymentQrUrl ?? prev.paymentQrUrl
        }));
      }
    }, (error) => {
      console.error("Error listening to config:", error);
    });

    return () => {
      unsubscribeBroadcast();
      unsubscribeConfig();
    };
  }, [notify, user]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [isToolboxOpen, setIsToolboxOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isModeOpen, setIsModeOpen] = useState(false);
  const [battery, setBattery] = useState<{ level: number; charging: boolean } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");

  useEffect(() => {
    // Global error handlers
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      let message = '';
      
      if (reason instanceof Error) {
        message = reason.message;
      } else if (typeof reason === 'string') {
        message = reason;
      } else if (reason && typeof reason === 'object') {
        try {
          message = JSON.stringify(reason);
        } catch (e) {
          message = String(reason);
        }
      } else {
        message = String(reason);
      }

      // Ignore empty or harmless rejections
      if (!reason || !message || message.trim() === '' || message === 'undefined' || message === '{}' || message === '""') {
        event.preventDefault();
        return;
      }

      // Ignore common harmless rejections
      if (
        message.includes('aborted') || 
        message.includes('AbortError') ||
        message.includes('Vite') ||
        message.includes('ResizeObserver') ||
        message.includes('Firebase: Error (auth/popup-closed-by-user)') ||
        message.includes('Firebase: Error (auth/cancelled-by-user)') ||
        message.includes('The user aborted a request')
      ) {
        event.preventDefault();
        return;
      }
      
      if (message.includes('INTERNAL ASSERTION FAILED')) {
        notify?.('A technical error occurred with the login system. Please refresh.', 'error', 5000);
      }
    };

    const handleGlobalError = (event: ErrorEvent) => {
      const message = event.message || '';
      
      // Ignore common harmless errors
      if (
        message.includes('Vite') || 
        message.includes('ResizeObserver') ||
        message.includes('Script error.') ||
        message.includes('ResizeObserver loop limit exceeded')
      ) {
        return;
      }

      console.error('Global Error:', event.error || message);
      
      if (message.includes('INTERNAL ASSERTION FAILED')) {
        notify?.('Authentication system error. Please refresh the page.', 'error', 5000);
      } else if (event.error) {
        notify?.('A system error occurred. Please refresh if issues persist.', 'error', 5000);
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleGlobalError);

    // Check onboarding
    const onboardingSeen = localStorage.getItem('salu_ai_onboarding_seen');
    if (!onboardingSeen) {
      setShowOnboarding(true);
    }

    // Battery monitoring
    if ('getBattery' in navigator) {
      try {
        (navigator as any).getBattery().then((bat: any) => {
          const updateBattery = () => {
            setBattery({ level: bat.level, charging: bat.charging });
          };
          updateBattery();
          bat.addEventListener('levelchange', updateBattery);
          bat.addEventListener('chargingchange', updateBattery);
        }).catch((err: any) => {
          console.warn("Battery status not available:", err);
        });
      } catch (e) {
        console.warn("Battery API access failed:", e);
      }
    }

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleGlobalError);
    };
  }, []);

  // Notify user connected
  useEffect(() => {
    if (user && !profileLoading) {
      const timer = setTimeout(() => {
        notify(`${preferences.name || 'User'} connected to SALU AI Network`, 'connect', 4000);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, profileLoading, preferences.name]);

  // Auto-create session if none exists
  useEffect(() => {
    if (user && !sessionsLoading && sessions.length === 0 && !currentSessionId) {
      createSession(preferences.preferredMode || 'student').catch(e => console.error("Auto-create session failed:", e));
    }
  }, [user, sessionsLoading, sessions.length, currentSessionId, createSession]);

  const handleSendMessage = async (content: string, attachments?: string[]) => {
    if (preferences.role === 'suspended') {
      notify('Your account is currently suspended. Please contact an administrator.', 'error', 5000);
      return;
    }

    const creditsUsed = preferences.creditsUsedToday || 0;
    const creditsTotal = preferences.creditsTotal || 30;

    if (creditsUsed >= creditsTotal) {
      setIsUpgradeOpen(true);
      notify('Daily credit limit reached. Get SALU Plus for 100 daily credits!', 'error', 6000);
      return;
    }

    const currentSession = sessions.find(s => s.id === currentSessionId);
    if (!currentSession) return;

    setIsLoading(true);
    setIsStreaming(true);
    setStreamedText("");
    
    try {
      // Add user message to Firestore
      await addMessage(currentSession.id, 'user', content, attachments);

      // Get AI response via Stream
      const aiResponse = await sendMessageStream(
        currentSession.mode,
        messages,
        content,
        preferences,
        'friendly', 
        attachments,
        (chunkText) => {
          setStreamedText(chunkText);
        }
      );

      // Reset stream before adding message to avoid double render of ImageResult
      setStreamedText("");
      setIsStreaming(false);

      // Add finalized model response to Firestore
      await addMessage(currentSession.id, 'model', aiResponse);

      // Deduct Credit
      await updatePreferences({
        creditsUsedToday: creditsUsed + 1
      });
    } catch (error: any) {
      console.error("Failed to send message:", error);
      notify(`Failed to send message: ${error.message || String(error)}`, 'error', 5000);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setStreamedText("");
    }
  };

  const handleModeChange = async (mode: Mode) => {
    if (!currentSessionId) return;
    try {
      const sessionRef = sessions.find(s => s.id === currentSessionId);
      if (sessionRef) {
        await updateDoc(doc(db, 'sessions', currentSessionId), { mode, updatedAt: serverTimestamp() });
        await updatePreferences({ preferredMode: mode });
        notify(`Switched to ${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode`, 'change', 2000);
      }
    } catch (e) {
      console.error("Failed to change mode:", e);
    }
  };

  // Expose handleModeChange to window for ChatInterface button
  useEffect(() => {
    (window as any).handleModeChange = handleModeChange;
    return () => {
      delete (window as any).handleModeChange;
    };
  }, [currentSessionId, sessions]);

  if (authLoading || profileLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white gap-4">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl animate-bounce border border-slate-100">
          <img 
            src={LOGO_URL} 
            alt={APP_NAME} 
            className="w-10 h-10 object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="flex items-center gap-2 text-slate-400 font-black uppercase tracking-widest text-[10px]">
          <Loader2 className="w-3 h-3 animate-spin" />
          Initializing {APP_NAME}...
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (systemConfig.maintenanceMode && !isAdmin) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 p-8 text-center">
        <div className="w-24 h-24 bg-brand-500/10 rounded-[2.5rem] flex items-center justify-center mb-8 relative">
          <div className="absolute inset-0 bg-brand-500/20 blur-2xl rounded-full animate-pulse" />
          <Settings className="w-10 h-10 text-brand-500 relative z-10 animate-spin-slow" />
        </div>
        <h1 className="text-4xl font-black text-white tracking-tighter mb-4">Under Maintenance</h1>
        <p className="text-slate-400 max-w-md mx-auto font-medium text-lg leading-relaxed">
          SALU AI is currently undergoing scheduled maintenance to improve your experience. We'll be back shortly!
        </p>
        <div className="mt-12 pt-8 border-t border-white/5 w-full max-w-xs">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
            Official SALU AI Network
          </p>
        </div>
      </div>
    );
  }

  const currentSession = sessions.find(s => s.id === currentSessionId);

  return (
    <div className={cn(
      "flex h-screen font-sans overflow-hidden relative",
      preferences.theme === 'dark' ? "dark bg-slate-950" : "bg-slate-50"
    )} style={{ '--brand-color': preferences.accentColor || '#0ea5e9' } as React.CSSProperties}>
      <Sidebar 
        sessions={sessions}
        currentSessionId={currentSessionId}
        currentMode={currentSession?.mode || 'student'}
        liveAiEnabled={systemConfig.liveAiMode}
        onModeChange={handleModeChange}
        onNewChat={async () => {
          try {
            await createSession(preferences.preferredMode || 'student');
          } catch (e) {
            console.error("Failed to create session:", e);
          }
        }}
        onSelectSession={setCurrentSessionId}
        onClearChats={async () => {
          try {
            await clearSessions();
          } catch (e) {
            console.error("Failed to clear sessions:", e);
          }
        }}
        onDeleteSession={async (id) => {
          try {
            await deleteSession(id);
          } catch (e) {
            console.error("Failed to delete session:", e);
          }
        }}
        onRenameSession={async (id, title) => {
          try {
            await updateSessionTitle(id, title);
          } catch (e) {
            console.error("Failed to rename session:", e);
          }
        }}
        onArchiveSession={async (id) => {
          try {
            const s = sessions.find(x => x.id === id);
            if (s) await archiveSession(id, !s.isArchived);
          } catch (e) {
            console.error("Failed to archive session:", e);
          }
        }}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        onClose={() => setIsSidebarOpen(false)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenVault={() => setIsVaultOpen(true)}
        onOpenToolbox={() => setIsToolboxOpen(true)}
        onOpenUpgrade={() => setIsUpgradeOpen(true)}
        battery={battery}
      />

      <AnimatePresence>
        {isToolboxOpen && (
          <Toolbox 
            isOpen={isToolboxOpen} 
            onClose={() => setIsToolboxOpen(false)} 
            onOpenUpgrade={() => setIsUpgradeOpen(true)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isVaultOpen && (
          <ImageKitGallery 
            isOpen={isVaultOpen} 
            onClose={() => setIsVaultOpen(false)} 
            onOpenUpgrade={() => setIsUpgradeOpen(true)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showOnboarding && (
          <Onboarding 
            onComplete={() => {
              setShowOnboarding(false);
              localStorage.setItem('salu_ai_onboarding_seen', 'true');
            }} 
            onUpgradeRequest={() => {
              setShowOnboarding(false);
              localStorage.setItem('salu_ai_onboarding_seen', 'true');
              setIsUpgradeOpen(true);
            }}
          />
        )}
      </AnimatePresence>
      
      <UpgradeModal 
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
        isPaid={isPaid}
        jazzCashNumber={systemConfig.jazzCashNumber}
        qrUrl={systemConfig.paymentQrUrl}
      />

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <InstallPWA />
      
      <main className="flex-1 flex flex-col min-w-0 h-full relative bg-white overflow-hidden">
        <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
          {/* Floating Top Bar (Copilot style) */}
          <div className="absolute top-0 left-0 right-0 z-40 p-4 pt-5 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-3 pointer-events-auto">
              {!isSidebarOpen && (
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2.5 text-slate-500 hover:text-slate-900 hover:bg-white hover:border-slate-300 rounded-xl transition-all shadow-soft border border-slate-200/50 bg-white/80 backdrop-blur-md group active:scale-95"
                  title="Open sidebar"
                >
                  <PanelLeftOpen className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button>
              )}
              <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 flex-shrink-0">
                <div className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm border border-slate-100">
                  <img 
                    src={LOGO_URL} 
                    alt="Logo" 
                    className="w-6 h-6 object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <span className="text-slate-900 font-black tracking-tighter text-base lg:text-lg">{APP_NAME}</span>
              </div>
            </div>

            {/* Centered Mode Selector - Premium Compact Pill */}
            <div className="flex-1 flex items-center justify-center max-w-[240px] pointer-events-auto">
              <div className="relative w-full px-2">
                <button
                  onClick={() => setIsModeOpen(!isModeOpen)}
                  className="w-full flex items-center justify-between pl-1.5 pr-4 py-1.5 bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-full shadow-lg shadow-slate-200/50 hover:border-brand-200 transition-all active:scale-[0.98] group ring-1 ring-black/5"
                >
                  {(() => {
                    const currentModeId = currentSession?.mode || preferences.preferredMode || 'student';
                    const activeMode = MODES.find(m => m.id === currentModeId) || MODES[0];
                    const Icon = activeMode.icon;
                    return (
                      <>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn("p-2 rounded-full shrink-0 shadow-sm transition-transform group-hover:rotate-12", activeMode.color)}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col items-start leading-none overflow-hidden">
                            <span className="text-[12px] font-black text-slate-900 truncate uppercase tracking-tighter">{activeMode.label}</span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest truncate">AI Node</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                          <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform duration-300", isModeOpen && "rotate-180")} />
                        </div>
                      </>
                    );
                  })()}
                </button>

                <AnimatePresence>
                  {isModeOpen && (
                    <>
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsModeOpen(false)} 
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full left-1/2 -translate-x-1/2 w-[280px] mt-2 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl overflow-hidden py-3 z-50 ring-1 ring-black/5"
                      >
                        <div className="px-5 py-2 mb-2 border-b border-slate-100">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global AI Network</span>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar px-2 space-y-1">
                          {MODES.filter(m => m.id !== 'live' || systemConfig.liveAiMode).map((mode) => {
                            const Icon = mode.icon;
                            const currentModeId = currentSession?.mode || preferences.preferredMode || 'student';
                            const isActive = currentModeId === mode.id;
                            const isLocked = !isPaid && ['live', 'assistant'].includes(mode.id);
                            
                            return (
                              <button
                                key={mode.id}
                                onClick={async () => {
                                  if (isLocked) {
                                    setIsUpgradeOpen(true);
                                    setIsModeOpen(false);
                                    return;
                                  }
                                  await handleModeChange(mode.id);
                                  setIsModeOpen(false);
                                }}
                                className={cn(
                                  "w-full flex items-center gap-4 px-4 py-3 text-sm transition-all text-left relative overflow-hidden rounded-2xl group",
                                  isActive 
                                    ? "bg-slate-900 text-white shadow-xl shadow-slate-200" 
                                    : "hover:bg-slate-50 text-slate-600"
                                )}
                              >
                                <div className={cn(
                                  "p-2 rounded-xl transition-colors",
                                  isActive ? "bg-white/10" : mode.color
                                )}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold flex items-center gap-2">
                                    {mode.label}
                                    {isLocked && <Lock className="w-3 h-3 opacity-50" />}
                                  </div>
                                  <p className={cn("text-[10px] truncate", isActive ? "text-slate-400" : "text-slate-500")}>
                                    {mode.description}
                                  </p>
                                </div>
                                {isActive && <Check className="w-4 h-4 text-emerald-400" />}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
            
            <div className="flex items-center gap-2 pointer-events-auto">
              {!isPaid && (
                <button
                  onClick={() => setIsUpgradeOpen(true)}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 mr-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 text-white font-bold text-[11px] uppercase tracking-widest hover:opacity-90 transition-opacity"
                  title="Get SALU AI Plus"
                >
                  <Crown className="w-3.5 h-3.5" />
                  Get SALU AI Plus
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => setIsAdminPanelOpen(true)}
                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-full transition-colors"
                  title="Admin Panel"
                >
                  <Shield className="w-5 h-5" />
                </button>
              )}
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="w-11 h-11 rounded-2xl bg-white/90 backdrop-blur-xl flex items-center justify-center overflow-hidden border border-slate-200 shadow-lg shadow-slate-200/50 hover:border-brand-300 transition-all active:scale-95 group relative ring-1 ring-black/5"
                title="Account Settings"
              >
                {preferences.profilePicture || user?.photoURL ? (
                  <img src={preferences.profilePicture || user?.photoURL || ""} alt="Profile" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                ) : (
                  <User className="w-5 h-5 text-slate-400 group-hover:text-brand-500 transition-colors" />
                )}
                <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-2xl pointer-events-none" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col h-full overflow-hidden pt-20">
            <div className="flex-1 overflow-hidden">
              {!currentSession ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center relative overflow-hidden bg-white">
                  {/* Decorative Background Elements */}
                  <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.03]">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500 rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[120px]" />
                  </div>

                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative z-10 space-y-10 max-w-2xl"
                  >
                    <div className="space-y-4">
                      <div className="w-24 h-24 mx-auto relative group">
                        <div className="absolute inset-0 bg-brand-500 rounded-[2.5rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
                        <div className="relative w-full h-full bg-white border-2 border-slate-100 rounded-[2.5rem] flex items-center justify-center p-4 shadow-2xl transition-transform hover:scale-105">
                          <img 
                            src={LOGO_URL} 
                            alt="Logo" 
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </div>
                      <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                        {systemConfig.welcomeMessage}
                      </h1>
                      <p className="text-slate-500 font-medium max-w-md mx-auto">
                        Your intelligent companion for the SALU community. Start a conversation to explore insights and knowledge.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                      <button
                        onClick={async () => {
                          try {
                            await createSession(preferences.preferredMode || 'student');
                          } catch (e) {
                            console.error("Failed to create session:", e);
                          }
                        }}
                        className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-black transition-all active:scale-95 shadow-xl shadow-slate-200 flex items-center gap-2 group"
                      >
                        <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                        New Chat
                      </button>
                      <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all active:scale-95 flex items-center gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        Configure AI
                      </button>
                    </div>

                    {/* Creator Spotlight */}
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="pt-12 flex flex-col items-center gap-4"
                    >
                      <div className="h-px w-12 bg-slate-200" />
                      <div className="flex items-center gap-4 px-5 py-3 bg-slate-50/50 backdrop-blur-sm rounded-2xl border border-slate-100">
                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-white shadow-sm ring-2 ring-brand-100">
                          <img 
                            src={CREATOR_IMAGE_URL} 
                            alt="Creator" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Crafted with ❤️ by</p>
                          <p className="text-xs font-black text-slate-900 tracking-tight underline decoration-brand-500 decoration-2 underline-offset-2">Babar Ali (Salu Coders)</p>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                </div>
              ) : currentSession.mode === 'live' ? (
                <LiveChatInterface 
                  onClose={async () => {
                    try {
                      await handleModeChange('student');
                    } catch (e) {
                      console.error("Failed to close live chat:", e);
                    }
                  }} 
                />
              ) : (
                <ChatInterface 
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  isLoading={isLoading}
                  mode={currentSession.mode}
                  isStreaming={isStreaming}
                  streamedText={streamedText}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {isAdminPanelOpen && (
          <AdminPanel onClose={() => setIsAdminPanelOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
