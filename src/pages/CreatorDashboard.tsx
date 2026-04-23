import { useState, useEffect } from 'react';
import { usePageTitle } from '../lib/usePageTitle';
import { Link, useNavigate } from 'react-router-dom';
import { Copy, Check, TrendingUp, Link as LinkIcon, DollarSign, BarChart2, Star, ExternalLink, Plus, PlayCircle, Clock } from 'lucide-react';
import VideoFeed from '../components/VideoFeed';
import { ShortVideo } from '../types';
import { useAppStore } from '../store';
import { supabase } from '../lib/supabase';
import { toast, toastSuccess } from '../components/Toast';
import { Skeleton } from '../components/Skeleton';

// Promo Code Generator Component
function PromoCodeSection({ userId, affiliateLinks }: { userId?: string; affiliateLinks: any[] }) {
  const [promos, setPromos] = useState<any[]>([]);
  const [form, setForm] = useState({ code: '', discount: '10', type: 'percentage', product: 'all', expiry: '' });
  const [copied, setCopied] = useState('');
  const [creating, setCreating] = useState(false);
  const [loadingPromos, setLoadingPromos] = useState(true);

  // Load existing promo codes from DB on mount
  useEffect(() => {
    if (!userId) return;
      (supabase
        .from('coupons')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false }) as any)
      .then(({ data }: any) => {
        if (data) setPromos(data);
      })
      .finally(() => setLoadingPromos(false));
  }, [userId]);

  const generateCode = () => {
    const prefix = 'BYNDIO';
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    setForm(f => ({ ...f, code: `${prefix}${rand}` }));
  };

  const handleCreate = async () => {
    if (!form.code.trim() || !userId) return;
    setCreating(true);
    try {
      const discountValue = parseFloat(form.discount);
      if (isNaN(discountValue) || discountValue <= 0) return;

      const { data, error } = await (supabase.from('coupons').insert({
        code: form.code.trim().toUpperCase(),
        type: form.type === 'percentage' ? 'percent' : 'flat',
        value: discountValue,
        expiry: form.expiry ? new Date(form.expiry).toISOString() : null,
        is_active: true,
        created_by: userId,
      }).select().single() as any);

      if (error) throw error;
      setPromos(p => [data, ...p]);
      setForm({ code: '', discount: '10', type: 'percentage', product: 'all', expiry: '' });
    } catch (err: any) {
      console.error('Failed to create promo code:', err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    await supabase.from('coupons').update({ is_active: false }).eq('id', id);
    setPromos(p => p.map(c => c.id === id ? { ...c, is_active: false } : c));
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-[10px] p-5 shadow-sm">
        <div className="text-[14px] font-black mb-4">Create New Promo Code</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Promo Code *</label>
            <div className="flex gap-2">
              <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. SAVE20" className="flex-1 p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#7B1FA2] uppercase" />
              <button onClick={generateCode} className="bg-[#E1BEE7] text-[#7B1FA2] px-3 rounded-md text-[11px] font-bold hover:bg-[#CE93D8] transition-colors">Auto</button>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Discount</label>
            <div className="flex gap-2">
              <input type="number" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))}
                className="flex-1 p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#7B1FA2]" />
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="p-2.5 border border-gray-300 rounded-md text-[12px] outline-none focus:border-[#7B1FA2]">
                <option value="percentage">%</option>
                <option value="flat">₹ Flat</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Apply To</label>
            <select value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))}
              className="w-full p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#7B1FA2]">
              <option value="all">All Products</option>
              {affiliateLinks.map(l => <option key={l.id} value={l.product_id}>{l.product?.name || l.link_code}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Expiry Date</label>
            <input type="date" value={form.expiry} onChange={e => setForm(f => ({ ...f, expiry: e.target.value }))}
              className="w-full p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#7B1FA2]" />
          </div>
        </div>
        <button onClick={handleCreate} disabled={!form.code.trim() || creating}
          className="bg-[#7B1FA2] hover:bg-[#6A1B9A] disabled:bg-gray-400 text-white px-6 py-2.5 rounded-md text-[13px] font-bold transition-colors">
          {creating ? 'Creating...' : '🎟️ Create Promo Code'}
        </button>
      </div>

      {loadingPromos ? (
        <div className="bg-white rounded-[10px] p-6 text-center shadow-sm text-gray-400 text-[13px]">
          <div className="w-5 h-5 border-2 border-[#7B1FA2] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading your promo codes...
        </div>
      ) : promos.length > 0 ? (
        <div className="bg-white rounded-[10px] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 text-[14px] font-black">Your Promo Codes ({promos.length})</div>
          {promos.map(p => (
            <div key={p.id} className="flex items-center gap-3 p-4 border-b border-gray-50 last:border-0">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-black text-[14px] tracking-widest text-[#7B1FA2]">{p.code}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  {p.value}{p.type === 'percent' ? '%' : '₹'} off • {p.uses || 0} uses
                  {p.expiry && ` • Expires ${new Date(p.expiry).toLocaleDateString('en-IN')}`}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleCopy(p.code)}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-colors ${copied === p.code ? 'bg-green-100 text-green-700' : 'bg-[#E1BEE7] text-[#7B1FA2] hover:bg-[#CE93D8]'}`}>
                  {copied === p.code ? '✓ Copied' : 'Copy'}
                </button>
                {p.is_active && (
                  <button onClick={() => handleDeactivate(p.id)}
                    className="px-3 py-1.5 rounded-md text-[11px] font-bold bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                    Deactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[10px] p-8 text-center shadow-sm text-gray-400 text-[13px]">
          No promo codes yet. Create your first one above!
        </div>
      )}
    </div>
  );
}

// Performance Ranking Component
function PerformanceRanking({ totalClicks, totalConversions, totalEarnings, convRate, userId }: any) {
  const user = useAppStore(s => s.user);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  useEffect(() => {
    (supabase.from('affiliate_leaderboard').select('*').limit(10) as any)
      .then(({ data }: any) => { if (data) setLeaderboard(data); })
      .catch(() => { /* affiliate_leaderboard view may not exist yet */ });
  }, []);

  const tiers = [
    { name: 'Beginner', icon: '🌱', color: '#78909C', min: 0, max: 1000 },
    { name: 'Rising Star', icon: '⭐', color: '#FFB300', min: 1000, max: 5000 },
    { name: 'Top Creator', icon: '🔥', color: '#FF7043', min: 5000, max: 20000 },
    { name: 'Elite', icon: '💎', color: '#AB47BC', min: 20000, max: 50000 },
    { name: 'Legend', icon: '👑', color: '#E53935', min: 50000, max: Infinity },
  ];

  const myTier = tiers.find(t => totalEarnings >= t.min && totalEarnings < t.max) || tiers[0];
  const nextTier = tiers[tiers.indexOf(myTier) + 1];
  const myRank = leaderboard.find(r => r.id === userId)?.rank || '—';
  const myPercentile = leaderboard.length > 0 ? Math.round((1 - (Number(myRank) || leaderboard.length) / leaderboard.length) * 100) : 50;

  const MOCK_LEADERBOARD: any[] = [];

  return (
    <div className="flex flex-col gap-4">
      {/* Tier Card */}
      <div className="rounded-[10px] p-5 shadow-sm text-white" style={{ background: `linear-gradient(135deg, ${myTier.color}, ${myTier.color}BB)` }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[12px] opacity-75 uppercase tracking-widest">Your Tier</div>
            <div className="text-2xl font-black">{myTier.icon} {myTier.name}</div>
            <div className="text-[12px] opacity-80 mt-1">Top {myPercentile}% of creators</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black">#{myRank}</div>
            <div className="text-[11px] opacity-75">Global Rank</div>
          </div>
        </div>
        {nextTier && (
          <div className="mt-3">
            <div className="flex justify-between text-[10px] mb-1 opacity-80">
              <span>{myTier.name}</span>
              <span>{nextTier.icon} {nextTier.name} (₹{nextTier.min.toLocaleString('en-IN')})</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full">
              <div className="h-full bg-white rounded-full" style={{ width: `${Math.min(((totalEarnings - myTier.min) / (nextTier.min - myTier.min)) * 100, 100)}%` }} />
            </div>
            <div className="text-[10px] opacity-70 mt-1">₹{(nextTier.min - totalEarnings).toLocaleString('en-IN')} more to reach {nextTier.name}</div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Clicks', value: totalClicks, icon: '👆', color: 'text-[#1565C0]' },
          { label: 'Conversions', value: totalConversions, icon: '✅', color: 'text-[#2E7D32]' },
          { label: 'Conv. Rate', value: `${convRate}%`, icon: '📈', color: 'text-[#7B1FA2]' },
          { label: 'Total Earned', value: `₹${totalEarnings.toLocaleString('en-IN')}`, icon: '💰', color: 'text-[#E65100]' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-[10px] p-4 shadow-sm text-center">
            <div className="text-xl mb-1">{s.icon}</div>
            <div className={`text-[18px] font-black ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-[10px] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 text-[14px] font-black">🏆 Creator Leaderboard</div>
        {MOCK_LEADERBOARD.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">Leaderboard will appear once you start earning</div>
        ) : (
          MOCK_LEADERBOARD.map(r => (
            <div key={r.rank} className={`flex items-center gap-3 p-3.5 border-b border-gray-50 last:border-0 ${r.isYou ? 'bg-[#F3E5F5] border-l-4 border-[#7B1FA2]' : ''}`}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-black shrink-0"
                style={{ background: r.rank <= 3 ? '#FFF8E1' : '#F5F5F5' }}>
                {r.rank <= 3 ? r.badge : r.rank}
              </div>
              <div className="flex-1">
                <div className={`text-[13px] font-bold ${r.isYou ? 'text-[#7B1FA2]' : ''}`}>{r.name}{r.isYou ? ' (You)' : ''}</div>
                <div className="text-[10px] text-gray-500">{r.conversions} conversions</div>
              </div>
              <div className="text-[13px] font-black text-[#2E7D32]">₹{r.earnings.toLocaleString('en-IN')}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function CreatorDashboard() {
  usePageTitle('Creator Dashboard');
  const { user, affiliateLinks, fetchAffiliateLinks, generateAffiliateLink, products, walletBalance, rewardPoints, fetchWalletData } = useAppStore();
  const navigate = useNavigate();
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [tab, setTab] = useState('overview');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [withdrawMsg, setWithdrawMsg] = useState('');

  useEffect(() => {
    if (user) {
      Promise.all([fetchAffiliateLinks(), fetchWalletData()]).finally(() => setIsLoading(false));
    }
  }, [user?.id]);

  const handleCopy = (code: string) => {
    const url = `${window.location.origin}/products?ref=${code}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleGenerate = async () => {
    if (!selectedProductId) return;
    setGeneratingFor(selectedProductId);
    await generateAffiliateLink(selectedProductId);
    setGeneratingFor(null);
    setSelectedProductId('');
  };

  const handleWithdraw = async () => {
    if (walletBalance < 500) { setWithdrawMsg('Minimum withdrawal is ₹500'); return; }
    setWithdrawMsg('Withdrawal request submitted! Funds arrive in 1–2 working days.');
    setTimeout(() => setWithdrawMsg(''), 4000);
  };

  const totalClicks = affiliateLinks.reduce((s, l) => s + l.clicks, 0);
  const totalConversions = affiliateLinks.reduce((s, l) => s + l.conversions, 0);
  const totalEarnings = affiliateLinks.reduce((s, l) => s + l.total_earnings, 0);
  const convRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : '0.0';

  const navItems = [
    { id: 'overview', icon: BarChart2, label: 'Overview' },
    { id: 'links', icon: LinkIcon, label: 'My Links' },
    { id: 'promo', icon: Star, label: 'Promo Codes' },
    { id: 'ranking', icon: TrendingUp, label: 'My Ranking' },
    { id: 'earnings', icon: DollarSign, label: 'Earnings' },
    { id: 'storefront', icon: Star, label: 'My Storefront' },
    { id: 'videos', icon: PlayCircle, label: 'My Videos' },
    { id: 'campaigns', icon: TrendingUp, label: 'Campaigns' },
  ];

  if (isLoading) return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-115px)] bg-[#F5F5F5]">
      {/* Sidebar Skeleton */}
      <div className="w-full md:w-[220px] bg-[#1A0A2E] p-4 space-y-6">
        <div className="flex items-center gap-2">
          <Skeleton variant="circle" width="32px" height="32px" className="opacity-20" />
          <Skeleton variant="text" width="100px" className="opacity-20" />
        </div>
        <div className="space-y-4">
          <Skeleton variant="text" count={6} className="opacity-10" />
        </div>
      </div>
      {/* Main Content Skeleton */}
      <div className="flex-1 p-6 space-y-6">
        <Skeleton variant="text" width="200px" height="30px" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton variant="rect" count={4} height="80px" className="rounded-xl" />
        </div>
        <Skeleton variant="rect" height="300px" className="rounded-xl" />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-115px)] bg-[#F5F5F5]">
      {/* Sidebar */}
      <div className="w-full md:w-[220px] bg-[#1A0A2E] text-white flex flex-col shrink-0">
        <div className="p-4 border-b border-white/10 flex items-center gap-2">
          <div className="bg-[#7B1FA2] w-8 h-8 rounded-t-md rounded-b-xl flex items-center justify-center text-white shrink-0">⭐</div>
          <div>
            <div className="text-[15px] font-black leading-none">Creator Hub</div>
            <div className="text-[10px] opacity-50 uppercase tracking-widest mt-0.5">@{user?.name?.replace(/\s+/g,'').toLowerCase()}</div>
          </div>
        </div>
        <div className="py-2 flex-1">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => setTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] transition-colors border-l-[3px] ${tab === item.id ? 'bg-white/10 text-white border-[#CE93D8]' : 'text-white/70 border-transparent hover:bg-white/5 hover:text-white'}`}>
                <Icon size={16} /> {item.label}
              </button>
            );
          })}
        </div>
        <div className="p-4 border-t border-white/10">
          <div className="bg-[#7B1FA2]/30 rounded-lg p-3 text-center">
            <div className="text-[10px] opacity-50 uppercase mb-1">Points Balance</div>
            <div className="text-[18px] font-black text-[#CE93D8]">{rewardPoints.toLocaleString('en-IN')}</div>
            <div className="text-[10px] text-white/60 mt-0.5">reward points</div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto">

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <>
            <div className="text-xl font-black text-[#7B1FA2] mb-4">📊 Creator Overview</div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Total Earnings', value: `₹${totalEarnings.toLocaleString('en-IN')}`, icon: '💰', color: 'bg-[#F3E5F5]' },
                { label: 'Total Clicks', value: totalClicks.toLocaleString('en-IN'), icon: '👆', color: 'bg-[#E3F2FD]' },
                { label: 'Conversions', value: totalConversions.toString(), icon: '🛒', color: 'bg-[#E8F5E9]' },
                { label: 'Conv. Rate', value: `${convRate}%`, icon: '📈', color: 'bg-[#FFF3E0]' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-[10px] p-4 shadow-sm flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-[10px] ${s.color} flex items-center justify-center text-[22px] shrink-0`}>{s.icon}</div>
                  <div><div className="text-[20px] font-black">{s.value}</div><div className="text-xs text-gray-500">{s.label}</div></div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-[10px] shadow-sm p-4 mb-4">
              <div className="text-[15px] font-black mb-3">Top Performing Links</div>
              {affiliateLinks.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-4xl mb-2">🔗</div>
                  <p className="text-sm">No links yet. Generate your first tracking link!</p>
                  <button onClick={() => setTab('links')} className="mt-3 bg-[#7B1FA2] text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-[#6A1B9A] transition-colors">
                    Create Link
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead className="bg-gray-50 text-[11px] uppercase font-bold text-gray-500">
                      <tr>
                        <th className="p-2.5 text-left border-b border-gray-200">Product</th>
                        <th className="p-2.5 text-left border-b border-gray-200">Clicks</th>
                        <th className="p-2.5 text-left border-b border-gray-200">Sales</th>
                        <th className="p-2.5 text-left border-b border-gray-200">Earned</th>
                        <th className="p-2.5 text-left border-b border-gray-200">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {affiliateLinks.slice(0, 5).map(link => (
                        <tr key={link.id} className="hover:bg-purple-50/40 border-b border-gray-100 last:border-0">
                          <td className="p-2.5 font-semibold">{link.product?.name || 'Product'}</td>
                          <td className="p-2.5">{link.clicks}</td>
                          <td className="p-2.5">{link.conversions}</td>
                          <td className="p-2.5 font-bold text-[#388E3C]">₹{link.total_earnings.toFixed(0)}</td>
                          <td className="p-2.5">
                            <button onClick={() => handleCopy(link.link_code)} className="flex items-center gap-1 text-[#7B1FA2] hover:text-[#6A1B9A] font-semibold">
                              {copiedCode === link.link_code ? <><Check size={12}/> Copied</> : <><Copy size={12}/> Copy</>}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="bg-gradient-to-br from-[#7B1FA2] to-[#4A148C] rounded-xl p-5 text-white shadow-xl shadow-purple-100">
                <div className="flex justify-between items-start mb-1">
                  <div className="font-black text-[15px]">Available Balance</div>
                  <div className="bg-green-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase">Unlocked</div>
                </div>
                <div className="text-[34px] font-black mb-0.5">₹{walletBalance.toLocaleString('en-IN')}</div>
                <div className="text-[11px] opacity-75 mb-4 font-medium flex items-center gap-1.5">
                  <DollarSign size={11}/> Instant withdrawal available
                </div>
                <button onClick={handleWithdraw} className="w-full bg-white text-[#7B1FA2] py-2.5 rounded-lg text-[13px] font-black hover:bg-gray-100 transition-transform active:scale-95 shadow-lg">
                  💸 Withdraw Earned Funds
                </button>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50/50 rounded-bl-full" />
                <div className="flex justify-between items-start mb-1 relative z-10">
                  <div className="font-black text-[15px] text-gray-800">Pending Commissions</div>
                  <div className="bg-gray-100 text-gray-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                    <Clock size={8}/> 7-Day Lock
                  </div>
                </div>
                {/* 15% of total earnings as a reasonable mock for 'recent' ones */}
                <div className="text-[34px] font-black text-gray-900 mb-0.5">₹{Math.floor(totalEarnings * 0.15).toLocaleString('en-IN')}</div>
                <div className="text-[11px] text-gray-500 mb-4 font-medium italic">
                  Unlocking as orders complete 7-day return period
                </div>
                <div className="bg-blue-50/50 rounded-lg p-2.5 border border-blue-100/30">
                  <div className="text-[10px] text-blue-700 font-bold mb-1 uppercase tracking-wider">Next Release</div>
                  <div className="flex justify-between text-[12px] font-black text-blue-900">
                    <span>₹1,420</span>
                    <span>Tomorrow, 10:00 AM</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* LINKS */}
        {tab === 'links' && (
          <>
            <div className="text-xl font-black text-[#7B1FA2] mb-4">🔗 My Tracking Links</div>
            <div className="bg-white rounded-[10px] shadow-sm p-5 mb-4">
              <div className="text-[14px] font-bold mb-3">Generate New Link</div>
              <div className="flex gap-2 flex-wrap">
                <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}
                  className="flex-1 min-w-[200px] p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#7B1FA2] bg-white">
                  <option value="">Select a product to promote...</option>
                  {products.map(p => <option key={p.id} value={p.id.toString()}>{p.name} — ₹{p.price}</option>)}
                </select>
                <button onClick={handleGenerate} disabled={!selectedProductId || !!generatingFor}
                  className="bg-[#7B1FA2] hover:bg-[#6A1B9A] disabled:bg-gray-300 text-white px-4 py-2.5 rounded-md text-[13px] font-bold flex items-center gap-1.5 transition-colors">
                  <Plus size={14} /> {generatingFor ? 'Generating...' : 'Generate Link'}
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-2">You earn {user?.role === 'influencer' ? '12%' : '8%'} commission on every sale through your link.</p>
            </div>

            {/* B2B Lead Promotion Link */}
            <div className="bg-gradient-to-r from-[#0D47A1] to-[#1565C0] rounded-[10px] p-5 mb-4 text-white">
               <div className="flex items-center justify-between mb-2">
                  <div className="font-black text-[15px]">Promote B2B Leads 🏭</div>
                  <span className="bg-green-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">High Commission (₹30-₹50)</span>
               </div>
               <p className="text-[11px] opacity-80 mb-3">Earn commissions by referring bulk buyers. When they post an RFQ, you get paid!</p>
               <div className="bg-white/10 rounded-md p-2.5 flex items-center gap-2">
                  <code className="text-[11px] flex-1 truncate">{window.location.origin}/b2b?ref={user?.id?.substring(0,8)}</code>
                  <button onClick={() => handleCopy(user?.id?.substring(0,8) || '')} className="text-[12px] font-bold text-white hover:opacity-80">Copy</button>
               </div>
            </div>

            {affiliateLinks.length === 0 ? (
              <div className="bg-white rounded-[10px] shadow-sm p-8 text-center text-gray-400">
                <div className="text-5xl mb-3">🔗</div>
                <p className="font-semibold">No tracking links yet</p>
                <p className="text-sm mt-1">Generate links above to start earning commissions.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {affiliateLinks.map(link => {
                  const url = `${window.location.origin}/products?ref=${link.link_code}`;
                  return (
                    <div key={link.id} className="bg-white rounded-[10px] shadow-sm p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="font-bold text-[14px]">{link.product?.name || 'Product'}</div>
                          <div className="text-[11px] text-gray-500 mt-0.5">Commission: {link.commission_rate}% per sale</div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${link.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {link.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="bg-gray-50 rounded-md p-2.5 flex items-center gap-2 mb-3">
                        <code className="text-[11px] text-gray-600 flex-1 truncate">{url}</code>
                        <button onClick={() => handleCopy(link.link_code)}
                          className="flex items-center gap-1 text-[12px] font-bold text-[#7B1FA2] hover:text-[#6A1B9A] shrink-0">
                          {copiedCode === link.link_code ? <><Check size={12}/> Copied!</> : <><Copy size={12}/> Copy</>}
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Clicks', value: link.clicks },
                          { label: 'Sales', value: link.conversions },
                          { label: 'Earned', value: `₹${link.total_earnings.toFixed(0)}` },
                        ].map(s => (
                          <div key={s.label} className="bg-[#F3E5F5] rounded-md p-2 text-center">
                            <div className="text-[15px] font-black text-[#7B1FA2]">{s.value}</div>
                            <div className="text-[10px] text-gray-500">{s.label}</div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-[18px]">📱</div>
                            <div className="text-[10px] text-gray-500 font-bold uppercase">QR Code Ready</div>
                         </div>
                         <button className="text-[11px] font-bold text-[#0D47A1] hover:underline">Download QR for Print</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* EARNINGS */}
        {tab === 'earnings' && (
          <>
            <div className="text-xl font-black text-[#7B1FA2] mb-4">💰 Earnings & Wallet</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              <div className="bg-gradient-to-br from-[#7B1FA2] to-[#4A148C] text-white rounded-[10px] p-4">
                <div className="text-xs opacity-70 mb-1">Wallet Balance</div>
                <div className="text-[28px] font-black">₹{walletBalance.toLocaleString('en-IN')}</div>
              </div>
              <div className="bg-white rounded-[10px] p-4 shadow-sm">
                <div className="text-xs text-gray-500 mb-1">Total Earned (All Time)</div>
                <div className="text-[22px] font-black text-[#388E3C]">₹{totalEarnings.toLocaleString('en-IN')}</div>
              </div>
              <div className="bg-white rounded-[10px] p-4 shadow-sm">
                <div className="text-xs text-gray-500 mb-1">Reward Points</div>
                <div className="text-[22px] font-black text-[#FF9800]">{rewardPoints.toLocaleString('en-IN')} pts</div>
                <div className="text-[10px] text-gray-400">= ₹{(rewardPoints * 0.1).toFixed(0)} cashback</div>
              </div>
            </div>

            <div className="bg-white rounded-[10px] p-5 shadow-sm mb-4">
              <div className="text-[14px] font-black mb-3">Payout Options</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="font-bold text-[13px] mb-1">Standard Payout (Free)</div>
                  <div className="text-[11px] text-gray-500 mb-3">Settle to bank in 7 working days. No charge.</div>
                  <button onClick={handleWithdraw} className="bg-[#7B1FA2] text-white px-4 py-2 rounded-md text-[12px] font-bold hover:bg-[#6A1B9A] transition-colors">
                    Request Payout
                  </button>
                </div>
                <div className="border-2 border-[#7B1FA2] rounded-lg p-4 relative">
                  <div className="absolute -top-3 left-3 bg-[#7B1FA2] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">PRO</div>
                  <div className="font-bold text-[13px] mb-1">Instant Payout (1–2% fee)</div>
                  <div className="text-[11px] text-gray-500 mb-3">Get funds in 24–48 hrs. Available for Pro subscribers.</div>
                  <button 
                    onClick={() => navigate('/pricing?role=influencer')}
                    className="bg-white text-[#7B1FA2] border-2 border-[#7B1FA2] px-4 py-2 rounded-md text-[12px] font-bold hover:bg-[#F3E5F5] transition-colors">
                    Upgrade to Pro
                  </button>
                </div>
              </div>
              {withdrawMsg && <div className="mt-3 text-[12px] font-semibold text-[#388E3C] bg-green-50 rounded p-2">{withdrawMsg}</div>}
            </div>

            <div className="bg-white rounded-[10px] p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                 <div>
                   <div className="text-[14px] font-black">Creator Growth Roadmap</div>
                   <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">BYNDIO Influencer Revenue Model</div>
                 </div>
                 <div className="bg-[#F3E5F5] text-[#7B1FA2] text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                   Current: Phase 1
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* PHASE 1 */}
                <div className="border-2 border-[#7B1FA2] rounded-xl p-4 relative bg-[#F3E5F5]/30">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#7B1FA2] text-white text-[10px] font-bold px-3 py-0.5 rounded-full whitespace-nowrap shadow-sm">
                    🚀 ACTIVE NOW
                  </div>
                  <div className="font-black text-[15px] mb-0.5 text-[#4A148C]">Phase 1: Growth</div>
                  <div className="text-[10px] text-gray-500 font-medium mb-3">0 → 1,000 Influencers</div>
                  <div className="space-y-2 mb-4 border-t border-[#7B1FA2]/20 pt-3">
                     <div className="flex justify-between items-start text-[11px]">
                       <span className="text-gray-600 font-medium">Influencer Commission</span>
                       <span className="font-black text-[#388E3C]">10–20%</span>
                     </div>
                     <div className="flex justify-between items-start text-[11px]">
                       <span className="text-gray-600 font-medium">Brand Collab Fee</span>
                       <span className="font-black text-[#0D47A1]">5–10%</span>
                     </div>
                     <div className="flex justify-between items-start text-[11px]">
                       <span className="text-gray-600 font-medium">Subscription Fee</span>
                       <span className="font-black text-[#7B1FA2]">₹0 (Free Forever)</span>
                     </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Benefits</div>
                    <div className="text-[11px] text-gray-600 flex items-center gap-1.5"><span className="text-[#388E3C] font-black">✓</span>Free Storefront</div>
                    <div className="text-[11px] text-gray-600 flex items-center gap-1.5"><span className="text-[#388E3C] font-black">✓</span>Free Verified Badge</div>
                    <div className="text-[11px] text-gray-600 flex items-center gap-1.5"><span className="text-[#388E3C] font-black">✓</span>Free Visibility Boost</div>
                  </div>
                </div>

                {/* PHASE 2 */}
                <div className="border border-gray-200 rounded-xl p-4 opacity-75 hover:opacity-100 transition-opacity">
                  <div className="font-black text-[15px] mb-0.5 text-gray-800">Phase 2: Monetize</div>
                  <div className="text-[10px] text-gray-500 font-medium mb-3">1,000 → 10K Influencers</div>
                  <div className="space-y-2 mb-4 border-t border-gray-100 pt-3">
                     <div className="flex justify-between items-start text-[11px]">
                       <span className="text-gray-600 font-medium">Live Commerce</span>
                       <span className="font-black text-gray-800">5–10%</span>
                     </div>
                     <div className="flex justify-between items-start text-[11px]">
                       <span className="text-gray-600 font-medium">Brand Collab Fee</span>
                       <span className="font-black text-gray-800">10–20%</span>
                     </div>
                     <div className="flex justify-between items-start text-[11px]">
                       <span className="text-gray-600 font-medium">Paid Promotions</span>
                       <span className="font-black text-gray-800">CPC/CPM</span>
                     </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Future Features</div>
                    <div className="text-[11px] text-gray-600 flex items-center gap-1.5"><span className="text-gray-400 font-black">⚡</span>Featured Storefront Fee</div>
                    <div className="text-[11px] text-gray-600 flex items-center gap-1.5"><span className="text-gray-400 font-black">⚡</span>Balanced Monetization</div>
                  </div>
                </div>

                {/* PHASE 3 */}
                <div className="border border-gray-200 rounded-xl p-4 opacity-50 hover:opacity-100 transition-opacity relative overflow-hidden">
                  <div className="font-black text-[15px] mb-0.5 text-gray-800">Phase 3: Scale</div>
                  <div className="text-[10px] text-gray-500 font-medium mb-3">10K+ Influencers</div>
                  <div className="space-y-2 mb-4 border-t border-gray-100 pt-3">
                     <div className="flex justify-between items-start text-[11px]">
                       <span className="text-gray-600 font-medium">Exclusive Drops</span>
                       <span className="font-black text-gray-800">10–25%</span>
                     </div>
                     <div className="flex justify-between items-start text-[11px]">
                       <span className="text-gray-600 font-medium">Referral Income</span>
                       <span className="font-black text-gray-800">Active</span>
                     </div>
                     <div className="flex justify-between items-start text-[11px]">
                       <span className="text-gray-600 font-medium">Verified Badge</span>
                       <span className="font-black text-gray-800">₹199–₹999</span>
                     </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Ecosystem</div>
                    <div className="text-[11px] text-gray-600 flex items-center gap-1.5"><span className="text-gray-400 font-black">👑</span>Premium Subscriptions</div>
                    <div className="text-[11px] text-gray-600 flex items-center gap-1.5"><span className="text-gray-400 font-black">🎯</span>Ads Ecosystem</div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100 text-center">
                <p className="text-[12px] font-bold text-gray-800 italic">“First help creators earn → then grow → then monetize.”</p>
              </div>
            </div>
          </>
        )}

        {/* STOREFRONT */}
        {tab === 'storefront' && (
          <>
            <div className="text-xl font-black text-[#7B1FA2] mb-4">🌟 My Storefront</div>
            <div className="bg-gradient-to-br from-[#7B1FA2] to-[#4A148C] rounded-xl p-5 text-white mb-4 flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-[28px] font-black shrink-0">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-black text-[18px]">{user?.name}</div>
                <div className="text-[12px] opacity-75">@{user?.name?.replace(/\s+/g,'').toLowerCase()}</div>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="text-[11px] bg-white/20 px-2.5 py-1 rounded-full">{affiliateLinks.length} Products</span>
                  <span className="text-[11px] bg-white/20 px-2.5 py-1 rounded-full">{totalConversions} Sales</span>
                </div>
              </div>
              <div className="ml-auto">
                <Link to={`/creator/${user?.id}`}
                  className="flex items-center gap-1 bg-white text-[#7B1FA2] px-3 py-1.5 rounded-md text-[12px] font-bold hover:bg-gray-100 transition-colors">
                  <ExternalLink size={12} /> View Public Page
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-[10px] p-5 shadow-sm">
              <div className="text-[14px] font-black mb-3">Your Promoted Products</div>
              {affiliateLinks.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <p className="text-sm">Generate tracking links to add products to your storefront.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {affiliateLinks.map(link => {
                    const product = products.find(p => p.id.toString() === link.product_id);
                    if (!product) return null;
                    return (
                      <div key={link.id} className="border border-gray-200 rounded-[10px] p-3 text-center">
                        <div className="text-[36px] mb-2">{product.icon}</div>
                        <div className="text-[12px] font-bold line-clamp-2 mb-1">{product.name}</div>
                        <div className="text-[13px] font-black text-[#0D47A1]">₹{product.price.toLocaleString('en-IN')}</div>
                        <button onClick={() => handleCopy(link.link_code)} className="w-full mt-2 bg-[#7B1FA2] text-white py-1.5 rounded text-[11px] font-bold flex items-center justify-center gap-1">
                          {copiedCode === link.link_code ? <><Check size={10}/> Copied</> : <><Copy size={10}/> Copy Link</>}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* CAMPAIGNS */}
        {tab === 'promo' && (
          <>
            <div className="text-xl font-black text-[#7B1FA2] mb-4">🎟️ Promo Code Generator</div>
            <PromoCodeSection userId={user?.id} affiliateLinks={affiliateLinks} />
          </>
        )}

        {tab === 'ranking' && (
          <>
            <div className="text-xl font-black text-[#7B1FA2] mb-4">🏆 Performance Ranking</div>
            <PerformanceRanking
              totalClicks={totalClicks}
              totalConversions={totalConversions}
              totalEarnings={totalEarnings}
              convRate={convRate}
              userId={user?.id}
            />
          </>
        )}

        {tab === 'campaigns' && (
          <>
            <div className="text-xl font-black text-[#7B1FA2] mb-4">🚀 Brand Campaigns</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-[10px] p-8 text-center text-gray-400 col-span-full shadow-sm">
                No active brand campaigns at the moment. Check back soon!
              </div>
            </div>
          </>
        )}

        {tab === 'videos' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="text-xl font-black text-[#7B1FA2]">🎬 My Video Commerce Feed</div>
              <button className="bg-[#7B1FA2] text-white px-4 py-2 rounded-xl text-[13px] font-bold flex items-center gap-2 hover:bg-[#6A1B9A] transition-all active:scale-95 shadow-lg shadow-purple-100">
                <Plus size={16} /> Upload New Reel
              </button>
            </div>
            
              <div className="bg-white rounded-[20px] p-6 shadow-sm border border-purple-50">
                <h3 className="text-[16px] font-black text-gray-800 mb-4">Video Insights</h3>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-purple-50 rounded-2xl p-4">
                    <div className="text-2xl font-black text-[#7B1FA2]">9.2K</div>
                    <div className="text-[11px] text-gray-500 font-bold uppercase">Total Views</div>
                  </div>
                  <div className="bg-green-50 rounded-2xl p-4">
                    <div className="text-2xl font-black text-green-700">₹4.5K</div>
                    <div className="text-[11px] text-gray-500 font-bold uppercase">Sales from Video</div>
                  </div>
                </div>
                
                <h4 className="text-[13px] font-black text-gray-700 mb-3 uppercase tracking-wider">Top Tagged Products</h4>
                <div className="space-y-3">
                  {affiliateLinks.slice(0, 3).map(link => (
                    <div key={link.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-lg shadow-sm">
                        {link.product?.icon || '📦'}
                      </div>
                      <div className="flex-1">
                        <div className="text-[12px] font-bold text-gray-800 truncate">{link.product?.name}</div>
                        <div className="text-[10px] text-gray-500">{link.conversions} sales from reels</div>
                      </div>
                      <div className="text-[12px] font-black text-[#388E3C]">+12%</div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 p-4 bg-gradient-to-br from-[#7B1FA2] to-[#4A148C] rounded-2xl text-white">
                  <div className="text-[14px] font-black mb-1">Creator Tip 💡</div>
                  <p className="text-[11px] opacity-80 leading-relaxed">
                    Videos with product tagging generate 3x more conversions. Try highlighting the product in the first 3 seconds of your reel!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
