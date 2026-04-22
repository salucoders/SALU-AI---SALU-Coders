import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  Zap, 
  Globe, 
  GraduationCap, 
  Code, 
  PenTool, 
  Video, 
  ArrowRight,
  Check,
  Crown,
  Heart,
  MessageCircle,
  Share2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { LOGO_URL, APP_NAME, CREATOR_IMAGE_URL } from '../constants';
import { Modal } from './Modal';
import { AICamera } from './AICamera';

export function LoginPage() {
  const { loginWithGoogle, isAuthenticating } = useAuth();
  const [activeModal, setActiveModal] = useState<null | 'privacy' | 'terms'>(null);


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
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-brand-500/30 selection:text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[100] px-6 py-6 flex items-center justify-between bg-[#0A0A0A]/50 backdrop-blur-2xl border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center">
            <img 
              src={LOGO_URL} 
              alt={APP_NAME} 
              className="w-6 h-6 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="text-xl font-bold tracking-tighter text-white">{APP_NAME}</span>
        </div>
        <button 
          onClick={handleLogin}
          disabled={isAuthenticating}
          className="px-6 py-2 bg-white text-black rounded-full font-bold text-sm hover:bg-slate-200 transition-all active:scale-95 disabled:opacity-50"
        >
          {isAuthenticating ? "Accessing..." : "Launch App"}
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-32 px-6 flex flex-col items-center justify-center text-center">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: 'url("https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=2000")',
            backgroundBlendMode: 'overlay'
          }}
        />
        <div className="absolute inset-0 z-0 bg-black/70" />
        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 text-5xl md:text-7xl lg:text-9xl font-black text-white tracking-tighter leading-[0.9] mb-8"
        >
          THE FUTURE OF <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-indigo-500">ACADEMIC AI.</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="relative z-10 text-lg text-slate-300 max-w-xl mx-auto mb-6 font-medium"
        >
          An infinite, intelligent workspace designed specifically for the students and developers of Shah Abdul Latif University. Experience personalized mentorship, real-time code generation, and advanced research tools.
        </motion.p>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="relative z-10 text-xl font-bold text-white max-w-xl mx-auto mb-12"
        >
          Transform your potential today.
        </motion.p>

        <motion.button 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onClick={handleLogin}
          className="relative z-10 px-12 py-5 bg-brand-500 text-white rounded-full font-black text-lg hover:shadow-[0_0_40px_-5px_rgba(59,130,246,0.5)] transition-all flex items-center gap-3 active:scale-95"
        >
          Launch Workspace <ArrowRight className="w-5 h-5" />
        </motion.button>
      </section>

      {/* Bento Grid Features - Enhanced */}
      <section className="py-24 px-6 bg-white text-slate-900">
        <div className="max-w-7xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">Everything You Need.</h2>
          <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto">From complex coding to creative writing, SALU AI empowers you with cutting-edge LLM capabilities, optimized for your success.</p>
        </div>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {modes.map((mode, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "p-8 rounded-[2rem] border border-slate-100 bg-slate-50 relative overflow-hidden transition-all hover:border-brand-200 hover:shadow-xl",
                  i === 0 ? "md:col-span-2" : "",
                  i === 3 ? "md:col-span-2 lg:col-span-1" : ""
                )}
              >
                <div className="relative z-10">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-6", mode.color)}>
                    {mode.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{mode.title}</h3>
                  <p className="text-slate-500 leading-relaxed font-medium">{mode.desc}</p>
                </div>
                <div className="absolute top-4 right-4 text-brand-500/10">
                  <ArrowRight className="w-20 h-20 rotate-[-45deg]" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing and Footer follow similar logic to original... */}
      <section className="py-32 px-6 md:px-12 bg-white relative">
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
                src={CREATOR_IMAGE_URL} 
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
              <div className="flex items-center justify-center md:justify-start gap-4 pt-4">
                  <a href="https://wa.me/923242571748" target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-white/5 hover:bg-green-500/20 text-white rounded-xl transition-all border border-white/10 flex items-center gap-2 font-bold group">
                    <MessageCircle className="w-5 h-5" /> WhatsApp
                  </a>
                  <a href="https://www.facebook.com/share/1BAhDS2JWE/" target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-white/5 hover:bg-blue-500/20 text-white rounded-xl transition-all border border-white/10 flex items-center gap-2 font-bold group">
                    <Share2 className="w-5 h-5" /> Facebook
                  </a>
                  <a href="https://babar-ali-arain.netlify.app/" target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-white/5 hover:bg-indigo-500/20 text-white rounded-xl transition-all border border-white/10 flex items-center gap-2 font-bold group">
                    <Globe className="w-5 h-5" /> Portfolio
                  </a>
                </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Live AI Camera Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="text-center space-y-2">
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter">Experience Live AI</h2>
              <p className="text-slate-400 text-lg">Use your camera for real-time interaction with SALU Coders AI.</p>
            </div>
            <AICamera />
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 md:px-12 border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="space-y-4 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <img src={LOGO_URL} alt="SALU" className="h-6 object-contain" referrerPolicy="no-referrer" />
              <span className="text-sm font-black tracking-tighter text-slate-400 uppercase">SALU CODERS</span>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
              © 2026 OFFICIAL {APP_NAME} NETWORK
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8 md:gap-16">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Platform</h4>
              <ul className="space-y-2 text-sm font-medium text-slate-500">
                <li className="hover:text-brand-500 cursor-pointer transition-colors" onClick={() => setActiveModal('privacy')}>Privacy Policy</li>
                <li className="hover:text-brand-500 cursor-pointer transition-colors" onClick={() => setActiveModal('terms')}>Terms of Service</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Connect</h4>
              <ul className="space-y-2 text-sm font-medium text-slate-500">
                <li className="hover:text-brand-500 cursor-pointer transition-colors">
                  <a href="https://wa.me/923242571748" target="_blank" rel="noopener noreferrer">WhatsApp</a>
                </li>
                <li className="hover:text-brand-500 cursor-pointer transition-colors">
                  <a href="https://www.facebook.com/share/1BAhDS2JWE/" target="_blank" rel="noopener noreferrer">Facebook</a>
                </li>
                <li className="hover:text-brand-500 cursor-pointer transition-colors">
                  <a href="https://babar-ali-arain.netlify.app/" target="_blank" rel="noopener noreferrer">Portfolio</a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
      <Modal
        isOpen={activeModal !== null}
        onClose={() => setActiveModal(null)}
        title={activeModal === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
      >
        {activeModal === 'privacy' ? (
          <div className="space-y-4">
            <p>Your privacy is paramount. At SALU Coders AI, we ensure that your academic and development data is processed securely and with complete transparency.</p>
            <p>We do not share your personal information with third parties without your explicit consent.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p>By using SALU Coders AI, you agree to use the platform for academic and professional development purposes only.</p>
            <p>Any misuse of the AI-powered tools, including prohibited content generation or security bypassing, will result in immediate termination of your access.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

