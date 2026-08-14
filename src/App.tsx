import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatInterface } from './components/ChatInterface';
import { LoginPage } from './components/LoginPage';
import { Mode, Message, ChatSession, Persona } from './types';
import { sendMessage, sendMessageStream, generateImageWithSALU } from './services/gemini';
import { Menu, Settings, Loader2, Plus, ChevronDown, User, Shield, Crown, PanelLeftOpen, Check, Lock, Ghost } from 'lucide-react';
import { LOGO_URL, APP_NAME, MODES, CREATOR_IMAGE_URL } from './constants';
import { cn } from './lib/utils';
import { useUserProfile } from './context/UserProfileContext';
import { useNotification } from './context/NotificationContext';
import { useAuth } from './context/AuthContext';
import { useSessions } from './context/SessionContext';
import { motion, AnimatePresence } from 'motion/react';
import { onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import  { db, OperationType, handleFirestoreError } from './lib/firebase';

import { Onboarding } from './components/Onboarding';
import { Toolbox } from './components/Toolbox';
import { InstallPWA } from './components/InstallPWA';

// Lazy loaded heavy modals and views
const SettingsModal = lazy(() => import('./components/SettingsModal').then(m => ({ default: m.SettingsModal })));
const ImageKitGallery = lazy(() => import('./components/ImageKitGallery').then(m => ({ default: m.ImageKitGallery })));
const LiveChatInterface = lazy(() => import('./components/LiveChatInterface').then(m => ({ default: m.LiveChatInterface })));
const AdminPanel = lazy(() => import('./components/AdminPanel').then(m => ({ default: m.AdminPanel })));
const UpgradeModal = lazy(() => import('./components/UpgradeModal').then(m => ({ default: m.UpgradeModal })));


export default function App() {
  const { preferences, loading: profileLoading, isAdmin, isPaid, updatePreferences } = useUserProfile();
  
  useEffect(() => {
    const color = preferences.accentColor || '#38bdf8';
    document.documentElement.style.setProperty('--brand-color', color);
    
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };
    
    const rgb = hexToRgb(color);
    if (rgb) {
      document.documentElement.style.setProperty('--brand-color-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    }
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
    pinSession,
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
      handleFirestoreError(error, OperationType.GET, 'system/broadcast');
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
      handleFirestoreError(error, OperationType.GET, 'system/config');
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

  // Update Last Active status
  useEffect(() => {
    if (user && !profileLoading) {
      const updateLastActive = async () => {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            lastActiveAt: serverTimestamp()
          });
        } catch (e) {
          console.warn("Failed to update last active status:", e);
        }
      };
      updateLastActive();
      
      // Also update every 5 minutes if app is open
      const interval = setInterval(updateLastActive, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user, profileLoading]);

  const initialSessionSetRef = useRef(false);

  // Auto-manage session
  useEffect(() => {
    if (user && !sessionsLoading && !initialSessionSetRef.current) {
      if (sessions.length > 0 && !currentSessionId) {
        // Automatically select the most recent active session on initial load
        const latestSession = sessions.find(s => !s.isArchived) || sessions[0];
        setCurrentSessionId(latestSession.id);
        initialSessionSetRef.current = true;
      } else if (sessions.length === 0) {
        initialSessionSetRef.current = true;
      }
    }
  }, [user, sessionsLoading, sessions, currentSessionId, setCurrentSessionId]);

  const isSendingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSendMessage = async (content: string, attachments?: string[]) => {
    if (isSendingRef.current) return; // Prevent duplicate sends

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

    isSendingRef.current = true;
    setIsLoading(true);
    setIsStreaming(true);
    setStreamedText("");

    let targetSessionId = currentSessionId;
    let targetMode = preferences.preferredMode || 'student';

    // If there is no active session yet, create one in Firestore now that user is sending a message!
    if (!targetSessionId || !sessions.some(s => s.id === targetSessionId)) {
      try {
        targetSessionId = await createSession(targetMode);
      } catch (err) {
        console.error("Failed to create session on message send:", err);
        isSendingRef.current = false;
        setIsLoading(false);
        setIsStreaming(false);
        return;
      }
    }

    const currentSession = sessions.find(s => s.id === targetSessionId) || {
      id: targetSessionId,
      mode: targetMode,
      title: 'Untitled Chat',
      persona: preferences.persona || 'professional'
    };

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    try {
      // Add user message to Firestore
      await addMessage(currentSession.id, 'user', content, attachments);

      // Get AI response via Stream
      const aiResponse = await sendMessageStream(
        currentSession.mode,
        messages,
        content,
        preferences,
        currentSession.persona || preferences.persona || 'professional', 
        attachments,
        (chunkText) => {
          setStreamedText(chunkText);
        },
        signal
      );

      // Reset stream before adding message to avoid double render of ImageResult
      setStreamedText("");
      setIsStreaming(false);

      if (!signal.aborted) {
        // Add finalized model response to Firestore
        await addMessage(currentSession.id, 'model', aiResponse);

        // Deduct Credit asynchronously
        updatePreferences({
          creditsUsedToday: creditsUsed + 1
        }).catch(console.error);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error("Failed to send message:", error);
        notify(`Failed to send message: ${error.message || String(error)}`, 'error', 5000);
      }
    } finally {
      isSendingRef.current = false;
      setIsLoading(false);
      setIsStreaming(false);
      setStreamedText("");
    }
  };

  const handleModeChange = async (mode: Mode) => {
    try {
      await updatePreferences({ preferredMode: mode });
      if (currentSessionId) {
        const sessionRef = sessions.find(s => s.id === currentSessionId);
        if (sessionRef) {
          await updateDoc(doc(db, 'sessions', currentSessionId), { mode, updatedAt: serverTimestamp() });
        }
      }
      const modeObj = MODES.find(m => m.id === mode);
      const modeName = modeObj ? modeObj.label : mode.charAt(0).toUpperCase() + mode.slice(1);
      notify(`Switched to SALU AI ${modeName} Mode`, 'change', 2000);
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
      <div className="h-screen w-full bg-[#F5F4F0]" />
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
  const activeSession = currentSession || {
    id: currentSessionId || '',
    userId: user.uid,
    mode: preferences.preferredMode || 'student',
    title: 'New Chat',
    isArchived: false,
    createdAt: new Date().toISOString()
  };

  return (
    <div className={cn(
      "flex h-screen font-sans overflow-hidden relative",
      preferences.theme === 'dark' ? "dark bg-slate-950" : "bg-slate-50"
    )} style={{ '--brand-color': preferences.accentColor || '#38bdf8' } as React.CSSProperties}>
      <Sidebar 
        sessions={sessions}
        currentSessionId={currentSessionId}
        currentMode={activeSession.mode}
        liveAiEnabled={systemConfig.liveAiMode}
        onModeChange={handleModeChange}
        onNewChat={() => {
          setCurrentSessionId(null);
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
        onPinSession={async (id) => {
          try {
            const s = sessions.find(x => x.id === id);
            if (s) await pinSession(id, !s.isPinned);
          } catch (e) {
            console.error("Failed to pin session:", e);
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

      <Suspense fallback={null}>
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
        
        {isUpgradeOpen && (
          <UpgradeModal 
            isOpen={isUpgradeOpen}
            onClose={() => setIsUpgradeOpen(false)}
            isPaid={isPaid}
            jazzCashNumber={systemConfig.jazzCashNumber}
            qrUrl={systemConfig.paymentQrUrl}
          />
        )}

        {isSettingsOpen && (
          <SettingsModal 
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
          />
        )}
      </Suspense>

      <InstallPWA />
      
      <main className="flex-1 flex flex-col min-w-0 h-full relative bg-white dark:bg-slate-950 transition-colors duration-300 overflow-hidden">
        <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
          {/* Claude Style Header */}
          <div className="absolute top-0 left-0 right-0 z-40 p-4 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-3 pointer-events-auto">
              {!isSidebarOpen && (
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                  title="Open sidebar"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}
              {/* Added SALU AI Logo here */}
              <div className="hidden sm:flex items-center flex-shrink-0 ml-1">
                <img 
                  src={LOGO_URL} 
                  alt="Logo" 
                  className="w-6 h-6 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            {/* Centered Mode Selector */}
            <div className="flex-1 flex items-center justify-center max-w-[240px] pointer-events-auto">
              <div className="relative w-full px-2">
                <button
                  onClick={() => setIsModeOpen(!isModeOpen)}
                  className="w-full flex items-center justify-center gap-2 py-1.5 transition-all text-slate-800 hover:text-slate-900 group"
                >
                  {(() => {
                    const currentModeId = activeSession.mode;
                    const activeMode = MODES.find(m => m.id === currentModeId) || MODES[0];
                    return (
                      <>
                        <span className="text-xl font-serif">SALU AI</span>
                        <span className="text-xl font-serif text-slate-500">{activeMode.label}</span>
                        <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform duration-300", isModeOpen && "rotate-180")} />
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
                            const currentModeId = activeSession.mode;
                            const isActive = currentModeId === mode.id;
                            
                            return (
                              <button
                                key={mode.id}
                                onClick={async () => {
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
                                  <div className="font-bold flex items-center gap-2 font-serif">
                                    {mode.label}
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
              {isAdmin && (
                <button
                  onClick={() => setIsAdminPanelOpen(true)}
                  className="w-10 h-10 rounded-full bg-transparent flex items-center justify-center hover:bg-slate-100 transition-all active:scale-95 group"
                  title="Admin Panel"
                >
                  <Shield className="w-5 h-5 text-slate-700 group-hover:text-amber-600 transition-colors" strokeWidth={1.5} />
                </button>
              )}
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="w-10 h-10 rounded-full bg-transparent flex items-center justify-center hover:bg-slate-100 transition-all active:scale-95 group relative"
                title="Account Settings"
              >
                {preferences.profilePicture || user?.photoURL ? (
                  <img src={preferences.profilePicture || user?.photoURL || ""} alt="Profile" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <Ghost className="w-5 h-5 text-slate-700 group-hover:text-slate-900 transition-colors" strokeWidth={1.5} />
                )}
              </button>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col h-full overflow-hidden pt-20">
            <div className="flex-1 overflow-hidden">
              <Suspense fallback={
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                </div>
              }>
                {activeSession.mode === 'live' ? (
                  <LiveChatInterface 
                    onClose={async () => {
                      try {
                        await handleModeChange('student');
                      } catch (e) {
                        console.error("Failed to close live chat:", e);
                      }
                    }} 
                    onSendMessage={handleSendMessage}
                    onGenerateImage={async (prompt) => {
                      let targetId = currentSessionId;
                      if (!targetId) {
                        try {
                          targetId = await createSession('live');
                        } catch (err) {
                          return;
                        }
                      }

                      // Quota check
                      const maxImages = preferences.subscription === 'paid' ? 5 : 3;
                      if ((preferences.imagesUsedToday || 0) >= maxImages) {
                          notify(`You have reached your daily image generation limit (${maxImages} images/day). Upgrade for higher limits.`, 'error', 5000);
                          return;
                      }
                      
                      setIsLoading(true);
                      try {
                        notify('Live AI is painting your vision...', 'change', 3000);
                        const imageUrl = await generateImageWithSALU(prompt);
                        
                        // Update quota
                        await updatePreferences({ imagesUsedToday: (preferences.imagesUsedToday || 0) + 1 });

                        await addMessage(targetId, 'model', `[IMAGE_GEN: ${prompt}]`, []);
                        // Also add the actual image result
                        await addMessage(targetId, 'model', `Here is your creation based on: ${prompt}`, [imageUrl]);
                        notify('Image generated and saved to chat!', 'success', 4000);
                      } catch (e: any) {
                        notify(`Image generation failed: ${e.message}`, 'error', 5000);
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                  />
                ) : (
                  <ChatInterface 
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    isLoading={isLoading}
                    mode={activeSession.mode}
                    isStreaming={isStreaming}
                    streamedText={streamedText}
                  />
                )}
              </Suspense>
            </div>
          </div>
        </div>
      </main>

      <Suspense fallback={null}>
        <AnimatePresence>
          {isAdminPanelOpen && (
            <AdminPanel onClose={() => setIsAdminPanelOpen(false)} />
          )}
        </AnimatePresence>
      </Suspense>
    </div>
  );
}
