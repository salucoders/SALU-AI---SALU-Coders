import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, Settings, Activity, Shield, Key, Database, Server, X, Check, AlertCircle, Loader2, MessageSquare, Radio, Trash2, Download, Eraser, Palette, Cpu, Eye, EyeOff, Crown, Upload, ShieldCheck, Plus, Layout, Banknote, Workflow, Save } from 'lucide-react';
import { collection, getDocs, doc, updateDoc, deleteDoc, getDoc, setDoc, query, where, collectionGroup } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useUserProfile } from '../context/UserProfileContext';
import { uploadToImageKit } from '../lib/imagekit';
import { cn } from '../lib/utils';

interface AdminPanelProps {
  onClose: () => void;
}

export function AdminPanel({ onClose }: AdminPanelProps) {
  const { user } = useAuth();
  const { preferences } = useUserProfile();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'members' | 'broadcast' | 'settings' | 'data'>('dashboard');
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({ users: 0, sessions: 0, messages: 0 });
  const [loading, setLoading] = useState(true);
  const [systemConfig, setSystemConfig] = useState({
    maintenanceMode: false,
    publicRegistration: true,
    liveAiMode: true,
    geminiApiKey: '',
    geminiImageGenApiKey: '',
    togetherApiKey: '',
    imageKitPublicKey: '',
    imageKitPrivateKey: '',
    imageKitUrlEndpoint: '',
    defaultModel: 'gemini-3-flash-preview',
    appName: 'SALU AI Plus',
    welcomeMessage: 'What can I help with?',
    jazzCashNumber: '03000000000',
    paymentQrUrl: ''
  });
  const [broadcast, setBroadcast] = useState({
    message: '',
    active: false
  });
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isUploadingQr, setIsUploadingQr] = useState(false);

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showMessage('error', 'Please upload a valid image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      showMessage('error', 'Image size should be less than 2MB');
      return;
    }

    try {
      setIsUploadingQr(true);
      const uploadedImage = await uploadToImageKit(file, `qr-${Date.now()}`);
      setSystemConfig(prev => ({ ...prev, paymentQrUrl: uploadedImage.url }));
      showMessage('success', 'QR Code uploaded temporarily. Save configuration to strictly apply.');
    } catch (error) {
      console.error("Upload failed", error);
      showMessage('error', 'Failed to upload QR Code');
    } finally {
      setIsUploadingQr(false);
    }
  };

  useEffect(() => {
    const isSuperAdmin = user?.email === 'salucoders@gmail.com' && user?.emailVerified;
    if (preferences.role !== 'admin' && !isSuperAdmin) {
      onClose();
      return;
    }
    fetchData();
  }, [preferences.role, user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(usersData);

      // Fetch Sessions for stats
      const sessionsSnapshot = await getDocs(collection(db, 'sessions'));
      
      // Fetch Messages for stats
      const messagesSnapshot = await getDocs(collectionGroup(db, 'messages'));
      
      setStats({ 
        users: usersSnapshot.size, 
        sessions: sessionsSnapshot.size,
        messages: messagesSnapshot.size
      });

      // Fetch Firestore Config
      const fsConfigDoc = await getDoc(doc(db, 'system', 'config'));
      if (fsConfigDoc.exists()) {
        const d = fsConfigDoc.data();
        setSystemConfig(prev => ({
          ...prev,
          maintenanceMode: d.maintenanceMode ?? prev.maintenanceMode,
          publicRegistration: d.publicRegistration ?? prev.publicRegistration,
          liveAiMode: d.liveAiMode ?? prev.liveAiMode,
          appName: d.appName ?? prev.appName,
          welcomeMessage: d.welcomeMessage ?? prev.welcomeMessage,
          geminiApiKey: d.geminiApiKey ?? prev.geminiApiKey,
          geminiImageGenApiKey: d.geminiImageGenApiKey ?? prev.geminiImageGenApiKey,
          togetherApiKey: d.togetherApiKey ?? prev.togetherApiKey,
          imageKitPublicKey: d.imageKitPublicKey ?? prev.imageKitPublicKey,
          imageKitPrivateKey: d.imageKitPrivateKey ?? prev.imageKitPrivateKey,
          imageKitUrlEndpoint: d.imageKitUrlEndpoint ?? prev.imageKitUrlEndpoint,
          defaultModel: d.defaultModel ?? prev.defaultModel,
          jazzCashNumber: d.jazzCashNumber ?? prev.jazzCashNumber,
          paymentQrUrl: d.paymentQrUrl ?? prev.paymentQrUrl
        }));
      }

      // Fetch Broadcast
      const broadcastDoc = await getDoc(doc(db, 'system', 'broadcast'));
      if (broadcastDoc.exists()) {
        setBroadcast(broadcastDoc.data() as any);
      }
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      showMessage('success', 'User role updated successfully');
    } catch (error) {
      showMessage('error', 'Failed to update user role');
    }
  };

  const handleSubscriptionChange = async (userId: string, tier: 'free' | 'paid') => {
    try {
      const creditsTotal = tier === 'paid' ? 100 : 30;
      await updateDoc(doc(db, 'users', userId), { 
        subscription: tier,
        creditsTotal: creditsTotal,
        creditsUsedToday: 0
      });
      setUsers(users.map(u => u.id === userId ? { ...u, subscription: tier, creditsTotal } : u));
      showMessage('success', `User upgraded to ${tier === 'paid' ? 'SALU Plus' : 'Free'}`);
    } catch (error) {
      showMessage('error', 'Failed to update subscription');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
      setUsers(users.filter(u => u.id !== userId));
      setStats(prev => ({ ...prev, users: prev.users - 1 }));
      showMessage('success', 'User deleted successfully');
    } catch (error) {
      showMessage('error', 'Failed to delete user');
    }
  };

  const handleSaveConfig = async () => {
    if (systemConfig.geminiApiKey?.includes('AIzaSyA9TH') || systemConfig.geminiApiKey?.includes('AIzaSyCU6n')) {
      showMessage('error', 'This specific API key is known to be rate-limited or blocked. Please generate a NEW key at aistudio.google.com and paste it here.');
      return;
    }

    setSaving(true);
    try {
      // Save to backend (fallback)
      try {
        await fetch('/api/admin/config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await user?.getIdToken()}`
          },
          body: JSON.stringify({ 
            geminiApiKey: systemConfig.geminiApiKey,
            geminiImageGenApiKey: systemConfig.geminiImageGenApiKey,
            togetherApiKey: systemConfig.togetherApiKey,
            imageKitPublicKey: systemConfig.imageKitPublicKey,
            imageKitPrivateKey: systemConfig.imageKitPrivateKey,
            imageKitUrlEndpoint: systemConfig.imageKitUrlEndpoint,
            defaultModel: systemConfig.defaultModel,
            appName: systemConfig.appName,
            welcomeMessage: systemConfig.welcomeMessage
          })
        });
      } catch (err) { }
      
      // Save to Firestore for real-time client updates (Primary on Static Sites)
      await setDoc(doc(db, 'system', 'config'), {
        maintenanceMode: systemConfig.maintenanceMode,
        publicRegistration: systemConfig.publicRegistration,
        liveAiMode: systemConfig.liveAiMode,
        appName: systemConfig.appName,
        welcomeMessage: systemConfig.welcomeMessage,
        geminiApiKey: systemConfig.geminiApiKey,
        geminiImageGenApiKey: systemConfig.geminiImageGenApiKey,
        togetherApiKey: systemConfig.togetherApiKey,
        imageKitPublicKey: systemConfig.imageKitPublicKey,
        imageKitPrivateKey: systemConfig.imageKitPrivateKey,
        imageKitUrlEndpoint: systemConfig.imageKitUrlEndpoint,
        defaultModel: systemConfig.defaultModel,
        jazzCashNumber: systemConfig.jazzCashNumber,
        paymentQrUrl: systemConfig.paymentQrUrl
      }, { merge: true });

      showMessage('success', 'System configuration saved successfully');
    } catch (error) {
      showMessage('error', 'Failed to save system configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBroadcast = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'system', 'broadcast'), broadcast);
      showMessage('success', 'Broadcast updated successfully');
    } catch (error) {
      showMessage('error', 'Failed to update broadcast');
    } finally {
      setSaving(false);
    }
  };

  const handleExportUsers = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "ID,Name,Email,Role\n"
      + users.map(u => `${u.id},${u.name},${u.email},${u.role}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "system_users_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showMessage('success', 'Users exported successfully');
  };

  const handleClearEmptySessions = async () => {
    if (!window.confirm("Are you sure you want to delete all empty sessions? This may take a moment.")) return;
    setSaving(true);
    try {
      const sessionsSnapshot = await getDocs(collection(db, 'sessions'));
      let deletedCount = 0;
      
      for (const sessionDoc of sessionsSnapshot.docs) {
        const messagesSnapshot = await getDocs(collection(db, 'sessions', sessionDoc.id, 'messages'));
        
        if (messagesSnapshot.empty) {
          await deleteDoc(doc(db, 'sessions', sessionDoc.id));
          deletedCount++;
        }
      }
      
      setStats(prev => ({ ...prev, sessions: prev.sessions - deletedCount }));
      showMessage('success', `Deleted ${deletedCount} empty sessions`);
    } catch (error) {
      showMessage('error', 'Failed to clear empty sessions');
    } finally {
      setSaving(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const isSuperAdmin = user?.email === 'salucoders@gmail.com' && user?.emailVerified;
  if (preferences.role !== 'admin' && !isSuperAdmin) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xl p-4 md:p-8"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-7xl h-full bg-white rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] flex flex-col md:flex-row overflow-hidden border border-white"
      >
        
        {/* Sidebar */}
        <aside className="w-full md:w-64 bg-white border-r border-slate-100 flex flex-col shrink-0">
          <div className="p-8 flex items-center justify-between md:justify-start gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center shadow-lg transform rotate-3">
                <img src="https://upload.wikimedia.org/wikipedia/en/thumb/a/aa/Shah_Abdul_Latif_University_logo.png/250px-Shah_Abdul_Latif_University_logo.png" alt="SALU Logo" className="w-7 h-7 object-contain" />
              </div>
              <div>
                <h2 className="font-black text-lg tracking-tighter text-slate-900 leading-none">ADMIN</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Management</p>
              </div>
            </div>
            <button onClick={onClose} className="md:hidden p-2 text-slate-400 hover:text-slate-950">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="px-6 mb-8">
            <button
              onClick={() => setActiveTab('broadcast')}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-900/10 flex items-center justify-center gap-3 hover:bg-black transition-all active:scale-95"
            >
              <Radio className="w-4 h-4 text-rose-500" />
              <span>Broadcast</span>
            </button>
          </div>
          
          <nav className="flex-1 py-4 px-4 space-y-1.5 overflow-y-auto no-scrollbar">
            <div className="px-4 mb-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Insights</p>
            </div>
            <AdminNavBtn
              active={activeTab === 'dashboard'}
              onClick={() => setActiveTab('dashboard')}
              icon={<Activity className="w-5 h-5" />}
              label="Dashboard"
            />
            <AdminNavBtn
              active={activeTab === 'users'}
              onClick={() => setActiveTab('users')}
              icon={<Users className="w-5 h-5" />}
              label="User List"
            />
            <AdminNavBtn
              active={activeTab === 'members'}
              onClick={() => setActiveTab('members')}
              icon={<Crown className="w-5 h-5" />}
              label="Plus Status"
            />

            <div className="px-4 pt-8 mb-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Resources</p>
            </div>
            <AdminNavBtn
              active={activeTab === 'data'}
              onClick={() => setActiveTab('data')}
              icon={<Database className="w-5 h-5" />}
              label="Database"
            />
            <AdminNavBtn
              active={activeTab === 'settings'}
              onClick={() => setActiveTab('settings')}
              icon={<Settings className="w-5 h-5" />}
              label="Settings"
            />
          </nav>
          
          <div className="p-6 border-t border-slate-50 hidden md:block">
            <div className="bg-slate-50 p-4 rounded-[1.5rem] border border-slate-100 flex flex-col gap-3">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight truncate tracking-tight">Security Lock</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none">Active Admin</p>
                  </div>
               </div>
               <button onClick={onClose} className="flex items-center justify-center gap-2 py-2.5 w-full bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-900 transition-all font-black text-[10px] uppercase tracking-widest shadow-sm">
                 Exit Panel
               </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 relative">
          
          {/* Header */}
          <header className="h-24 md:h-28 px-8 md:px-12 flex items-center justify-between shrink-0 bg-white/50 backdrop-blur-md sticky top-0 z-10 border-b border-slate-100/50">
            <div className="flex-1 max-w-xl">
               <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic font-mono mb-1">
                 {activeTab.replace('-', ' ')}
               </h1>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{activeTab === 'dashboard' ? 'Real-time performance metrics' : 'Administrative control center'}</p>
            </div>
            
            <div className="flex items-center gap-6 ml-8">
               <div className="flex items-center gap-4">
                  <div className="hidden md:block text-right">
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tighter leading-none mb-1">Root Account</p>
                    <p className="text-[10px] text-brand-500 font-bold uppercase tracking-[0.3em] leading-none italic">Verified Root</p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-white p-1 border border-slate-200 shadow-sm relative shrink-0">
                    <img 
                      src={user?.photoURL || `https://ui-avatars.com/api/?name=Admin&background=0f172a&color=fff`} 
                      alt="Admin" 
                      className="w-full h-full object-cover rounded-xl" 
                    />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                  </div>
               </div>
            </div>
          </header>

          {/* Messages */}
          {message.text && (
            <div className="absolute top-32 left-1/2 -translate-x-1/2 z-50">
              <motion.div 
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={cn(
                  "px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-4 font-black text-xs uppercase tracking-widest backdrop-blur-xl border border-white/20",
                  message.type === 'success' ? "bg-black text-white" : "bg-rose-500 text-white"
                )}
              >
                <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0", message.type === 'success' ? "bg-emerald-500/20" : "bg-white/20")}>
                  {message.type === 'success' ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4" />}
                </div>
                {message.text}
              </motion.div>
            </div>
          )}

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="w-16 h-16 rounded-3xl bg-white shadow-xl flex items-center justify-center border border-slate-100">
                   <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Syncing Records</p>
              </div>
            ) : (
              <div className="max-w-6xl mx-auto pb-12">
                
                {/* Dashboard Tab */}
                {activeTab === 'dashboard' && (
                  <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                       <StatCard 
                          icon={<Users className="w-7 h-7" />} 
                          label="Global Population" 
                          value={stats.users} 
                          subText="Total identifiers" 
                          color="blue" 
                       />
                       <StatCard 
                          icon={<MessageSquare className="w-7 h-7" />} 
                          label="Core Sessions" 
                          value={stats.sessions} 
                          subText="Concurrent threads" 
                          color="purple" 
                       />
                       <StatCard 
                          icon={<Radio className="w-7 h-7" />} 
                          label="Signal Count" 
                          value={stats.messages} 
                          subText="Processed queries" 
                          color="rose" 
                       />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                       <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-8 text-slate-100 group-hover:text-slate-200 transition-colors">
                             <Users className="w-24 h-24 rotate-12" />
                          </div>
                          <div className="relative z-10">
                             <div className="flex items-center justify-between mb-10">
                                <div>
                                   <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic font-mono leading-none mb-2">User Directory</h3>
                                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent node activations</p>
                                </div>
                                <button onClick={() => setActiveTab('users')} className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl transition-all shadow-sm border border-slate-100">
                                   <Plus className="w-5 h-5" />
                                </button>
                             </div>
                             <div className="space-y-6">
                                {users.slice(0, 4).map((u, i) => (
                                  <div key={i} className="flex items-center gap-4 group/item cursor-pointer">
                                    <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 p-0.5 group-hover/item:scale-105 transition-all overflow-hidden relative shadow-sm">
                                       <img src={u.profilePicture || `https://ui-avatars.com/api/?name=${u.name || 'U'}&background=random`} alt="" className="w-full h-full object-cover rounded-[0.9rem]" />
                                       {u.subscription === 'paid' && (
                                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center p-1.5 border-2 border-white shadow-md">
                                             <Crown className="w-full h-full text-white" />
                                          </div>
                                       )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-black text-slate-900 truncate tracking-tight">{u.name || 'Anonymous'}</p>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">{u.email}</p>
                                    </div>
                                    <div className="text-right">
                                       <div className={cn(
                                          "w-2.5 h-2.5 rounded-full mx-auto mb-1 shadow-sm",
                                          u.role === 'suspended' ? "bg-rose-500" : "bg-emerald-500"
                                       )} />
                                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">{u.role}</p>
                                    </div>
                                  </div>
                                ))}
                             </div>
                          </div>
                       </div>

                       <div className="bg-slate-950 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden flex flex-col justify-between group">
                          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/20 rounded-full blur-[120px] -mr-48 -mt-48 group-hover:scale-125 transition-transform duration-[2s]" />
                          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] -ml-32 -mb-32 group-hover:scale-125 transition-transform duration-[2s]" />
                          
                          <div className="relative z-10">
                             <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center mb-10 shadow-xl">
                                <ShieldCheck className="w-8 h-8 text-emerald-400" />
                             </div>
                             <h3 className="text-3xl font-black tracking-tighter italic font-mono uppercase mb-4 leading-none underline decoration-brand-500 underline-offset-8 decoration-4">System Core</h3>
                             <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-sm mb-12">Intelligence pathways fully operational. Database redundancy active across all nodes. Real-time encryption active.</p>
                             
                             <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 border border-white/5 p-6 rounded-[2rem] hover:bg-white/[0.07] transition-colors">
                                   <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em] mb-2 leading-none">Reliability</p>
                                   <p className="text-2xl font-black text-brand-400 uppercase italic font-mono leading-none">99.9%</p>
                                </div>
                                <div className="bg-white/5 border border-white/5 p-6 rounded-[2rem] hover:bg-white/[0.07] transition-colors">
                                   <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em] mb-2 leading-none">Security</p>
                                   <p className="text-2xl font-black text-emerald-400 uppercase italic font-mono leading-none">TIGHT</p>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                  <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="p-8 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">Identity</th>
                            <th className="p-8 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">Tier</th>
                            <th className="p-8 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">Access Level</th>
                            <th className="p-8 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map(u => (
                            <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors group">
                              <td className="p-8">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 p-0.5 shadow-sm group-hover:scale-110 transition-transform overflow-hidden">
                                    <img src={u.profilePicture || `https://ui-avatars.com/api/?name=${u.name}&background=random`} alt={u.name} className="w-full h-full object-cover rounded-xl" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-black text-slate-900 tracking-tight leading-none mb-1 text-sm">{u.name || 'Anonymous'}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none truncate max-w-[150px]">{u.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-8">
                                <span className={cn(
                                  "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-2 border",
                                  u.subscription === 'paid' ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-slate-50 text-slate-400 border-slate-100"
                                )}>
                                  {u.subscription === 'paid' && <Crown className="w-3 h-3" />}
                                  {u.subscription === 'paid' ? 'PLUS MEMBER' : 'FREE TIER'}
                                </span>
                              </td>
                              <td className="p-8">
                                <span className={cn(
                                  "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-2 border",
                                  u.role === 'admin' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                  u.role === 'suspended' ? "bg-rose-50 text-rose-600 border-rose-100" :
                                  "bg-blue-50 text-blue-600 border-blue-100"
                                )}>
                                  <Shield className="w-3 h-3" />
                                  {u.role}
                                </span>
                              </td>
                              <td className="p-8">
                                <div className="flex items-center gap-3">
                                  <select 
                                    value={u.role}
                                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                    disabled={u.id === user?.uid || u.email === 'salucoders@gmail.com'}
                                    className="bg-white border border-slate-200 text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-[0.9rem] focus:ring-2 focus:ring-slate-900 focus:border-slate-900 block px-3 py-2 disabled:opacity-30 transition-all outline-none"
                                  >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                    <option value="suspended">Suspended</option>
                                  </select>
                                  <button
                                    onClick={() => handleDeleteUser(u.id)}
                                    disabled={u.id === user?.uid || u.email === 'salucoders@gmail.com'}
                                    className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-30"
                                    title="Revoke Access"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Members Tab */}
                {activeTab === 'members' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between">
                       <div>
                         <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase italic font-mono leading-none mb-2">Member Subscriptions</h3>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global revenue & tier distribution</p>
                       </div>
                       <div className="flex items-center gap-3 px-6 py-4 bg-amber-400 text-white rounded-[1.5rem] shadow-xl shadow-amber-400/20">
                          <Crown className="w-5 h-5" />
                          <div className="text-right">
                             <p className="text-[10px] font-black uppercase tracking-widest opacity-80 leading-none mb-1">Active Plus</p>
                             <p className="text-xl font-black italic font-mono leading-none underline decoration-white/30 decoration-2 underline-offset-4">{users.filter(u => u.subscription === 'paid').length}</p>
                          </div>
                       </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                              <th className="p-8 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">Node</th>
                              <th className="p-8 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">Resources Used</th>
                              <th className="p-8 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {users.map(u => (
                              <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors group">
                                <td className="p-8">
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 p-0.5 shadow-sm group-hover:rotate-6 transition-transform overflow-hidden relative">
                                        <img src={u.profilePicture || `https://ui-avatars.com/api/?name=${u.name}&background=random`} alt={u.name} className="w-full h-full object-cover rounded-xl" />
                                        {u.subscription === 'paid' && (
                                          <div className="absolute inset-0 bg-amber-400/10 mix-blend-overlay" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-black text-slate-900 tracking-tight leading-none mb-1 text-sm">{u.name || 'Anonymous'}</p>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none truncate max-w-[150px]">{u.email}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-8">
                                   <div className="w-48">
                                      <div className="flex justify-between text-[9px] font-black text-slate-400 mb-2 uppercase tracking-[0.2em]">
                                        <span>Cycles: {u.creditsUsedToday || 0}</span>
                                        <span>Max: {u.creditsTotal || 30}</span>
                                      </div>
                                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-100 shadow-inner">
                                        <div 
                                          className={cn(
                                            "h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(0,0,0,0.1)]", 
                                            u.subscription === 'paid' ? "bg-amber-400" : "bg-slate-400"
                                          )}
                                          style={{ width: `${Math.min(100, ((u.creditsUsedToday || 0) / (u.creditsTotal || 30)) * 100)}%` }}
                                        />
                                      </div>
                                   </div>
                                </td>
                                <td className="p-8">
                                  <button
                                    onClick={() => handleSubscriptionChange(u.id, u.subscription === 'paid' ? 'free' : 'paid')}
                                    className={cn(
                                      "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-md border group-hover:-translate-y-1",
                                      u.subscription === 'paid' 
                                        ? "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100" 
                                        : "bg-slate-900 text-white border-transparent hover:bg-black shadow-slate-900/10"
                                    )}
                                  >
                                    {u.subscription === 'paid' ? 'Demote to Free' : 'Grant Plus Access'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Broadcast Tab */}
                {activeTab === 'broadcast' && (
                  <div className="max-w-3xl space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10 md:p-14 relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-[80px] -mr-32 -mt-32" />
                       <div className="relative z-10">
                          <div className="flex items-center gap-4 mb-10 pb-10 border-b border-slate-50">
                             <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shadow-sm">
                                <Radio className="w-8 h-8 animate-pulse" />
                             </div>
                             <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic font-mono leading-none mb-2">System Pulse</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global notification stream</p>
                             </div>
                          </div>
                          
                          <div className="space-y-8">
                             <div className="group">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Signal Content</label>
                                <textarea 
                                   value={broadcast.message}
                                   onChange={(e) => setBroadcast({...broadcast, message: e.target.value})}
                                   placeholder="Transmit message to all active nodes..."
                                   rows={5}
                                   className="w-full px-8 py-6 rounded-[2rem] border border-slate-100 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all resize-none text-slate-900 font-bold placeholder:text-slate-300 shadow-inner"
                                />
                             </div>
                             
                             <div className="p-8 bg-slate-50/50 rounded-[2rem] border border-slate-100 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                                <div>
                                   <p className="font-black text-slate-900 uppercase tracking-tight text-sm">Broadcasting Active</p>
                                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Global visibility on check-in</p>
                                </div>
                                <button 
                                   onClick={() => setBroadcast({...broadcast, active: !broadcast.active})}
                                   className={cn(
                                     "w-16 h-8 rounded-full p-1 transition-all duration-500 shadow-inner overflow-hidden",
                                     broadcast.active ? "bg-rose-500" : "bg-slate-200"
                                   )}
                                >
                                   <div className={cn(
                                      "w-6 h-6 bg-white rounded-full shadow-lg transition-transform duration-500 border border-slate-100",
                                      broadcast.active ? "translate-x-8" : "translate-x-0"
                                   )} />
                                </button>
                             </div>
                          </div>
                          
                          <div className="flex justify-end pt-12">
                             <button
                                onClick={handleSaveBroadcast}
                                disabled={saving}
                                className="group flex items-center gap-4 px-10 py-5 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-[1.8rem] hover:bg-black transition-all disabled:opacity-30 active:scale-95 shadow-2xl shadow-slate-900/20"
                             >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5 text-brand-400 group-hover:scale-125 transition-transform" />}
                                Commit Changes
                             </button>
                          </div>
                       </div>
                    </div>
                  </div>
                )}

                {/* Data Management Tab */}
                {activeTab === 'data' && (
                  <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm group hover:shadow-2xl hover:-translate-y-1 transition-all">
                          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mb-10 group-hover:scale-110 shadow-sm transition-transform">
                             <Download className="w-7 h-7" />
                          </div>
                          <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase italic font-mono mb-2">Vault Export</h3>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-10 leading-relaxed">Compile all user identities into a portable CSV format for offline synthesis.</p>
                          <button
                             onClick={handleExportUsers}
                             className="w-full py-4 bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-900 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all border border-slate-100 shadow-sm"
                          >
                             Initiate Extraction
                          </button>
                       </div>

                       <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm group hover:shadow-2xl hover:-translate-y-1 transition-all">
                          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-10 group-hover:scale-110 shadow-sm transition-transform">
                             <Eraser className="w-7 h-7" />
                          </div>
                          <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase italic font-mono mb-2">Cycle Cleanup</h3>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-10 leading-relaxed">Purge orphaned sessions with zero interactions to optimize storage efficiency.</p>
                          <button
                             onClick={handleClearEmptySessions}
                             disabled={saving}
                             className="w-full py-4 bg-white hover:bg-rose-500 hover:text-white text-rose-500 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all border border-rose-100 shadow-sm disabled:opacity-30"
                          >
                             {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Run Optimizer"}
                          </button>
                       </div>
                    </div>
                  </div>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                  <div className="max-w-4xl space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10 md:p-14">
                      <div className="flex items-center gap-4 mb-12 pb-10 border-b border-slate-50">
                        <div className="w-16 h-16 rounded-2xl bg-slate-950 text-white flex items-center justify-center shadow-lg">
                           <Layout className="w-8 h-8" />
                        </div>
                        <div>
                           <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic font-mono leading-none mb-2">Core Identity</h3>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global application branding</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="md:col-span-1">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Instance Label</label>
                          <input 
                            type="text" 
                            value={systemConfig.appName}
                            onChange={(e) => setSystemConfig({...systemConfig, appName: e.target.value})}
                            placeholder="SALU AI Plus"
                            className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-950 transition-all font-bold text-slate-900"
                          />
                        </div>
                        <div className="md:col-span-1">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Initial Handshake</label>
                          <input 
                            type="text" 
                            value={systemConfig.welcomeMessage}
                            onChange={(e) => setSystemConfig({...systemConfig, welcomeMessage: e.target.value})}
                            placeholder="Awaiting Input..."
                            className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-950 transition-all font-bold text-slate-900"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10 md:p-14">
                      <div className="flex items-center gap-4 mb-12 pb-10 border-b border-slate-50">
                        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shadow-sm">
                           <Banknote className="w-8 h-8" />
                        </div>
                        <div>
                           <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic font-mono leading-none mb-2">Monetary Link</h3>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment gateway configuration</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">JazzCash Terminal</label>
                          <input 
                            type="text" 
                            value={systemConfig.jazzCashNumber}
                            onChange={(e) => setSystemConfig({...systemConfig, jazzCashNumber: e.target.value})}
                            placeholder="03XXXXXXXXX"
                            className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all font-mono font-black tracking-widest text-slate-900"
                          />
                        </div>
                        <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Visual QR Link</label>
                              <div className="flex gap-4">
                                <input 
                                  type="text" 
                                  value={systemConfig.paymentQrUrl}
                                  onChange={(e) => setSystemConfig({...systemConfig, paymentQrUrl: e.target.value})}
                                  placeholder="https://cdn.link/qr.jpg"
                                  className="flex-1 px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all font-mono text-[10px] text-slate-400 truncate"
                                />
                                <div className="relative flex shrink-0">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleQrUpload}
                                    disabled={isUploadingQr}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:not-allowed z-10"
                                  />
                                  <button
                                    type="button"
                                    disabled={isUploadingQr}
                                    className={cn(
                                      "px-6 py-4 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-slate-900/10",
                                      isUploadingQr && "opacity-50 scale-95"
                                    )}
                                  >
                                    {isUploadingQr ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                    <span>Sync</span>
                                  </button>
                                </div>
                              </div>
                              {systemConfig.paymentQrUrl && (
                                <div className="mt-6 p-4 bg-white border border-slate-100 rounded-[2rem] shadow-xl w-fit group relative overflow-hidden">
                                  <div className="absolute inset-0 bg-brand-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  <img 
                                    src={systemConfig.paymentQrUrl} 
                                    alt="Payment Signal" 
                                    className="h-32 w-auto rounded-[1.5rem] relative z-10"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10 md:p-14">
                      <div className="flex items-center gap-4 mb-12 pb-10 border-b border-slate-50">
                        <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center shadow-sm">
                           <Cpu className="w-8 h-8" />
                        </div>
                        <div>
                           <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic font-mono leading-none mb-2">Neural Keys</h3>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI engine authentication</p>
                        </div>
                      </div>
                      
                      <div className="space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                           <div className="group">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Gemini Main Access</label>
                              <div className="relative">
                                <input 
                                  type={showApiKey ? "text" : "password"} 
                                  value={systemConfig.geminiApiKey}
                                  onChange={(e) => setSystemConfig({...systemConfig, geminiApiKey: e.target.value})}
                                  placeholder="AIzaSy..."
                                  className="w-full px-8 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all font-mono text-[10px] tracking-widest pr-16 shadow-inner"
                                />
                                <button 
                                  type="button" 
                                  onClick={() => setShowApiKey(!showApiKey)}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-slate-900 transition-colors"
                                >
                                  {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                              </div>
                           </div>

                           <div className="group">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Signal Generation Key</label>
                              <div className="relative">
                                <input 
                                  type={showApiKey ? "text" : "password"} 
                                  value={systemConfig.geminiImageGenApiKey || ''}
                                  onChange={(e) => setSystemConfig({...systemConfig, geminiImageGenApiKey: e.target.value})}
                                  placeholder="Implicit from Main"
                                  className="w-full px-8 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all font-mono text-[10px] tracking-widest pr-16 shadow-inner"
                                />
                                <button 
                                  type="button" 
                                  onClick={() => setShowApiKey(!showApiKey)}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-slate-900 transition-colors"
                                >
                                  {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                              </div>
                           </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Active Neural Model</label>
                          <div className="relative">
                            <select 
                              value={systemConfig.defaultModel}
                              onChange={(e) => setSystemConfig({...systemConfig, defaultModel: e.target.value})}
                              className="w-full px-8 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all font-black text-[10px] uppercase tracking-widest appearance-none cursor-pointer"
                            >
                              <option value="gemini-3-flash-preview">Flash v1.5 [Standard]</option>
                              <option value="gemini-3.1-flash-lite-preview">Flash v1.5 Lite [Optimizer]</option>
                              <option value="gemini-3.1-pro-preview">Pro v1.5 [Advanced]</option>
                            </select>
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                               <Plus className="w-5 h-5 rotate-45" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10 md:p-14">
                      <div className="flex items-center gap-4 mb-12 pb-10 border-b border-slate-50">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center shadow-sm">
                           <Workflow className="w-8 h-8" />
                        </div>
                        <div>
                           <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic font-mono leading-none mb-2">Extended Logic</h3>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Together AI integration</p>
                        </div>
                      </div>
                      
                      <div className="group">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Together Auth Token</label>
                        <div className="relative">
                          <input 
                            type={showApiKey ? "text" : "password"} 
                            value={systemConfig.togetherApiKey || ""}
                            onChange={(e) => setSystemConfig({...systemConfig, togetherApiKey: e.target.value})}
                            placeholder="together_..."
                            className="w-full px-8 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-[10px] tracking-widest pr-16 shadow-inner"
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-slate-900 transition-colors"
                          >
                            {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10 md:p-14">
                      <div className="flex items-center gap-4 mb-12 pb-10 border-b border-slate-100">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center shadow-sm">
                           <Database className="w-8 h-8" />
                        </div>
                        <div>
                           <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic font-mono leading-none mb-2">Vault Storage</h3>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ImageKit environment variables</p>
                        </div>
                      </div>
                      
                      <div className="space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                           <div className="group">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Public Token</label>
                              <input 
                                type="text" 
                                value={systemConfig.imageKitPublicKey || ""}
                                onChange={(e) => setSystemConfig({...systemConfig, imageKitPublicKey: e.target.value})}
                                placeholder="public_..."
                                className="w-full px-8 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono text-[10px] tracking-widest shadow-inner"
                              />
                           </div>
                           <div className="group">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Endpoint Node</label>
                              <input 
                                type="text" 
                                value={systemConfig.imageKitUrlEndpoint || ""}
                                onChange={(e) => setSystemConfig({...systemConfig, imageKitUrlEndpoint: e.target.value})}
                                placeholder="https://ik.imagekit.io/..."
                                className="w-full px-8 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono text-[10px] tracking-widest shadow-inner"
                              />
                           </div>
                        </div>

                        <div className="group">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Secure Private Token</label>
                          <div className="relative">
                            <input 
                              type={showApiKey ? "text" : "password"} 
                              value={systemConfig.imageKitPrivateKey || ""}
                              onChange={(e) => setSystemConfig({...systemConfig, imageKitPrivateKey: e.target.value})}
                              placeholder="private_..."
                              className="w-full px-8 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono text-[10px] tracking-widest pr-16 shadow-inner"
                            />
                            <button 
                              type="button" 
                              onClick={() => setShowApiKey(!showApiKey)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-slate-900 transition-colors"
                            >
                              {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10 md:p-14">
                      <div className="flex items-center gap-4 mb-12 pb-10 border-b border-slate-50">
                        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shadow-sm">
                           <Settings className="w-8 h-8" />
                        </div>
                        <div>
                           <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic font-mono leading-none mb-2">Logic Toggles</h3>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global system flags</p>
                        </div>
                      </div>
                      
                      <div className="space-y-6">
                        <label className="flex items-center justify-between p-8 bg-slate-50/50 rounded-[2rem] border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                          <div>
                            <p className="font-black text-slate-900 uppercase tracking-tight text-sm">Live System Mode</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Real-time signal synthesis</p>
                          </div>
                          <div className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={systemConfig.liveAiMode}
                              onChange={(e) => setSystemConfig({...systemConfig, liveAiMode: e.target.checked})}
                            />
                            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                          </div>
                        </label>

                        <label className="flex items-center justify-between p-8 bg-slate-50/50 rounded-[2rem] border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                          <div>
                            <p className="font-black text-slate-900 uppercase tracking-tight text-sm">Maintenance Shutdown</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Restrict access to verified admins</p>
                          </div>
                          <div className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={systemConfig.maintenanceMode}
                              onChange={(e) => setSystemConfig({...systemConfig, maintenanceMode: e.target.checked})}
                            />
                            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-rose-500 shadow-inner"></div>
                          </div>
                        </label>

                        <label className="flex items-center justify-between p-8 bg-slate-50/50 rounded-[2rem] border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                          <div>
                            <p className="font-black text-slate-900 uppercase tracking-tight text-sm">Public Node Entry</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Allow new user synthesis</p>
                          </div>
                          <div className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={systemConfig.publicRegistration}
                              onChange={(e) => setSystemConfig({...systemConfig, publicRegistration: e.target.checked})}
                            />
                            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-500 shadow-inner"></div>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end pt-12">
                       <button
                          onClick={handleSaveConfig}
                          disabled={saving}
                          className="group flex items-center gap-4 px-12 py-6 bg-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] rounded-[2rem] hover:bg-black transition-all disabled:opacity-30 active:scale-95 shadow-2xl shadow-slate-900/40"
                       >
                          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 text-emerald-400 group-hover:scale-125 transition-transform" />}
                          Update Secure Config
                       </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </motion.div>
    </motion.div>
  );
}

function AdminNavBtn({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all whitespace-nowrap group",
        active 
          ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10" 
          : "text-slate-400 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      <div className={cn("p-1.5 rounded-lg transition-colors border border-transparent", active ? "bg-white/10 border-white/10" : "bg-slate-50")}>
        {icon}
      </div>
      <span className="font-bold text-sm tracking-tight">{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500 shadow-[0_0_10px_#0ea5e9]" />}
    </button>
  );
}

function StatCard({ icon, label, value, subText, color }: { icon: any, label: string, value: any, subText: string, color: 'blue' | 'purple' | 'rose' | 'emerald' }) {
  const colors = {
    blue: "bg-blue-50 text-blue-500 border-blue-100",
    purple: "bg-purple-50 text-purple-500 border-purple-100",
    rose: "bg-rose-50 text-rose-500 border-rose-100",
    emerald: "bg-emerald-50 text-emerald-500 border-emerald-100"
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all group overflow-hidden relative">
      <div className={cn("absolute top-0 right-0 w-48 h-48 blur-[100px] -mr-24 -mt-24 opacity-30 group-hover:scale-150 transition-transform duration-1000", colors[color])} />
      <div className="relative z-10">
        <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-10 shrink-0 transition-transform group-hover:scale-110 shadow-sm", colors[color])}>
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-5xl font-black text-slate-900 tracking-tighter mb-1">{value}</h3>
          </div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none">{subText}</p>
        </div>
      </div>
    </div>
  );
}
