import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Info, AlertCircle, X, Wifi, WifiOff, Sparkles, Battery, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

export type NotificationType = 'success' | 'info' | 'error' | 'connect' | 'change' | 'power';

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
}

interface NotificationContextType {
  notify: (message: string, type: NotificationType, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = useCallback((message: string, type: NotificationType, duration = 3000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, message, type, duration }]);

    if (duration !== Infinity) {
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, duration);
    }
  }, []);

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <div className="fixed top-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9, transition: { duration: 0.2 } }}
              className={cn(
                "pointer-events-auto min-w-[260px] max-w-[320px] p-3 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border flex items-center gap-3 backdrop-blur-md transition-all duration-300",
                n.type === 'success' && "bg-white/95 text-slate-900 border-emerald-100",
                n.type === 'info' && "bg-white/95 text-slate-900 border-blue-100",
                n.type === 'error' && "bg-white/95 text-slate-900 border-rose-100",
                n.type === 'connect' && "bg-white/95 text-slate-900 border-slate-100",
                n.type === 'change' && "bg-white/95 text-slate-900 border-brand-100",
                n.type === 'power' && "bg-white/95 text-slate-900 border-amber-100"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                n.type === 'success' && "bg-emerald-50 text-emerald-600",
                n.type === 'info' && "bg-blue-50 text-blue-600",
                n.type === 'error' && "bg-rose-50 text-rose-600",
                n.type === 'connect' && "bg-slate-50 text-slate-600",
                n.type === 'change' && "bg-brand-50 text-brand-600",
                n.type === 'power' && "bg-amber-50 text-amber-600"
              )}>
                {n.type === 'success' && <Check className="w-4 h-4" />}
                {n.type === 'info' && <Info className="w-4 h-4" />}
                {n.type === 'error' && <AlertCircle className="w-4 h-4" />}
                {n.type === 'connect' && <Wifi className="w-4 h-4" />}
                {n.type === 'change' && <Sparkles className="w-4 h-4" />}
                {n.type === 'power' && <Zap className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-slate-800 leading-tight truncate">{n.message}</p>
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 mt-0.5">
                  {n.type === 'connect' ? 'Network' : n.type === 'change' ? 'System' : n.type === 'power' ? 'Power' : 'Alert'}
                </p>
              </div>
              <button 
                onClick={() => removeNotification(n.id)}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors group"
              >
                <X className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
