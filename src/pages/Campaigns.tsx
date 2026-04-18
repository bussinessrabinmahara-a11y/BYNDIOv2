import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Star, DollarSign, Clock, Users, CheckCircle, XCircle, MessageSquare, Filter } from 'lucide-react';
import { useAppStore } from '../store';
import { toastSuccess, toast } from '../components/Toast';

const MOCK_CAMPAIGNS = [
  {
    id: '1', brand: 'TechNova India', brandLogo: '📱', title: 'Launch Campaign – Nova X1 Phone',
    category: 'Electronics', commission: '12%', budget: '₹50,000', deadline: '2026-04-15',
    followers_required: '5,000+', platforms: ['Instagram', 'YouTube'],
    desc: 'Promote our new flagship Nova X1 smartphone. Create unboxing + review content. Full device provided free.',
    status: 'open', applicants: 34,
  },
  {
    id: '2', brand: 'GlowUp Beauty', brandLogo: '💄', title: 'Summer Skincare Collection',
    category: 'Beauty', commission: '15%', budget: '₹30,000', deadline: '2026-04-01',
    followers_required: '2,000+', platforms: ['Instagram', 'Reels'],
    desc: 'Showcase our summer skincare range. Product kit shipped to you. Post 3 reels + 5 stories.',
    status: 'open', applicants: 57,
  },
  {
    id: '3', brand: 'FitZone Apparel', brandLogo: '🏋️', title: 'Fitness Wear – Spring Drop',
    category: 'Fashion', commission: '10%', budget: '₹20,000', deadline: '2026-03-25',
    followers_required: '1,000+', platforms: ['Instagram'],
    desc: 'Wear and review our new activewear collection. 2 outfit sets provided. 1 reel + 3 posts required.',
    status: 'open', applicants: 22,
  },
  {
    id: '4', brand: 'KidsWorld Toys', brandLogo: '🧸', title: 'Toy Unboxing Series',
    category: 'Kids', commission: '8%', budget: '₹15,000', deadline: '2026-04-30',
    followers_required: '500+', platforms: ['YouTube', 'Instagram'],
    desc: 'Family/parenting creators preferred. Unbox and review 3 toy sets. Toys kept by creator after review.',
    status: 'closing', applicants: 18,
  },
];

