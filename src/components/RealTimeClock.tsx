import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export function RealTimeClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 shadow-sm group hover:bg-white hover:border-brand-200 transition-all duration-500">
      <div className="flex items-center gap-1.5 border-r border-slate-200 pr-2">
        <Clock className="w-3 h-3 text-brand-500 group-hover:rotate-12 transition-transform" />
        <span className="text-[11px] font-mono font-black text-slate-900 tracking-tight">
          {formatTime(time)}
        </span>
      </div>
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
        {formatDate(time)}
      </span>
    </div>
  );
}
