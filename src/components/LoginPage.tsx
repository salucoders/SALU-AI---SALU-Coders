import React from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  Zap, 
  Globe, 
  GraduationCap, 
  Code, 
  PenTool, 
  Sparkles, 
  Video, 
  ArrowRight,
  Check,
  Crown,
  Heart
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

export function LoginPage() {
  const { loginWithGoogle, isAuthenticating } = useAuth();

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        // User closed the popup, silence the error
        return;
      }
      console.error("LoginPage: Login failed", error);
    }
  };

  const modes = [
    {
      title: "Student Mode",
      desc: "Instant solutions for assignments, notes, and academic queries.",
      icon: <GraduationCap className="w-6 h-6 text-emerald-500" />,
      color: "bg-emerald-50 text-emerald-600 border-emerald-100",
      accent: "shadow-emerald-500/20"
    },
    {
      title: "Developer Mode",
      desc: "Clean code generation, debugging, and tech documentation.",
      icon: <Code className="w-6 h-6 text-blue-500" />,
      color: "bg-blue-50 text-blue-600 border-blue-100",
      accent: "shadow-blue-500/20"
    },
    {
      title: "Creator Mode",
      desc: "Viral YouTube scripts, SEO titles, and social media hooks.",
      icon: <PenTool className="w-6 h-6 text-purple-500" />,
      color: "bg-purple-50 text-purple-600 border-purple-100",
      accent: "shadow-purple-500/20"
    },
    {
      title: "Live Voice AI",
      desc: "Real-time voice interactions for seamless productivity.",
      icon: <Video className="w-6 h-6 text-rose-500" />,
      color: "bg-rose-50 text-rose-600 border-rose-100",
      accent: "shadow-rose-500/20"
    }
  ];

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-brand-100 selection:text-brand-900 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[100] px-6 py-4 md:px-12 flex items-center justify-between bg-white/70 backdrop-blur-xl border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center shadow-lg">
            <img 
              src="https://upload.wikimedia.org/wikipedia/en/thumb/a/aa/Shah_Abdul_Latif_University_logo.png/250px-Shah_Abdul_Latif_University_logo.png" 
              alt="SALU Logo" 
              className="w-7 h-7 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="text-xl font-black text-slate-900 tracking-tighter">SALU AI</span>
        </div>
        <button 
          onClick={handleLogin}
          disabled={isAuthenticating}
          className="px-6 py-2.5 bg-slate-900 text-white rounded-full font-bold text-sm hover:bg-black transition-all active:scale-95 shadow-xl shadow-slate-950/20 disabled:opacity-50"
        >
          {isAuthenticating ? "Accessing..." : "Get Started"}
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 md:px-12 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 15, repeat: Infinity }}
            className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] bg-brand-400 rounded-full blur-[140px]" 
          />
          <motion.div 
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 12, repeat: Infinity }}
            className="absolute -bottom-[10%] -left-[5%] w-[50%] h-[50%] bg-indigo-400 rounded-full blur-[120px]" 
          />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-50 border border-brand-100 rounded-full text-[10px] font-black text-brand-600 uppercase tracking-widest"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Intelligence Reimagined for SALU
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.8 }}
              className="text-6xl md:text-8xl lg:text-[10rem] font-black text-slate-900 leading-[0.85] tracking-tighter"
            >
              INFINITE <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600">POSSIBILITIES.</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-lg md:text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed"
            >
              The most advanced AI workspace ever built for Shah Abdul Latif University. Elevate your learning, coding, and creative potential with custom-tuned LLMs.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8"
            >
              <button 
                onClick={handleLogin}
                className="w-full sm:w-auto px-10 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-lg hover:bg-black transition-all hover:shadow-2xl hover:shadow-brand-500/20 flex items-center justify-center gap-3 group active:scale-95"
              >
                Launch SALU AI <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <div className="flex items-center gap-3 px-6 py-4 bg-slate-50 rounded-[2rem] border border-slate-100 text-slate-600 text-sm font-bold">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                Verified Student Network
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Modes Grid */}
      <section className="py-24 px-6 md:px-12 bg-slate-50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Specialized Intelligence.</h2>
            <p className="text-slate-500 font-medium text-lg">Four distinct modes tailored to your specific workflow.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {modes.map((mode, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "group p-8 bg-white border border-slate-200 rounded-[2.5rem] space-y-6 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2",
                  mode.accent
                )}
              >
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border transition-transform group-hover:scale-110 duration-500", mode.color)}>
                  {mode.icon}
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-black text-slate-900">{mode.title}</h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">{mode.desc}</p>
                </div>
                <div className="pt-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-900 transition-colors">
                  Explore Features <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-32 px-6 md:px-12 bg-slate-50 relative">
        <div className="absolute inset-0 opacity-[0.4] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #e2e8f0 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center space-y-4 mb-20">
            <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight">One Price. Infinite Power.</h2>
            <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto">Choose the plan that fits your academic journey. SALU Plus unlocks the full architectural potential of our AI.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <motion.div 
               initial={{ opacity: 0, x: -30 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true }}
               className="p-10 bg-white rounded-[3rem] border border-slate-200 shadow-xl space-y-8 flex flex-col"
            >
              <div className="space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Access</span>
                <h3 className="text-3xl font-black text-slate-900">Standard</h3>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black text-slate-900">Free</span>
                <span className="text-slate-400 font-bold uppercase text-xs tracking-widest">forever</span>
              </div>
              <ul className="space-y-4 flex-1">
                {['Student Mode Access', 'Developer Mode Access', 'Creator Mode Access', '30 Daily AI Credits', 'Community Support'].map((feat, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-600 font-medium">
                    <div className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-slate-500" />
                    </div>
                    {feat}
                  </li>
                ))}
              </ul>
              <button 
                onClick={handleLogin}
                className="w-full py-4 bg-slate-100 text-slate-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
              >
                Get Started Free
              </button>
            </motion.div>

            {/* Paid Plan */}
            <motion.div 
               initial={{ opacity: 0, x: 30 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true }}
               className="p-10 bg-slate-950 rounded-[3rem] border border-brand-500 shadow-2xl shadow-brand-500/20 space-y-8 flex flex-col relative overflow-hidden"
            >
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-500/20 blur-3xl rounded-full" />
              
              <div className="space-y-2 relative z-10">
                <div className="flex items-center gap-2">
                   <Crown className="w-4 h-4 text-brand-400" />
                   <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest">Unlimited Mastery</span>
                </div>
                <h3 className="text-3xl font-black text-white">SALU Plus</h3>
              </div>
              <div className="flex items-baseline gap-1 relative z-10">
                <span className="text-sm text-brand-400 font-black tracking-widest pr-1">Rs.</span>
                <span className="text-5xl font-black text-white">200</span>
                <span className="text-slate-500 font-bold uppercase text-xs tracking-widest">/ month</span>
              </div>
              <ul className="space-y-4 flex-1 relative z-10">
                {[
                  'Study Toolbox (Pomodoro, Notes, etc)', 
                  'Live Voice AI Interactivity', 
                  'Personal AI Assistant Mode', 
                  '100 Daily AI Credits', 
                  'Full Media Vault Access',
                  'Priority Model Access (1.5 Pro)'
                ].map((feat, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-300 font-medium">
                    <div className="w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    {feat}
                  </li>
                ))}
              </ul>
              <button 
                onClick={handleLogin}
                className="w-full py-5 bg-brand-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-600 transition-all active:scale-95 shadow-xl shadow-brand-500/20 relative z-10"
              >
                Upgrade to Plus
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Creator Spotlight */}
      <section className="py-32 px-6 md:px-12 bg-white relative">
        <div className="max-w-5xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="p-8 md:p-16 bg-slate-950 rounded-[3rem] text-white flex flex-col md:flex-row items-center gap-12 relative overflow-hidden shadow-2xl shadow-slate-950/40"
          >
            {/* Background Texture */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            
            <div className="relative z-10 w-48 h-48 md:w-64 md:h-64 shrink-0">
              <div className="absolute inset-0 bg-brand-500 blur-3xl opacity-20 animate-pulse rounded-full" />
              <img 
                src="/assets/creator/Babar.jpg" 
                alt="Babar Ali Arain" 
                className="w-full h-full object-cover rounded-[2rem] border-2 border-white/10 relative z-10 grayscale hover:grayscale-0 transition-all duration-700"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://picsum.photos/seed/developer/400/400";
                }}
              />
            </div>

            <div className="relative z-10 space-y-6 text-center md:text-left">
              <div className="space-y-2">
                <span className="text-[10px] font-black text-brand-400 uppercase tracking-[0.3em]">Founding Architect</span>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight underline decoration-brand-500/30 underline-offset-8">Babar Ali Arain</h2>
                <p className="text-slate-400 font-medium text-lg italic">IT Batch 2026 • Shah Abdul Latif University</p>
              </div>
              <p className="text-slate-300 text-lg leading-relaxed font-medium">
                "I built SALU AI to bridge the gap between academic theory and practical intelligence. This isn't just a tool; it's a personalized mentor for every student of our university."
              </p>
              <div className="flex items-center justify-center md:justify-start gap-6 pt-4">
                <a href="#" className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/5"><Code className="w-5 h-5 text-slate-400" /></a>
                <a href="#" className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/5"><Globe className="w-5 h-5 text-slate-400" /></a>
                <a href="#" className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/5"><Globe className="w-5 h-5 text-slate-400" /></a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 md:px-12 border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="space-y-4 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <img src="https://upload.wikimedia.org/wikipedia/en/thumb/a/aa/Shah_Abdul_Latif_University_logo.png/250px-Shah_Abdul_Latif_University_logo.png" alt="SALU" className="h-6 object-contain" referrerPolicy="no-referrer" />
              <span className="text-sm font-black tracking-tighter text-slate-400">SALU CODERS</span>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
              © 2026 OFFICIAL SALU AI NETWORK
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8 md:gap-16">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Platform</h4>
              <ul className="space-y-2 text-sm font-medium text-slate-500">
                <li className="hover:text-brand-500 cursor-pointer transition-colors">Privacy Policy</li>
                <li className="hover:text-brand-500 cursor-pointer transition-colors">Terms of Service</li>
                <li className="hover:text-brand-500 cursor-pointer transition-colors">Security Code</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Connect</h4>
              <ul className="space-y-2 text-sm font-medium text-slate-500">
                <li className="hover:text-brand-500 cursor-pointer transition-colors">Community Forum</li>
                <li className="hover:text-brand-500 cursor-pointer transition-colors">Help Center</li>
                <li className="hover:text-brand-500 cursor-pointer transition-colors">Support</li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

