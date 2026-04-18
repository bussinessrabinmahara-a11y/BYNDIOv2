import { useState, useEffect } from 'react';
import { Trophy, Star, Zap, Shield, Crown, Target, TrendingUp, Gift } from 'lucide-react';
import { useAppStore } from '../store';
import { Link } from 'react-router-dom';

const BADGE_DEFS = [
  { id: 'first_order', icon: '🛍️', name: 'First Purchase', desc: 'Placed your first order', points: 50 },
  { id: 'reviewer', icon: '⭐', name: 'Top Reviewer', desc: 'Left 5 product reviews', points: 100 },
  { id: 'referrer', icon: '🤝', name: 'Super Referrer', desc: 'Referred 3 friends', points: 200, target: 3 },
  { id: 'big_spender', icon: '💎', name: 'Big Spender', desc: 'Spent ₹10,000 on Byndio', points: 300, target: 10000 },
  { id: 'influencer', icon: '🌟', name: 'Micro Influencer', desc: 'Made 10 affiliate sales', points: 500, target: 10 },
  { id: 'loyalist', icon: '🏆', name: 'Byndio Loyalist', desc: 'Member for 6 months', points: 250, target: 6 },
  { id: 'wishlist_pro', icon: '❤️', name: 'Wishlist Pro', desc: 'Added 20 items to wishlist', points: 75, target: 20 },
  { id: 'cart_king', icon: '🛒', name: 'Cart King', desc: 'Had 10+ items in cart', points: 50, target: 10 },
];

const LEVELS = [
  { level: 1, name: 'Bronze', icon: '🥉', minPoints: 0, maxPoints: 500, color: '#CD7F32', bg: '#FFF3E0' },
  { level: 2, name: 'Silver', icon: '🥈', minPoints: 500, maxPoints: 1500, color: '#9E9E9E', bg: '#F5F5F5' },
  { level: 3, name: 'Gold', icon: '🥇', minPoints: 1500, maxPoints: 3000, color: '#F9A825', bg: '#FFFDE7' },
  { level: 4, name: 'Platinum', icon: '💎', minPoints: 3000, maxPoints: 6000, color: '#1565C0', bg: '#E3F2FD' },
  { level: 5, name: 'Diamond', icon: '👑', minPoints: 6000, maxPoints: Infinity, color: '#AD1457', bg: '#FCE4EC' },
];

const PERKS_BY_LEVEL = [
  { level: 'Silver', perks: ['Priority customer support', '2x points on flash sales'] },
  { level: 'Gold', perks: ['Early access to flash deals', '5% extra discount on all orders', 'Free express shipping once/month'] },
  { level: 'Platinum', perks: ['Dedicated account manager', '10% extra discount', 'Free shipping always', 'Exclusive products'] },
  { level: 'Diamond', perks: ['VIP treatment', '15% extra discount', 'First access to all features', '₹1000 monthly credit'] },
];

