import { useState, useEffect } from 'react';
import { usePageTitle } from '../lib/usePageTitle';
import { useAppStore } from '../store';
import { 
  User, Mail, MapPin, Shield, Edit2, Check, X, Package, Heart, 
  LogOut, LayoutDashboard, Settings, CreditCard, Bell, 
  ChevronRight, ArrowUpRight, Wallet, History, Lock, Eye, EyeOff, Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { toastSuccess, toast } from '../components/Toast';
import { supabase } from '../lib/supabase';

export default function Profile() {
  usePageTitle('Account Settings');
  const { user, logout, updateProfile, walletBalance } = useAppStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);

  // Mock user for previewing when not logged in
  const demoUser = {
    name: 'Rabin Mahara',
    email: 'hello@rabin.me',
    role: 'influencer',
    id: 'demo-123'
  };

  const activeUser = user || demoUser;

  // Derived state or placeholders for extended features
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    if (activeUser) {
      setEditName(activeUser.name);
      loadRecentOrders();
    }
  }, [activeUser]);

  const loadRecentOrders = async () => {
    // Only fetch if we have a real user
    if (!user) {
      setRecentOrders([
        { id: 'ORD-8822', total_amount: 14500, created_at: new Date().toISOString(), status: 'delivered' },
        { id: 'ORD-7711', total_amount: 8900, created_at: new Date().toISOString(), status: 'processing' }
      ]);
      return;
    }
    setLoadingOrders(true);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3);
    if (data) setRecentOrders(data);
    setLoadingOrders(false);
  };

  // if (!user) return null; // Bypassed for preview

  const handleSaveProfile = async () => {
    setIsSaving(true);
    const result = await updateProfile({ name: editName });
    setIsSaving(false);
    if (result.success) {
      toastSuccess('Identity updated!');
      setIsEditing(false);
    } else {
      toast(result.error || 'Failed to update', 'error');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'orders',   label: 'My Orders', icon: Package },
    { id: 'wallet',   label: 'Wallet', icon: Wallet },
    { id: 'address',  label: 'Addresses', icon: MapPin },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      
      {/* 📱 MOBILE VERSION (md:hidden) */}
      <div className="md:hidden pb-20">
        {/* 📥 Elite Nano-Header */}
        <div className="bg-[#0D47A1] pb-10 pt-6 px-4 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
             <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2" />
          </div>
          
          <div className="max-w-4xl mx-auto flex items-center gap-4 relative z-10">
             <div className="w-16 h-16 rounded-[20px] bg-white p-0.5 shadow-2xl">
                <div className="w-full h-full rounded-[18px] bg-gradient-to-br from-[#0D47A1] to-[#1565C0] flex items-center justify-center border border-white/10">
                   <span className="text-2xl font-black text-white">{activeUser.name.charAt(0).toUpperCase()}</span>
                </div>
             </div>
             <div className="flex-1">
                <div className="flex items-center gap-2">
                   <h1 className="text-xl font-black text-white tracking-tight">{activeUser.name}</h1>
                   <span className="px-1.5 py-0.5 bg-white/15 backdrop-blur-md text-white text-[7px] font-black uppercase tracking-widest rounded-full border border-white/20">{activeUser.role}</span>
                </div>
                <p className="text-blue-100/60 text-[9px] font-bold uppercase tracking-widest mt-0.5 truncate max-w-[200px]">{activeUser.email}</p>
             </div>
             <button onClick={() => logout()} className="w-10 h-10 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-xl flex items-center justify-center active:scale-90 transition-all">
                <LogOut size={16} />
             </button>
          </div>
        </div>

        {/* 🧭 Horizontal Nano-Nav */}
        <div className="sticky top-0 z-[100] bg-white/80 backdrop-blur-xl border-b border-gray-100 overflow-x-auto no-scrollbar">
           <div className="flex items-center px-4 py-2 gap-3 min-w-max">
              {tabs.map(tab => {
                 const Icon = tab.icon;
                 const active = activeTab === tab.id;
                 return (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-[#0D47A1] text-white shadow-lg shadow-blue-900/10' : 'text-gray-400 hover:text-gray-900'}`}>
                       <Icon size={12} className={active ? 'text-white' : 'text-gray-300'} />
                       {tab.label}
                    </button>
                 );
              })}
           </div>
        </div>

        {/* 🏰 Main Dashboard Content */}
        <div className="max-w-4xl mx-auto p-4 content-fade-in">
           <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                 
                 {activeTab === 'overview' && (
                    <div className="space-y-4">
                       {/* Bountique Wallet Row */}
                       <div className="grid grid-cols-2 gap-3">
                          <div className="p-5 rounded-[24px] bg-gradient-to-br from-[#0D47A1] to-[#1565C0] text-white shadow-xl relative overflow-hidden">
                             <Wallet className="absolute -right-2 -bottom-2 w-16 h-16 opacity-10" />
                             <p className="text-[8px] font-black opacity-60 uppercase tracking-widest mb-1">Treasury Balance</p>
                             <h3 className="text-xl font-black italic">₹{walletBalance?.toLocaleString('en-IN') || '0'}</h3>
                          </div>
                          <div className="p-5 rounded-[24px] bg-white border border-gray-100 shadow-sm flex flex-col justify-between">
                             <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Global XP</p>
                             <div className="flex items-end justify-between">
                                <h3 className="text-xl font-black text-gray-900">450</h3>
                                <span className="text-[7px] font-black text-blue-500 uppercase">LVL 12</span>
                             </div>
                          </div>
                       </div>

                       {/* Progress & Badge Island */}
                       <div className="p-5 rounded-[28px] bg-gray-900 text-white relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
                          <div className="relative z-10">
                             <div className="flex justify-between items-center mb-4">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400">Mastery Progress</h4>
                                <span className="text-[9px] font-black bg-blue-500/20 px-2 py-0.5 rounded border border-blue-500/30">ELITE</span>
                             </div>
                             <div className="w-full h-1.5 bg-white/10 rounded-full mb-2">
                                <div className="h-full bg-blue-400 rounded-full" style={{ width: '81%' }} />
                             </div>
                             <div className="flex justify-between text-[7px] font-black text-gray-400 uppercase">
                                <span>2,450 XP EARNED</span>
                                <span>NEXT LVL @ 3,000</span>
                             </div>
                          </div>
                       </div>

                       {/* Quick Actions List */}
                       <div className="space-y-3 pt-4">
                          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">Identity Management</h3>
                          <div className="p-4 bg-white rounded-[24px] border border-gray-100 flex items-center justify-between gap-4">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-[#F57C00]"><Shield size={16}/></div>
                                <div>
                                   <p className="text-[11px] font-black text-gray-900 leading-none mb-1">{activeUser.name}</p>
                                   <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Verified Identity</p>
                                </div>
                             </div>
                             <button onClick={() => setIsEditing(true)} className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 active:bg-gray-50 transition-all"><Edit2 size={12}/></button>
                          </div>

                          <Link to="/notifications" className="p-4 bg-white rounded-[24px] border border-gray-100 flex items-center justify-between group">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-blue-500"><Bell size={16}/></div>
                                <p className="text-[11px] font-black text-gray-900 uppercase tracking-tight">System Alerts</p>
                             </div>
                             <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-900 transition-colors" />
                          </Link>
                       </div>
                    </div>
                 )}

                 {activeTab === 'orders' && (
                    <div className="py-20 flex flex-col items-center text-center">
                       <div className="w-20 h-20 bg-blue-50 rounded-[32px] flex items-center justify-center text-[#0D47A1] mb-6"><Package size={32}/></div>
                       <h2 className="text-xl font-black text-gray-900 uppercase">Order Stream</h2>
                       <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wide mt-2">See your pipeline items</p>
                       <Link to="/my-orders" className="mt-6 px-10 py-3 bg-[#0D47A1] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl">Go to Orders</Link>
                    </div>
                 )}

                 {(activeTab === 'wallet' || activeTab === 'address' || activeTab === 'settings') && (
                    <div className="py-20 flex flex-col items-center text-center opacity-50">
                       <span className="text-4xl mb-4">⚙️</span>
                       <h2 className="text-[14px] font-black text-gray-900 uppercase tracking-widest">Under Construction</h2>
                       <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight mt-1 max-w-[200px]">We are fine-tuning this boutique experience for your account.</p>
                    </div>
                 )}

              </motion.div>
           </AnimatePresence>
        </div>

        <footer className="px-6 mt-10 py-10 border-t border-gray-100 flex flex-col items-center">
           <div className="flex items-center gap-4 text-gray-200 font-black text-[7px] uppercase tracking-[0.3em]">
              <span>STABLE_V1.4</span>
              <div className="w-1 h-1 bg-gray-200 rounded-full" />
              <span>GLOBAL_SYNC</span>
              <div className="w-1 h-1 bg-gray-200 rounded-full" />
              <span>2026 BYNDIO</span>
           </div>
        </footer>
      </div>

      {/* 🖥️ DESKTOP VERSION (hidden md:block) */}
      <div className="hidden md:block min-h-screen bg-[#F4F7FE]">
        {/* Desktop Header */}
        <div className="bg-[#0D47A1] text-white p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent pointer-events-none" />
          <div className="max-w-7xl mx-auto flex items-center justify-between relative z-10">
            <div className="flex items-center gap-8">
              <div className="relative">
                <div className="w-28 h-28 bg-white rounded-[32px] flex items-center justify-center text-[#0D47A1] text-6xl font-black border-4 border-white/20 shadow-2xl">
                  {activeUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="absolute bottom-1 right-1 w-6 h-6 bg-[#4CAF50] rounded-full border-4 border-[#0D47A1]" />
              </div>
              <div>
                <div className="flex items-center gap-4">
                  <h1 className="text-4xl font-black">{activeUser.name}</h1>
                  <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-black uppercase tracking-widest border border-white/30">{activeUser.role} PRO</span>
                </div>
                <div className="flex items-center gap-4 mt-2">
                   <p className="text-blue-100/70 font-bold flex items-center gap-2 text-[15px]">
                     <Mail size={16} /> {activeUser.email}
                   </p>
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              {activeUser.role === 'admin' && (
                <Link to="/admin" className="flex items-center gap-2.5 px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-[13px] font-black uppercase tracking-widest transition-all backdrop-blur-sm">
                  <LayoutDashboard size={20} /> Control Panel
                </Link>
              )}
              <button onClick={() => logout()} className="flex items-center gap-2.5 px-8 py-3 bg-red-500 hover:bg-red-600 rounded-2xl text-[13px] font-black uppercase tracking-widest transition-all shadow-xl shadow-red-900/20">
                <LogOut size={20} /> Log Out
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Body */}
        <div className="max-w-7xl mx-auto px-8 -mt-8 pb-20 flex gap-8 relative z-20">
          {/* Sidebar */}
          <div className="w-80 shrink-0">
            <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-blue-900/5 border border-gray-100 sticky top-8">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-8">Menu Navigation</p>
              <div className="space-y-3">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[14px] font-black transition-all ${active ? 'bg-[#E3F2FD] text-[#0D47A1]' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'}`}>
                      <Icon size={20} />
                      {tab.label}
                      {active && <div className="ml-auto w-2 h-2 bg-[#0D47A1] rounded-full shadow-[0_0_8px_rgba(13,71,161,0.5)]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            <div className="bg-white rounded-[48px] p-12 shadow-xl shadow-blue-900/5 border border-gray-100 min-h-[700px]">
              <div className="flex justify-between items-center mb-12">
                <h2 className="text-3xl font-black text-gray-900">Dashboard Overview</h2>
                <div className="flex items-center gap-3 text-[12px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-5 py-2 rounded-full border border-blue-100">
                  <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                  Live Sync Active
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                  
                  {activeTab === 'overview' && (
                    <div className="space-y-10">
                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-8">
                        {/* Wallet Card */}
                        <div className="bg-gradient-to-br from-[#0D47A1] to-[#1565C0] rounded-[40px] p-10 text-white relative overflow-hidden shadow-2xl shadow-blue-900/30 group">
                          <Wallet className="absolute -right-6 -bottom-6 w-40 h-40 opacity-10 group-hover:scale-110 transition-transform duration-700" />
                          <div className="relative z-10 h-full flex flex-col justify-between">
                            <div className="flex justify-between items-center mb-12">
                              <div className="w-16 h-16 bg-white/15 backdrop-blur-md rounded-[24px] flex items-center justify-center border border-white/20">
                                <Wallet size={32} />
                              </div>
                              <span className="text-[11px] font-black bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full uppercase tracking-wider">Live Balance</span>
                            </div>
                            <div>
                              <p className="text-[12px] font-black opacity-60 uppercase tracking-widest mb-2">Wallet Credit</p>
                              <h3 className="text-5xl font-black italic">₹{walletBalance?.toLocaleString('en-IN') || '0'}</h3>
                            </div>
                          </div>
                        </div>
                        
                        {/* Orders Card */}
                        <div className="bg-white rounded-[40px] p-10 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-2xl hover:border-blue-100 transition-all group">
                          <div className="flex justify-between items-center">
                             <div className="w-16 h-16 bg-blue-50 rounded-[24px] flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform duration-500">
                                <Package size={32} />
                             </div>
                             <Link to="/my-orders" className="text-[11px] font-black text-blue-500 uppercase tracking-widest hover:underline bg-blue-50/50 px-4 py-2 rounded-full transition-colors">View All</Link>
                          </div>
                          <div>
                             <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Orders</p>
                             <h3 className="text-5xl font-black text-gray-900 tracking-tight">{recentOrders.length}</h3>
                          </div>
                        </div>

                        {/* Reward Points Card */}
                        <div className="bg-[#FFF8E1] rounded-[40px] p-10 text-[#FF8F00] flex flex-col justify-between border border-[#FFECB3] relative overflow-hidden group">
                          <Star className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 group-hover:rotate-12 transition-transform duration-700" />
                          <div className="flex justify-between items-center">
                             <div className="w-16 h-16 bg-white rounded-[24px] flex items-center justify-center shadow-md">
                                <Star size={32} fill="#FF8F00" stroke="none" />
                             </div>
                             <span className="text-[11px] font-black bg-white px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm">Bonus</span>
                          </div>
                          <div>
                             <p className="text-[12px] font-black opacity-60 uppercase tracking-widest mb-2">Reward Points</p>
                             <h3 className="text-5xl font-black text-gray-900 tracking-tight">450</h3>
                          </div>
                        </div>
                      </div>

                      {/* Loyalty & Activity Row */}
                      <div className="grid grid-cols-2 gap-10 pt-4">
                        {/* Loyalty Level Card */}
                        <div className="bg-[#050B14] rounded-[48px] p-10 text-white relative overflow-hidden shadow-2xl">
                           <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px]" />
                           <div className="relative z-10 h-full flex flex-col">
                              <div className="flex justify-between items-start mb-10">
                                 <div>
                                    <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest mb-2">Loyalty Level</p>
                                    <h4 className="text-3xl font-black flex items-center gap-3 italic">LEVEL 12 <span className="text-[14px] bg-blue-600 px-3 py-1 rounded-lg text-white font-black not-italic shadow-lg shadow-blue-600/30">PRO</span></h4>
                                 </div>
                                 <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-yellow-500 shadow-inner">
                                    <Star size={32} fill="currentColor" />
                                 </div>
                              </div>
                              <div className="space-y-6">
                                 <div className="flex justify-between text-[13px] font-black uppercase text-gray-400 tracking-widest">
                                    <span>XP Progress: 2,450 / 3,000</span>
                                    <span className="text-blue-400">81%</span>
                                 </div>
                                 <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                                    <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.6)]" style={{ width: '81%' }} />
                                 </div>
                                 <div className="pt-8">
                                    <p className="text-[12px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Earned Elite Badges</p>
                                    <div className="flex flex-wrap gap-3">
                                       {['Early Bird', 'Bulk Shopper', 'Top Promoter', 'Verified Seller', 'Winner'].map(badge => (
                                          <span key={badge} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase text-white/70 hover:bg-white/10 transition-colors cursor-default tracking-wider">{badge}</span>
                                       ))}
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>

                        {/* Recent Activity Card */}
                        <div className="flex flex-col h-full">
                           <h4 className="text-[15px] font-black text-gray-900 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                              <History size={22} className="text-blue-500" /> Recent Activity
                           </h4>
                           <div className="flex-1 space-y-4">
                              <div className="flex flex-col items-center justify-center h-full bg-gray-50 rounded-[48px] border-2 border-dashed border-gray-100 opacity-80 group hover:bg-blue-50/30 hover:border-blue-100 transition-all duration-500">
                                 <div className="w-20 h-20 bg-white rounded-[32px] shadow-sm flex items-center justify-center text-gray-300 mb-6 group-hover:scale-110 transition-transform">
                                    <Package size={32} />
                                 </div>
                                 <p className="text-[15px] font-bold text-gray-400">No recent orders found.</p>
                                 <Link to="/products" className="text-[12px] font-black text-blue-500 uppercase tracking-widest mt-4 hover:underline flex items-center gap-2">
                                    Start Shopping <ArrowUpRight size={16} />
                                 </Link>
                              </div>
                           </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab !== 'overview' && (
                    <div className="py-32 flex flex-col items-center text-center">
                       <div className="w-24 h-24 bg-blue-50 rounded-[40px] flex items-center justify-center text-[#0D47A1] mb-8 shadow-inner"><Settings size={40} className="animate-spin-slow"/></div>
                       <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Section Under Refinement</h2>
                       <p className="text-[14px] text-gray-400 font-bold uppercase tracking-widest mt-4 max-w-md mx-auto leading-relaxed">We are currently fine-tuning this specific dashboard module to provide you with the most premium experience possible.</p>
                       <button onClick={() => setActiveTab('overview')} className="mt-10 px-12 py-4 bg-[#0D47A1] text-white rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-2xl shadow-blue-900/20 hover:-translate-y-1 transition-transform">Return to Overview</button>
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
