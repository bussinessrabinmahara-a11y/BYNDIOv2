import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppStore } from '../store';
import ProductCard from '../components/ProductCard';

export default function CreatorStorefront() {
  const { creatorId } = useParams();
  const { products } = useAppStore();
  const [creatorInfo, setCreatorInfo] = useState<{ name: string; role: string; bio?: string; niche?: string[]; followers?: string } | null>(null);

  useEffect(() => {
    if (!creatorId) return;
    import('../lib/supabase').then(({ supabase }) => {
      supabase.from('users').select('full_name, role, bio, niche, followers_count').eq('id', creatorId).single()
        .then(({ data }) => { 
          if (data) setCreatorInfo({ 
            name: data.full_name, 
            role: data.role,
            bio: data.bio || 'Passionate about sharing the best products with my community. Check out my curated picks below! ✨',
            niche: data.niche || ['Lifestyle', 'Fashion', 'Tech'],
            followers: data.followers_count || '12.5K'
          }); 
        });
    });
  }, [creatorId]);

  const creatorProducts = products.filter(p => p.inf || p.creator === creatorInfo?.name).slice(0, 16);

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-20">
      {/* Premium Header/Banner */}
      <div className="bg-[#0D1117] relative h-80 overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 opacity-40">
           <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/30 rounded-full blur-[120px] translate-x-1/2 -translate-y-1/2 animate-pulse" />
           <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/20 rounded-full blur-[100px] -translate-x-1/4 translate-y-1/4" />
        </div>
        
        <div className="relative z-10 text-center px-6">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-28 h-28 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/20 shadow-2xl overflow-hidden"
          >
            <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-4xl font-black text-white">
              {creatorInfo?.name?.charAt(0).toUpperCase() || '⭐'}
            </div>
          </motion.div>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tight"
          >
            {creatorInfo?.name}'s <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">Picks</span>
          </motion.h1>
          <p className="text-gray-400 text-sm max-w-lg mx-auto leading-relaxed">{creatorInfo?.bio}</p>
        </div>
      </div>

      {/* Stats & Niche bar */}
      <div className="max-w-6xl mx-auto px-6 -translate-y-10 relative z-20">
        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-blue-900/5 border border-white flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex gap-4">
            <div className="text-center px-6 border-r border-gray-100">
               <div className="text-xl font-black text-gray-900">{creatorInfo?.followers}</div>
               <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Followers</div>
            </div>
            <div className="text-center px-6 border-r border-gray-100">
               <div className="text-xl font-black text-gray-900">{creatorProducts.length}</div>
               <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Recommendations</div>
            </div>
            <div className="text-center px-6">
               <div className="text-xl font-black text-green-600">98%</div>
               <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Trust Score</div>
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap justify-center">
            {creatorInfo?.niche?.map(n => (
              <span key={n} className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-xs font-bold text-gray-700 hover:bg-[#0D47A1] hover:text-white transition-colors cursor-default">
                #{n}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Product Feed */}
      <div className="max-w-6xl mx-auto px-6 mt-6">
        <div className="flex items-center justify-between mb-8">
           <h2 className="text-2xl font-black text-gray-900 tracking-tight">Curated Collection 📦</h2>
           <div className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Updated 2 hours ago
           </div>
        </div>

        {creatorProducts.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] p-20 text-center shadow-sm">
            <div className="text-6xl mb-6 grayscale opacity-50">🛍️</div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Inventory Syncing...</h3>
            <p className="text-gray-500 text-sm">Products recommended by {creatorInfo?.name} will appear here shortly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {creatorProducts.map(p => (
               <motion.div 
                 key={p.id}
                 whileHover={{ y: -5 }}
                 className="group"
               >
                 <ProductCard product={p} />
                 <div className="mt-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-black text-purple-600 uppercase tracking-tighter">Verified Choice ★</span>
                 </div>
               </motion.div>
            ))}
          </div>
        )}

        {/* Brand Call to Action */}
        <div className="mt-20 bg-gradient-to-r from-[#0D47A1] to-[#1565C0] rounded-[2.5rem] p-12 text-center text-white relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
           <div className="relative z-10">
              <h3 className="text-3xl font-black mb-4">Are you a brand? 🚀</h3>
              <p className="max-w-lg mx-auto text-blue-100 mb-8 font-medium">Collaborate with {creatorInfo?.name} and other top creators to drive sales and scale your brand visibility.</p>
              <div className="flex gap-4 justify-center">
                 <Link to="/seller" className="bg-white text-[#0D47A1] px-8 py-3 rounded-xl font-black text-sm hover:scale-105 transition-transform">
                    Start Campaign
                 </Link>
                 <Link to="/affiliate" className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-8 py-3 rounded-xl font-black text-sm hover:bg-white/20 transition-all">
                    Creator Hub info
                 </Link>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