export default function Gamification() {
  const { myOrders, wishlist, cart, rewardPoints, affiliateLinks, fetchMyOrders, fetchAffiliateLinks } = useAppStore();
  
  // Compute real badge progress
  const totalSpent = myOrders.filter(o => o.payment_status === 'paid').reduce((s, o) => s + o.total_amount, 0);
  const affiliateSales = affiliateLinks.reduce((s, l) => s + (l.conversions || 0), 0);
  
  const BADGES = BADGE_DEFS.map(b => {
    let progress = 0, unlocked = false;
    switch (b.id) {
      case 'first_order': unlocked = myOrders.length > 0; break;
      case 'referrer': progress = 0; unlocked = false; break; // needs referral tracking
      case 'big_spender': progress = totalSpent; unlocked = totalSpent >= 10000; break;
      case 'influencer': progress = affiliateSales; unlocked = affiliateSales >= 10; break;
      case 'wishlist_pro': progress = wishlist.length; unlocked = wishlist.length >= 20; break;
      case 'cart_king': progress = cart.length; unlocked = cart.length >= 10; break;
      default: unlocked = false;
    }
    return { ...b, unlocked, progress: b.target ? progress : undefined };
  });
  const [tab, setTab] = useState<'badges' | 'levels' | 'perks'>('badges');

  useEffect(() => {
    fetchMyOrders();
    fetchAffiliateLinks();
  }, []);

  const currentLevel = LEVELS.find(l => rewardPoints >= l.minPoints && rewardPoints < l.maxPoints) || LEVELS[0];
  const nextLevel = LEVELS[currentLevel.level] || null;
  const progressPct = nextLevel
    ? ((rewardPoints - currentLevel.minPoints) / (nextLevel.minPoints - currentLevel.minPoints)) * 100
    : 100;

  const unlockedCount = BADGES.filter(b => b.unlocked).length;

  return (
    <div className="min-h-screen bg-[#F5F5F5] py-5 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Level Card */}
        <div style={{ background: `linear-gradient(135deg, ${currentLevel.color}, ${currentLevel.color}CC)` }}
          className="rounded-2xl p-6 text-white mb-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[12px] opacity-75 uppercase tracking-widest">Your Level</div>
              <div className="text-3xl font-black">{currentLevel.icon} {currentLevel.name}</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black">{rewardPoints.toLocaleString()}</div>
              <div className="text-[12px] opacity-75">Total Points</div>
            </div>
          </div>
          {nextLevel && (
            <>
              <div className="flex justify-between text-[11px] mb-1.5 opacity-80">
                <span>{currentLevel.name}</span>
                <span>{nextLevel.icon} {nextLevel.name} ({nextLevel.minPoints.toLocaleString()} pts)</span>
              </div>
              <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all" style={{ width: `${Math.min(progressPct, 100)}%` }} />
              </div>
              <div className="text-[11px] opacity-75 mt-1.5">
                {(nextLevel.minPoints - rewardPoints).toLocaleString()} points to {nextLevel.name}
              </div>
            </>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {(['badges', 'levels', 'perks'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-lg text-[13px] font-bold capitalize transition-colors ${tab === t ? 'bg-[#0D47A1] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              {t === 'badges' ? `🏅 Badges (${unlockedCount}/${BADGES.length})` : t === 'levels' ? '🎮 Levels' : '🎁 Perks'}
            </button>
          ))}
        </div>

        {tab === 'badges' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {BADGES.map(badge => (
              <div key={badge.id} className={`bg-white rounded-xl p-4 text-center shadow-sm transition-all ${badge.unlocked ? 'border-2 border-[#F9A825]' : 'opacity-60'}`}>
                <div className={`text-3xl mb-2 ${!badge.unlocked ? 'grayscale' : ''}`}>{badge.icon}</div>
                <div className="text-[12px] font-black mb-1">{badge.name}</div>
                <div className="text-[10px] text-gray-500 mb-2">{badge.desc}</div>
                {badge.unlocked ? (
                  <div className="text-[10px] font-bold text-[#F9A825] bg-[#FFFDE7] px-2 py-0.5 rounded-full inline-block">
                    +{badge.points} pts ✓
                  </div>
                ) : badge.progress !== undefined ? (
                  <>
                    <div className="h-1.5 bg-gray-200 rounded-full mb-1">
                      <div className="h-full bg-[#0D47A1] rounded-full" style={{ width: `${(badge.progress / badge.target!) * 100}%` }} />
                    </div>
                    <div className="text-[10px] text-gray-400">{badge.progress}/{badge.target}</div>
                  </>
                ) : (
                  <div className="text-[10px] text-gray-400">Locked 🔒</div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'levels' && (
          <div className="flex flex-col gap-3">
            {LEVELS.map(level => {
              const isActive = level.level === currentLevel.level;
              const isUnlocked = rewardPoints >= level.minPoints;
              return (
                <div key={level.level} className={`bg-white rounded-xl p-4 shadow-sm flex items-center gap-4 ${isActive ? 'border-2 border-[#0D47A1]' : ''}`}>
                  <div className="text-3xl shrink-0">{level.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-[15px] font-black" style={{ color: level.color }}>{level.name}</div>
                      {isActive && <span className="text-[10px] font-bold bg-[#E3F2FD] text-[#0D47A1] px-2 py-0.5 rounded-full">CURRENT</span>}
                      {!isUnlocked && <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">LOCKED</span>}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {level.maxPoints === Infinity ? `${level.minPoints.toLocaleString()}+ points` : `${level.minPoints.toLocaleString()} – ${level.maxPoints.toLocaleString()} points`}
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isUnlocked ? 'bg-[#2E7D32]' : 'bg-gray-200'}`}>
                    <span className="text-white text-[11px]">{isUnlocked ? '✓' : '🔒'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'perks' && (
          <div className="flex flex-col gap-4">
            <div className="bg-[#E8F5E9] rounded-xl p-4 border border-[#A5D6A7]">
              <div className="text-[13px] font-black text-[#2E7D32] mb-1">🎁 Your Current Perks ({currentLevel.name})</div>
              {currentLevel.level === 1 ? (
                <div className="text-[12px] text-[#388E3C]">Earn more points to unlock exclusive perks. Reach Silver (500 pts) to start!</div>
              ) : (
                <div className="text-[12px] text-[#388E3C]">Enjoy the perks of your current level. Keep earning to unlock more!</div>
              )}
            </div>
            {PERKS_BY_LEVEL.map((item, i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="text-[14px] font-black mb-3">{LEVELS.find(l => l.name === item.level)?.icon} {item.level} Perks</div>
                <div className="flex flex-col gap-2">
                  {item.perks.map((perk, j) => (
                    <div key={j} className="flex items-center gap-2 text-[12px] text-gray-700">
                      <div className="w-5 h-5 rounded-full bg-[#E8F5E9] flex items-center justify-center shrink-0">
                        <span className="text-[10px] text-[#2E7D32]">✓</span>
                      </div>
                      {perk}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <Link to="/rewards" className="bg-[#0D47A1] hover:bg-[#1565C0] text-white py-3 rounded-xl text-[14px] font-black text-center transition-colors block">
              🏆 View Full Rewards & Wallet →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
