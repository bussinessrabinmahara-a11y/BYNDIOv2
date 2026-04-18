import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Trophy, TrendingUp, Users, Star } from 'lucide-react';

interface LeaderEntry {
  id: string;
  full_name: string;
  role: string;
  total_earned: number;
  total_clicks: number;
  total_sales: number;
  rank: number;
}

export default function Leaderboard() {
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'influencer' | 'seller' | 'supplier'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [filter]);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('affiliate_leaderboard').select('*').limit(20);
      if (filter !== 'all') query = query.eq('role', filter);
      const { data } = await query;
      if (data && data.length > 0) setLeaders(data);
      else {
        // Fallback for demo if view doesn't exist
        const mock: LeaderEntry[] = [
          { id: '1', full_name: 'Rahul S.', role: 'influencer', total_earned: 45000, total_clicks: 1200, total_sales: 85, rank: 1 },
          { id: '2', full_name: 'Fast Fashion Ltd', role: 'seller', total_earned: 38000, total_clicks: 900, total_sales: 120, rank: 2 },
          { id: '3', full_name: 'Priya K.', role: 'influencer', total_earned: 32000, total_clicks: 1500, total_sales: 45, rank: 3 },
          { id: '4', full_name: 'TexGlobal Imports', role: 'supplier', total_earned: 28000, total_clicks: 50, total_sales: 12, rank: 4 },
        ];
        setLeaders(filter === 'all' ? mock : mock.filter(m => m.role === filter));
      }
    } catch {
      setLeaders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const rankColors: Record<number, string> = { 1: 'bg-amber-400 text-amber-900', 2: 'bg-gray-300 text-gray-800', 3: 'bg-orange-300 text-orange-900' };
  const rankIcons: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

  return (
    <div className="bg-[#F5F5F5] min-h-screen">
      <div className="bg-gradient-to-br from-[#0D47A1] via-[#1565C0] to-[#7B1FA2] text-white py-10 px-6 text-center">
        <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 px-4 py-1.5 rounded-full mb-4 text-xs font-bold">
          <Trophy size={14} /> BYNDIO Performance Leaderboard
        </div>
        <h1 className="text-3xl font-black mb-2">Top Performers on BYNDIO</h1>
        <p className="text-[14px] opacity-80 max-w-lg mx-auto">Real-time rankings of our highest-earning creators, sellers, and suppliers.</p>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {/* Filter tabs */}
        <div className="flex gap-2 mb-5 bg-white rounded-xl p-1.5 shadow-sm overflow-x-auto">
          {([
            { id: 'all', label: '🏆 All', icon: Users },
            { id: 'influencer', label: '⭐ Creators', icon: Star },
            { id: 'seller', label: '🏪 Sellers', icon: TrendingUp },
            { id: 'supplier', label: '🏢 Suppliers', icon: Users },
          ] as const).map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-colors whitespace-nowrap ${filter === f.id ? 'bg-[#0D47A1] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Top 3 podium */}
        {leaders.length >= 3 && (
          <div className="flex items-end justify-center gap-4 mb-6">
            {[leaders[1], leaders[0], leaders[2]].map((entry, i) => {
              const podiumHeight = i === 1 ? 'pb-6' : 'pb-2';
              const size = i === 1 ? 'w-24 h-24 text-[20px]' : 'w-20 h-20 text-[16px]';
              return (
                <div key={entry.id} className={`flex flex-col items-center ${podiumHeight}`}>
                  <div className={`${size} bg-gradient-to-br from-[#0D47A1] to-[#7B1FA2] rounded-full flex items-center justify-center text-white font-black mb-2 border-4 border-white shadow-lg`}>
                    {entry.full_name.charAt(0)}
                  </div>
                  <div className="text-[11px] font-bold text-center max-w-[80px] truncate">{entry.full_name}</div>
                  <div className="text-[12px] font-black text-[#0D47A1]">₹{(entry.total_earned / 1000).toFixed(0)}K</div>
                  <div className="text-[20px] mt-1">{rankIcons[i === 1 ? 1 : i === 0 ? 2 : 3]}</div>
                  <div className={`w-full text-center text-[11px] font-black rounded-t-md py-1 px-3 mt-2 ${i === 1 ? 'bg-amber-400 text-amber-900' : i === 0 ? 'bg-gray-300 text-gray-800' : 'bg-orange-300 text-orange-900'}`}>
                    #{i === 1 ? 1 : i === 0 ? 2 : 3}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Full table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <span className="font-black text-[15px]">Full Rankings</span>
            <span className="text-[12px] text-gray-400">{leaders.length} entries</span>
          </div>
          {isLoading ? (
            <div className="p-8 text-center"><div className="w-8 h-8 border-4 border-[#0D47A1] border-t-transparent rounded-full animate-spin mx-auto" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="bg-gray-50 text-[11px] uppercase text-gray-500 font-bold">
                  <tr>
                    <th className="p-3 text-left w-12">Rank</th>
                    <th className="p-3 text-left">Name</th>
                    <th className="p-3 text-left">Role</th>
                    <th className="p-3 text-right">Earnings</th>
                    <th className="p-3 text-right">Sales</th>
                    <th className="p-3 text-right">Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {leaders.map((entry, i) => (
                    <tr key={entry.id} className={`border-b border-gray-100 hover:bg-blue-50/30 ${i < 3 ? 'bg-amber-50/30' : ''}`}>
                      <td className="p-3">
                        <span className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-[11px] font-black ${rankColors[i + 1] || 'bg-gray-100 text-gray-600'}`}>
                          {i < 3 ? rankIcons[i + 1] : i + 1}
                        </span>
                      </td>
                      <td className="p-3 font-bold">{entry.full_name}</td>
                      <td className="p-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          entry.role === 'influencer' ? 'bg-[#F3E5F5] text-[#7B1FA2]' : 
                          entry.role === 'supplier' ? 'bg-[#E8F5E9] text-[#1B5E20]' :
                          'bg-[#E3F2FD] text-[#0D47A1]'
                        }`}>
                          {entry.role === 'influencer' ? '⭐ Creator' : entry.role === 'supplier' ? '🏢 Supplier' : '🏪 Seller'}
                        </span>
                      </td>
                      <td className="p-3 text-right font-black text-[#388E3C]">₹{entry.total_earned.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-semibold">{entry.total_sales.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right text-gray-500">{entry.total_clicks.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-[#7B1FA2] to-[#4A148C] text-white rounded-xl p-5">
            <div className="font-black text-[15px] mb-1">Want to join the leaderboard?</div>
            <p className="text-[12px] opacity-80 mb-3">Register as a Creator and start earning commissions today. No minimum followers needed.</p>
            <Link to="/influencer" className="bg-white text-[#7B1FA2] px-4 py-2 rounded-md text-[12px] font-bold hover:bg-gray-100 transition-colors inline-block">
              Join Creator Hub →
            </Link>
          </div>
          <div className="bg-gradient-to-br from-[#0D47A1] to-[#1565C0] text-white rounded-xl p-5">
            <div className="font-black text-[15px] mb-1">Sell on BYNDIO</div>
            <p className="text-[12px] opacity-80 mb-3">0% commission. Generate affiliate links for your products and climb the leaderboard.</p>
            <Link to="/seller" className="bg-white text-[#0D47A1] px-4 py-2 rounded-md text-[12px] font-bold hover:bg-gray-100 transition-colors inline-block">
              Start Selling →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
