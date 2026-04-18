import React, { useState } from 'react';
import { MessageSquare, Plus, History, Settings, LogOut, Sparkles, Trash2, X, User, AlertTriangle, Edit2, Archive, ArchiveRestore, Check, GraduationCap, Code, Video, School, ChevronDown, Mic, MoreVertical, Image as ImageIcon, CheckSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ChatSession, Mode } from '../types';
import { useUserProfile } from '../context/UserProfileContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Lock, Crown } from 'lucide-react';

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
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenVault: () => void;
  onOpenToolbox: () => void;
  onOpenUpgrade: () => void;
  battery: { level: number; charging: boolean } | null;
}

const modes: { id: Mode; label: string; icon: any; color: string; description: string }[] = [
  { id: 'student', label: 'Student', icon: GraduationCap, color: 'text-blue-500 bg-blue-50', description: 'Assignments, Notes, AI Images' },
  { id: 'developer', label: 'Developer', icon: Code, color: 'text-emerald-500 bg-emerald-50', description: 'Code, Debug, AI Diagrams' },
  { id: 'creator', label: 'Creator', icon: Video, color: 'text-purple-500 bg-purple-50', description: 'YouTube, SEO, AI Art' },
  { id: 'assistant', label: 'Assistant', icon: User, color: 'text-orange-500 bg-orange-50', description: 'Emails, Schedules, AI Design' },
  { id: 'salu', label: 'SALU Plus', icon: School, color: 'text-brand-500 bg-brand-50', description: 'University Updates, Community' },
  { id: 'live', label: 'Live AI', icon: Mic, color: 'text-rose-500 bg-rose-50', description: 'Real-time Voice Conversation' },
];

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
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [isModeOpen, setIsModeOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const filteredModes = modes.filter(m => m.id !== 'live' || liveAiEnabled);
  const activeMode = filteredModes.find(m => m.id === currentMode) || filteredModes[0];
  const ActiveModeIcon = activeMode.icon;

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
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {sessionToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSessionToDelete(null)}
              className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-slate-900">Delete Chat?</h3>
                  <p className="text-sm text-slate-500">
                    This will permanently delete this conversation.
                  </p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 flex gap-3 border-t border-slate-100">
                <button
                  onClick={() => setSessionToDelete(null)}
                  className="flex-1 px-4 py-2.5 bg-white text-slate-700 rounded-xl font-medium hover:bg-slate-100 transition-colors border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.div 
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDragEnd={(_, info) => {
          if (info.offset.x < -100) onClose();
        }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[280px] bg-[#f9f9f9] flex flex-col transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 border-r border-slate-200/60",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Top Section */}
        <div className="p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                onNewChat();
                onClose();
              }}
              className="flex-1 flex items-center gap-2 px-3 py-2 hover:bg-slate-200/50 rounded-lg transition-colors text-sm font-medium text-slate-700"
            >
              <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200">
                <img 
                  src="https://admission.salu.edu.pk/static/media/logo.793ee5b813bb22366372.png" 
                  alt="SALU AI" 
                  className="w-4 h-4 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              New chat
              <Plus className="w-4 h-4 ml-auto text-slate-500" />
            </button>
            <button
              onClick={() => {
                if (!isPaid) {
                  onOpenUpgrade();
                  return;
                }
                onOpenToolbox();
                if (window.innerWidth < 1024) onClose();
              }}
              className="flex items-center gap-2 px-3 py-2 hover:bg-slate-200/50 rounded-lg transition-colors text-sm font-medium text-slate-700 ml-1 relative group"
              title="Study Toolbox"
            >
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center shadow-sm border",
                isPaid ? "bg-amber-50 border-amber-100" : "bg-slate-100 border-slate-200"
              )}>
                <CheckSquare className={cn("w-3.5 h-3.5", isPaid ? "text-amber-600" : "text-slate-400")} />
              </div>
              {!isPaid && <Lock className="w-2.5 h-2.5 absolute -top-1 -right-1 text-slate-400 bg-white rounded-full shadow-sm" />}
            </button>
            <button
              onClick={() => {
                if (!isPaid) {
                  onOpenUpgrade();
                  return;
                }
                onOpenVault();
                if (window.innerWidth < 1024) onClose();
              }}
              className="flex items-center gap-2 px-3 py-2 hover:bg-slate-200/50 rounded-lg transition-colors text-sm font-medium text-slate-700 ml-1 relative group"
              title="Media Vault"
            >
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center shadow-sm border",
                isPaid ? "bg-brand-50 border-brand-100" : "bg-slate-100 border-slate-200"
              )}>
                <ImageIcon className={cn("w-3.5 h-3.5", isPaid ? "text-brand-600" : "text-slate-400")} />
              </div>
              {!isPaid && <Lock className="w-2.5 h-2.5 absolute -top-1 -right-1 text-slate-400 bg-white rounded-full shadow-sm" />}
            </button>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-200/50 rounded-lg lg:hidden transition-colors text-slate-500 ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Selector */}
          <div className="relative">
            <div className="px-3 mb-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">SALU AI Modes</span>
            </div>
            <button
              onClick={() => setIsModeOpen(!isModeOpen)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-200/50 rounded-lg transition-colors text-sm font-medium text-slate-700"
            >
              <ActiveModeIcon className="w-4 h-4 text-slate-500" />
              <span className="flex-1 text-left">{activeMode.label}</span>
              <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isModeOpen && "rotate-180")} />
            </button>
            
            <AnimatePresence>
              {isModeOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsModeOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden py-1 z-50"
                  >
                    {filteredModes.map((mode) => {
                      const Icon = mode.icon;
                      const isActive = currentMode === mode.id;
                      const isLocked = !isPaid && ['live', 'assistant'].includes(mode.id);
                      
                      return (
                        <button
                          key={mode.id}
                          onClick={() => {
                            if (isLocked) {
                              onOpenUpgrade();
                              setIsModeOpen(false);
                              return;
                            }
                            onModeChange(mode.id);
                            setIsModeOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors text-left relative",
                            isActive ? "bg-slate-100 text-slate-900 font-medium" : "hover:bg-slate-50 text-slate-600",
                            isLocked && "opacity-60 cursor-not-allowed"
                          )}
                        >
                          <Icon className={cn("w-4 h-4", isActive ? "text-slate-900" : "text-slate-500")} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {mode.label}
                              {isLocked && <Lock className="w-3 h-3 text-slate-400" />}
                            </div>
                          </div>
                          {isActive && <Check className="w-4 h-4 text-slate-900" />}
                        </button>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto px-3 py-2 custom-scrollbar">
          <div className="text-xs font-semibold text-slate-500 px-3 mb-2 flex items-center justify-between">
            <span>{showArchived ? 'Archived' : 'Recent'}</span>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setShowArchived(!showArchived)} 
                className={cn(
                  "p-1 rounded transition-colors",
                  showArchived ? "bg-slate-200 text-slate-800" : "hover:bg-slate-200/50 text-slate-500"
                )}
                title={showArchived ? "Show active" : "Show archived"}
              >
                <Archive className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          
          {displayedSessions.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-slate-400">
              No chats found.
            </div>
          )}

          <div className="space-y-0.5">
            {displayedSessions.map(session => (
              <div key={session.id} className="relative group/item">
                {editingSessionId === session.id ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-brand-500 shadow-sm z-10 relative">
                    <input
                      autoFocus
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveRename();
                        if (e.key === 'Escape') setEditingSessionId(null);
                      }}
                      className="bg-transparent border-none focus:ring-0 text-sm text-slate-900 w-full p-0 font-medium"
                    />
                    <div className="flex items-center gap-1">
                      <button onClick={saveRename} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingSessionId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        onSelectSession(session.id);
                        if (window.innerWidth < 1024) onClose();
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left pr-10",
                        currentSessionId === session.id
                          ? "bg-slate-200/60 text-slate-900 font-medium"
                          : "hover:bg-slate-200/40 text-slate-700"
                      )}
                    >
                      <span className="truncate">{session.title}</span>
                    </button>
                    
                    <div className={cn(
                      "absolute right-1 top-1/2 -translate-y-1/2 transition-opacity",
                      activeMenuId === session.id || currentSessionId === session.id ? "opacity-100" : "opacity-0 group-hover/item:opacity-100"
                    )}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === session.id ? null : session.id);
                        }}
                        className={cn(
                          "p-1.5 text-slate-500 hover:text-slate-900 rounded-md transition-colors",
                          activeMenuId === session.id ? "bg-slate-200" : "hover:bg-slate-200/50"
                        )}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      <AnimatePresence>
                        {activeMenuId === session.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-[70]" 
                              onClick={() => setActiveMenuId(null)}
                            />
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              className="absolute right-0 top-full mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-lg z-[80] overflow-hidden py-1"
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditing(session);
                                  setActiveMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                                Rename
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onArchiveSession(session.id);
                                  setActiveMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                {session.isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                                {session.isArchived ? 'Unarchive' : 'Archive'}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSessionToDelete(session.id);
                                  setActiveMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer (User Profile) */}
        <div className="p-3 border-t border-slate-200/60 bg-white/50 space-y-2">
          {user && !isPaid && (
            <motion.button 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onOpenUpgrade}
              className="w-full relative overflow-hidden p-3 bg-gradient-to-br from-amber-400 via-brand-500 to-rose-600 rounded-xl group"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 flex items-center justify-center gap-2">
                <Crown className="w-4 h-4 text-white animate-pulse" />
                <span className="text-xs font-black text-white uppercase tracking-widest">Upgrade to Plus</span>
              </div>
            </motion.button>
          )}

          {user && (
            <div className="px-3 py-2 bg-slate-100/50 rounded-xl border border-slate-200/50 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Daily Credits</span>
                <span className={cn(
                  "text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-tight",
                  isPaid ? "bg-brand-500 text-white" : "bg-slate-200 text-slate-600"
                )}>
                  {isPaid ? 'SALU Plus' : 'Free'}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>{preferences.creditsTotal! - preferences.creditsUsedToday!} Remaining</span>
                  <span>{preferences.creditsTotal}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(0, Math.min(100, (1 - (preferences.creditsUsedToday! / preferences.creditsTotal!)) * 100))}%` }}
                    className={cn(
                      "h-full transition-all duration-1000",
                      isPaid ? "bg-brand-500" : "bg-slate-500"
                    )}
                  />
                </div>
              </div>
            </div>
          )}

          {!user ? (
            <button 
              onClick={handleLogin}
              disabled={isAuthenticating}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-200/50 rounded-lg transition-colors text-sm font-medium text-slate-700"
            >
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                {isAuthenticating ? (
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-700 rounded-full animate-spin" />
                ) : (
                  <User className="w-4 h-4 text-slate-500" />
                )}
              </div>
              {isAuthenticating ? 'Signing in...' : 'Sign in'}
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button 
                onClick={() => {
                  onOpenSettings();
                  if (window.innerWidth < 1024) onClose();
                }}
                className="flex-1 flex items-center gap-3 px-3 py-2.5 hover:bg-slate-200/50 rounded-lg transition-colors text-sm font-medium text-slate-700"
              >
                <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center shrink-0 border border-slate-300/50">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-4 h-4 text-slate-500" />
                  )}
                </div>
                <span className="truncate flex-1 text-left">{user.displayName || 'User'}</span>
                <Settings className="w-4 h-4 text-slate-400" />
              </button>
              <button 
                onClick={handleLogout}
                className="p-2.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
});
