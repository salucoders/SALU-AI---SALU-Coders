import React, { useState, useRef, useMemo } from "react";
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
  Pin,
  PinOff,
  Trash2,
  MoreVertical,
  Search,
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
  onPinSession?: (id: string) => void;
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
    onPinSession,
    isOpen,
    onToggle,
    onClose,
    onOpenSettings,
    onOpenVault,
    onOpenToolbox,
  }: SidebarProps) => {
    const { user, loginWithGoogle } = useAuth();
    const { preferences } = useUserProfile();
    const { notify } = useNotification();
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState("");
    const [showArchived, setShowArchived] = useState(false);
    const [selectedSessionForOptions, setSelectedSessionForOptions] = useState<ChatSession | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Touch & Hold (Long Press) gesture handlers
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
    const isLongPressTriggeredRef = useRef<boolean>(false);

    const handleTouchStart = (e: React.TouchEvent, session: ChatSession) => {
      isLongPressTriggeredRef.current = false;
      const touch = e.touches[0];
      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

      longPressTimerRef.current = setTimeout(() => {
        isLongPressTriggeredRef.current = true;
        if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
          try {
            window.navigator.vibrate(40);
          } catch (_) {}
        }
        setSelectedSessionForOptions(session);
      }, 500);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
      if (!touchStartPosRef.current) return;
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
      const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
      if (dx > 10 || dy > 10) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
    };

    const handleTouchEnd = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };

    const handleMouseDown = (e: React.MouseEvent, session: ChatSession) => {
      if (e.button !== 0) return;
      isLongPressTriggeredRef.current = false;
      longPressTimerRef.current = setTimeout(() => {
        isLongPressTriggeredRef.current = true;
        setSelectedSessionForOptions(session);
      }, 500);
    };

    const handleMouseUpOrLeave = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };

    const handleContextMenu = (e: React.MouseEvent, session: ChatSession) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedSessionForOptions(session);
    };

    const handleSessionClick = (session: ChatSession) => {
      if (isLongPressTriggeredRef.current) {
        isLongPressTriggeredRef.current = false;
        return;
      }
      onSelectSession(session.id);
      if (window.innerWidth < 1024) onClose();
    };

    const saveRename = () => {
      if (editingSessionId && editingTitle.trim()) {
        onRenameSession(editingSessionId, editingTitle.trim());
        setEditingSessionId(null);
      } else {
        setEditingSessionId(null);
      }
    };

    // Search & Archive filtering across title and message content
    const filteredSessions = useMemo(() => {
      const base = showArchived
        ? sessions.filter((s) => s.isArchived)
        : sessions.filter((s) => !s.isArchived);

      if (!searchQuery.trim()) return base;
      const q = searchQuery.toLowerCase().trim();
      return base.filter((s) => {
        const titleMatch = (s.title || "").toLowerCase().includes(q);
        const lastMsgMatch = (s.lastMessage || "").toLowerCase().includes(q);
        return titleMatch || lastMsgMatch;
      });
    }, [sessions, showArchived, searchQuery]);

    const getSessionCategory = (session: ChatSession): string => {
      if (session.isPinned) return "Pinned";

      const timeVal =
        typeof session.updatedAt === "string"
          ? new Date(session.updatedAt).getTime()
          : (session.updatedAt as any)?.seconds
            ? (session.updatedAt as any).seconds * 1000
            : typeof session.createdAt === "string"
              ? new Date(session.createdAt).getTime()
              : 0;

      if (!timeVal) return "Older";

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const yesterdayStart = todayStart - 86400000;
      const last7DaysStart = todayStart - 6 * 86400000;
      const last30DaysStart = todayStart - 29 * 86400000;

      if (timeVal >= todayStart) return "Today";
      if (timeVal >= yesterdayStart) return "Yesterday";
      if (timeVal >= last7DaysStart) return "Previous 7 Days";
      if (timeVal >= last30DaysStart) return "Previous 30 Days";
      return "Older";
    };

    const groupedSessions = useMemo(() => {
      const groups: { [key: string]: ChatSession[] } = {};
      const categoryOrder = [
        "Pinned",
        "Today",
        "Yesterday",
        "Previous 7 Days",
        "Previous 30 Days",
        "Older",
      ];

      filteredSessions.forEach((s) => {
        const category = searchQuery.trim() ? "Search Results" : getSessionCategory(s);
        if (!groups[category]) groups[category] = [];
        groups[category].push(s);
      });

      // Sort items within each category by updatedAt descending
      Object.keys(groups).forEach((cat) => {
        groups[cat].sort((a, b) => {
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
      });

      if (searchQuery.trim()) {
        return [{ category: "Search Results", items: groups["Search Results"] || [] }];
      }

      return categoryOrder
        .filter((cat) => groups[cat] && groups[cat].length > 0)
        .map((cat) => ({ category: cat, items: groups[cat] }));
    }, [filteredSessions, searchQuery]);

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

            <div className="h-px bg-[#E5E3DB] w-full mb-4" />

            {/* Search Input Bar */}
            <div className="relative mb-3 px-1 shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                className="w-full bg-[#EAE8E1] focus:bg-white text-slate-900 placeholder:text-slate-500 text-sm rounded-xl pl-9 pr-8 py-2 border border-transparent focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300/50 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto w-full custom-scrollbar pb-4 pr-1 relative">
              {groupedSessions.length === 0 ? (
                <div className="py-8 px-4 text-center">
                  <p className="text-xs text-slate-400 font-medium">
                    {searchQuery.trim() ? "No chats found matching your search" : "No recent chats"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedSessions.map(({ category, items }) => (
                    <div key={category} className="space-y-1">
                      <h3 className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        {category}
                      </h3>
                      <div className="space-y-[2px]">
                        {items.map((session) => (
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
                                  placeholder="Enter chat title..."
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
                                onClick={() => handleSessionClick(session)}
                                onTouchStart={(e) => handleTouchStart(e, session)}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                                onMouseDown={(e) => handleMouseDown(e, session)}
                                onMouseUp={handleMouseUpOrLeave}
                                onMouseLeave={handleMouseUpOrLeave}
                                onContextMenu={(e) => handleContextMenu(e, session)}
                                className={cn(
                                  "w-full flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors relative text-[15px] group/item select-none",
                                  currentSessionId === session.id
                                    ? "bg-[#ebeae5] text-slate-900 font-semibold shadow-xs border border-slate-300/40"
                                    : "text-slate-700 hover:bg-[#ebeae5]",
                                )}
                              >
                                <div className="flex items-center gap-2 truncate flex-1 pr-2 min-w-0">
                                  {session.isPinned && (
                                    <Pin className="w-3.5 h-3.5 text-amber-600 fill-amber-600/30 shrink-0" />
                                  )}
                                  <div className="flex flex-col min-w-0 flex-1">
                                    <span className="truncate flex-1">
                                      {session.title || "Untitled Chat"}
                                    </span>
                                    {session.lastMessage && searchQuery.trim() && (
                                      <span className="text-[11px] text-slate-400 truncate">
                                        {session.lastMessage}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedSessionForOptions(session);
                                    }}
                                    className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                    title="Options (Hold or click)"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                    {preferences?.profilePicture || user?.photoURL ? (
                      <img
                        src={preferences?.profilePicture || user?.photoURL || ""}
                        alt="User"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      getInitials(preferences?.name || user?.displayName || "")
                    )}
                  </div>
                  <div className="flex-1 flex text-left items-center min-w-0">
                    <span className="text-[15px] font-medium truncate w-full pr-2 text-slate-800">
                      {preferences?.name || user?.displayName || "Guest"}
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

        {/* Touch & Hold / Options Modal */}
        <AnimatePresence>
          {selectedSessionForOptions && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-950/50 backdrop-blur-md"
                onClick={() => setSelectedSessionForOptions(null)}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 12 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className="relative w-full max-w-xs bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden z-10 p-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-2">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      Chat Options
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {selectedSessionForOptions.title || "Untitled Chat"}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedSessionForOptions(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1">
                  {/* Option 1: Pin / Unpin Chat */}
                  <button
                    onClick={() => {
                      const session = selectedSessionForOptions;
                      setSelectedSessionForOptions(null);
                      if (onPinSession) {
                        onPinSession(session.id);
                      }
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                  >
                    {selectedSessionForOptions.isPinned ? (
                      <>
                        <PinOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span>Unpin Chat</span>
                      </>
                    ) : (
                      <>
                        <Pin className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span>Pin Chat</span>
                      </>
                    )}
                  </button>

                  {/* Option 2: Edit Name */}
                  <button
                    onClick={() => {
                      const session = selectedSessionForOptions;
                      setSelectedSessionForOptions(null);
                      setEditingSessionId(session.id);
                      setEditingTitle(session.title || "");
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Edit Name</span>
                  </button>

                  {/* Option 3: Delete Chat */}
                  <button
                    onClick={() => {
                      const session = selectedSessionForOptions;
                      setSelectedSessionForOptions(null);
                      onDeleteSession(session.id);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                    <span>Delete Chat</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </>
    );
  },
);
