import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, ShieldCheck, Zap, Globe, ArrowRight, GraduationCap, Code, PenTool } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

export function LoginPage() {
  const { loginWithGoogle, isAuthenticating } = useAuth();

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error("LoginPage: Login failed", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row overflow-hidden font-sans">
      {/* Left Pane: Cinematic Branding */}
      <div className="relative w-full lg:w-[55%] bg-slate-950 flex flex-col justify-between p-8 md:p-12 lg:p-20 overflow-hidden">
        {/* Atmospheric Background */}
        <div className="absolute inset-0 z-0">
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.5, 0.3],
              rotate: [0, 5, 0]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-[20%] -left-[10%] w-[80%] h-[80%] bg-brand-600/20 rounded-full blur-[120px]" 
          />
          <motion.div 
            animate={{ 
              scale: [1.1, 1, 1.1],
              opacity: [0.2, 0.4, 0.2],
              rotate: [0, -5, 0]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] bg-indigo-600/20 rounded-full blur-[100px]" 
          />
          <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        </div>

        {/* Logo & Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 flex items-center gap-4"
        >
          <div className="w-14 h-14 bg-white rounded-[1.25rem] flex items-center justify-center shadow-2xl shadow-white/10 group hover:scale-105 transition-transform duration-500">
            <img 
              src="https://admission.salu.edu.pk/static/media/logo.793ee5b813bb22366372.png" 
              alt="SALU Logo" 
              className="w-10 h-10 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black text-white tracking-tighter leading-none">SALU AI</span>
            <span className="text-[10px] font-black text-brand-400 uppercase tracking-[0.3em] mt-1">Academic Intelligence</span>
          </div>
        </motion.div>

        {/* Hero Content */}
        <div className="relative z-10 mt-16 lg:mt-0">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="space-y-6"
          >
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-[0.85] tracking-tighter">
              ELEVATE YOUR <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-indigo-400 to-purple-400">SCHOLARLY</span> <br />
              JOURNEY.
            </h1>
            <p className="text-slate-400 text-lg md:text-xl lg:text-2xl font-medium max-w-xl leading-relaxed tracking-tight">
              The professional AI workspace built exclusively for the Shah Abdul Latif University community.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap gap-4 mt-10"
          >
            {[
              { icon: <GraduationCap className="w-4 h-4" />, label: "Students" },
              { icon: <Code className="w-4 h-4" />, label: "Developers" },
              { icon: <PenTool className="w-4 h-4" />, label: "Creators" }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full text-xs font-bold text-white/80">
                {item.icon}
                {item.label}
              </div>
            ))}
          </motion.div>
        </div>

        {/* Stats Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="relative z-10 flex flex-wrap gap-12 mt-16 lg:mt-0 pt-8 border-t border-white/10"
        >
          {[
            { value: "10k+", label: "Active Scholars" },
            { value: "24/7", label: "AI Assistance" },
            { value: "99.9%", label: "System Uptime" }
          ].map((stat, i) => (
            <div key={i} className="flex flex-col gap-1">
              <span className="text-white font-black text-3xl tracking-tighter">{stat.value}</span>
              <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{stat.label}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Right Pane: Modern Login Form */}
      <div className="w-full lg:w-[45%] bg-white flex flex-col justify-center p-8 md:p-16 lg:p-24 relative overflow-y-auto">
        <div className="max-w-md w-full mx-auto space-y-12">
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-50 border border-brand-100 rounded-full text-[10px] font-black text-brand-600 uppercase tracking-widest shadow-sm"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Enterprise Security Enabled
            </motion.div>
            <div className="space-y-2">
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Welcome to the <br /> Next Level.
              </h2>
              <p className="text-slate-500 font-medium text-lg">
                Sign in to access your personalized AI workspace and academic tools.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <button
              onClick={handleLogin}
              disabled={isAuthenticating}
              className={cn(
                "w-full group relative flex items-center justify-center gap-4 px-8 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-sm transition-all active:scale-[0.98] shadow-2xl shadow-slate-900/20 overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed",
                "hover:bg-black hover:shadow-brand-500/10"
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-brand-500/0 via-brand-500/10 to-brand-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
              {isAuthenticating ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.2em]">
                <span className="bg-white px-6 text-slate-400">Official SALU AI Portal</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-3 group hover:bg-white hover:border-brand-200 hover:shadow-xl hover:shadow-brand-500/5 transition-all duration-500">
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Zap className="w-5 h-5 text-brand-500" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-sm">Instant Access</h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-1">Single sign-on with your university-linked Google account.</p>
                </div>
              </div>
              <div className="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-3 group hover:bg-white hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-500">
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Globe className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-sm">Cloud Sync</h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-1">Your conversations and preferences synced across all devices.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-12 text-center space-y-4">
            <div className="flex items-center justify-center gap-6 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700">
              <img src="https://admission.salu.edu.pk/static/media/logo.793ee5b813bb22366372.png" alt="SALU" className="h-8 object-contain" referrerPolicy="no-referrer" />
              <div className="w-px h-6 bg-slate-300" />
              <span className="text-sm font-black tracking-tighter text-slate-900">SALU CODERS</span>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              Developed by <span className="text-slate-900">Babar Ali Arain</span> • IT Batch 2026
            </p>
          </div>
        </div>

        {/* Decorative Vertical Rail Text */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden xl:block">
          <p className="writing-mode-vertical-rl rotate-180 text-[10px] font-black text-slate-100 uppercase tracking-[0.6em] whitespace-nowrap select-none">
            INNOVATION • EXCELLENCE • COMMUNITY • FUTURE
          </p>
        </div>
      </div>
    </div>
  );
}
