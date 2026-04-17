import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, Settings, Activity, Shield, Key, Database, Server, X, Check, AlertCircle, Loader2, MessageSquare, Radio, Trash2, Download, Eraser, Palette, Cpu, Eye, EyeOff } from 'lucide-react';
import { collection, getDocs, doc, updateDoc, deleteDoc, getDoc, setDoc, query, where, collectionGroup } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useUserProfile } from '../context/UserProfileContext';
import { cn } from '../lib/utils';

interface AdminPanelProps {
  onClose: () => void;
}

export function AdminPanel({ onClose }: AdminPanelProps) {
  const { user } = useAuth();
  const { preferences } = useUserProfile();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'broadcast' | 'settings' | 'data'>('dashboard');
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({ users: 0, sessions: 0, messages: 0 });
  const [loading, setLoading] = useState(true);
  const [systemConfig, setSystemConfig] = useState({
    maintenanceMode: false,
    publicRegistration: true,
    liveAiMode: true,
    geminiApiKey: '',
    defaultModel: 'gemini-2.0-flash',
    appName: 'SALU AI',
    welcomeMessage: 'What can I help with?'
  });
  const [broadcast, setBroadcast] = useState({
    message: '',
    active: false
  });
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

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
          defaultModel: d.defaultModel ?? prev.defaultModel
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
        defaultModel: systemConfig.defaultModel
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
    link.setAttribute("download", "salu_ai_users.csv");
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
      className="fixed inset-0 z-50 flex bg-slate-50/80 backdrop-blur-sm overflow-hidden"
    >
      <div className="w-full h-full bg-white shadow-2xl flex flex-col md:flex-row overflow-hidden">
        
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-slate-900 text-white flex flex-col shrink-0">
          <div className="p-6 flex items-center justify-between md:justify-start gap-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg leading-tight">Admin Panel</h2>
                <p className="text-xs text-slate-400">SALU AI Dashboard</p>
              </div>
            </div>
            <button onClick={onClose} className="md:hidden p-2 text-slate-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 py-6 px-4 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap",
                activeTab === 'dashboard' ? "bg-rose-500 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Activity className="w-5 h-5" />
              <span className="font-medium">Dashboard</span>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap",
                activeTab === 'users' ? "bg-rose-500 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Users className="w-5 h-5" />
              <span className="font-medium">User Management</span>
            </button>
            <button
              onClick={() => setActiveTab('broadcast')}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap",
                activeTab === 'broadcast' ? "bg-rose-500 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Radio className="w-5 h-5" />
              <span className="font-medium">Broadcast</span>
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap",
                activeTab === 'data' ? "bg-rose-500 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Database className="w-5 h-5" />
              <span className="font-medium">Data Management</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap",
                activeTab === 'settings' ? "bg-rose-500 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Settings className="w-5 h-5" />
              <span className="font-medium">System Settings</span>
            </button>
          </div>
          
          <div className="p-6 border-t border-slate-800 hidden md:block">
            <button onClick={onClose} className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors w-full">
              <X className="w-5 h-5" />
              <span className="font-medium">Close Panel</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 relative">
          
          {/* Header */}
          <div className="h-16 md:h-20 bg-white border-b border-slate-200 flex items-center px-6 md:px-10 shrink-0">
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 capitalize">
              {activeTab.replace('-', ' ')}
            </h1>
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
                  <div className="space-y-6 md:space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center shrink-0">
                          <Users className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-500">Total Users</p>
                          <h3 className="text-2xl font-bold text-slate-800">{stats.users}</h3>
                        </div>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center shrink-0">
                          <MessageSquare className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-500">Total Sessions</p>
                          <h3 className="text-2xl font-bold text-slate-800">{stats.sessions}</h3>
                        </div>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center shrink-0">
                          <MessageSquare className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-500">Total Messages</p>
                          <h3 className="text-2xl font-bold text-slate-800">{stats.messages}</h3>
                        </div>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center shrink-0">
                          <Server className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-500">Server Status</p>
                          <h3 className="text-2xl font-bold text-slate-800">Online</h3>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="p-4 font-semibold text-slate-600 text-sm">User</th>
                            <th className="p-4 font-semibold text-slate-600 text-sm">Email</th>
                            <th className="p-4 font-semibold text-slate-600 text-sm">Role</th>
                            <th className="p-4 font-semibold text-slate-600 text-sm">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map(u => (
                            <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <img src={u.profilePicture || `https://ui-avatars.com/api/?name=${u.name}&background=random`} alt={u.name} className="w-8 h-8 rounded-full" />
                                  <span className="font-medium text-slate-800">{u.name}</span>
                                </div>
                              </td>
                              <td className="p-4 text-slate-600 text-sm">{u.email}</td>
                              <td className="p-4">
                                <span className={cn(
                                  "px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                                  u.role === 'admin' ? "bg-rose-100 text-rose-600" :
                                  u.role === 'suspended' ? "bg-orange-100 text-orange-600" :
                                  "bg-slate-100 text-slate-600"
                                )}>
                                  {u.role}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <select 
                                    value={u.role}
                                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                    disabled={u.id === user?.uid || u.email === 'salucoders@gmail.com'}
                                    className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-rose-500 focus:border-rose-500 block w-full p-2 disabled:opacity-50"
                                  >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                    <option value="suspended">Suspended</option>
                                  </select>
                                  <button
                                    onClick={() => handleDeleteUser(u.id)}
                                    disabled={u.id === user?.uid || u.email === 'salucoders@gmail.com'}
                                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                                    title="Delete User"
                                  >
                                    <Trash2 className="w-5 h-5" />
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

                {/* Broadcast Tab */}
                {activeTab === 'broadcast' && (
                  <div className="max-w-2xl space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
                      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                        <Radio className="w-5 h-5 text-rose-500" />
                        <h3 className="text-lg font-bold text-slate-800">System Broadcast</h3>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Announcement Message</label>
                          <textarea 
                            value={broadcast.message}
                            onChange={(e) => setBroadcast({...broadcast, message: e.target.value})}
                            placeholder="Enter a message to display to all users..."
                            rows={4}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all resize-none"
                          />
                        </div>
                        
                        <label className="flex items-center justify-between p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                          <div>
                            <p className="font-medium text-slate-800">Broadcast Active</p>
                            <p className="text-sm text-slate-500">Show this message to all connected users</p>
                          </div>
                          <div className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={broadcast.active}
                              onChange={(e) => setBroadcast({...broadcast, active: e.target.checked})}
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                          </div>
                        </label>
                      </div>
                      
                      <div className="flex justify-end pt-4">
                        <button
                          onClick={handleSaveBroadcast}
                          disabled={saving}
                          className="flex items-center gap-2 px-6 py-3 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 transition-colors disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Radio className="w-5 h-5" />}
                          Update Broadcast
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Data Management Tab */}
                {activeTab === 'data' && (
                  <div className="max-w-2xl space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
                      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                        <Database className="w-5 h-5 text-rose-500" />
                        <h3 className="text-lg font-bold text-slate-800">Data Operations</h3>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                          <div>
                            <p className="font-medium text-slate-800">Export Users</p>
                            <p className="text-sm text-slate-500">Download a CSV of all registered users</p>
                          </div>
                          <button
                            onClick={handleExportUsers}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            Export CSV
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                          <div>
                            <p className="font-medium text-slate-800">Clear Empty Sessions</p>
                            <p className="text-sm text-slate-500">Delete chat sessions with no messages</p>
                          </div>
                          <button
                            onClick={handleClearEmptySessions}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 font-medium rounded-lg hover:bg-rose-100 transition-colors disabled:opacity-50"
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
                {activeTab === 'settings' && (
                  <div className="max-w-2xl space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
                      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                        <Palette className="w-5 h-5 text-rose-500" />
                        <h3 className="text-lg font-bold text-slate-800">App Customization</h3>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">App Name</label>
                          <input 
                            type="text" 
                            value={systemConfig.appName}
                            onChange={(e) => setSystemConfig({...systemConfig, appName: e.target.value})}
                            placeholder="SALU AI"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Welcome Message</label>
                          <input 
                            type="text" 
                            value={systemConfig.welcomeMessage}
                            onChange={(e) => setSystemConfig({...systemConfig, welcomeMessage: e.target.value})}
                            placeholder="What can I help with?"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
                      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                        <Cpu className="w-5 h-5 text-rose-500" />
                        <h3 className="text-lg font-bold text-slate-800">AI Configuration</h3>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Gemini API Key</label>
                          <div className="relative">
                            <input 
                              type={showApiKey ? "text" : "password"} 
                              value={systemConfig.geminiApiKey}
                              onChange={(e) => setSystemConfig({...systemConfig, geminiApiKey: e.target.value})}
                              placeholder="AIzaSy..."
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all pr-12"
                            />
                            <button 
                              type="button" 
                              onClick={() => setShowApiKey(!showApiKey)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                          <p className="mt-2 text-xs text-slate-500">Get a free key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-rose-500 hover:underline">Google AI Studio</a>.</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Default AI Model</label>
                          <select 
                            value={systemConfig.defaultModel}
                            onChange={(e) => setSystemConfig({...systemConfig, defaultModel: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                          >
                            <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fastest / Recommended)</option>
                            <option value="gemini-1.5-flash">Gemini 1.5 Flash (Use if you hit Quota errors!)</option>
                            <option value="gemini-1.5-pro">Gemini 1.5 Pro (Powerful but slower)</option>
                            <option value="gemini-1.5-flash-8b">Gemini 1.5 Flash-8B (High rate limits)</option>
                          </select>
                          <p className="mt-2 text-xs text-slate-500">
                            If you get <b>Quota Exceeded</b> errors on a free key, switch to <b>Gemini 1.5 Flash</b> or <b>Gemini 1.5 Flash-8B</b>.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
                      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                        <Settings className="w-5 h-5 text-rose-500" />
                        <h3 className="text-lg font-bold text-slate-800">System Preferences</h3>
                      </div>
                      
                      <div className="space-y-4">
                        <label className="flex items-center justify-between p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                          <div>
                            <p className="font-medium text-slate-800">Live AI Mode</p>
                            <p className="text-sm text-slate-500">Enable real-time voice and video AI features</p>
                          </div>
                          <div className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={systemConfig.liveAiMode}
                              onChange={(e) => setSystemConfig({...systemConfig, liveAiMode: e.target.checked})}
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                          </div>
                        </label>

                        <label className="flex items-center justify-between p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                          <div>
                            <p className="font-medium text-slate-800">Maintenance Mode</p>
                            <p className="text-sm text-slate-500">Disable access for non-admin users</p>
                          </div>
                          <div className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={systemConfig.maintenanceMode}
                              onChange={(e) => setSystemConfig({...systemConfig, maintenanceMode: e.target.checked})}
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                          </div>
                        </label>

                        <label className="flex items-center justify-between p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                          <div>
                            <p className="font-medium text-slate-800">Public Registration</p>
                            <p className="text-sm text-slate-500">Allow new users to sign up</p>
                          </div>
                          <div className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={systemConfig.publicRegistration}
                              onChange={(e) => setSystemConfig({...systemConfig, publicRegistration: e.target.checked})}
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveConfig}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 transition-colors disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                        Save Changes
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
