import { useEffect, useState } from 'react';
import { usePageTitle } from '../lib/usePageTitle';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store';
import { supabase } from '../lib/supabase';
import { toast, toastSuccess } from '../components/Toast';

export default function RewardsWallet() {
  usePageTitle('Rewards & Wallet');
  const { user, walletBalance, rewardPoints, fetchWalletData } = useAppStore();
  const [history, setHistory] = useState<any[]>([]);
  const [withdrawMsg, setWithdrawMsg] = useState('');

  useEffect(() => { if (user) { fetchWalletData(); fetchHistory(); } }, [user?.id]);

  const fetchHistory = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('reward_points')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      if (data) setHistory(data);
    } catch (err: any) {
      // silently fail - wallet history is non-critical
    }
  };

  const handleRedeem = async () => {
    if (rewardPoints < 100) { toast('Minimum 100 points needed to redeem.', 'info'); return; }
    if (!user) return;
    try {
      const cashback = Math.floor(rewardPoints * 0.1);
      // Deduct points
      await supabase.from('reward_points').insert({
        user_id: user.id,
        points_earned: 0,
        points_redeemed: rewardPoints,
        action: 'redeemed_for_cashback',
      });
      // Add to wallet
      await supabase.from('wallets').upsert(
        { user_id: user.id, balance: walletBalance + cashback },
        { onConflict: 'user_id' }
      );
      toastSuccess(`Redeemed ${rewardPoints} points = ₹${cashback} added to wallet!`);
      fetchWalletData();
    } catch (err: any) {
      toast('Redemption failed. Please try again.', 'error');
    }
  };

  const handleWithdraw = async () => {
    if (walletBalance < 100) { toast('Minimum ₹100 balance required to withdraw.', 'info'); return; }
    if (!user) return;
    try {
      const { error } = await supabase.from('withdrawal_requests').insert({
        user_id: user.id,
        amount: walletBalance,
        status: 'pending',
        requested_at: new Date().toISOString(),
      });
      if (error) throw error;
      toastSuccess(`Withdrawal of ₹${walletBalance.toLocaleString('en-IN')} requested! Funds arrive in 2–3 business days.`);
    } catch (err: any) {
      toast('Withdrawal failed. Please complete KYC first or try again.', 'error');
    }
  };

  if (!user) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <span className="text-6xl mb-4">🎁</span>
      <h2 className="text-xl font-black mb-2">Login to view Rewards</h2>
      <p className="text-gray-500 mb-5">Earn points on every purchase and redeem for cashback.</p>
      <Link to="/" className="bg-[#0D47A1] text-white px-6 py-2.5 rounded-md font-bold">Login</Link>
    </div>
  );

  return (
    <div className="bg-[#F5F5F5] min-h-screen">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 px-4 py-2.5 bg-white border-b border-gray-200">
        <Link to="/" className="text-[#1565C0] hover:underline">Home</Link> ›
        <span className="font-semibold text-gray-800">Rewards & Wallet</span>
      </div>
      <div className="max-w-4xl mx-auto p-4 md:p-6 flex flex-col gap-4">
        <h1 className="text-[18px] font-black">🎁 Rewards & Wallet</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-[#FF9800] to-[#E65100] text-white rounded-xl p-5">
            <div className="text-xs opacity-70 mb-1 uppercase tracking-wide">Reward Points</div>
            <div className="text-[42px] font-black">{rewardPoints.toLocaleString('en-IN')}</div>
            <div className="text-[12px] opacity-80 mb-4">= ₹{(rewardPoints * 0.1).toFixed(0)} cashback value</div>
            {withdrawMsg && <div className="bg-black/20 rounded p-2 text-xs mb-3">{withdrawMsg}</div>}
            <button onClick={handleRedeem} className="bg-white text-[#E65100] px-4 py-2 rounded-md text-[12px] font-bold hover:bg-orange-50 transition-colors">
              Redeem Points
            </button>
          </div>
          <div className="bg-gradient-to-br from-[#0D47A1] to-[#1565C0] text-white rounded-xl p-5">
            <div className="text-xs opacity-70 mb-1 uppercase tracking-wide">Wallet Balance</div>
            <div className="text-[42px] font-black">₹{walletBalance.toLocaleString('en-IN')}</div>
            <div className="text-[12px] opacity-80 mb-4">Available for orders or withdrawal</div>
            <button onClick={handleWithdraw} className="bg-white text-[#0D47A1] px-4 py-2 rounded-md text-[12px] font-bold hover:bg-blue-50 transition-colors">
              Withdraw to Bank
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="text-[14px] font-black mb-3 text-[#E65100]">🎯 How to Earn Points</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: '🛒', action: 'Every Purchase', points: '1 pt per ₹50 spent' },
              { icon: '⭐', action: 'Leave a Review', points: '5 pts / review' },
              { icon: '👥', action: 'Refer a Friend', points: '100 pts + 5% of their first order' },
              { icon: '📱', action: 'Download App', points: '100 pts instantly' },
            ].map((e, i) => (
              <div key={i} className="bg-[#FFF3E0] border border-[#FFE0B2] rounded-lg p-3 text-center">
                <div className="text-[24px] mb-1">{e.icon}</div>
                <div className="text-[11px] font-bold">{e.action}</div>
                <div className="text-[13px] font-black text-[#E65100] mt-0.5">{e.points}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Gamification: Referrals & Leaderboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-orange-100/50">
            <h3 className="text-[14px] font-black mb-1">🔗 Invite & Earn</h3>
            <p className="text-[11px] text-gray-500 mb-4 tracking-tight">Generate wealth by growing the BYNDIO community.</p>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center justify-between mb-5">
              <span className="text-[12px] font-mono text-gray-700 tracking-wider">BYNDIO-REF-{user.id.substring(0, 5).toUpperCase()}</span>
              <button onClick={() => { navigator.clipboard.writeText(`https://byndio.com?ref=${user.id}`); toastSuccess('Link copied!'); }}
                className="bg-[#0D47A1] text-white px-3 py-1.5 rounded text-[11px] font-bold hover:bg-[#1565C0] active:scale-95 transition-all">Copy Link</button>
            </div>
            
            {/* REFERRAL TREE VISUAL */}
            <div className="mb-5">
              <div className="text-[12px] font-black text-gray-800 mb-3 flex items-center gap-2">
                🕸️ Your Network <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">Level 3</span>
              </div>
              <div className="flex items-center justify-center py-2 relative">
                {/* Visual Tree */}
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-[#0D47A1] border-4 border-blue-50 flex items-center justify-center text-white font-black text-sm z-10 relative">You</div>
                  {/* Stem */}
                  <div className="absolute top-12 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-gray-200" />
                  
                  {/* Level 1 branches */}
                  <div className="flex justify-center gap-12 mt-6">
                    <div className="relative flex flex-col items-center">
                       <div className="absolute -top-6 left-1/2 w-12 h-0.5 bg-gray-200" style={{ transform: 'translateX(-100%)' }} />
                       <div className="w-8 h-8 rounded-full bg-green-500 border-2 border-green-50 flex items-center justify-center text-white text-[10px] font-bold">8</div>
                       <span className="text-[9px] font-bold text-gray-500 mt-1">Direct</span>
                    </div>
                    <div className="relative flex flex-col items-center">
                       <div className="absolute -top-6 right-1/2 w-12 h-0.5 bg-gray-200" style={{ transform: 'translateX(100%)' }} />
                       <div className="w-8 h-8 rounded-full bg-blue-400 border-2 border-blue-50 flex items-center justify-center text-white text-[10px] font-bold">24</div>
                       <span className="text-[9px] font-bold text-gray-500 mt-1">Extended</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-[#E8F5E9] p-3 rounded-xl text-[#1B5E20] border border-[#C8E6C9]/50">
                <div className="text-xl font-black">32</div><div className="text-[9px] font-bold uppercase tracking-wider">Direct Network</div>
              </div>
              <div className="bg-[#F3E5F5] p-3 rounded-xl text-[#7B1FA2] border border-[#E1BEE7]/50">
                <div className="text-xl font-black">1,240</div><div className="text-[9px] font-bold uppercase tracking-wider">Network Points</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#FFD54F]/20 to-transparent rounded-bl-full" />
            <h3 className="text-[14px] font-black mb-1 flex items-center gap-1.5">🏆 Top Earner Leaderboard</h3>
            <p className="text-[11px] text-gray-500 mb-4">Compete with other buyers. Top 3 win extra rewards monthly!</p>
            <div className="space-y-2">
              {[
                { rank: 1, name: 'Rahul S.', points: '14,500', emoji: '👑' },
                { rank: 2, name: 'Priya K.', points: '12,200', emoji: '🚀' },
                { rank: 3, name: 'Arjun M.', points: '9,800',  emoji: '🔥' },
              ].map((lb) => (
                <div key={lb.rank} className="flex justify-between items-center bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 flex items-center justify-center bg-white border border-gray-200 rounded-full text-[10px] font-black text-gray-600">{lb.rank}</span>
                    <span className="text-[12px] font-bold">{lb.name} {lb.emoji}</span>
                  </div>
                  <span className="text-[12px] font-black text-[#E65100]">{lb.points} pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="text-[14px] font-black mb-3">Points History</div>
          {history.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">No rewards activity yet. Start shopping to earn points!</div>
          ) : (
            <div className="flex flex-col divide-y divide-gray-100">
              {history.map(h => (
                <div key={h.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-[13px] font-semibold capitalize">{h.action.replace(/_/g, ' ')}</div>
                    <div className="text-[11px] text-gray-400">{new Date(h.created_at).toLocaleDateString('en-IN')}</div>
                  </div>
                  <span className={`text-[13px] font-black ${h.points_earned > 0 ? 'text-[#388E3C]' : 'text-red-500'}`}>
                    {h.points_earned > 0 ? `+${h.points_earned}` : `-${h.points_redeemed}`} pts
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
