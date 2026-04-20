import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast, toastSuccess } from '../components/Toast';
import { Package, Wallet, MapPin, Lock, Settings, Plus, Trash2, ArrowUpRight, ArrowDownRight, Save } from 'lucide-react';
import { Link } from 'react-router-dom';

export function OrdersSection({ user }: { user: any }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user.id.startsWith('demo-')) {
      setOrders([
        { id: 'ORD-8822', total_amount: 14500, created_at: new Date().toISOString(), status: 'delivered' },
        { id: 'ORD-7711', total_amount: 8900, created_at: new Date().toISOString(), status: 'processing' }
      ]);
      setLoading(false);
      return;
    }
    supabase.from('orders').select('*').eq('buyer_id', user.id).order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setOrders(data);
      setLoading(false);
    });
  }, [user.id]);

  if (loading) return <div className="py-20 text-center font-bold text-gray-400 animate-pulse">Loading orders...</div>;

  if (orders.length === 0) return (
    <div className="py-20 flex flex-col items-center text-center opacity-70">
       <div className="w-20 h-20 bg-blue-50 rounded-[32px] flex items-center justify-center text-[#0D47A1] mb-6"><Package size={32}/></div>
       <h2 className="text-xl font-black text-gray-900 uppercase">No Orders Yet</h2>
       <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wide mt-2">Start shopping to see your history.</p>
       <Link to="/products" className="mt-6 px-10 py-3 bg-[#0D47A1] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:-translate-y-1 transition-transform">Browse Products</Link>
    </div>
  );

  return (
    <div className="space-y-4">
      {orders.map(o => (
        <div key={o.id} className="bg-white border border-gray-100 rounded-[24px] p-6 shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Order ID</span>
              <p className="font-bold text-gray-900 group-hover:text-[#0D47A1] transition-colors">#{o.id.split('-')[0].toUpperCase()}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</span>
              <p className="font-black text-[#0D47A1]">₹{o.total_amount?.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex justify-between items-end">
            <div>
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</span>
               <p className="text-[12px] font-bold text-gray-700">{new Date(o.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
              o.status === 'delivered' ? 'bg-green-100 text-green-700' :
              o.status === 'processing' || o.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-600'
            }`}>{o.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function WalletSection({ user, balance }: { user: any, balance: number }) {
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user.id.startsWith('demo-')) {
      setTxns([
        { id: 1, type: 'credit', amount: 500, description: 'Signup Bonus', created_at: new Date().toISOString() }
      ]);
      setLoading(false);
      return;
    }
    supabase.from('wallet_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20).then(({ data }) => {
      if (data) setTxns(data);
      setLoading(false);
    });
  }, [user.id]);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-[#0D47A1] to-[#1565C0] rounded-[32px] p-8 text-white relative overflow-hidden shadow-xl shadow-blue-900/20">
        <Wallet className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10" />
        <div className="relative z-10">
          <p className="text-[11px] font-black opacity-60 uppercase tracking-widest mb-1">Available Balance</p>
          <h3 className="text-4xl font-black italic">₹{balance?.toLocaleString('en-IN') || '0'}</h3>
          <div className="mt-6 flex gap-3">
            <button className="px-6 py-2.5 bg-white text-[#0D47A1] rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 transition-transform" onClick={() => toast('Withdrawals coming soon', 'info')}>Withdraw</button>
            <button className="px-6 py-2.5 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-colors" onClick={() => toast('Top-up coming soon', 'info')}>Add Funds</button>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-[12px] font-black text-gray-400 uppercase tracking-widest mb-4 pl-2">Recent Transactions</h3>
        {loading ? <div className="text-center font-bold text-gray-400 animate-pulse py-10">Loading...</div> : 
         txns.length === 0 ? <div className="text-center font-bold text-gray-400 py-10 bg-white rounded-[24px] border border-gray-100">No transactions yet</div> :
         <div className="space-y-2">
           {txns.map(t => (
             <div key={t.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex justify-between items-center hover:shadow-sm transition-shadow">
               <div className="flex items-center gap-4">
                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.type === 'credit' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                   {t.type === 'credit' ? <ArrowDownRight size={18}/> : <ArrowUpRight size={18}/>}
                 </div>
                 <div>
                   <p className="font-bold text-[13px] text-gray-900">{t.description || (t.type === 'credit' ? 'Credit Received' : 'Funds Debited')}</p>
                   <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase">{new Date(t.created_at).toLocaleDateString()}</p>
                 </div>
               </div>
               <span className={`font-black ${t.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                 {t.type === 'credit' ? '+' : '-'}₹{t.amount}
               </span>
             </div>
           ))}
         </div>
        }
      </div>
    </div>
  );
}

export function AddressSection({ user }: { user: any }) {
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newAddr, setNewAddr] = useState({ fullName: '', mobile: '', line1: '', city: '', state: '', pin: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user.id.startsWith('demo-')) {
      setAddresses([{ id: '1', fullName: 'Rabin Mahara', line1: '123 Tech Park', city: 'Bangalore', state: 'Karnataka', pin: '560001', mobile: '9876543210' }]);
      setLoading(false);
      return;
    }
    load();
  }, [user.id]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('addresses').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setAddresses(data);
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user.id.startsWith('demo-')) return toast('Cannot add address in demo mode', 'error');
    setSaving(true);
    const { error } = await supabase.from('addresses').insert({ ...newAddr, user_id: user.id });
    setSaving(false);
    if (error) { toast(error.message, 'error'); } 
    else { toastSuccess('Address added!'); setShowAdd(false); setNewAddr({ fullName: '', mobile: '', line1: '', city: '', state: '', pin: '' }); load(); }
  };

  const handleDelete = async (id: string) => {
    if (user.id.startsWith('demo-')) return toast('Cannot delete in demo mode', 'error');
    if (!window.confirm('Delete address?')) return;
    const { error } = await supabase.from('addresses').delete().eq('id', id);
    if (error) toast(error.message, 'error'); else { toastSuccess('Deleted'); load(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-[12px] font-black text-gray-400 uppercase tracking-widest pl-2">Saved Addresses</h3>
        {!showAdd && <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 bg-[#0D47A1] text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:-translate-y-0.5 transition-transform"><Plus size={14}/> Add New</button>}
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white border border-gray-100 rounded-[24px] p-6 shadow-sm mb-6 animate-fade-in">
          <h4 className="font-black text-gray-900 mb-4">New Address</h4>
          <div className="grid grid-cols-2 gap-4">
            <input required placeholder="Full Name" value={newAddr.fullName} onChange={e=>setNewAddr(p=>({...p, fullName: e.target.value}))} className="col-span-2 sm:col-span-1 px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#0D47A1]" />
            <input required placeholder="Mobile Number" value={newAddr.mobile} onChange={e=>setNewAddr(p=>({...p, mobile: e.target.value}))} className="col-span-2 sm:col-span-1 px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#0D47A1]" />
            <input required placeholder="Address Line (House No, Street)" value={newAddr.line1} onChange={e=>setNewAddr(p=>({...p, line1: e.target.value}))} className="col-span-2 px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#0D47A1]" />
            <input required placeholder="City" value={newAddr.city} onChange={e=>setNewAddr(p=>({...p, city: e.target.value}))} className="col-span-2 sm:col-span-1 px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#0D47A1]" />
            <input required placeholder="State" value={newAddr.state} onChange={e=>setNewAddr(p=>({...p, state: e.target.value}))} className="col-span-1 px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#0D47A1]" />
            <input required placeholder="PIN Code" value={newAddr.pin} onChange={e=>setNewAddr(p=>({...p, pin: e.target.value}))} className="col-span-1 px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#0D47A1]" />
          </div>
          <div className="mt-6 flex gap-3">
            <button type="button" onClick={() => setShowAdd(false)} className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={saving} className="px-6 py-2.5 bg-[#0D47A1] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-[#1565C0] disabled:opacity-50">{saving ? 'Saving...' : 'Save Address'}</button>
          </div>
        </form>
      )}

      {loading ? <div className="text-center font-bold text-gray-400 animate-pulse py-10">Loading...</div> :
       addresses.length === 0 && !showAdd ? <div className="text-center font-bold text-gray-400 py-10 bg-white rounded-[24px] border border-gray-100">No saved addresses</div> :
       addresses.map(a => (
         <div key={a.id} className="bg-white border border-gray-100 rounded-[24px] p-6 shadow-sm flex justify-between items-start hover:border-blue-100 transition-colors group">
           <div className="flex gap-4 items-start">
             <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0"><MapPin size={18}/></div>
             <div>
               <h4 className="font-black text-gray-900">{a.fullName} <span className="text-[10px] text-gray-400 tracking-widest uppercase ml-2">{a.mobile}</span></h4>
               <p className="text-[13px] text-gray-600 mt-1">{a.line1}</p>
               <p className="text-[13px] text-gray-600">{a.city}, {a.state} - {a.pin}</p>
             </div>
           </div>
           <button onClick={() => handleDelete(a.id)} className="p-2 text-gray-300 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors"><Trash2 size={16}/></button>
         </div>
       ))}
    </div>
  );
}

export function SecuritySection() {
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd !== confirm) return toast('Passwords do not match', 'error');
    if (pwd.length < 6) return toast('Password too short (min 6 chars)', 'error');
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setSaving(false);
    if (error) toast(error.message, 'error');
    else { toastSuccess('Password updated successfully'); setPwd(''); setConfirm(''); }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-900"><Lock size={24}/></div>
        <div>
          <h3 className="font-black text-xl text-gray-900">Change Password</h3>
          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">Keep your account secure</p>
        </div>
      </div>
      <form onSubmit={handleUpdate} className="max-w-md space-y-4">
        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 mb-1 block">New Password</label>
          <input type="password" required value={pwd} onChange={e=>setPwd(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1]" />
        </div>
        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 mb-1 block">Confirm Password</label>
          <input type="password" required value={confirm} onChange={e=>setConfirm(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1]" />
        </div>
        <button type="submit" disabled={saving} className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-black transition-colors disabled:opacity-50 mt-4 flex items-center justify-center gap-2">
          {saving ? 'Updating...' : <><Save size={16}/> Update Password</>}
        </button>
      </form>
    </div>
  );
}

export function SettingsSection({ user, updateProfile }: { user: any, updateProfile: any }) {
  const [name, setName] = useState(user.name || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user.id.startsWith('demo-')) return toast('Cannot update in demo mode', 'error');
    setSaving(true);
    const result = await updateProfile({ name });
    setSaving(false);
    if (result.success) toastSuccess('Profile updated!');
    else toast(result.error || 'Update failed', 'error');
  };

  return (
    <div className="bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-900"><Settings size={24}/></div>
        <div>
          <h3 className="font-black text-xl text-gray-900">Account Settings</h3>
          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">Manage your identity</p>
        </div>
      </div>
      <form onSubmit={handleSave} className="max-w-md space-y-4">
        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 mb-1 block">Full Name</label>
          <input required value={name} onChange={e=>setName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1]" />
        </div>
        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 mb-1 block">Email Address</label>
          <input disabled value={user.email} className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-gray-500 text-sm cursor-not-allowed" />
          <p className="text-[10px] font-bold text-gray-400 mt-1 pl-1">Email cannot be changed directly.</p>
        </div>
        <button type="submit" disabled={saving || name === user.name} className="w-full py-3.5 bg-[#0D47A1] text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-[#1565C0] transition-colors disabled:opacity-50 mt-4 flex items-center justify-center gap-2">
          {saving ? 'Saving...' : <><Save size={16}/> Save Changes</>}
        </button>
      </form>
    </div>
  );
}
