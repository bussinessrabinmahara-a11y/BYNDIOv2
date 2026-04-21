import { useState } from 'react';
import { usePageTitle } from '../lib/usePageTitle';
import { Link } from 'react-router-dom';
import { toastSuccess, toast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store';

export default function Influencer() {
  usePageTitle('Join Creator Hub');
  const { user } = useAppStore();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    try {
      const { error } = await supabase.from('influencer_applications').insert({
        user_id: user?.id || null,
        full_name: data.get('fullName') as string,
        email: data.get('email') as string,
        phone: data.get('phone') as string,
        instagram_handle: data.get('instagram') as string,
        youtube_channel: data.get('youtube') as string,
        followers_count: data.get('followers') as string,
        category: data.get('category') as string,
        status: 'pending',
      });
      if (error) throw error;
      toastSuccess('Application submitted! Our team will review within 2–3 days.');
      form.reset();
    } catch (err: any) {
      toast('Failed to submit application: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#F5F5F5] min-h-screen">
      <div className="bg-gradient-to-br from-[#6A1B9A] via-[#4A148C] to-[#0D47A1] text-white py-12 px-6 text-center">
        <div className="inline-block bg-[#FFD600] text-[#333] text-[11px] font-black px-4 py-1 rounded-full mb-4">
          ⭐ India's Largest Creator Commerce Platform
        </div>
        <h1 className="text-4xl font-black mb-3">Turn Your Influence Into Income</h1>
        <p className="text-[15px] opacity-90 max-w-[580px] mx-auto mb-6">Join 20,000+ Indian creators earning from their content. Earn up to 15% commission on every sale. No minimum follower requirement.</p>
        
        <div className="flex gap-4 justify-center flex-wrap mb-6">
          <div className="bg-white/10 border-2 border-white/25 rounded-lg py-4 px-6 text-center min-w-[130px]">
            <span className="text-[26px] font-black block">20K+</span>
            <span className="text-xs opacity-85">Active Creators</span>
          </div>
          <div className="bg-white/10 border-2 border-white/25 rounded-lg py-4 px-6 text-center min-w-[130px]">
            <span className="text-[26px] font-black block">₹2.5L</span>
            <span className="text-xs opacity-85">Avg. Monthly Earning</span>
          </div>
          <div className="bg-white/10 border-2 border-white/25 rounded-lg py-4 px-6 text-center min-w-[130px]">
            <span className="text-[26px] font-black block">15%</span>
            <span className="text-xs opacity-85">Commission Rate</span>
          </div>
          <div className="bg-white/10 border-2 border-white/25 rounded-lg py-4 px-6 text-center min-w-[130px]">
            <span className="text-[26px] font-black block">10M+</span>
            <span className="text-xs opacity-85">Products Recommended</span>
          </div>
        </div>

        <button onClick={() => document.getElementById('creator-form')?.scrollIntoView({behavior:'smooth'})} className="bg-[#FFD600] hover:bg-[#FBC02D] text-[#333] px-7 py-3.5 rounded-md text-[15px] font-extrabold transition-colors mr-3">
          ⭐ Apply to Join Creator Hub
        </button>
        <Link to="/creator-dashboard" className="bg-white/15 hover:bg-white/25 text-white border border-white/30 px-7 py-3.5 rounded-md text-[15px] font-bold transition-colors inline-block">
          📊 Creator Dashboard
        </Link>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6 flex flex-col gap-6">
        <div>
          <div className="text-lg font-black mb-4">Why Creators Love BYNDIO</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {[
              { icon: '💰', title: 'Earn 15% Commission', desc: 'Get 15% on every sale made through your unique link. Monthly payouts directly to your bank.' },
              { icon: '🎁', title: 'Free Product Samples', desc: 'Get free samples from brands to review. Build your content with authentic products.' },
              { icon: '📊', title: 'Real-time Analytics', desc: 'Track your clicks, sales, conversions and earnings with a powerful dashboard.' },
              { icon: '🤝', title: 'Brand Collaborations', desc: 'Get direct collaboration requests from India\'s top brands across all categories.' },
              { icon: '🔗', title: 'Custom Storefront', desc: 'Create your own branded storefront with your curated product picks.' },
              { icon: '🚀', title: 'Exclusive Creator Tools', desc: 'Access tools to create product videos, comparison charts, and affiliate links.' }
            ].map((f, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-[10px] p-5 flex items-start gap-3.5">
                <div className="w-11 h-11 bg-[#F3E5F5] rounded-[10px] flex items-center justify-center text-[28px] shrink-0">{f.icon}</div>
                <div>
                  <strong className="text-sm block mb-1">{f.title}</strong>
                  <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-lg font-black mb-4">Top Earning Creators</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { icon: '👗', name: '@StyleByRiya', cat: 'Fashion', followers: '2.4M', earn: '₹4.2L/month' },
              { icon: '📱', name: '@TechByArjun', cat: 'Electronics', followers: '1.8M', earn: '₹3.8L/month' },
              { icon: '💄', name: '@GlowWithNisha', cat: 'Beauty', followers: '3.1M', earn: '₹5.1L/month' },
              { icon: '💪', name: '@FitIndia', cat: 'Sports & Fitness', followers: '1.2M', earn: '₹2.7L/month' },
              { icon: '🥻', name: '@DesiLooks', cat: 'Fashion', followers: '900K', earn: '₹1.9L/month' },
              { icon: '✨', name: '@MakeupByMeera', cat: 'Beauty', followers: '4.2M', earn: '₹6.8L/month' }
            ].map((c, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-[10px] p-4 text-center">
                <span className="text-4xl block mb-2">{c.icon}</span>
                <div className="text-xs font-extrabold mb-0.5">{c.name}</div>
                <div className="text-[10px] text-[#7B1FA2] font-semibold">{c.cat}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">{c.followers} followers</div>
                <div className="text-[10px] font-bold text-[#388E3C] mt-1">{c.earn}</div>
              </div>
            ))}
          </div>
        </div>

        <div id="creator-form" className="bg-gradient-to-br from-[#F3E5F5] to-[#E3F2FD] rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-black text-[#7B1FA2] mb-1.5">Apply to Creator Hub</h2>
          <p className="text-[13px] text-gray-600 mb-5">No minimum followers required. All creators welcome!</p>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">Full Name</label>
                <input name="fullName" type="text" placeholder="Your full name" className="p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#7B1FA2] bg-white" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">Email Address</label>
                <input name="email" type="email" placeholder="you@example.com" className="p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#7B1FA2] bg-white" required />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">Mobile / WhatsApp</label>
                <input name="phone" type="tel" placeholder="+91 00000 00000" className="p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#7B1FA2] bg-white" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">Instagram Handle</label>
                <input name="instagram" type="text" placeholder="@yourhandle" className="p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#7B1FA2] bg-white" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">YouTube Channel</label>
                <input name="youtube" type="text" placeholder="youtube.com/yourchannel" className="p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#7B1FA2] bg-white" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">Content Category</label>
                <select name="category" className="p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#7B1FA2] bg-white">
                  <option>Fashion & Lifestyle</option><option>Beauty & Skincare</option><option>Tech & Gadgets</option><option>Fitness & Health</option><option>Food & Cooking</option><option>Travel</option><option>Parenting</option><option>Other</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1 mb-4">
              <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">Total Followers (approx)</label>
              <select name="followers" className="p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#7B1FA2] bg-white">
                <option>Less than 1K</option><option>1K – 10K</option><option>10K – 100K</option><option>100K – 1M</option><option>1M+</option>
              </select>
            </div>
            <button type="submit" disabled={submitting} className="w-full bg-[#7B1FA2] hover:bg-[#6A1B9A] disabled:bg-gray-400 disabled:cursor-not-allowed text-white border-none p-3 rounded-md text-[15px] font-bold transition-colors flex items-center justify-center gap-2">
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                '🌟 Apply as Creator'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
