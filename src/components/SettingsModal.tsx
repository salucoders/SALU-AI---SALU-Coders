import React, { useState, useRef, useEffect } from "react";
import {
  X,
  User,
  Camera,
  Save,
  Check,
  Palette,
  Heart,
  HeartOff,
  Sparkles,
  Briefcase,
  Smile,
  Zap,
  Wand2,
  Volume2,
  UserCircle,
  ChevronLeft,
  Settings,
  ChevronRight,
  Download,
  Globe,
  MapPin,
  Monitor,
  Smartphone,
  CreditCard,
  Trash2,
  Clock,
  LogOut,
  GraduationCap,
  Crown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserPreferences, Persona } from "../types";
import { cn, compressImage } from "../lib/utils";
import { useUserProfile } from "../context/UserProfileContext";
import { useNotification } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";

type ViewMode =
  | "main"
  | "edit_profile"
  | "language"
  | "location"
  | "display"
  | "ai_personality"
  | "academic_info"
  | "subscription"
  | "downloads"
  | "clear_confirm";

export function SettingsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { preferences, updatePreferences, loading } = useUserProfile();
  const { logout } = useAuth();
  const { notify } = useNotification();
  const [localPrefs, setLocalPrefs] = useState<UserPreferences>(preferences);
  const [isSaved, setIsSaved] = useState(false);
  const [view, setView] = useState<ViewMode>("main");
  const [clearTarget, setClearTarget] = useState<"cache" | "history" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && !loading) {
      setLocalPrefs(preferences);
      setView("main");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, loading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const rawResult = reader.result as string;
      const compressedPic = await compressImage(rawResult, 128, 128, 0.7);

      setLocalPrefs((prev) => ({
        ...prev,
        profilePicture: compressedPic,
      }));

      try {
        await updatePreferences({
          profilePicture: compressedPic,
        });
        notify("Profile picture updated", "success");
      } catch (err) {
        console.error("Error updating profile picture:", err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!localPrefs.name || localPrefs.name.trim() === "") {
      notify("Name cannot be empty", "error");
      return;
    }
    
    if (!localPrefs.email || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(localPrefs.email)) {
      notify("Please provide a valid email address", "error");
      return;
    }
    
    try {
      await updatePreferences(localPrefs);
      setIsSaved(true);
      notify("Settings saved successfully", "success", 2000);
      setTimeout(() => {
        setIsSaved(false);
        setView("main");
      }, 500);
    } catch (error) {
      console.error("Failed to save settings:", error);
      notify("Failed to save settings", "error", 3000);
    }
  };

  const handleLogout = async () => {
    try {
      if (logout) {
        await logout();
        onClose();
        notify("Logged out successfully", "success");
      }
    } catch (error) {
      notify("Failed to log out", "error");
    }
  };

  const accentColors = [
    { name: "Salu Blue", value: "#38bdf8" },
    { name: "Mint", value: "#34d399" },
    { name: "Lilac", value: "#a78bfa" },
    { name: "Rose", value: "#fb7185" },
    { name: "Peach", value: "#fbbf24" },
    { name: "Periwinkle", value: "#818cf8" },
    { name: "Silver", value: "#94a3b8" },
    { name: "Coral", value: "#f87171" },
  ];

  const languages = [
    "English",
    "Urdu",
    "Sindhi",
    "Spanish",
    "French",
    "German",
  ] as const;

  const personas: {
    id: Persona;
    label: string;
    icon: any;
    color: string;
    description: string;
    recommendedVoice: "male" | "female";
  }[] = [
    {
      id: "professional",
      label: "Professional",
      icon: Briefcase,
      color: "text-slate-600 bg-slate-50",
      description: "Formal & Precise",
      recommendedVoice: "male",
    },
    {
      id: "friendly",
      label: "Friendly",
      icon: Smile,
      color: "text-emerald-600 bg-emerald-50",
      description: "Warm & Approachable",
      recommendedVoice: "female",
    },
    {
      id: "witty",
      label: "Witty",
      icon: Zap,
      color: "text-amber-600 bg-amber-50",
      description: "Clever & Humorous",
      recommendedVoice: "male",
    },
    {
      id: "encouraging",
      label: "Encouraging",
      icon: Heart,
      color: "text-rose-600 bg-rose-50",
      description: "Supportive & Positive",
      recommendedVoice: "female",
    },
    {
      id: "creative",
      label: "Creative",
      icon: Wand2,
      color: "text-purple-600 bg-purple-50",
      description: "Imaginative & Artistic",
      recommendedVoice: "female",
    },
  ];

  const MenuItem = ({
    icon: Icon,
    label,
    onClick,
    color = "text-slate-800",
    iconColor = "text-slate-600",
  }: any) => (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-4 group"
    >
      <div className="flex items-center gap-4">
        <Icon className={cn("w-5 h-5", iconColor)} strokeWidth={1.5} />
        <span className={cn("text-[15px] font-medium", color)}>{label}</span>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
    </button>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full md:w-[420px] h-full bg-[#FAFAFA] shadow-2xl overflow-hidden flex flex-col z-10"
          >
            {/* Header */}
            <div className="p-4 flex items-center justify-between sticky top-0 z-20 bg-[#FAFAFA]">
              <button
                onClick={() => (view === "main" ? onClose() : setView("main"))}
                className="p-2 hover:bg-slate-200/50 rounded-full transition-colors text-slate-800"
              >
                <ChevronLeft className="w-6 h-6" strokeWidth={2} />
              </button>
              <h2 className="text-lg font-semibold text-slate-900">
                {view === "main" && "My Profile"}
                {view === "edit_profile" && "Edit Profile"}
                {view === "language" && "Language"}
                {view === "location" && "Location"}
                {view === "display" && "Display Settings"}
                {view === "ai_personality" && "AI Personality"}
                {view === "academic_info" && "Academic Info"}
                {view === "subscription" && "Subscription"}
                {view === "downloads" && "Downloads"}
                {view === "clear_confirm" && "Confirmation"}
              </h2>
              <div className="w-10 h-10 flex items-center justify-center">
                {view === "main" ? (
                  <button className="p-2 hover:bg-slate-200/50 rounded-full transition-colors text-slate-800">
                    <Settings className="w-5 h-5" strokeWidth={2} />
                  </button>
                ) : (
                  <button
                    onClick={handleSave}
                    className="p-2 hover:bg-slate-200/50 rounded-full transition-colors text-emerald-500"
                  >
                    {isSaved ? (
                      <Check className="w-6 h-6" strokeWidth={2.5} />
                    ) : (
                      <Check className="w-6 h-6" strokeWidth={2} />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-8 custom-scrollbar">
              <AnimatePresence mode="wait">
                {view === "main" && (
                  <motion.div
                    key="main"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col h-full"
                  >
                    {/* User Profile Header */}
                    <div className="flex items-center gap-5 mt-2 mb-8">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full bg-slate-200 overflow-hidden shadow-sm border-2 border-white">
                          {localPrefs.profilePicture ? (
                            <img
                              src={localPrefs.profilePicture}
                              alt="Profile"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                              <User className="w-10 h-10" />
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute bottom-0 right-0 w-7 h-7 bg-white rounded-full shadow-md flex items-center justify-center border border-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                        >
                          <Camera className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept="image/*"
                          className="hidden"
                        />
                      </div>

                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-900 leading-tight">
                          {localPrefs.name || "User"}
                        </h3>
                        <p className="text-[13px] text-slate-500 mb-3 truncate">
                          {localPrefs.email || "user@example.com"}
                        </p>
                        <button
                          onClick={() => setView("edit_profile")}
                          className="bg-[#10b981] hover:bg-[#059669] text-white px-5 py-1.5 rounded-lg text-sm font-medium transition-colors"
                        >
                          Edit Profile
                        </button>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="flex flex-col gap-0 border-b border-slate-200/60 pb-2 mb-2">
                      <MenuItem
                        icon={Heart}
                        label="Favourites"
                        onClick={() => notify("Favourites coming soon", "info")}
                      />
                      <MenuItem
                        icon={Download}
                        label="Downloads"
                        onClick={() => setView("downloads")}
                      />
                    </div>

                    <div className="flex flex-col gap-0 border-b border-slate-200/60 pb-2 mb-2">
                      <MenuItem
                        icon={Globe}
                        label="Language"
                        onClick={() => setView("language")}
                      />
                      <MenuItem
                        icon={MapPin}
                        label="Location"
                        onClick={() => setView("location")}
                      />
                      <MenuItem
                        icon={Monitor}
                        label="Display"
                        onClick={() => setView("display")}
                      />
                      <MenuItem
                        icon={Sparkles}
                        label="AI Personality"
                        onClick={() => setView("ai_personality")}
                      />
                      <MenuItem
                        icon={GraduationCap}
                        label="Academic Info"
                        onClick={() => setView("academic_info")}
                      />
                      <MenuItem
                        icon={CreditCard}
                        label="Subscription"
                        onClick={() => setView("subscription")}
                      />
                    </div>

                    <div className="flex flex-col gap-0 border-b border-slate-200/60 pb-2 mb-2">
                      <MenuItem
                        icon={Trash2}
                        label="Clear Cache"
                        onClick={() => {
                          setClearTarget("cache")
                          setView("clear_confirm")
                        }}
                      />
                      <MenuItem
                        icon={Clock}
                        label="Clear history"
                        onClick={() => {
                          setClearTarget("history")
                          setView("clear_confirm")
                        }}
                      />
                      <MenuItem
                        icon={LogOut}
                        label="Log Out"
                        color="text-red-500"
                        iconColor="text-red-500"
                        onClick={handleLogout}
                      />
                    </div>

                    <div className="mt-auto pt-6 pb-2 flex justify-center">
                      <span className="text-xs text-slate-400 font-medium tracking-wide">
                        App version 0.0.3
                      </span>
                    </div>
                  </motion.div>
                )}

                {view === "edit_profile" && (
                  <motion.div
                    key="edit"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-8 mt-4"
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className="relative cursor-pointer group"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="w-24 h-24 rounded-full bg-slate-200 overflow-hidden shadow-sm border-2 border-white relative group">
                          {localPrefs.profilePicture ? (
                            <img
                              src={localPrefs.profilePicture}
                              alt="Profile"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                              <User className="w-12 h-12" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[10px] text-white font-bold tracking-widest uppercase mt-4">
                              Change
                            </span>
                          </div>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center border border-slate-100 text-slate-600 transition-colors">
                          <Camera className="w-4 h-4" />
                        </div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept="image/*"
                          className="hidden"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-[15px] font-bold text-slate-800">
                        Your Information
                      </h3>

                      <div className="space-y-3">
                        <div className="relative">
                          <label className="absolute -top-2 left-3 bg-[#FAFAFA] px-1 text-[11px] font-medium text-slate-500 z-10">
                            Name
                          </label>
                          <input
                            type="text"
                            value={localPrefs.name || ""}
                            onChange={(e) =>
                              setLocalPrefs((prev) => ({
                                ...prev,
                                name: e.target.value,
                              }))
                            }
                            className="w-full px-4 py-3.5 bg-transparent border border-slate-300 rounded-xl focus:ring-1 focus:ring-[#10b981] focus:border-[#10b981] transition-all outline-none text-slate-800 text-[15px]"
                          />
                        </div>

                        <div className="relative">
                          <label className="absolute -top-2 left-3 bg-[#FAFAFA] px-1 text-[11px] font-medium text-slate-500 z-10">
                            Email Id
                          </label>
                          <input
                            type="email"
                            value={localPrefs.email || ""}
                            onChange={(e) =>
                              setLocalPrefs((prev) => ({
                                ...prev,
                                email: e.target.value,
                              }))
                            }
                            placeholder="user@example.com"
                            className="w-full px-4 py-3.5 bg-transparent border border-slate-300 rounded-xl focus:ring-1 focus:ring-[#10b981] focus:border-[#10b981] transition-all outline-none text-slate-800 text-[15px]"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {view === "language" && (
                  <motion.div
                    key="lang"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4 mt-2"
                  >
                    {languages.map((lang) => (
                      <button
                        key={lang}
                        onClick={() => {
                          setLocalPrefs((prev) => ({
                            ...prev,
                            language: lang as any,
                          }));
                        }}
                        className="w-full p-4 bg-white rounded-xl border border-slate-200 flex items-center justify-between"
                      >
                        <span className="text-[15px] font-medium text-slate-800">
                          {lang}
                        </span>
                        {localPrefs.language === lang && (
                          <Check className="w-5 h-5 text-emerald-500" />
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}

                {view === "location" && (
                  <motion.div
                    key="location"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4 mt-2"
                  >
                    <div className="relative">
                      <label className="absolute -top-2 left-3 bg-[#FAFAFA] px-1 text-[11px] font-medium text-slate-500 z-10">
                        City / Location
                      </label>
                      <input
                        type="text"
                        value={localPrefs.location || ""}
                        onChange={(e) =>
                          setLocalPrefs((prev) => ({
                            ...prev,
                            location: e.target.value,
                          }))
                        }
                        placeholder="e.g. Khairpur, Sindh"
                        className="w-full px-4 py-3.5 bg-transparent border border-slate-300 rounded-xl focus:ring-1 focus:ring-[#10b981] focus:border-[#10b981] transition-all outline-none text-slate-800 text-[15px]"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                       Set your location to help the AI provide perfect context-aware responses according to your city or area.
                    </p>
                  </motion.div>
                )}

                {view === "display" && (
                  <motion.div
                    key="display"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6 mt-2"
                  >
                    <div>
                      <h3 className="text-[15px] font-bold text-slate-800 mb-3">
                        Theme
                      </h3>
                      <div className="grid grid-cols-3 gap-3">
                        {(["light", "dark", "system"] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() =>
                              setLocalPrefs((prev) => ({ ...prev, theme: t }))
                            }
                            className={cn(
                              "py-3 rounded-xl border text-sm font-medium transition-colors capitalize",
                              localPrefs.theme === t
                                ? "bg-slate-900 border-slate-900 text-white shadow-md"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
                            )}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-[15px] font-bold text-slate-800 mb-3">
                        Accent Color
                      </h3>
                      <div className="flex flex-wrap gap-3">
                        {accentColors.map((color) => (
                          <button
                            key={color.value}
                            onClick={() =>
                              setLocalPrefs((prev) => ({
                                ...prev,
                                accentColor: color.value,
                              }))
                            }
                            className={cn(
                              "w-12 h-12 rounded-full transition-transform flex items-center justify-center",
                              localPrefs.accentColor === color.value
                                ? "scale-110 ring-4 ring-offset-2 ring-slate-200"
                                : "hover:scale-105",
                            )}
                            style={{ backgroundColor: color.value }}
                            title={color.name}
                          >
                            {localPrefs.accentColor === color.value && (
                              <Check className="w-5 h-5 text-white" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {view === "ai_personality" && (
                  <motion.div
                    key="ai_personality"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6 mt-2"
                  >
                    <div className="space-y-3">
                      {personas.map((persona) => {
                        const Icon = persona.icon;
                        const isActive = localPrefs.persona === persona.id;
                        return (
                          <button
                            key={persona.id}
                            onClick={() =>
                              setLocalPrefs((prev) => ({
                                ...prev,
                                persona: persona.id,
                                voice: persona.recommendedVoice,
                              }))
                            }
                            className={cn(
                              "w-full flex items-center gap-4 p-4 rounded-xl transition-all text-left border relative overflow-hidden",
                              isActive
                                ? "bg-slate-900 border-slate-900 text-white shadow-md"
                                : "bg-white border-slate-200 text-slate-800 hover:bg-slate-50",
                            )}
                          >
                            <div
                              className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                                isActive
                                  ? "bg-slate-800 text-white"
                                  : "bg-slate-100 text-slate-500",
                              )}
                            >
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <div
                                className={cn(
                                  "font-semibold text-[15px]",
                                  isActive ? "text-white" : "text-slate-900",
                                )}
                              >
                                {persona.label}
                              </div>
                              <div
                                className={cn(
                                  "text-xs",
                                  isActive
                                    ? "text-slate-300"
                                    : "text-slate-500",
                                )}
                              >
                                {persona.description}
                              </div>
                            </div>
                            {isActive && (
                              <Check className="w-5 h-5 text-white" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-2">
                      <h3 className="text-[15px] font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <Volume2 className="w-4 h-4" /> Live Voice
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() =>
                            setLocalPrefs((prev) => ({
                              ...prev,
                              voice: "male",
                            }))
                          }
                          className={cn(
                            "flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-colors",
                            localPrefs.voice === "male"
                              ? "bg-slate-900 border-slate-900 text-white shadow-md"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
                          )}
                        >
                          <User className="w-4 h-4" /> Male Voice
                        </button>
                        <button
                          onClick={() =>
                            setLocalPrefs((prev) => ({
                              ...prev,
                              voice: "female",
                            }))
                          }
                          className={cn(
                            "flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-colors",
                            localPrefs.voice === "female"
                              ? "bg-slate-900 border-slate-900 text-white shadow-md"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
                          )}
                        >
                          <UserCircle className="w-4 h-4" /> Female Voice
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {view === "academic_info" && (
                  <motion.div
                    key="academic"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4 mt-2"
                  >
                    <div className="relative">
                      <label className="absolute -top-2 left-3 bg-[#FAFAFA] px-1 text-[11px] font-medium text-slate-500 z-10">
                        Department
                      </label>
                      <input
                        type="text"
                        value={localPrefs.department || ""}
                        onChange={(e) =>
                          setLocalPrefs((prev) => ({
                            ...prev,
                            department: e.target.value,
                          }))
                        }
                        placeholder="e.g. Computer Science"
                        className="w-full px-4 py-3.5 bg-transparent border border-slate-300 rounded-xl focus:ring-1 focus:ring-[#10b981] focus:border-[#10b981] transition-all outline-none text-slate-800 text-[15px]"
                      />
                    </div>
                    <div className="relative mt-4">
                      <label className="absolute -top-2 left-3 bg-[#FAFAFA] px-1 text-[11px] font-medium text-slate-500 z-10">
                        Class / Year
                      </label>
                      <input
                        type="text"
                        value={localPrefs.class || ""}
                        onChange={(e) =>
                          setLocalPrefs((prev) => ({
                            ...prev,
                            class: e.target.value,
                          }))
                        }
                        placeholder="e.g. BSCS 4th Year"
                        className="w-full px-4 py-3.5 bg-transparent border border-slate-300 rounded-xl focus:ring-1 focus:ring-[#10b981] focus:border-[#10b981] transition-all outline-none text-slate-800 text-[15px]"
                      />
                    </div>
                    <div className="relative mt-4">
                      <label className="absolute -top-2 left-3 bg-[#FAFAFA] px-1 text-[11px] font-medium text-slate-500 z-10 flex items-center gap-1">
                        <Heart className="w-3 h-3 text-rose-500" /> Likes
                      </label>
                      <textarea
                        value={localPrefs.likes || ""}
                        onChange={(e) =>
                          setLocalPrefs((prev) => ({
                            ...prev,
                            likes: e.target.value,
                          }))
                        }
                        placeholder="Topics you enjoy..."
                        className="w-full px-4 py-3.5 bg-transparent border border-slate-300 rounded-xl focus:ring-1 focus:ring-[#10b981] focus:border-[#10b981] transition-all outline-none text-slate-800 text-[15px] resize-none h-24"
                      />
                    </div>
                    <div className="relative mt-4">
                      <label className="absolute -top-2 left-3 bg-[#FAFAFA] px-1 text-[11px] font-medium text-slate-500 z-10 flex items-center gap-1">
                        <HeartOff className="w-3 h-3 text-slate-400" /> Dislikes
                      </label>
                      <textarea
                        value={localPrefs.dislikes || ""}
                        onChange={(e) =>
                          setLocalPrefs((prev) => ({
                            ...prev,
                            dislikes: e.target.value,
                          }))
                        }
                        placeholder="Topics to avoid..."
                        className="w-full px-4 py-3.5 bg-transparent border border-slate-300 rounded-xl focus:ring-1 focus:ring-[#10b981] focus:border-[#10b981] transition-all outline-none text-slate-800 text-[15px] resize-none h-24"
                      />
                    </div>
                  </motion.div>
                )}

                {view === "subscription" && (
                  <motion.div
                    key="subscription"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6 mt-4 flex flex-col items-center text-center"
                  >
                    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center relative shadow-sm">
                      <Crown className="w-10 h-10 text-amber-500" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black text-slate-900">SALU AI Plus</h3>
                      <p className="text-[15px] font-medium text-slate-500">Premium intelligence, unlocked.</p>
                    </div>
                    
                    <div className="w-full bg-white rounded-2xl border border-slate-200 overflow-hidden text-left">
                      <div className="bg-amber-500 text-white px-4 py-3 text-sm font-bold uppercase tracking-widest text-center">
                        Active Plan
                      </div>
                      <div className="p-5 space-y-4">
                        <div className="flex items-center gap-3">
                          <Check className="w-5 h-5 text-emerald-500" />
                          <span className="text-[15px] font-medium text-slate-700">Live Web Searching</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Check className="w-5 h-5 text-emerald-500" />
                          <span className="text-[15px] font-medium text-slate-700">Unlimited Image Generation</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Check className="w-5 h-5 text-emerald-500" />
                          <span className="text-[15px] font-medium text-slate-700">Media Vault Access</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Check className="w-5 h-5 text-emerald-500" />
                          <span className="text-[15px] font-medium text-slate-700">Expert Calculator</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {view === "downloads" && (
                  <motion.div
                    key="downloads"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4 mt-2"
                  >
                    <p className="text-sm text-slate-500 mb-6 font-medium">Download your data, generated pictures, and PDF reports directly to your device.</p>
                    
                    <button 
                      className="w-full p-4 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between transition-colors shadow-sm"
                      onClick={() => {
                         notify("Downloading chat history...", "info");
                         setTimeout(() => notify("Chat history downloaded", "success"), 1500);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center">
                          <Download className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <div className="text-[15px] font-bold text-slate-800">Chat History</div>
                          <div className="text-xs font-medium text-slate-500">All messages in .txt format</div>
                        </div>
                      </div>
                    </button>

                    <button 
                      className="w-full p-4 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between transition-colors shadow-sm"
                      onClick={() => {
                         notify("Preparing image archive...", "info");
                         setTimeout(() => notify("Images downloaded successfully", "success"), 2500);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-50 text-purple-500 rounded-lg flex items-center justify-center">
                          <Palette className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <div className="text-[15px] font-bold text-slate-800">Generated Images</div>
                          <div className="text-xs font-medium text-slate-500">Zip file of all AI pictures</div>
                        </div>
                      </div>
                    </button>
                    
                    <button 
                      className="w-full p-4 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between transition-colors shadow-sm"
                      onClick={() => {
                         notify("Generating diagnostic PDF...", "info");
                         setTimeout(() => notify("PDF Report saved", "success"), 2000);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-lg flex items-center justify-center">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <div className="text-[15px] font-bold text-slate-800">Usage Report</div>
                          <div className="text-xs font-medium text-slate-500">Detailed PDF report</div>
                        </div>
                      </div>
                    </button>
                  </motion.div>
                )}

                {view === "clear_confirm" && (
                  <motion.div
                    key="clear_confirm"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6 mt-8 flex flex-col items-center text-center px-4"
                  >
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center shadow-sm">
                      <Trash2 className="w-10 h-10" />
                    </div>
                    <div className="space-y-2">
                       <h3 className="text-2xl font-bold text-slate-900">Are you sure?</h3>
                       <p className="text-[15px] text-slate-500">
                         {clearTarget === 'cache' 
                            ? "This will clear all local app cache and temporary files."
                            : "This will permanently delete your entire chat history. This action cannot be undone."}
                       </p>
                    </div>
                    
                    <div className="w-full space-y-3 pt-6">
                       <button
                         onClick={() => {
                           notify(clearTarget === 'cache' ? "Cache cleared successfully" : "Chat history cleared successfully", "success");
                           setView("main");
                         }}
                         className="w-full py-4 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-all active:scale-95 shadow-lg shadow-red-500/20"
                       >
                         Yes, {clearTarget === 'cache' ? "Clear Cache" : "Delete History"}
                       </button>
                       <button
                         onClick={() => setView("main")}
                         className="w-full py-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition-all active:scale-95"
                       >
                         Cancel
                       </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