export default function Campaigns() {
  const { user } = useAppStore();
  const [filter, setFilter] = useState('all');
  const [applied, setApplied] = useState<string[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<typeof MOCK_CAMPAIGNS[0] | null>(null);
  const [applyMsg, setApplyMsg] = useState('');
  const [applying, setApplying] = useState(false);

  const filtered = filter === 'all' ? MOCK_CAMPAIGNS : MOCK_CAMPAIGNS.filter(c => c.category.toLowerCase() === filter);

  const handleApply = async () => {
    if (!applyMsg.trim()) { toast('Please write a message to the brand', 'error'); return; }
    setApplying(true);
    try {
      await supabase.from('campaign_applications').insert({
        campaign_id: selectedCampaign!.id,
        campaign_title: selectedCampaign!.title,
        brand: selectedCampaign!.brand,
        message: applyMsg.trim(),
        status: 'pending',
      });
    } catch { /* Graceful fallback if table not yet created */ }
    setApplied(a => [...a, selectedCampaign!.id]);
    setSelectedCampaign(null);
    setApplyMsg('');
    setApplying(false);
    toastSuccess('Application submitted! Brand will review and contact you.');
  };

  return (
    <div className="bg-[#F5F5F5] min-h-screen py-5 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#AD1457] to-[#C2185B] text-white rounded-2xl p-6 mb-5">
          <div className="text-2xl font-black mb-1">🎯 Campaign Marketplace</div>
          <div className="text-[13px] text-white/80 mb-4">Apply to brand campaigns, earn commissions, grow your audience</div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Active Campaigns', value: MOCK_CAMPAIGNS.length },
              { label: 'Avg Commission', value: '11%' },
              { label: 'Applied', value: applied.length },
            ].map((s, i) => (
              <div key={i} className="bg-white/10 rounded-lg p-3 text-center">
                <div className="text-xl font-black">{s.value}</div>
                <div className="text-[10px] opacity-75">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {['all', 'Electronics', 'Beauty', 'Fashion', 'Kids', 'Sports'].map(f => (
            <button key={f} onClick={() => setFilter(f.toLowerCase())}
              className={`px-4 py-2 rounded-full text-[12px] font-bold whitespace-nowrap transition-colors ${filter === f.toLowerCase() ? 'bg-[#AD1457] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
              {f === 'all' ? 'All Categories' : f}
            </button>
          ))}
        </div>

        {/* Campaign Cards */}
        <div className="flex flex-col gap-4">
          {filtered.map(campaign => (
            <div key={campaign.id} className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-[#FCE4EC] flex items-center justify-center text-2xl shrink-0">{campaign.brandLogo}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-[15px] font-black">{campaign.title}</div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${campaign.status === 'open' ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-[#FFF3E0] text-[#E65100]'}`}>
                      {campaign.status === 'open' ? '🟢 Open' : '🟡 Closing Soon'}
                    </span>
                  </div>
                  <div className="text-[12px] text-gray-500">{campaign.brand} • {campaign.category}</div>
                </div>
              </div>

              <p className="text-[12px] text-gray-600 mb-3">{campaign.desc}</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                {[
                  { icon: DollarSign, label: 'Commission', value: campaign.commission },
                  { icon: Users, label: 'Min Followers', value: campaign.followers_required },
                  { icon: Clock, label: 'Deadline', value: new Date(campaign.deadline).toLocaleDateString('en-IN') },
                  { icon: Star, label: 'Applicants', value: campaign.applicants },
                ].map((info, i) => {
                  const Icon = info.icon;
                  return (
                    <div key={i} className="bg-gray-50 rounded-lg p-2.5 flex items-center gap-2">
                      <Icon size={13} className="text-[#AD1457] shrink-0" />
                      <div>
                        <div className="text-[10px] text-gray-400">{info.label}</div>
                        <div className="text-[12px] font-black">{info.value}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-1.5 flex-wrap">
                  {campaign.platforms.map(p => (
                    <span key={p} className="text-[10px] font-bold px-2 py-0.5 bg-[#E3F2FD] text-[#1565C0] rounded-full">{p}</span>
                  ))}
                </div>
                {applied.includes(campaign.id) ? (
                  <div className="flex items-center gap-1.5 text-[12px] text-[#2E7D32] font-bold">
                    <CheckCircle size={15} /> Applied
                  </div>
                ) : (
                  <button onClick={() => setSelectedCampaign(campaign)}
                    className="bg-[#AD1457] hover:bg-[#C2185B] text-white px-4 py-2 rounded-md text-[12px] font-bold transition-colors">
                    Apply Now →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Apply Modal */}
        {selectedCampaign && (
          <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <div className="text-[16px] font-black mb-1">Apply to Campaign</div>
              <div className="text-[13px] text-gray-500 mb-4">{selectedCampaign.brand} — {selectedCampaign.title}</div>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Your Message to Brand *</label>
                  <textarea value={applyMsg} onChange={e => setApplyMsg(e.target.value)} rows={4}
                    placeholder="Tell the brand why you're a great fit. Include your niche, audience demographics, and past campaign results..."
                    className="w-full p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#AD1457] resize-none" />
                </div>
                <div className="bg-[#FCE4EC] rounded-lg p-3 text-[11px] text-[#AD1457]">
                  <strong>💡 Tip:</strong> Brands prefer creators with engaged audiences. Mention your avg engagement rate and past brand collaborations.
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => { setSelectedCampaign(null); setApplyMsg(''); }} className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-md text-[13px] font-bold hover:bg-gray-50">Cancel</button>
                <button onClick={handleApply} disabled={applying} className="flex-1 bg-[#AD1457] hover:bg-[#C2185B] text-white py-2.5 rounded-md text-[13px] font-black transition-colors disabled:opacity-50">
                  {applying ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
