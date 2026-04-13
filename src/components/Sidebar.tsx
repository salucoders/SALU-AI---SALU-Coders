import React, { useState } from 'react';
import { MessageSquare, Plus, History, Settings, LogOut, Sparkles, Trash2, X, User, AlertTriangle, Edit2, Archive, ArchiveRestore, Check, GraduationCap, Code, Video, School, ChevronDown, Battery, BatteryCharging, Mic, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RealTimeClock } from './RealTimeClock';
import { cn } from '../lib/utils';
import { ChatSession, Mode } from '../types';
import { useUserProfile } from '../context/UserProfileContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

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
  battery: { level: number; charging: boolean } | null;
}

const modes: { id: Mode; label: string; icon: any; color: string; description: string }[] = [
  { id: 'student', label: 'Student', icon: GraduationCap, color: 'text-blue-500 bg-blue-50', description: 'Assignments, Notes, Summaries' },
  { id: 'developer', label: 'Developer', icon: Code, color: 'text-emerald-500 bg-emerald-50', description: 'Code, Debug, Optimization' },
  { id: 'creator', label: 'Creator', icon: Video, color: 'text-purple-500 bg-purple-50', description: 'YouTube, SEO, Scripts' },
  { id: 'assistant', label: 'Assistant', icon: User, color: 'text-orange-500 bg-orange-50', description: 'Emails, Schedules, Advice' },
  { id: 'salu', label: 'SALU', icon: School, color: 'text-red-500 bg-red-50', description: 'University Updates, Community' },
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
  battery
}: SidebarProps) => {
  const { preferences, isAdmin } = useUserProfile();
  const { user, loginWithGoogle, logout, isAuthenticating } = useAuth();
  const { notify } = useNotification();
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [isModeOpen, setIsModeOpen] = useState(false);

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
    setEditingTitle(session.title);
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
        notify?.('Login popup was blocked by your browser. Please allow popups for this site.', 'error', 5000);
      } else if (error.code === 'auth/unauthorized-domain') {
        notify?.('This domain is not authorized in Firebase. Please add the current URL to "Authorized domains" in your Firebase Console.', 'error', 8000);
      } else if (error.code === 'auth/cancelled-popup-request') {
        // User closed the popup, usually no need for a loud error but we can log it
        console.log("User cancelled login");
      } else if (error.message?.includes('INTERNAL ASSERTION FAILED')) {
        notify?.('A technical error occurred with the login popup. Please try refreshing the page.', 'error', 5000);
      } else {
        notify?.('Failed to sign in with Google. Please try again.', 'error', 3000);
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
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-40 lg:hidden"
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
              className="absolute inset-0 bg-white/60 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto shadow-sm">
                  <AlertTriangle className="w-10 h-10 text-red-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Delete Chat?</h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    This will permanently delete this conversation. This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="p-6 bg-slate-50/50 flex gap-3 border-t border-slate-50">
                <button
                  onClick={() => setSessionToDelete(null)}
                  className="flex-1 px-4 py-4 bg-white text-slate-600 rounded-2xl font-bold hover:bg-slate-100 transition-all border border-slate-200 shadow-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 px-4 py-4 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all"
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
          "fixed inset-y-0 left-0 z-50 w-72 md:w-80 bg-white/90 backdrop-blur-3xl text-slate-600 flex flex-col h-full border-r border-slate-200/50 transition-transform duration-700 cubic-bezier(0.4, 0, 0.2, 1) lg:relative lg:translate-x-0 shadow-[40px_0_80px_rgba(0,0,0,0.03)]",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar Header */}
        <div className="p-6 md:p-8 flex items-center justify-between">
          <div className="flex items-center gap-4 group cursor-default">
            <div className="w-10 h-10 md:w-11 md:h-11 bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
              <img 
                src="https://admission.salu.edu.pk/static/media/logo.793ee5b813bb22366372.png" 
                alt="SALU AI Logo" 
                className="w-8 h-8 md:w-9 md:h-9 object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="space-y-0.5">
              <h1 className="font-black text-slate-900 text-base md:text-lg tracking-tight leading-none group-hover:text-brand-600 transition-colors">SALU AI</h1>
              <div className="flex items-center gap-2">
                <p className="text-[8px] md:text-[9px] uppercase tracking-[0.3em] text-slate-400 font-black leading-none">Coders Edition</p>
                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <RealTimeClock />
            </div>
            <button 
              onClick={onClose}
              className="p-2.5 hover:bg-slate-100 rounded-2xl lg:hidden transition-all text-slate-400 hover:text-slate-900 active:scale-90 border border-transparent hover:border-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-4 md:px-6 mb-4">
          <div className="relative">
            <motion.button
              id="mode-selector"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsModeOpen(!isModeOpen)}
              className={cn(
                "w-full flex items-center gap-3 px-5 py-4 rounded-2xl bg-white border border-slate-200 transition-all group hover:border-brand-300 shadow-sm",
                isModeOpen && "border-slate-900 ring-4 ring-slate-900/5"
              )}
            >
              <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm", activeMode.color)}>
                <ActiveModeIcon className="w-4 h-4" />
              </div>
              <div className="text-left flex-1">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Active AI Mode</p>
                <p className="text-[11px] font-black text-slate-900 leading-none">{activeMode.label}</p>
              </div>
              <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform duration-500", isModeOpen && "rotate-180 text-slate-900")} />
            </motion.button>

            <AnimatePresence>
              {isModeOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-[1.5rem] shadow-2xl overflow-hidden p-2 z-[60]"
                >
                  <div className="grid grid-cols-1 gap-1">
                    {filteredModes.map((mode) => {
                      const Icon = mode.icon;
                      const isActive = currentMode === mode.id;
                      return (
                        <button
                          key={mode.id}
                          onClick={() => {
                            onModeChange(mode.id);
                            setIsModeOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group/btn",
                            isActive ? "bg-slate-900 text-white shadow-lg" : "hover:bg-slate-50 text-slate-600"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all",
                            isActive ? "bg-white/10" : mode.color
                          )}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-black uppercase tracking-wider">{mode.label}</p>
                              {isActive && <div className="w-1 h-1 rounded-full bg-white animate-pulse" />}
                            </div>
                            <p className={cn(
                              "text-[8px] font-bold uppercase tracking-wider truncate",
                              isActive ? "text-white/50" : "text-slate-400"
                            )}>{mode.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="px-4 md:px-6 mb-6 md:mb-8">
          <button
            id="new-chat-button"
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-5 md:px-6 py-4 bg-slate-900 hover:bg-black text-white rounded-2xl md:rounded-[1.5rem] transition-all shadow-2xl shadow-slate-900/20 group font-black text-xs md:text-sm active:scale-[0.98] relative overflow-hidden border border-white/10"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-600/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors relative z-10">
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500 stroke-[3px]" />
            </div>
            <span className="relative z-10 tracking-tight">New Conversation</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 md:px-4 space-y-1 custom-scrollbar pb-8">
          <div className="flex items-center justify-between px-4 py-3 mb-1">
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              <History className="w-3.5 h-3.5" />
              {showArchived ? 'Archived' : 'Recent History'}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={cn(
                  "p-2 transition-all rounded-xl border",
                  showArchived 
                    ? "text-brand-600 bg-brand-50 border-brand-100 shadow-sm" 
                    : "text-slate-400 hover:text-slate-900 hover:bg-slate-50 border-transparent hover:border-slate-200"
                )}
                title={showArchived ? "Show active chats" : "Show archived chats"}
              >
                <Archive className="w-3.5 h-3.5" />
              </button>
              {sessions.length > 0 && (
                <button 
                  onClick={onClearChats}
                  className="text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all p-2 rounded-xl border border-transparent"
                  title="Clear all history"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          
          {displayedSessions.length === 0 && (
            <div className="px-4 py-12 text-center space-y-3">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto border border-slate-100">
                <MessageSquare className="w-6 h-6 text-slate-200" />
              </div>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                {showArchived ? 'No archived chats' : 'Empty History'}
              </p>
            </div>
          )}

          {displayedSessions.map((session) => (
            <div key={session.id} className="relative group/item px-1 md:px-2">
              {editingSessionId === session.id ? (
                <div className="flex items-center gap-2 px-4 py-3 bg-white rounded-2xl border-2 border-brand-500 shadow-xl shadow-brand-500/10 z-10 relative">
                  <input
                    autoFocus
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveRename();
                      if (e.key === 'Escape') setEditingSessionId(null);
                    }}
                    className="bg-transparent border-none focus:ring-0 text-xs md:text-sm text-slate-900 w-full p-0 font-bold"
                  />
                  <div className="flex items-center gap-1">
                    <button onClick={saveRename} className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
                      <Check className="w-3.5 h-3.5 stroke-[3px]" />
                    </button>
                    <button onClick={() => setEditingSessionId(null)} className="p-1.5 bg-slate-100 text-slate-400 rounded-lg hover:bg-slate-200 transition-colors">
                      <X className="w-3.5 h-3.5 stroke-[3px]" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative group">
                  <button
                    onClick={() => {
                      onSelectSession(session.id);
                      onClose();
                    }}
                    className={cn(
                      "w-full flex items-center gap-3.5 px-4 md:px-5 py-4 rounded-2xl text-xs md:text-sm transition-all text-left pr-24 font-bold relative overflow-hidden border",
                      currentSessionId === session.id
                        ? "bg-white text-slate-900 shadow-lg shadow-slate-200/50 border-slate-200"
                        : "hover:bg-slate-50 text-slate-500 hover:text-slate-900 border-transparent hover:border-slate-100"
                    )}
                  >
                    {currentSessionId === session.id && (
                      <motion.div 
                        layoutId="active-pill"
                        className="absolute left-0 top-4 bottom-4 w-1 bg-brand-500 rounded-r-full" 
                      />
                    )}
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500",
                      currentSessionId === session.id ? "bg-brand-50 text-brand-600 scale-110" : "bg-slate-50 text-slate-300 group-hover/item:bg-white group-hover/item:text-slate-400"
                    )}>
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <span className="truncate tracking-tight">{session.title}</span>
                  </button>
                  
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-all duration-300 translate-x-2 group-hover/item:translate-x-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(session);
                      }}
                      className="p-2 text-slate-400 hover:text-brand-600 hover:bg-white border border-transparent hover:border-slate-100 rounded-xl transition-all shadow-sm"
                      title="Rename"
                    >
                      <Edit2 className="w-3 h-3 md:w-3.5 md:h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onArchiveSession(session.id);
                      }}
                      className="p-2 text-slate-400 hover:text-amber-600 hover:bg-white border border-transparent hover:border-slate-100 rounded-xl transition-all shadow-sm"
                      title={session.isArchived ? "Unarchive" : "Archive"}
                    >
                      {session.isArchived ? <ArchiveRestore className="w-3 h-3 md:w-3.5 md:h-3.5" /> : <Archive className="w-3 h-3 md:w-3.5 md:h-3.5" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSessionToDelete(session.id);
                      }}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-white border border-transparent hover:border-slate-100 rounded-xl transition-all shadow-sm"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3 md:w-3.5 md:h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Sidebar Footer - Profile Button */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Network Connected</span>
            </div>
            {battery && (
              <div className="flex items-center gap-1.5">
                {battery.charging ? (
                  <BatteryCharging className="w-3 h-3 text-amber-500 animate-pulse" />
                ) : (
                  <Battery className={cn(
                    "w-3 h-3",
                    battery.level < 0.2 ? "text-rose-500" : "text-slate-400"
                  )} />
                )}
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest",
                  battery.level < 0.2 ? "text-rose-500" : "text-slate-500"
                )}>
                  {Math.round(battery.level * 100)}%
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {!user ? (
              <button 
                onClick={handleLogin}
                disabled={isAuthenticating}
                className={cn(
                  "flex items-center gap-3 p-3 bg-brand-500 text-white rounded-[1.5rem] shadow-lg shadow-brand-500/20 hover:bg-brand-600 transition-all duration-300 font-black text-xs uppercase tracking-widest",
                  isAuthenticating && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  {isAuthenticating ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>
                {isAuthenticating ? 'Signing in...' : 'Sign in with Google'}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  id="settings-button"
                  onClick={() => {
                    onOpenSettings();
                    onClose();
                  }}
                  className="relative group flex-1"
                >
                  <div className="flex items-center gap-4 p-3 bg-white rounded-[1.5rem] border border-slate-200 shadow-xl shadow-slate-200/40 group-hover:border-brand-500 transition-all duration-500 group-hover:shadow-brand-500/10">
                    <div className="w-10 h-10 rounded-2xl bg-slate-50 border-2 border-white overflow-hidden flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-500 ring-1 ring-slate-100">
                      {user.photoURL ? (
                        <img 
                          src={user.photoURL || null} 
                          alt="Profile" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <User className="w-5 h-5 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-black text-slate-900 truncate group-hover:text-brand-600 transition-colors leading-tight">{user.displayName || 'User'}</p>
                      <p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.15em] mt-0.5">Settings</p>
                    </div>
                    <div className="w-7 h-7 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-brand-500 group-hover:text-white transition-all duration-500">
                      <Settings className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-700" />
                    </div>
                  </div>
                </button>
                <button 
                  onClick={handleLogout}
                  className="w-11 h-11 rounded-[1.25rem] bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all duration-500 shadow-sm"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
});
