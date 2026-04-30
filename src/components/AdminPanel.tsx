import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, Settings, Activity, Shield, Key, Database, Server, X, Check, AlertCircle, Loader2, MessageSquare, Radio, Trash2, Download, Eraser, Palette, Cpu, Eye, EyeOff, Crown, Upload, Search, Filter, Calendar, BarChart3, Terminal, Sparkles, Menu, Bot, FileBox } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { collection, getDocs, doc, updateDoc, deleteDoc, getDoc, setDoc, query, where, collectionGroup, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useUserProfile } from '../context/UserProfileContext';
import { uploadToImageKit } from '../lib/imagekit';
import { cn } from '../lib/utils';

import { LOGO_URL, APP_NAME } from '../constants';

interface AdminPanelProps {
  onClose: () => void;
}

export function AdminPanel({ onClose }: AdminPanelProps) {
  const { user } = useAuth();
  const { preferences } = useUserProfile();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'members' | 'broadcast' | 'analytics' | 'messages' | 'settings' | 'data' | 'api-keys'>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilterRole, setUserFilterRole] = useState('all');
  const [userFilterSub, setUserFilterSub] = useState('all');
  const [stats, setStats] = useState({ 
    users: 0, 
    sessions: 0, 
    messages: 0,
    paidUsers: 0,
    activeToday: 0,
    messagesToday: 0,
    activeUsersPerDay: [] as { day: string, count: number }[],
    messagesPerDay: [] as { day: string, count: number }[],
    modeDistribution: [] as { mode: string, count: number }[],
    activityBreakdown: { today: 0, week: 0, month: 0 },
    avgMessagesPerSession: 0
  });
  const [sessions, setSessions] = useState<any[]>([]);
  const [allMessages, setAllMessages] = useState<any[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [systemConfig, setSystemConfig] = useState({
    maintenanceMode: false,
    publicRegistration: true,
    liveAiMode: true,
    geminiApiKey: '',
    geminiApiKey2: '',
    geminiApiKey3: '',
    geminiApiKey4: '',
    geminiApiKey5: '',
    groqApiKey: '',
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
      // 1. Fetch Fast Configuration First
      const fsConfigDocPromise = getDoc(doc(db, 'system', 'config'));
      const broadcastDocPromise = getDoc(doc(db, 'system', 'broadcast'));
      
      const [fsConfigDoc, broadcastDoc] = await Promise.all([fsConfigDocPromise, broadcastDocPromise]);
      
      if (fsConfigDoc.exists()) {
        const d = fsConfigDoc.data();
        setSystemConfig(prev => ({
          ...prev,
          ...d
        }));
      }

      if (broadcastDoc.exists()) {
        setBroadcast(broadcastDoc.data() as any);
      }
      
      // Stop blocking UI for heavy stats
      setLoading(false);

      // 2. Fetch Heavy Stats in Background
      fetchHeavyData();

    } catch (error: any) {
      if (error.code === 'unavailable' || String(error).includes('Code: unavailable')) {
        console.warn("Could not fetch admin config (Firestore connection unavailable).");
      } else {
        console.error("Error fetching admin data:", error);
      }
      setLoading(false);
    }
  };

  const fetchHeavyData = async () => {
    try {
      // Fetch Users
      const usersSnapshot = await getDocs(query(collection(db, 'users'), limit(500)));
      const usersData = usersSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      setUsers(usersData);

      // Fetch Sessions for stats
      const sessionsSnapshot = await getDocs(query(collection(db, 'sessions'), limit(500)));
      const sessionsData = sessionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setSessions(sessionsData);
      
      // Fetch Messages for stats (Limit lowered to reduce payload size and speed up query)
      const messagesQuery = query(collectionGroup(db, 'messages'), orderBy('timestamp', 'desc'), limit(300));
      const messagesSnapshot = await getDocs(messagesQuery);
      const messagesData = messagesSnapshot.docs.map(doc => ({ id: doc.id, sessionId: doc.ref.parent.parent?.id, ...doc.data() }));
      setAllMessages(messagesData);
      
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      // Process messages per day
      const msgMap: Record<string, number> = {};
      let msgToday = 0;
      messagesData.forEach((m: any) => {
        if (!m.timestamp) return;
        const d = m.timestamp.toDate ? m.timestamp.toDate() : new Date(m.timestamp);
        const dayStr = d.toISOString().split('T')[0];
        msgMap[dayStr] = (msgMap[dayStr] || 0) + 1;
        if (dayStr === todayStr) msgToday++;
      });
      
      const messagesPerDay = Object.entries(msgMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-7)
        .map(([day, count]) => ({ day, count }));

      // Process active users per day
      const activeMap: Record<string, number> = {};
      let activeToday = 0;
      let activeWeek = 0;
      let activeMonth = 0;
      usersData.forEach((u: any) => {
        if (!u.lastActiveAt) return;
        const d = u.lastActiveAt.toDate ? u.lastActiveAt.toDate() : new Date(u.lastActiveAt);
        const dayStr = d.toISOString().split('T')[0];
        activeMap[dayStr] = (activeMap[dayStr] || 0) + 1;
        if (dayStr === todayStr) activeToday++;
        if (d >= oneWeekAgo) activeWeek++;
        if (d >= oneMonthAgo) activeMonth++;
      });
      
      const activeUsersPerDay = Object.entries(activeMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-7)
        .map(([day, count]) => ({ day, count }));

      // Mode Distribution
      const modeMap: Record<string, number> = {};
      sessionsData.forEach((s: any) => {
        if (!s.mode) return;
        modeMap[s.mode] = (modeMap[s.mode] || 0) + 1;
      });
      const modeDistribution = Object.entries(modeMap)
        .sort((a, b) => b[1] - a[1])
        .map(([mode, count]) => ({ mode, count }));

      const paidUsers = usersData.filter(u => u.subscription === 'paid').length;
      const avgMessagesPerSession = sessionsData.length > 0 ? (messagesData.length / sessionsData.length) : 0;
      
      setStats({ 
        users: usersSnapshot.size, 
        sessions: sessionsSnapshot.size,
        messages: messagesSnapshot.size, // This is now capped at limit(300)
        paidUsers,
        activeToday,
        messagesToday: msgToday,
        activeUsersPerDay,
        messagesPerDay,
        modeDistribution,
        activityBreakdown: { today: activeToday, week: activeWeek, month: activeMonth },
        avgMessagesPerSession
      });

    } catch (error: any) {
      if (error.code === 'unavailable' || String(error).includes('Code: unavailable')) {
        console.warn("Could not fetch some background admin data (Firestore connection unavailable).");
      } else {
        console.error("Error fetching background admin data:", error);
      }
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

  const handleToggleTraining = async (userId: string, enabled: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { aiTrainingEnabled: enabled });
      setUsers(users.map(u => u.id === userId ? { ...u, aiTrainingEnabled: enabled } : u));
      showMessage('success', `AI Training ${enabled ? 'enabled' : 'disabled'} for user`);
    } catch (error) {
      showMessage('error', 'Failed to update AI training status');
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
            geminiApiKey2: systemConfig.geminiApiKey2,
            geminiApiKey3: systemConfig.geminiApiKey3,
            geminiApiKey4: systemConfig.geminiApiKey4,
            geminiApiKey5: systemConfig.geminiApiKey5,
            groqApiKey: systemConfig.groqApiKey,
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
        geminiApiKey2: systemConfig.geminiApiKey2,
        geminiApiKey3: systemConfig.geminiApiKey3,
        geminiApiKey4: systemConfig.geminiApiKey4,
        geminiApiKey5: systemConfig.geminiApiKey5,
        groqApiKey: systemConfig.groqApiKey,
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
      + "ID,Name,Email,Role,Subscription,Credits_Used,Credits_Total,Last_Active\n"
      + users.map(u => {
        const d = u.lastActiveAt?.toDate ? u.lastActiveAt.toDate() : (u.lastActiveAt ? new Date(u.lastActiveAt) : null);
        const lastActive = d ? d.toISOString() : 'Never';
        return `${u.id},"${u.name || ''}","${u.email || ''}",${u.role},${u.subscription || 'free'},${u.creditsUsedToday || 0},${u.creditsTotal || 30},${lastActive}`;
      }).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "system_users_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showMessage('success', 'Users exported successfully');
  };

  const handleExportMessages = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "MessageID,Role,Content,Timestamp\n"
      + allMessages.map(m => {
        const d = m.timestamp?.toDate ? m.timestamp.toDate() : (m.timestamp ? new Date(m.timestamp) : null);
        const ts = d ? d.toISOString() : 'Unknown';
        const safeContent = (m.content || '').replace(/"/g, '""');
        return `${m.id},${m.role},"${safeContent}",${ts}`;
      }).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "system_messages_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showMessage('success', 'Messages exported successfully');
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
      className="fixed inset-0 z-50 flex bg-zinc-950/20 backdrop-blur-sm overflow-hidden"
    >
      <div className="w-full h-full bg-[#FAFAFA] flex flex-col md:flex-row overflow-hidden">
        
        {/* Sidebar */}
        <div className={cn(
          "bg-white/80 backdrop-blur-xl text-slate-600 flex flex-col shrink-0 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] absolute md:relative z-20 transition-all duration-300 overflow-hidden",
          "md:w-[280px] w-72 md:m-4 md:mr-0 md:rounded-[32px]",
          mobileSidebarOpen ? "translate-x-0 inset-y-0 left-0" : "-translate-x-full md:translate-x-0 inset-y-0 left-0"
        )}>
          <div className="p-6 flex items-center justify-between gap-4 border-b border-slate-100/50 bg-white/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 via-fuchsia-500 to-indigo-500 flex items-center justify-center p-2 shadow-lg shadow-violet-500/30 ring-1 ring-white/20">
                <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain brightness-0 invert" referrerPolicy="no-referrer" />
              </div>
              <div className="flex flex-col">
                <h2 className="font-bold text-slate-800 tracking-tight text-sm leading-tight">{APP_NAME}</h2>
                <span className="text-[9px] font-black text-violet-500 uppercase tracking-widest bg-violet-50 px-2 py-0.5 rounded-full w-max mt-0.5">ADMIN</span>
              </div>
            </div>
            <button onClick={() => setMobileSidebarOpen(false)} className="md:hidden p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 py-6 px-4 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
            <div className="px-3 pb-3 text-[10px] font-black tracking-widest text-slate-400/80 uppercase">Overview</div>
            <button
              onClick={() => { setActiveTab('dashboard'); setMobileSidebarOpen(false); }}
              className={cn(
                "flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all whitespace-nowrap text-sm font-semibold group",
                activeTab === 'dashboard' ? "bg-violet-600 text-white shadow-md shadow-violet-500/20" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Activity className={cn("w-4 h-4 shrink-0 transition-transform group-hover:scale-110", activeTab === 'dashboard' ? "text-white" : "text-slate-400")} />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => { setActiveTab('analytics'); setMobileSidebarOpen(false); }}
              className={cn(
                "flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all whitespace-nowrap text-sm font-semibold group mt-1",
                activeTab === 'analytics' ? "bg-violet-600 text-white shadow-md shadow-violet-500/20" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <BarChart3 className={cn("w-4 h-4 shrink-0 transition-transform group-hover:scale-110", activeTab === 'analytics' ? "text-white" : "text-slate-400")} />
              <span>Analytics</span>
            </button>

            <div className="px-3 pt-8 pb-3 text-[10px] font-black tracking-widest text-slate-400/80 uppercase">Accounts</div>
            <button
              onClick={() => { setActiveTab('users'); setMobileSidebarOpen(false); }}
              className={cn(
                "flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all whitespace-nowrap text-sm font-semibold group",
                activeTab === 'users' ? "bg-violet-600 text-white shadow-md shadow-violet-500/20" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Users className={cn("w-4 h-4 shrink-0 transition-transform group-hover:scale-110", activeTab === 'users' ? "text-white" : "text-slate-400")} />
              <span className="flex-1 text-left">Users Setup</span>
            </button>
            <button
              onClick={() => { setActiveTab('members'); setMobileSidebarOpen(false); }}
              className={cn(
                "flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all whitespace-nowrap text-sm font-semibold group mt-1",
                activeTab === 'members' ? "bg-violet-600 text-white shadow-md shadow-violet-500/20" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Crown className={cn("w-4 h-4 shrink-0 transition-transform group-hover:scale-110", activeTab === 'members' ? "text-white" : "text-slate-400")} />
              <span>Memberships</span>
            </button>

            <div className="px-3 pt-8 pb-3 text-[10px] font-black tracking-widest text-slate-400/80 uppercase">System Config</div>
            <button
              onClick={() => { setActiveTab('messages'); setMobileSidebarOpen(false); }}
              className={cn(
                "flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all whitespace-nowrap text-sm font-semibold group",
                activeTab === 'messages' ? "bg-violet-600 text-white shadow-md shadow-violet-500/20" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <MessageSquare className={cn("w-4 h-4 shrink-0 transition-transform group-hover:scale-110", activeTab === 'messages' ? "text-white" : "text-slate-400")} />
              <span>Message Logs</span>
            </button>
            <button
              onClick={() => { setActiveTab('broadcast'); setMobileSidebarOpen(false); }}
              className={cn(
                "flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all whitespace-nowrap text-sm font-semibold group mt-1",
                activeTab === 'broadcast' ? "bg-violet-600 text-white shadow-md shadow-violet-500/20" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Radio className={cn("w-4 h-4 shrink-0 transition-transform group-hover:scale-110", activeTab === 'broadcast' ? "text-white" : "text-slate-400")} />
              <span>Broadcast Center</span>
            </button>
            <button
              onClick={() => { setActiveTab('settings'); setMobileSidebarOpen(false); }}
              className={cn(
                "flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all whitespace-nowrap text-sm font-semibold group mt-1",
                activeTab === 'settings' ? "bg-violet-600 text-white shadow-md shadow-violet-500/20" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Settings className={cn("w-4 h-4 shrink-0 transition-transform group-hover:scale-110", activeTab === 'settings' ? "text-white" : "text-slate-400")} />
              <span>General Settings</span>
            </button>
            <button
              onClick={() => { setActiveTab('data'); setMobileSidebarOpen(false); }}
              className={cn(
                "flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all whitespace-nowrap text-sm font-semibold group mt-1",
                activeTab === 'data' ? "bg-violet-600 text-white shadow-md shadow-violet-500/20" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Database className={cn("w-4 h-4 shrink-0 transition-transform group-hover:scale-110", activeTab === 'data' ? "text-white" : "text-slate-400")} />
              <span>Data & Actions</span>
            </button>
          </div>
          
          <div className="p-4 border-t border-slate-100/50 bg-white/50 hidden md:flex items-center gap-3">
             <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200/60 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
               {user?.photoURL ? (
                 <img src={user.photoURL} alt="Admin" className="w-full h-full object-cover" />
               ) : (
                 <Terminal className="w-5 h-5 text-slate-500" />
               )}
             </div>
             <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold text-slate-700 truncate">{user?.displayName || 'Admin'}</p>
                <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 truncate">Super Admin</p>
             </div>
             <button onClick={onClose} className="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Close Panel">
               <X className="w-4 h-4" />
             </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#FAFAFA] relative">
          
          {/* Header */}
          <div className="h-20 bg-white border-b border-slate-100 flex items-center px-6 md:px-10 shrink-0 gap-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] z-10">
            <button onClick={() => setMobileSidebarOpen(true)} className="md:hidden p-2 text-slate-500 hover:text-slate-900 transition-colors">
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-800 capitalize tracking-tight flex items-center gap-2">
                {activeTab.replace('-', ' ')}
                <Sparkles className="w-4 h-4 text-violet-500" />
              </h1>
              <p className="text-[13px] text-slate-500 font-medium">Manage your {activeTab.replace('-', ' ')} data and preferences</p>
            </div>
          </div>

          {/* Messages */}
          {message.text && (
            <div className="absolute top-20 md:top-24 left-1/2 -translate-x-1/2 z-50">
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "px-6 py-3 rounded-full shadow-lg flex items-center gap-2 font-medium text-sm",
                  message.type === 'success' ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                )}
              >
                {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {message.text}
              </motion.div>
            </div>
          )}

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 md:p-10">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
              </div>
            ) : (
              <div className="max-w-6xl mx-auto">
                
                {/* Dashboard Tab */}
                {activeTab === 'dashboard' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Stat Card 1 */}
                      <motion.div whileHover={{ y: -4 }} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between h-40 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-10 transform scale-150 -translate-y-4 translate-x-4 transition-transform group-hover:scale-110">
                          <Users className="w-24 h-24 text-emerald-500" />
                        </div>
                        <div className="relative z-10 flex items-center justify-between">
                          <span className="text-[15px] font-bold text-slate-500">Total Users</span>
                          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                            <Users className="w-5 h-5 text-emerald-500" />
                          </div>
                        </div>
                        <div className="relative z-10">
                          <h3 className="text-4xl font-black text-slate-800 tracking-tighter">{stats.users}</h3>
                          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-700 font-bold bg-emerald-50/80 w-fit px-2.5 py-1 rounded-full uppercase tracking-widest">
                            <Activity className="w-3.5 h-3.5" />
                            <span>+{stats.activeToday} active today</span>
                          </div>
                        </div>
                      </motion.div>

                      {/* Stat Card 2 */}
                      <motion.div whileHover={{ y: -4 }} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between h-40 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-10 transform scale-150 -translate-y-4 translate-x-4 transition-transform group-hover:scale-110">
                          <Crown className="w-24 h-24 text-amber-500" />
                        </div>
                        <div className="relative z-10 flex items-center justify-between">
                          <span className="text-[15px] font-bold text-slate-500">SALU Plus Members</span>
                          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                            <Crown className="w-5 h-5 text-amber-500" />
                          </div>
                        </div>
                        <div className="relative z-10">
                          <h3 className="text-4xl font-black text-slate-800 tracking-tighter">{stats.paidUsers}</h3>
                          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-700 font-bold bg-amber-50/80 w-fit px-2.5 py-1 rounded-full uppercase tracking-widest">
                            <Crown className="w-3.5 h-3.5" />
                            <span>{Math.round((stats.paidUsers / Math.max(stats.users, 1)) * 100 || 0)}% conversion rate</span>
                          </div>
                        </div>
                      </motion.div>

                      {/* Stat Card 3 */}
                      <motion.div whileHover={{ y: -4 }} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between h-40 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-10 transform scale-150 -translate-y-4 translate-x-4 transition-transform group-hover:scale-110">
                          <MessageSquare className="w-24 h-24 text-indigo-500" />
                        </div>
                        <div className="relative z-10 flex items-center justify-between">
                          <span className="text-[15px] font-bold text-slate-500">Total AI Insights</span>
                          <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                            <MessageSquare className="w-5 h-5 text-indigo-500" />
                          </div>
                        </div>
                        <div className="relative z-10">
                          <h3 className="text-4xl font-black text-slate-800 tracking-tighter">{stats.messages}</h3>
                          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-indigo-700 font-bold bg-indigo-50/80 w-fit px-2.5 py-1 rounded-full uppercase tracking-widest">
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>+{stats.messagesToday} processed today</span>
                          </div>
                        </div>
                      </motion.div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                       {/* Chart Card 1 */}
                       <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col">
                          <div className="flex items-center justify-between mb-8">
                             <div>
                                <h3 className="text-lg font-bold text-slate-800 tracking-tight">User Activity (7 Days)</h3>
                                <p className="text-[13px] font-medium text-slate-400 mt-1">Unique active users per day</p>
                             </div>
                             <div className="flex items-center gap-1.5 text-[10px] font-black text-rose-600 uppercase tracking-widest px-3 py-1.5 bg-rose-50 rounded-lg">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                LIVE
                             </div>
                          </div>
                          
                          <div className="flex-1 min-h-[160px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={stats.activeUsersPerDay}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                                <XAxis dataKey="day" tick={{fontSize: 10}} tickFormatter={(val) => val.split('-').slice(1).join('/')} stroke="#a1a1aa" axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                       </div>

                       {/* Chart Card 2 */}
                       <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col">
                          <div className="flex items-center justify-between mb-8">
                             <div>
                                <h3 className="text-lg font-bold text-slate-800 tracking-tight">Message Volume (7 Days)</h3>
                                <p className="text-[13px] font-medium text-slate-400 mt-1">Platform interactions per day</p>
                             </div>
                             <div className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 uppercase tracking-widest px-3 py-1.5 bg-indigo-50 rounded-lg">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                LIVE
                             </div>
                          </div>
                          
                          <div className="flex-1 min-h-[160px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={stats.messagesPerDay}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                                <XAxis dataKey="day" tick={{fontSize: 10}} tickFormatter={(val) => val.split('-').slice(1).join('/')} stroke="#a1a1aa" axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="count" fill="#a855f7" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                       </div>
                    </div>
                  </div>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                       <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full max-w-2xl">
                          <div className="relative flex-1">
                             <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                                <Search className="w-4 h-4" />
                             </div>
                             <input 
                               type="text"
                               placeholder="Search by name or email..."
                               value={searchQuery}
                               onChange={(e) => setSearchQuery(e.target.value)}
                               className="block w-full pl-11 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                             />
                          </div>
                          <select 
                            value={userFilterRole}
                            onChange={(e) => setUserFilterRole(e.target.value)}
                            className="px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none w-full sm:w-32"
                          >
                            <option value="all">All Roles</option>
                            <option value="admin">Admins</option>
                            <option value="user">Users</option>
                            <option value="suspended">Suspended</option>
                          </select>
                          <select 
                            value={userFilterSub}
                            onChange={(e) => setUserFilterSub(e.target.value)}
                            className="px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none w-full sm:w-36"
                          >
                            <option value="all">All Plans</option>
                            <option value="paid">SALU Plus</option>
                            <option value="free">Free Tier</option>
                          </select>
                       </div>
                       <div className="flex items-center gap-3">
                          <button onClick={handleExportUsers} className="flex items-center justify-center w-full md:w-auto gap-2 px-5 py-2.5 bg-white border border-zinc-200 text-zinc-700 font-semibold text-xs rounded-xl hover:bg-zinc-50 transition-all shadow-sm">
                             <Download className="w-4 h-4" />
                             Export CSV
                          </button>
                       </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-zinc-50/80 border-b border-zinc-200/60">
                              <th className="px-6 py-4 font-semibold text-zinc-500 text-[10px] uppercase tracking-widest leading-4">User Profile</th>
                              <th className="px-6 py-4 font-semibold text-zinc-500 text-[10px] uppercase tracking-widest leading-4">Contact Info</th>
                              <th className="px-6 py-4 font-semibold text-zinc-500 text-[10px] uppercase tracking-widest leading-4">Subscription</th>
                              <th className="px-6 py-4 font-semibold text-zinc-500 text-[10px] uppercase tracking-widest leading-4">Experience</th>
                              <th className="px-6 py-4 font-semibold text-zinc-500 text-[10px] uppercase tracking-widest leading-4">Privileges</th>
                              <th className="px-6 py-4 font-semibold text-zinc-500 text-[10px] uppercase tracking-widest leading-4 text-right">Management</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 text-sm">
                            {users
                              .filter(u => 
                                (u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                u.email?.toLowerCase().includes(searchQuery.toLowerCase())) &&
                                (userFilterRole === 'all' || u.role === userFilterRole) &&
                                (userFilterSub === 'all' || (userFilterSub === 'paid' && u.subscription === 'paid') || (userFilterSub === 'free' && u.subscription !== 'paid'))
                              )
                              .map(u => (
                              <tr key={u.id} className="hover:bg-zinc-50/50 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="relative group shrink-0">
                                      <img 
                                        src={u.profilePicture || `https://ui-avatars.com/api/?name=${u.name}&background=random`} 
                                        alt={u.name} 
                                        className="w-9 h-9 rounded-full object-cover ring-2 ring-transparent group-hover:ring-indigo-500/20 transition-all" 
                                      />
                                      <div className={cn(
                                        "absolute 0 bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white",
                                        u.lastActiveAt ? "bg-emerald-500" : "bg-zinc-300"
                                      )} />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-semibold text-zinc-900 leading-tight">{u.name}</span>
                                      <span className="text-[10px] font-medium text-zinc-400 mt-0.5">UID: {u.id.slice(0, 8)}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <span className="text-sm text-zinc-600">{u.email}</span>
                                    <span className="text-[10px] text-zinc-400 font-medium">Joined: {u.createdAt?.toDate?.()?.toLocaleDateString() || new Date(u.createdAt).toLocaleDateString() || 'Unknown'}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={cn(
                                    "px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest inline-flex items-center gap-1.5",
                                    u.subscription === 'paid' ? "bg-amber-100 text-amber-700 border border-amber-200/50" : "bg-zinc-100 text-zinc-500 border border-zinc-200/50"
                                  )}>
                                    {u.subscription === 'paid' && <Crown className="w-3 h-3" />}
                                    {u.subscription === 'paid' ? 'SALU Plus' : 'Free Tier'}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <button
                                    onClick={() => handleToggleTraining(u.id, !u.aiTrainingEnabled)}
                                    className={cn(
                                      "px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest transition-all",
                                      u.aiTrainingEnabled 
                                        ? "bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100" 
                                        : "bg-zinc-50 text-zinc-500 border border-zinc-200 hover:bg-zinc-100"
                                    )}
                                  >
                                    {u.aiTrainingEnabled ? 'AI Enhanced' : 'Standard'}
                                  </button>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={cn(
                                    "px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest inline-flex items-center gap-1.5",
                                    u.role === 'admin' ? "bg-rose-50 text-rose-600 border border-rose-100" :
                                    u.role === 'suspended' ? "bg-orange-50 text-orange-600 border border-orange-100" :
                                    "bg-zinc-50 text-zinc-600 border border-zinc-200/50"
                                  )}>
                                    <Shield className="w-3 h-3" />
                                    {u.role}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center justify-end gap-2">
                                    <select 
                                      value={u.role}
                                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                      disabled={u.id === user?.uid || u.email === 'salucoders@gmail.com'}
                                      className="bg-white border border-zinc-200 text-zinc-700 text-xs font-semibold rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 p-1.5 outline-none disabled:opacity-50"
                                    >
                                      <option value="user">USER</option>
                                      <option value="admin">ADMIN</option>
                                      <option value="suspended">SUSP.</option>
                                    </select>
                                    <button
                                      onClick={() => handleDeleteUser(u.id)}
                                      disabled={u.id === user?.uid || u.email === 'salucoders@gmail.com'}
                                      className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-50"
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
                  </div>
                )}

                {/* Messages Activity Tab */}
                {activeTab === 'messages' && (
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                       <div className="relative flex-1 max-w-md">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                             <Search className="w-4 h-4" />
                          </div>
                          <input 
                            type="text"
                            placeholder="Filter messages by content..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="block w-full pl-11 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                          />
                       </div>
                       <p className="text-sm font-medium text-zinc-500">{allMessages.length} total messages</p>
                    </div>
                    
                    <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden">
                       <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                             <thead>
                                <tr className="bg-zinc-50/80 border-b border-zinc-200/60">
                                   <th className="px-6 py-4 font-semibold text-zinc-500 text-[10px] uppercase tracking-widest leading-4">Sender Role</th>
                                   <th className="px-6 py-4 font-semibold text-zinc-500 text-[10px] uppercase tracking-widest leading-4">User</th>
                                   <th className="px-6 py-4 font-semibold text-zinc-500 text-[10px] uppercase tracking-widest leading-4">User</th>
                                   <th className="px-6 py-4 font-semibold text-zinc-500 text-[10px] uppercase tracking-widest leading-4">Content Preview</th>
                                   <th className="px-6 py-4 font-semibold text-zinc-500 text-[10px] uppercase tracking-widest leading-4">Timestamp</th>
                                   <th className="px-6 py-4 font-semibold text-zinc-500 text-[10px] uppercase tracking-widest leading-4 text-right">Action</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-zinc-100 text-sm">
                                {allMessages
                                 .filter(m => m.content?.toLowerCase().includes(searchQuery.toLowerCase()))
                                 .slice(0, 50).sort((a, b) => {
                                   const t1 = a.timestamp?.toDate?.() || new Date(a.timestamp);
                                   const t2 = b.timestamp?.toDate?.() || new Date(b.timestamp);
                                   return t2 - t1;
                                }).map((m, i) => {
                                    const session = sessions.find(s => s.id === m.sessionId);
                                    const user = session ? users.find(u => u.id === session.userId) : null;
                                    return (
                                    <tr key={i} onClick={() => setSelectedMessage({...m, user})} className="hover:bg-zinc-50/50 transition-colors cursor-pointer group">
                                      <td className="px-6 py-4">
                                          <span className={cn(
                                             "px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest",
                                             m.role === 'user' ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                                          )}>
                                             {m.role}
                                          </span>
                                       </td>
                                       <td className="px-6 py-4">
                                          {user ? (
                                            <div className="flex flex-col">
                                              <span className="text-sm font-semibold text-slate-800 line-clamp-1">{user.name}</span>
                                              <span className="text-[10px] text-zinc-400 line-clamp-1">{user.email}</span>
                                            </div>
                                          ) : (
                                            <span className="text-xs text-zinc-400 italic">Unknown</span>
                                          )}
                                       </td>
                                      <td className="px-6 py-4">
                                         <p className="line-clamp-1 max-w-sm text-zinc-700">
                                            {m.content}
                                         </p>
                                      </td>
                                      <td className="px-6 py-4 text-zinc-400 text-xs font-medium">
                                         {m.timestamp?.toDate?.() ? m.timestamp.toDate().toLocaleString() : new Date(m.timestamp).toLocaleString()}
                                      </td>
                                      <td className="px-6 py-4 text-right w-24">
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); setSelectedMessage({...m, user}); }}
                                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors inline-block"
                                          >
                                            View
                                          </button>
                                       </td>
                                   </tr>
                                )})}
                             </tbody>
                          </table>
                       </div>
                    </div>
                  </div>
                )}

                {/* Analytics Tab (Dedicated) */}
                {activeTab === 'analytics' && (
                  <div className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* More detailed charts or insights could go here */}
                        <div className="bg-white p-6 rounded-2xl border border-zinc-200/60 shadow-sm">
                           <h4 className="text-base font-semibold text-zinc-900 mb-6 flex items-center gap-2">
                             <Activity className="w-4 h-4 text-zinc-400" />
                             Mode Usage Distribution
                           </h4>
                           <div className="space-y-5">
                              {stats.modeDistribution.length > 0 ? stats.modeDistribution.map((item, i) => {
                                const colors = ['bg-indigo-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500'];
                                const percentage = Math.round((item.count / stats.sessions) * 100) || 0;
                                return (
                                  <div key={i} className="space-y-1.5">
                                     <div className="flex justify-between text-xs font-semibold text-zinc-600">
                                        <span className="capitalize">{item.mode} Mode</span>
                                        <span className="text-zinc-900">{percentage}%</span>
                                     </div>
                                     <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                                        <div className={cn("h-full rounded-full transition-all duration-1000", colors[i % colors.length])} style={{ width: `${percentage}%` }} />
                                     </div>
                                  </div>
                                );
                              }) : (
                                <div className="text-sm font-medium text-zinc-400 italic py-4">No session data available</div>
                              )}
                           </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-zinc-200/60 shadow-sm">
                           <h4 className="text-base font-semibold text-zinc-900 mb-6 flex items-center gap-2">
                             <Users className="w-4 h-4 text-zinc-400" />
                             Active User Breakdown
                           </h4>
                           <div className="flex flex-col gap-3">
                              {[
                                { label: 'Active Today', value: stats.activityBreakdown.today },
                                { label: 'Active This Week', value: stats.activityBreakdown.week },
                                { label: 'Active This Month', value: stats.activityBreakdown.month }
                              ].map((item, i) => (
                                <div key={i} className="px-4 py-3 bg-zinc-50 rounded-xl border border-zinc-100 flex items-center justify-between">
                                   <span className="text-sm font-medium text-zinc-600">{item.label}</span>
                                   <span className="text-lg font-semibold text-zinc-900">{item.value} <span className="text-xs text-zinc-400 font-normal">users</span></span>
                                </div>
                              ))}
                           </div>
                        </div>
                     </div>

                     <div className="bg-zinc-950 p-8 rounded-2xl shadow-xl border border-zinc-900 relative overflow-hidden flex flex-col md:flex-row items-center gap-10">
                        {/* A nice glow effect */}
                        <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-500 rounded-full blur-[128px] opacity-20 pointer-events-none" />
                        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-purple-500 rounded-full blur-[128px] opacity-20 pointer-events-none" />
                        
                        <div className="relative z-10 flex-1 space-y-3">
                           <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                             <Sparkles className="w-3 h-3" />
                             Platform Impact
                           </div>
                           <h3 className="text-3xl font-semibold text-white tracking-tight">AI Generation Metrics</h3>
                           <p className="text-zinc-400 text-sm max-w-sm">The platform is currently serving {stats.sessions} distinct user sessions, seamlessly processing {stats.messages} intelligent iterations in total.</p>
                           <div className="flex items-center gap-8 pt-4">
                              <div>
                                 <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Avg Msgs/Session</p>
                                 <p className="text-2xl font-semibold text-zinc-100">{stats.avgMessagesPerSession.toFixed(1)}</p>
                              </div>
                              <div className="w-px h-8 bg-zinc-800" />
                              <div>
                                 <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Registered Users</p>
                                 <p className="text-2xl font-semibold text-emerald-400">{stats.users}</p>
                              </div>
                           </div>
                        </div>
                        <div className="relative z-10 w-40 h-40 shrink-0 border-8 border-zinc-800 rounded-full flex items-center justify-center">
                           <div 
                             className="absolute inset-0 border-8 border-indigo-500 rounded-full flex items-center justify-center transition-all duration-1000 ease-out" 
                             style={{ 
                               clipPath: `polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, ${50 * (1 - Math.sin((Math.round((stats.paidUsers / Math.max(stats.users, 1)) * 100) / 100) * 2 * Math.PI))}% 0%)`
                             }} 
                           />
                           <div className="text-center">
                              <p className="text-3xl font-semibold text-white">{Math.round((stats.paidUsers / Math.max(stats.users, 1)) * 100)}%</p>
                              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">Paid Tier</p>
                           </div>
                        </div>
                     </div>
                  </div>
                )}

                {/* Members Tab */}
                {activeTab === 'members' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                       <div className="bg-white p-6 rounded-2xl border border-zinc-200/60 shadow-sm flex flex-col justify-between">
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Crown className="w-3 h-3" /> Active Subscriptions</p>
                          <h4 className="text-3xl font-semibold text-zinc-900">{users.filter(u => u.subscription === 'paid').length}</h4>
                       </div>
                       <div className="bg-white p-6 rounded-2xl border border-zinc-200/60 shadow-sm flex flex-col justify-between">
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Activity className="w-3 h-3" /> Est. Monthly Rev</p>
                          <h4 className="text-3xl font-semibold text-emerald-600">${(users.filter(u => u.subscription === 'paid').length * 9.99).toFixed(2)}</h4>
                       </div>
                       <div className="bg-white p-6 rounded-2xl border border-zinc-200/60 shadow-sm flex flex-col justify-between">
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><MessageSquare className="w-3 h-3" /> Avg Sessions / User</p>
                          <h4 className="text-3xl font-semibold text-indigo-500">{(stats.sessions / Math.max(stats.users, 1)).toFixed(1)}</h4>
                       </div>
                    </div>
                    
                    <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-zinc-50 px-6 border-b border-zinc-200/60">
                              <th className="px-6 py-4 font-semibold text-zinc-500 text-[10px] uppercase tracking-widest leading-4">User</th>
                              <th className="px-6 py-4 font-semibold text-zinc-500 text-[10px] uppercase tracking-widest leading-4">Credits Today</th>
                              <th className="px-6 py-4 font-semibold text-zinc-500 text-[10px] uppercase tracking-widest leading-4">Subscription</th>
                              <th className="px-6 py-4 font-semibold text-zinc-500 text-[10px] uppercase tracking-widest leading-4 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100">
                            {users.filter(u => u.subscription === 'paid').map(u => (
                              <tr key={u.id} className="hover:bg-zinc-50/50 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <img src={u.profilePicture || `https://ui-avatars.com/api/?name=${u.name}&background=random`} alt={u.name} className="w-8 h-8 rounded-full" />
                                    <div className="flex flex-col">
                                      <span className="font-medium text-zinc-900 text-sm leading-tight">{u.name}</span>
                                      <span className="text-[11px] text-zinc-500">{u.email}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                   <div className="w-32">
                                      <div className="flex justify-between text-[10px] font-semibold text-zinc-500 mb-1.5 uppercase tracking-wider">
                                        <span>Used: {u.creditsUsedToday || 0}</span>
                                        <span>Limit: {u.creditsTotal || 30}</span>
                                      </div>
                                      <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                                        <div 
                                          className={cn("h-full transition-all", u.subscription === 'paid' ? "bg-indigo-500" : "bg-zinc-400")}
                                          style={{ width: `${Math.min(100, ((u.creditsUsedToday || 0) / (u.creditsTotal || 30)) * 100)}%` }}
                                        />
                                      </div>
                                   </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={cn(
                                    "px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest inline-flex items-center gap-1.5",
                                    u.subscription === 'paid' ? "bg-amber-100 text-amber-700 border border-amber-200/50" : "bg-zinc-100 text-zinc-500 border border-zinc-200/50"
                                  )}>
                                    {u.subscription === 'paid' ? <><Crown className="w-3 h-3" /> SALU Plus</> : 'Free Plan'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <button
                                    onClick={() => handleSubscriptionChange(u.id, u.subscription === 'paid' ? 'free' : 'paid')}
                                    className={cn(
                                      "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm",
                                      u.subscription === 'paid' 
                                        ? "bg-zinc-50 text-rose-600 border border-zinc-200 hover:bg-rose-50" 
                                        : "bg-indigo-500 text-white hover:bg-indigo-600 shadow-indigo-500/20"
                                    )}
                                  >
                                    {u.subscription === 'paid' ? 'Revoke Plus' : 'Assign Plus'}
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
                  <div className="max-w-2xl space-y-6">
                    <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-6 md:p-8 space-y-6">
                      <div className="flex items-center gap-3 pb-4 border-b border-zinc-100">
                        <Radio className="w-5 h-5 text-indigo-500" />
                        <h3 className="text-lg font-semibold text-zinc-900">System Broadcast</h3>
                      </div>
                      
                      <div className="space-y-5">
                        <div>
                          <label className="block text-sm font-semibold text-zinc-700 mb-2">Announcement Message</label>
                          <textarea 
                            value={broadcast.message}
                            onChange={(e) => setBroadcast({...broadcast, message: e.target.value})}
                            placeholder="Enter a message to display to all users..."
                            rows={4}
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none text-zinc-800"
                          />
                        </div>
                        
                        <label className="flex items-center justify-between p-4 border border-zinc-200/80 rounded-xl cursor-pointer hover:bg-zinc-50 transition-colors">
                          <div>
                            <p className="font-semibold text-zinc-900 mb-0.5">Broadcast Active</p>
                            <p className="text-sm text-zinc-500">Show this message to all connected users</p>
                          </div>
                          <div className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={broadcast.active}
                              onChange={(e) => setBroadcast({...broadcast, active: e.target.checked})}
                            />
                            <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                          </div>
                        </label>
                      </div>
                      
                      <div className="flex justify-end pt-4">
                        <button
                          onClick={handleSaveBroadcast}
                          disabled={saving}
                          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 text-white font-semibold rounded-xl hover:bg-indigo-600 transition-colors disabled:opacity-50 shadow-sm shadow-indigo-500/20"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
                          Update Broadcast
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Data Management Tab */}
                {activeTab === 'data' && (
                  <div className="max-w-2xl space-y-6">
                    <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-6 md:p-8 space-y-6">
                      <div className="flex items-center gap-3 pb-4 border-b border-zinc-100">
                        <Database className="w-5 h-5 text-indigo-500" />
                        <h3 className="text-lg font-semibold text-zinc-900">Data Operations</h3>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-4 border border-zinc-200/80 rounded-xl hover:bg-zinc-50 transition-colors">
                          <div>
                            <p className="font-semibold text-zinc-900 mb-0.5">Export Users</p>
                            <p className="text-sm text-zinc-500">Download a CSV of all registered users</p>
                          </div>
                          <button
                            onClick={handleExportUsers}
                            className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-white font-medium text-sm rounded-xl hover:bg-zinc-800 transition-colors shadow-sm"
                          >
                            <Download className="w-4 h-4" />
                            Users CSV
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-4 border border-zinc-200/80 rounded-xl hover:bg-zinc-50 transition-colors">
                          <div>
                            <p className="font-semibold text-zinc-900 mb-0.5">Export Messages</p>
                            <p className="text-sm text-zinc-500">Download a CSV of all platform interaction messages</p>
                          </div>
                          <button
                            onClick={handleExportMessages}
                            className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-white font-medium text-sm rounded-xl hover:bg-zinc-800 transition-colors shadow-sm"
                          >
                            <Download className="w-4 h-4" />
                            Messages CSV
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-4 border border-red-200/60 bg-red-50/30 rounded-xl hover:bg-red-50/50 transition-colors mt-6">
                          <div>
                            <p className="font-semibold text-red-700 mb-0.5">Clear Empty Sessions</p>
                            <p className="text-sm text-red-600/80">Delete generated chat sessions with no messages</p>
                          </div>
                          <button
                            onClick={handleClearEmptySessions}
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-2.5 bg-red-100 text-red-700 font-medium text-sm rounded-xl hover:bg-red-200 transition-colors disabled:opacity-50"
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eraser className="w-4 h-4" />}
                            Clean Up
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Settings Tab */}
                {activeTab === 'api-keys' && (
                  <div className="max-w-4xl mx-auto space-y-6">
                    <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-6 md:p-8 space-y-6 text-center">
                      <div className="inline-flex items-center justify-center p-3 bg-indigo-50 rounded-xl mb-2">
                        <Cpu className="w-8 h-8 text-indigo-500" />
                      </div>
                      <h3 className="text-xl font-bold text-zinc-900">Advanced API Configuration</h3>
                      <p className="text-zinc-500 max-w-md mx-auto">API Keys and AI model configuration have been merged into the main System Settings tab for easier management.</p>
                      <button onClick={() => setActiveTab('settings')} className="mt-4 px-6 py-3 bg-zinc-900 text-white font-medium rounded-xl hover:bg-zinc-800 transition-colors shadow-sm">Go to System Settings</button>
                    </div>
                  </div>
                )}
                {activeTab === 'settings' && (
                  <div className="max-w-3xl space-y-8">
                    <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden">
                      <div className="p-6 md:p-8 space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-zinc-100">
                          <Palette className="w-5 h-5 text-indigo-500" />
                          <h3 className="text-lg font-semibold text-zinc-900">App Customization</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="md:col-span-2 space-y-2">
                            <label className="block text-sm font-semibold text-zinc-700">App Name</label>
                            <input 
                              type="text" 
                              value={systemConfig.appName}
                              onChange={(e) => setSystemConfig({...systemConfig, appName: e.target.value})}
                              placeholder="Gemini AI"
                              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-zinc-800"
                            />
                          </div>
                          <div className="md:col-span-2 space-y-2">
                            <label className="block text-sm font-semibold text-zinc-700">Welcome Message</label>
                            <input 
                              type="text" 
                              value={systemConfig.welcomeMessage}
                              onChange={(e) => setSystemConfig({...systemConfig, welcomeMessage: e.target.value})}
                              placeholder="What can I help with?"
                              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-zinc-800"
                            />
                          </div>
                          <div className="md:col-span-2 pt-6 border-t border-zinc-100">
                            <h4 className="text-sm font-bold text-zinc-900 mb-4 uppercase tracking-wider">Payment Configuration</h4>
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-zinc-700">JazzCash Account Number</label>
                            <input 
                              type="text" 
                              value={systemConfig.jazzCashNumber}
                              onChange={(e) => setSystemConfig({...systemConfig, jazzCashNumber: e.target.value})}
                              placeholder="03XXXXXXXXX"
                              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-zinc-800"
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                                <label className="block text-sm font-semibold text-zinc-700">Payment QR Image URL</label>
                                <div className="flex gap-3">
                                  <input 
                                    type="text" 
                                    value={systemConfig.paymentQrUrl}
                                    onChange={(e) => setSystemConfig({...systemConfig, paymentQrUrl: e.target.value})}
                                    placeholder="https://image-url.com/qr.jpg"
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-zinc-800"
                                  />
                                  <div className="relative flex">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={handleQrUpload}
                                      disabled={isUploadingQr}
                                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                      title="Upload QR Code"
                                    />
                                    <button
                                      type="button"
                                      disabled={isUploadingQr}
                                      className={cn(
                                        "px-5 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 font-semibold shrink-0 min-w-[140px]",
                                        isUploadingQr && "opacity-50"
                                      )}
                                    >
                                      {isUploadingQr ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> <span>Uploading</span></>
                                      ) : (
                                        <><Upload className="w-4 h-4" /> <span>Upload</span></>
                                      )}
                                    </button>
                                  </div>
                                </div>
                                {systemConfig.paymentQrUrl && (
                                  <div className="mt-4 p-3 bg-zinc-50 border border-zinc-200 rounded-xl w-fit">
                                    <img 
                                      src={systemConfig.paymentQrUrl} 
                                      alt="Payment QR Preview" 
                                      className="h-24 w-auto rounded-lg shadow-sm"
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden">
                      <div className="p-6 md:p-8 space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-zinc-100">
                          <Cpu className="w-5 h-5 text-blue-500" />
                          <h3 className="text-lg font-semibold text-zinc-900">AI Configuration</h3>
                        </div>
                        
                        <div className="space-y-5">
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-zinc-700">Gemini API Key 1 (Primary)</label>
                            <div className="relative">
                              <input 
                                type={showApiKey ? "text" : "password"} 
                                value={systemConfig.geminiApiKey}
                                onChange={(e) => setSystemConfig({...systemConfig, geminiApiKey: e.target.value})}
                                placeholder="AIzaSy..."
                                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all pr-12 text-zinc-800 font-mono text-sm"
                              />
                              <button 
                                type="button" 
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 transition-colors"
                              >
                                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-zinc-700">Gemini API Key 2 (Backup)</label>
                            <div className="relative">
                              <input 
                                type={showApiKey ? "text" : "password"} 
                                value={systemConfig.geminiApiKey2}
                                onChange={(e) => setSystemConfig({...systemConfig, geminiApiKey2: e.target.value})}
                                placeholder="AIzaSy..."
                                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all pr-12 text-zinc-800 font-mono text-sm"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-zinc-700">Gemini API Key 3 (Backup)</label>
                            <div className="relative">
                              <input 
                                type={showApiKey ? "text" : "password"} 
                                value={systemConfig.geminiApiKey3}
                                onChange={(e) => setSystemConfig({...systemConfig, geminiApiKey3: e.target.value})}
                                placeholder="AIzaSy..."
                                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all pr-12 text-zinc-800 font-mono text-sm"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="block text-sm font-semibold text-zinc-700">Gemini API Key 4</label>
                              <div className="relative">
                                <input 
                                  type={showApiKey ? "text" : "password"} 
                                  value={systemConfig.geminiApiKey4}
                                  onChange={(e) => setSystemConfig({...systemConfig, geminiApiKey4: e.target.value})}
                                  placeholder="AIzaSy..."
                                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-zinc-800 font-mono text-sm"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="block text-sm font-semibold text-zinc-700">Gemini API Key 5</label>
                              <div className="relative">
                                <input 
                                  type={showApiKey ? "text" : "password"} 
                                  value={systemConfig.geminiApiKey5}
                                  onChange={(e) => setSystemConfig({...systemConfig, geminiApiKey5: e.target.value})}
                                  placeholder="AIzaSy..."
                                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-zinc-800 font-mono text-sm"
                                />
                              </div>
                            </div>
                          </div>
                          <p className="mt-2 text-xs font-medium text-zinc-500">The system automatically rotates through keys 1-5 if a Quota Exceeded error occurs.</p>

                          <div className="pt-6 border-t border-zinc-100 space-y-2">
                            <label className="block text-sm font-semibold text-zinc-700">Groq API Key (Final Fallback)</label>
                            <div className="relative">
                              <input 
                                type={showApiKey ? "text" : "password"} 
                                value={systemConfig.groqApiKey}
                                onChange={(e) => setSystemConfig({...systemConfig, groqApiKey: e.target.value})}
                                placeholder="gsk_..."
                                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all pr-12 text-zinc-800 font-mono text-sm"
                              />
                            </div>
                            <p className="mt-2 text-xs font-medium text-zinc-500">If all Gemini keys fail, requests fallback to Groq's high-speed API.</p>
                          </div>

                          <div className="pt-6 border-t border-zinc-100 space-y-2">
                            <label className="block text-sm font-semibold text-zinc-700">Gemini API Key (Image Generation)</label>
                            <div className="relative">
                              <input 
                                type={showApiKey ? "text" : "password"} 
                                value={systemConfig.geminiImageGenApiKey || ''}
                                onChange={(e) => setSystemConfig({...systemConfig, geminiImageGenApiKey: e.target.value})}
                                placeholder="Leave empty to use main key"
                                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all pr-12 text-zinc-800 font-mono text-sm"
                              />
                              <button 
                                type="button" 
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 transition-colors"
                              >
                                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                            <p className="mt-2 text-xs font-medium text-zinc-500">Use a secondary key purely for Image Generation. Leaves main free quota safe.</p>
                          </div>

                          <div className="pt-6 border-t border-zinc-100 space-y-2">
                            <label className="block text-sm font-semibold text-zinc-700">Default AI Model</label>
                            <select 
                              value={systemConfig.defaultModel}
                              onChange={(e) => setSystemConfig({...systemConfig, defaultModel: e.target.value})}
                              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-zinc-800 font-medium"
                            >
                              <option value="gemini-3-flash-preview">Gemini 1.5 Flash (Fastest / Recommended)</option>
                              <option value="gemini-3.1-flash-lite-preview">Gemini 1.5 Flash Lite (Use if you hit Quota errors!)</option>
                              <option value="gemini-3.1-pro-preview">Gemini 1.5 Pro (Powerful but slower)</option>
                            </select>
                            <p className="mt-2 text-xs font-medium text-zinc-500">
                              If you get <b>Quota Exceeded</b> errors on a free key, switch to <b>Gemini 1.5 Flash Lite</b>.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-6 md:p-8 space-y-6">
                      <div className="flex items-center gap-3 pb-4 border-b border-zinc-100">
                        <Cpu className="w-5 h-5 text-indigo-500" />
                        <h3 className="text-lg font-semibold text-zinc-900">Together AI (FLUX & SDXL)</h3>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-zinc-700">Together API Key</label>
                          <div className="relative">
                            <input 
                              type={showApiKey ? "text" : "password"} 
                              value={systemConfig.togetherApiKey || ""}
                              onChange={(e) => setSystemConfig({...systemConfig, togetherApiKey: e.target.value})}
                              placeholder="together_..."
                              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all pr-12 text-zinc-800 font-mono text-sm"
                            />
                            <button 
                              type="button" 
                              onClick={() => setShowApiKey(!showApiKey)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 transition-colors"
                            >
                              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <p className="mt-2 text-xs font-medium text-zinc-500">Get a key from <a href="https://api.together.xyz/settings/api-keys" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">Together AI Settings</a>. Provides ultra-fast generation with FLUX.1 models.</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-6 md:p-8 space-y-6">
                      <div className="flex items-center gap-3 pb-4 border-b border-zinc-100">
                        <Database className="w-5 h-5 text-emerald-500" />
                        <h3 className="text-lg font-semibold text-zinc-900">ImageKit Web Vault Settings</h3>
                      </div>
                      
                      <div className="space-y-5">
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-zinc-700">ImageKit Public Key</label>
                          <input 
                            type="text" 
                            value={systemConfig.imageKitPublicKey || ''}
                            onChange={(e) => setSystemConfig({...systemConfig, imageKitPublicKey: e.target.value})}
                            placeholder="public_..."
                            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-zinc-800 font-mono text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-zinc-700">ImageKit URL Endpoint</label>
                          <input 
                            type="text" 
                            value={systemConfig.imageKitUrlEndpoint || ''}
                            onChange={(e) => setSystemConfig({...systemConfig, imageKitUrlEndpoint: e.target.value})}
                            placeholder="https://ik.imagekit.io/your_id/"
                            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-zinc-800 font-mono text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-zinc-700">ImageKit Private Key (Optional)</label>
                          <div className="relative">
                            <input 
                              type={showApiKey ? "text" : "password"} 
                              value={systemConfig.imageKitPrivateKey || ''}
                              onChange={(e) => setSystemConfig({...systemConfig, imageKitPrivateKey: e.target.value})}
                              placeholder="private_..."
                              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-zinc-800 font-mono text-sm pr-12"
                            />
                            <button 
                              type="button" 
                              onClick={() => setShowApiKey(!showApiKey)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 transition-colors"
                            >
                              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <p className="mt-2 text-xs font-medium text-zinc-500">
                          These keys let the app securely save generated media into your public <a href="https://imagekit.io" target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline">ImageKit</a> gallery. 
                        </p>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-6 md:p-8 space-y-6">
                      <div className="flex items-center gap-3 pb-4 border-b border-zinc-100">
                        <Settings className="w-5 h-5 text-zinc-700" />
                        <h3 className="text-lg font-semibold text-zinc-900">System Preferences</h3>
                      </div>
                      
                      <div className="space-y-3">
                        <label className="flex items-center justify-between p-4 border border-zinc-200/80 rounded-xl cursor-pointer hover:bg-zinc-50 transition-colors">
                          <div>
                            <p className="font-semibold text-zinc-900 mb-0.5">Live AI Mode</p>
                            <p className="text-sm text-zinc-500">Enable real-time voice and video AI features</p>
                          </div>
                          <div className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={systemConfig.liveAiMode}
                              onChange={(e) => setSystemConfig({...systemConfig, liveAiMode: e.target.checked})}
                            />
                            <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-900"></div>
                          </div>
                        </label>

                        <label className="flex items-center justify-between p-4 border border-zinc-200/80 rounded-xl cursor-pointer hover:bg-zinc-50 transition-colors">
                          <div>
                            <p className="font-semibold text-zinc-900 mb-0.5">Maintenance Mode</p>
                            <p className="text-sm text-zinc-500">Disable access for non-admin users</p>
                          </div>
                          <div className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={systemConfig.maintenanceMode}
                              onChange={(e) => setSystemConfig({...systemConfig, maintenanceMode: e.target.checked})}
                            />
                            <div className="w-11 h-6 bg-amber-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-amber-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                          </div>
                        </label>

                        <label className="flex items-center justify-between p-4 border border-zinc-200/80 rounded-xl cursor-pointer hover:bg-zinc-50 transition-colors">
                          <div>
                            <p className="font-semibold text-zinc-900 mb-0.5">Public Registration</p>
                            <p className="text-sm text-zinc-500">Allow new users to sign up</p>
                          </div>
                          <div className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={systemConfig.publicRegistration}
                              onChange={(e) => setSystemConfig({...systemConfig, publicRegistration: e.target.checked})}
                            />
                            <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <button
                        onClick={handleSaveConfig}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 transition-colors disabled:opacity-50 shadow-sm"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Save Settings
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-2.5 rounded-xl text-white",
                  selectedMessage.role === 'user' ? "bg-blue-500" : "bg-indigo-500"
                )}>
                  {selectedMessage.role === 'user' ? <Users className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 tracking-tight">
                    {selectedMessage.role === 'user' ? 'User Message' : 'AI Response'}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    {selectedMessage.user ? `${selectedMessage.user.name} (${selectedMessage.user.email})` : 'Unknown User'} • {selectedMessage.timestamp?.toDate?.() ? selectedMessage.timestamp.toDate().toLocaleString() : new Date(selectedMessage.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedMessage(null)}
                className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap font-medium">
                {selectedMessage.content || <span className="italic text-slate-400">No text content</span>}
              </div>

              {selectedMessage.attachments?.length > 0 && (
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Attachments ({selectedMessage.attachments.length})</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {selectedMessage.attachments.map((att: any, idx: number) => (
                      <div key={idx} className="bg-slate-50 rounded-xl border border-slate-200/60 p-3 flex flex-col gap-2">
                        {att.type?.startsWith('image/') ? (
                          <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-200">
                            <img src={att.url} alt="Attachment" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="aspect-video rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-400">
                            <FileBox className="w-8 h-8" />
                          </div>
                        )}
                        <span className="text-[10px] font-bold text-slate-500 truncate" title={att.name}>{att.name || 'document'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center gap-4">
               <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                 Session ID: {selectedMessage.sessionId || 'Unknown'}
               </span>
               <button 
                 onClick={() => setSelectedMessage(null)}
                 className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors"
               >
                 Close
               </button>
            </div>
          </div>
        </div>
      )}

    </motion.div>
  );
}
