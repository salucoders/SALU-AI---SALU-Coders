import React from 'react';
import { Menu, User, Plus, Battery, BatteryCharging } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useUserProfile } from '../context/UserProfileContext';

import { LOGO_URL, APP_NAME } from '../constants';

interface HeaderProps {
  onNewChat: () => void;
  onOpenSidebar: () => void;
  onOpenSettings: () => void;
  isSidebarOpen: boolean;
  battery: { level: number; charging: boolean } | null;
}

export const Header = React.memo(({ onNewChat, onOpenSidebar, onOpenSettings, battery }: HeaderProps) => {
  const { preferences } = useUserProfile();
  
  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-2xl border-b border-slate-200/50 px-4 py-3 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        
        {/* Left: Sidebar Toggle & Logo */}
        <div className="flex items-center gap-3">
          <motion.button 
            whileTap={{ scale: 0.92 }}
            onClick={onOpenSidebar}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition-all shadow-sm active:shadow-inner"
          >
            <Menu className="w-5 h-5" />
          </motion.button>

          <div className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-200/50 border border-slate-100 group-hover:scale-105 transition-transform duration-500 overflow-hidden">
              <img 
                src={LOGO_URL} 
                alt={APP_NAME} 
                className="w-7 h-7 object-contain"
              />
            </div>
            <div className="flex flex-col">
              <h1 className="font-black text-slate-900 text-sm tracking-tighter leading-none">{APP_NAME}</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                <span className="text-[7px] font-black text-emerald-600 uppercase tracking-widest">Connected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: New Chat Button */}
        <div className="flex-1 flex items-center justify-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onNewChat}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 text-white shadow-xl shadow-slate-900/10 group relative overflow-hidden active:bg-black transition-all border border-white/10"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500 relative z-10 stroke-[3px]" />
            <span className="text-[10px] font-black uppercase tracking-widest relative z-10">New Chat</span>
          </motion.button>
        </div>

        {/* Right: User Profile & Battery */}
        <div className="flex items-center gap-2">
          {battery && (
            <div className="hidden xs:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
              {battery.charging ? (
                <BatteryCharging className="w-3 h-3 text-amber-500 animate-pulse" />
              ) : (
                <Battery className={cn("w-3 h-3", battery.level < 0.2 ? "text-rose-500" : "text-slate-400")} />
              )}
              <span className={cn("text-[8px] font-black tracking-widest", battery.level < 0.2 ? "text-rose-500" : "text-slate-500")}>
                {Math.round(battery.level * 100)}%
              </span>
            </div>
          )}

          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={onOpenSettings}
            className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center shadow-md relative group active:shadow-inner transition-all"
          >
            {preferences.profilePicture ? (
              <img 
                src={preferences.profilePicture || null} 
                alt="Profile" 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
            ) : (
              <User className="w-5 h-5 text-slate-400 group-hover:text-brand-500 transition-colors" />
            )}
            <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-xl" />
          </motion.button>
        </div>

      </div>
    </header>
  );
});
