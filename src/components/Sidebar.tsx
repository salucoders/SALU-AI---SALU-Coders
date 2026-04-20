import React, { useState } from 'react';
import { MessageSquare, Plus, History, Settings, LogOut, Trash2, X, User, AlertTriangle, Edit2, Archive, ArchiveRestore, Check, GraduationCap, Code, Video, School, ChevronDown, Mic, MoreVertical, Image as ImageIcon, CheckSquare, PanelLeftClose, PanelLeftOpen, Zap, Loader2, Lock, Crown, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ChatSession, Mode } from '../types';
import { useUserProfile } from '../context/UserProfileContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { usePWA } from '../context/PWAContext';
import { LOGO_URL, APP_NAME, MODES } from '../constants';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string;
  currentMode: Mode;
  liveAiEnabled?: boolean;
  onModeChange: (mode: Mode) => void;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onClearChats: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onArchiveSession: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenVault: () => void;
  onOpenToolbox: () => void;
  onOpenUpgrade: () => void;
  battery: { level: number; charging: boolean } | null;
}


export const Sidebar = React.memo(({ 
  sessions, 
  currentSessionId, 
  currentMode,
  liveAiEnabled = true,
  onModeChange,
  onNewChat, 
  onSelectSession, 
  onClearChats, 
  onDeleteSession, 
  onRenameSession,
  onArchiveSession,
  isOpen, 
  onToggle,
  onClose, 
  onOpenSettings,
  onOpenVault,
  onOpenToolbox,
  onOpenUpgrade,
  battery
}: SidebarProps) => {
  const { preferences, isPaid } = useUserProfile();
  const { user, loginWithGoogle, logout, isAuthenticating } = useAuth();
  const { notify } = useNotification();
  const { canInstall, installed, install } = usePWA();
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const handleDeleteConfirm = () => {
    if (sessionToDelete) {
      onDeleteSession(sessionToDelete);
      setSessionToDelete(null);
    }
  };

  const startEditing = (session: ChatSession) => {
    setEditingSessionId(session.id);
    setEditingTitle(session.title || '');
  };

  const saveRename = () => {
    if (editingSessionId && editingTitle.trim()) {
      onRenameSession(editingSessionId, editingTitle.trim());
      setEditingSessionId(null);
    }
  };

  const activeSessions = sessions.filter(s => !s.isArchived);
  const archivedSessions = sessions.filter(s => s.isArchived);
  const displayedSessions = showArchived ? archivedSessions : activeSessions;

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error: any) {
      console.error("Sidebar: Login failed", error);
      if (error.code === 'auth/popup-blocked') {
        notify?.('Login popup was blocked.', 'error', 5000);
      } else {
        notify?.('Failed to sign in. Please try again.', 'error', 3000);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Sidebar: Logout failed", error);
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/10 backdrop-blur-[2px] z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {sessionToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSessionToDelete(null)}
              className="absolute inset-0 bg-slate-900/10 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="p-8 text-center space-y-4">
                <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-7 h-7 text-rose-500" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase tracking-widest text-[13px]">Delete Conversation?</h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    This will permanently remove this chat from your history. This action cannot be reversed.
                  </p>
                </div>
              </div>
              <div className="p-4 bg-slate-50/50 flex gap-3 border-t border-slate-100">
                <button
                  onClick={() => setSessionToDelete(null)}
                  className="flex-1 px-4 py-3 bg-white text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-100 transition-all border border-slate-200 active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-black transition-all shadow-lg active:scale-95"
                >
                  Delete Chat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={false}
        animate={{ 
          width: isOpen ? 280 : 0,
          x: isOpen ? 0 : -280,
          opacity: isOpen ? 1 : 0
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-white/90 backdrop-blur-xl flex flex-col h-full lg:relative border-r border-slate-200/60 shadow-sm overflow-hidden",
          !isOpen && "pointer-events-none lg:pointer-events-auto"
        )}
      >
        {/* Top Header Section */}
        <div className="p-4 flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-lg shadow-slate-100 transition-transform hover:scale-105">
                <img 
                  src={LOGO_URL} 
                  alt={APP_NAME} 
                  className="w-6 h-6 object-contain"
                />
              </div>
              <div className="flex flex-col -space-y-0.5">
                <h1 className="font-black text-slate-900 tracking-tighter text-base">{APP_NAME}</h1>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-0.5">Network Architecture</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button
                onClick={onToggle}
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all active:scale-95 group/toggle"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="w-5 h-5 group-hover/toggle:scale-110 transition-transform" />
              </button>
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl lg:hidden transition-all active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 1024) onClose();
            }}
            className="w-full h-12 flex items-center justify-center gap-3 bg-white text-slate-900 rounded-2xl transition-all hover:bg-slate-50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 font-bold text-sm group active:scale-95"
          >
            <div className="w-6 h-6 rounded-lg bg-slate-900 flex items-center justify-center text-white transition-transform group-hover:rotate-90">
              <Plus className="w-4 h-4 stroke-[3px]" />
            </div>
            New conversation
          </button>
        </div>

        {/* Action Shortcuts */}
        <div className="px-4 grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => {
              if (!isPaid) { onOpenUpgrade(); return; }
              onOpenToolbox();
              if (window.innerWidth < 1024) onClose();
            }}
            className="flex flex-col items-center justify-center gap-1.5 p-3 bg-slate-50 hover:bg-white hover:shadow-md border border-slate-100 rounded-2xl transition-all group relative overflow-hidden"
          >
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center shadow-sm border mb-0.5",
              isPaid ? "bg-amber-50 border-amber-100 text-amber-600" : "bg-white border-slate-200 text-slate-400"
            )}>
              <CheckSquare className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-600 tracking-tight">Study Tools</span>
            {!isPaid && <Lock className="w-2 h-2 absolute top-2 right-2 text-slate-400" />}
          </button>

          <button
            onClick={() => {
              if (!isPaid) { onOpenUpgrade(); return; }
              onOpenVault();
              if (window.innerWidth < 1024) onClose();
            }}
            className="flex flex-col items-center justify-center gap-1.5 p-3 bg-slate-50 hover:bg-white hover:shadow-md border border-slate-100 rounded-2xl transition-all group relative"
          >
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center shadow-sm border mb-0.5",
              isPaid ? "bg-brand-50 border-brand-100 text-brand-600" : "bg-white border-slate-200 text-slate-400"
            )}>
              <ImageIcon className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-600 tracking-tight">Media Vault</span>
            {!isPaid && <Lock className="w-2 h-2 absolute top-2 right-2 text-slate-400" />}
          </button>
        </div>

        {/* History Section */}
        <div className="flex-1 flex flex-col min-h-0 pt-2 pb-4">
            <div className="px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">History</span>
                <div className="w-1 h-1 rounded-full bg-slate-200" />
                <span className="text-[10px] font-medium text-slate-400">{displayedSessions.length} active</span>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setShowArchived(!showArchived)} 
                  className={cn(
                    "p-1.5 rounded-lg transition-all border shadow-soft",
                    showArchived 
                      ? "bg-slate-900 text-white border-slate-800 scale-105" 
                      : "bg-white border-slate-100 text-slate-400 hover:text-slate-900 hover:bg-slate-50"
                  )}
                  title={showArchived ? "Show active chats" : "Show archived chats"}
                >
                  {showArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                </button>
              </div>
            </div>

          <div className="flex-1 overflow-y-auto px-4 py-1 custom-scrollbar space-y-1">
            {displayedSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 opacity-40">
                <History className="w-10 h-10 mb-2 text-slate-300" />
                <p className="text-xs font-bold text-slate-400">Empty list</p>
              </div>
            ) : (
              displayedSessions.map(session => (
                <div key={session.id} className="relative group/item">
                  {editingSessionId === session.id ? (
                    <div className="flex items-center gap-2 p-2 bg-white rounded-2xl border border-slate-900 shadow-sm z-10 relative animate-in fade-in zoom-in duration-200">
                      <input
                        autoFocus
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveRename();
                          if (e.key === 'Escape') setEditingSessionId(null);
                        }}
                        className="bg-transparent border-none focus:ring-0 text-xs text-slate-900 w-full p-0 font-bold"
                      />
                      <div className="flex items-center gap-1">
                        <button onClick={saveRename} className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingSessionId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          onSelectSession(session.id);
                          if (window.innerWidth < 1024) onClose();
                        }}
                        className={cn(
                          "flex-1 flex items-center gap-3 px-3 py-3 rounded-2xl text-[13px] transition-all text-left relative group/btn overflow-hidden",
                          currentSessionId === session.id
                            ? "text-white font-bold"
                            : "hover:bg-slate-50/80 text-slate-600 font-medium active:scale-95"
                        )}
                      >
                        {currentSessionId === session.id && (
                          <motion.div
                            layoutId="active-session-bg"
                            className="absolute inset-0 bg-slate-900 z-0 shadow-lg shadow-slate-200"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                          />
                        )}
                        <MessageSquare className={cn("w-4 h-4 shrink-0 relative z-10", currentSessionId === session.id ? "text-slate-300" : "text-slate-400")} />
                        <span className="truncate flex-1 pr-4 relative z-10">{session.title}</span>
                      </button>
                      
                        <div className={cn(
                          "absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 transition-all duration-300",
                          activeMenuId === session.id 
                            ? "opacity-100 translate-x-0" 
                            : "opacity-0 translate-x-2 pointer-events-none group-hover/item:opacity-100 group-hover/item:translate-x-0 group-hover/item:pointer-events-auto"
                        )}>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === session.id ? null : session.id);
                            }}
                            className={cn(
                              "p-1.5 rounded-lg transition-all border shadow-sm backdrop-blur-md relative z-20",
                              currentSessionId === session.id 
                                ? "bg-white/10 text-white hover:bg-white/20 border-white/20" 
                                : "bg-white border-slate-100 text-slate-400 hover:text-slate-900 border-slate-200"
                            )}
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          <AnimatePresence>
                            {activeMenuId === session.id && (
                              <>
                                <motion.div 
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="fixed inset-0 z-40 bg-black/5" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(null);
                                  }}
                                />
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9, x: 10 }}
                                  animate={{ opacity: 1, scale: 1, x: 0 }}
                                  exit={{ opacity: 0, scale: 0.9, x: 10 }}
                                  className="absolute right-full top-0 mr-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[60] overflow-hidden py-1.5"
                                >
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      startEditing(session);
                                      setActiveMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                                  >
                                    <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </div>
                                    Rename Chat
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      onArchiveSession(session.id);
                                      setActiveMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                                  >
                                    <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                                      {session.isArchived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                                    </div>
                                    {session.isArchived ? 'Activate Chat' : 'Archive Chat'}
                                  </button>
                                  <div className="h-px bg-slate-100 mx-2 my-1" />
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setSessionToDelete(session.id);
                                      setActiveMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                                  >
                                    <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </div>
                                    Delete Chat
                                  </button>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer (User Profile) */}
        <div className="p-4 border-t border-slate-100/50 space-y-4 bg-slate-50/30">
          {!isPaid && user && (
            <button 
              onClick={onOpenUpgrade}
              className="w-full group relative overflow-hidden p-3.5 bg-slate-900 rounded-2xl transition-all hover:bg-black shadow-lg shadow-slate-200 active:scale-95"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-brand-600 via-brand-400 to-brand-600 opacity-20 group-hover:opacity-100 transition-opacity animate-gradient-xy" />
              <div className="relative z-10 flex items-center justify-center gap-2.5">
                <Crown className="w-4 h-4 text-amber-400 fill-amber-400 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-black text-white uppercase tracking-[0.2em] shadow-sm">Upgrade to Plus</span>
              </div>
            </button>
          )}

          <div className="space-y-4">
            {user && (
              <div className="p-3.5 bg-white rounded-2xl border border-slate-100 shadow-sm shadow-slate-100/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Usage Quota</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={cn(
                      "text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest",
                      isPaid ? "bg-brand-50 text-brand-600" : "bg-slate-100 text-slate-500"
                    )}>
                      {isPaid ? 'Premium' : 'Standard'}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(0, Math.min(100, (1 - (preferences.creditsUsedToday! / preferences.creditsTotal!)) * 100))}%` }}
                      className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        isPaid ? "bg-brand-500" : "bg-slate-400"
                      )}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-slate-500 font-medium">Credits</span>
                    <span className="text-slate-900 tracking-tight">{preferences.creditsTotal! - preferences.creditsUsedToday!} / {preferences.creditsTotal}</span>
                  </div>
                </div>
              </div>
            )}

            {!user ? (
              <button 
                onClick={handleLogin}
                disabled={isAuthenticating}
                className="w-full flex items-center gap-3 p-2 hover:bg-slate-100 rounded-2xl transition-all text-sm font-bold text-slate-700 h-12 active:scale-95 border border-transparent hover:border-slate-100"
              >
                <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-200">
                  {isAuthenticating ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <User className="w-4 h-4 text-white" />
                  )}
                </div>
                <span className="flex-1">{isAuthenticating ? 'Initializing...' : 'Join SALU AI'}</span>
              </button>
            ) : (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        onOpenSettings();
                        if (window.innerWidth < 1024) onClose();
                      }}
                      className="flex-1 flex items-center gap-3 p-2 hover:bg-white hover:border-slate-100 border border-transparent rounded-2xl transition-all text-sm font-bold text-slate-700 group h-12 active:scale-95 shadow-soft bg-white/50 backdrop-blur-sm"
                    >
                      <div className="w-8 h-8 rounded-xl bg-slate-200 overflow-hidden flex items-center justify-center shrink-0 border border-slate-100 transition-all group-hover:border-brand-500 group-hover:shadow-md">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <User className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="truncate text-left text-xs tracking-tight">{user.displayName || 'Me'}</span>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Account Settings</span>
                      </div>
                      <Settings className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-900 transition-colors" />
                    </button>
                    <button 
                      onClick={handleLogout}
                      className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all active:scale-95 border border-transparent hover:border-rose-100"
                      title="Goodbye"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
});
