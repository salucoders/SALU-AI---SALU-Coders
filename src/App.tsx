import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ChatInterface } from './components/ChatInterface';
import { SettingsModal } from './components/SettingsModal';
import { LoginPage } from './components/LoginPage';
import { Mode, Message, ChatSession, Persona } from './types';
import { sendMessage } from './services/gemini';
import { Menu, Settings, Loader2, Sparkles } from 'lucide-react';
import { useUserProfile } from './context/UserProfileContext';
import { useNotification } from './context/NotificationContext';
import { useAuth } from './context/AuthContext';
import { useSessions } from './context/SessionContext';
import { motion, AnimatePresence } from 'motion/react';
import { onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './lib/firebase';

import { Onboarding } from './components/Onboarding';
import { LiveChatInterface } from './components/LiveChatInterface';

export default function App() {
  const { preferences, loading: profileLoading, isAdmin } = useUserProfile();
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
    maintenanceMode: false
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
        setSystemConfig({
          publicRegistration: data.publicRegistration ?? true,
          liveAiMode: data.liveAiMode ?? true,
          maintenanceMode: data.maintenanceMode ?? false
        });
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
  const [battery, setBattery] = useState<{ level: number; charging: boolean } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

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

  const handleSendMessage = async (content: string, attachments?: string[]) => {
    const currentSession = sessions.find(s => s.id === currentSessionId);
    if (!currentSession) return;

    setIsLoading(true);
    try {
      // Add user message to Firestore
      await addMessage(currentSession.id, 'user', content, attachments);

      // Get AI response
      const aiResponse = await sendMessage(
        currentSession.mode,
        messages,
        content,
        preferences,
        'friendly', // Default persona for now
        attachments
      );

      // Add model response to Firestore
      await addMessage(currentSession.id, 'model', aiResponse);
    } catch (error) {
      console.error("Failed to send message:", error);
      notify('Failed to send message. Please try again.', 'error', 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeChange = async (mode: Mode) => {
    if (!currentSessionId) return;
    try {
      const sessionRef = sessions.find(s => s.id === currentSessionId);
      if (sessionRef) {
        await updateDoc(doc(db, 'sessions', currentSessionId), { mode, updatedAt: serverTimestamp() });
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
        <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center shadow-2xl animate-bounce">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <div className="flex items-center gap-2 text-slate-400 font-black uppercase tracking-widest text-[10px]">
          <Loader2 className="w-3 h-3 animate-spin" />
          Initializing SALU AI...
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
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden relative">
      <Sidebar 
        sessions={sessions}
        currentSessionId={currentSessionId}
        currentMode={currentSession?.mode || 'student'}
        liveAiEnabled={systemConfig.liveAiMode}
        onModeChange={handleModeChange}
        onNewChat={async () => {
          try {
            await createSession('student');
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
        onClose={() => setIsSidebarOpen(false)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        battery={battery}
      />

      <AnimatePresence>
        {showOnboarding && (
          <Onboarding 
            onComplete={() => {
              setShowOnboarding(false);
              localStorage.setItem('salu_ai_onboarding_seen', 'true');
            }} 
          />
        )}
      </AnimatePresence>
      
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      
      <main className="flex-1 flex flex-col min-w-0 h-full relative bg-slate-50 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>
        
        <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
          <div className="lg:hidden">
            <Header 
              onNewChat={async () => {
                try {
                  await createSession('student');
                } catch (e) {
                  console.error("Failed to create session:", e);
                }
              }}
              onOpenSidebar={() => setIsSidebarOpen(true)}
              onOpenSettings={() => setIsSettingsOpen(true)}
              isSidebarOpen={isSidebarOpen}
              battery={battery}
            />
          </div>
          
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-hidden">
              {!currentSession ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-6">
                  <div className="w-20 h-20 bg-slate-100 rounded-[2.5rem] flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-slate-300" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Ready to start?</h2>
                    <p className="text-slate-500 max-w-xs mx-auto font-medium">Create your first chat session to begin exploring with SALU AI.</p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await createSession('student');
                      } catch (e) {
                        console.error("Failed to create session:", e);
                      }
                    }}
                    className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all active:scale-95 shadow-xl shadow-slate-900/20"
                  >
                    Start New Conversation
                  </button>
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
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
