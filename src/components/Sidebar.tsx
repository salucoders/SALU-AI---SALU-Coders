import React, { useState } from "react";
import {
  MessageSquare,
  Settings,
  Archive,
  ArchiveRestore,
  X,
  User,
  AlertTriangle,
  Edit2,
  Check,
  PanelLeftClose,
  PlusCircle,
  Layout,
  Folder,
  ChevronDown,
  CheckSquare,
  ImageIcon,
  MessageSquarePlus,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { ChatSession, Mode } from "../types";
import { useUserProfile } from "../context/UserProfileContext";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { usePWA } from "../context/PWAContext";
import { LOGO_URL, APP_NAME, MODES } from "../constants";

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

export const Sidebar = React.memo(
  ({
    sessions,
    currentSessionId,
    onNewChat,
    onSelectSession,
    onDeleteSession,
    onRenameSession,
    onArchiveSession,
    isOpen,
    onToggle,
    onClose,
    onOpenSettings,
    onOpenVault,
    onOpenToolbox,
  }: SidebarProps) => {
    const { user, loginWithGoogle } = useAuth();
    const { notify } = useNotification();
    const [editingSessionId, setEditingSessionId] = useState<string | null>(
      null,
    );
    const [editingTitle, setEditingTitle] = useState("");
    const [showArchived, setShowArchived] = useState(false);

    const startEditing = (e: React.MouseEvent, session: ChatSession) => {
      e.stopPropagation();
      setEditingSessionId(session.id);
      setEditingTitle(session.title || "");
    };

    const saveRename = () => {
      if (editingSessionId && editingTitle.trim()) {
        onRenameSession(editingSessionId, editingTitle.trim());
        setEditingSessionId(null);
      }
    };

    const displayedSessions = showArchived
      ? sessions.filter((s) => s.isArchived)
      : sessions.filter((s) => !s.isArchived);

    // Sort by recent
    const sortedSessions = [...displayedSessions].sort((a, b) => {
      const timeA =
        typeof a.updatedAt === "string"
          ? new Date(a.updatedAt).getTime()
          : (a.updatedAt as any)?.seconds
            ? (a.updatedAt as any).seconds * 1000
            : 0;
      const timeB =
        typeof b.updatedAt === "string"
          ? new Date(b.updatedAt).getTime()
          : (b.updatedAt as any)?.seconds
            ? (b.updatedAt as any).seconds * 1000
            : 0;
      return timeB - timeA;
    });

    const getInitials = (name: string) => {
      if (!name) return "U";
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);
    };

    return (
      <>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden"
              onClick={onClose}
            />
          )}
        </AnimatePresence>

        <motion.div
          initial={false}
          animate={{
            width: isOpen ? 300 : 0,
            x: isOpen ? 0 : -300,
            opacity: isOpen ? 1 : 0,
          }}
          transition={{ type: "spring", damping: 30, stiffness: 250 }}
          className={cn(
            "fixed inset-y-0 left-0 z-50 bg-[#F5F4F0] flex flex-col h-full lg:relative border-r border-[#E5E3DB] overflow-hidden drop-shadow-xl lg:drop-shadow-none",
            !isOpen && "pointer-events-none lg:pointer-events-auto",
          )}
        >
          <div className="flex flex-col h-full overflow-hidden p-4">
            <div className="flex items-center justify-between mb-8 pl-2">
              <h1 className="text-[28px] font-serif font-bold text-slate-900 tracking-tight">
                SALU AI
              </h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={onToggle}
                  className="p-1.5 text-slate-500 hover:bg-slate-200/50 rounded-lg transition-all hidden lg:block"
                >
                  <PanelLeftClose className="w-5 h-5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 text-slate-500 hover:bg-slate-200/50 rounded-lg lg:hidden transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-1 mb-8">
              <button
                onClick={() => {
                  onNewChat();
                  if (window.innerWidth < 1024) onClose();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-[15px] font-medium text-[#c4533a] hover:bg-[#ebeae5] rounded-xl transition-colors"
              >
                <PlusCircle className="w-5 h-5" />
                New chat
              </button>

              <button
                onClick={() => setShowArchived(false)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-[15px] font-medium rounded-xl transition-colors",
                  !showArchived
                    ? "bg-[#ebeae5] text-slate-800"
                    : "text-slate-600 hover:bg-[#ebeae5]",
                )}
              >
                <MessageSquare className="w-5 h-5" />
                Chats
              </button>

              <button
                onClick={() => {
                  onOpenVault();
                  if (window.innerWidth < 1024) onClose();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-[15px] font-medium text-slate-600 hover:bg-[#ebeae5] rounded-xl transition-colors"
              >
                <ImageIcon className="w-5 h-5" />
                Media & Assets
              </button>

              <button
                onClick={() => {
                  onOpenToolbox();
                  if (window.innerWidth < 1024) onClose();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-[15px] font-medium text-slate-600 hover:bg-[#ebeae5] rounded-xl transition-colors"
              >
                <Layout className="w-5 h-5" />
                Apps & Features
              </button>

              <button
                onClick={() => setShowArchived(true)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-[15px] font-medium rounded-xl transition-colors",
                  showArchived
                    ? "bg-[#ebeae5] text-slate-800"
                    : "text-slate-600 hover:bg-[#ebeae5]",
                )}
              >
                <Archive className="w-5 h-5" />
                Archived
              </button>
            </div>

            <div className="h-px bg-[#E5E3DB] w-full mb-6" />

            <div className="flex-1 overflow-y-auto w-full custom-scrollbar pb-4 pr-1 relative">
              <h3 className="px-3 text-[14px] font-semibold text-slate-500 mb-2">
                Recents
              </h3>

              <div className="space-y-[2px]">
                {sortedSessions.map((session) => (
                  <div key={session.id} className="relative group">
                    {editingSessionId === session.id ? (
                      <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-300 shadow-sm mx-1">
                        <input
                          autoFocus
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveRename();
                            if (e.key === "Escape") setEditingSessionId(null);
                          }}
                          onBlur={saveRename}
                          className="bg-transparent border-none focus:ring-0 text-[15px] text-slate-900 w-full p-0 flex-1"
                        />
                        <button
                          onClick={saveRename}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg shrink-0"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          onSelectSession(session.id);
                          if (window.innerWidth < 1024) onClose();
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors relative text-[15px] group/item",
                          currentSessionId === session.id
                            ? "bg-[#ebeae5] text-slate-900 font-medium"
                            : "text-slate-700 hover:bg-[#ebeae5]",
                        )}
                      >
                        <span
                          className="truncate flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(e, session);
                          }}
                          title="Click to rename"
                        >
                          {session.title || "Untitled"}
                        </span>

                        <div className="flex items-center opacity-0 group-hover/item:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (session.isArchived) {
                                // To unarchive we need a way, but since we just have onArchiveSession maybe it toggles. Let's assume onArchiveSession toggles or we can add onUnarchive.
                                // For now, call onArchiveSession.
                                onArchiveSession(session.id);
                              } else {
                                onArchiveSession(session.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
                            title={session.isArchived ? "Unarchive" : "Archive"}
                          >
                            {session.isArchived ? (
                              <ArchiveRestore className="w-4 h-4" />
                            ) : (
                              <Archive className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSession(session.id);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-200"
                            title="Delete"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {user ? (
              <div className="mt-auto pt-2">
                <button
                  onClick={() => {
                    onOpenSettings();
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className="w-full flex items-center gap-3 p-2 hover:bg-[#ebeae5] rounded-xl transition-colors text-slate-700 mt-2"
                >
                  <div className="w-9 h-9 rounded-full bg-[#3d3c3a] text-white flex items-center justify-center shrink-0 text-sm font-medium overflow-hidden">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="User"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      getInitials(user.displayName || "")
                    )}
                  </div>
                  <div className="flex-1 flex text-left items-center min-w-0">
                    <span className="text-[15px] font-medium truncate w-full pr-2 text-slate-800">
                      {user.displayName || "Guest"}
                    </span>
                  </div>
                  <Settings className="w-5 h-5 text-slate-500 shrink-0" />
                </button>
              </div>
            ) : (
              <div className="mt-auto pt-2">
                <button
                  onClick={loginWithGoogle}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors mt-2"
                >
                  <User className="w-4 h-4" />
                  Sign in
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </>
    );
  },
);
