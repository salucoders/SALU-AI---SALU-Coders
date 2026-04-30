import fs from 'fs';
let content = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

const regex = /{\/\* Sidebar \*\/}.*?<\/button>\s*<\/div>\s*<\/div>/s;

const replacement = `{/* Sidebar */}
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
        </div>`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/AdminPanel.tsx', content);
