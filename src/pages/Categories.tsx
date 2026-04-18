import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../lib/usePageTitle';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { 
  ShoppingBag, Laptop, Baby, Dumbbell, 
  Home, Sparkles, ChevronRight 
} from 'lucide-react';
import PageWrapper from '../components/PageWrapper';
import ProductCard from '../components/ProductCard';

const CATEGORIES = [
  { name: 'Fashion', icon: <ShoppingBag size={24} />, color: 'text-pink-600', bg: 'bg-pink-50' },
  { name: 'Electronics', icon: <Laptop size={24} />, color: 'text-blue-600', bg: 'bg-blue-50' },
  { name: 'Beauty', icon: <Sparkles size={24} />, color: 'text-purple-600', bg: 'bg-purple-50' },
  { name: 'Kids', icon: <Baby size={24} />, color: 'text-orange-600', bg: 'bg-orange-50' },
  { name: 'Home Decor', icon: <Home size={24} />, color: 'text-cyan-600', bg: 'bg-cyan-50' },
  { name: 'Sports', icon: <Dumbbell size={24} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
];

export default function Categories() {
  usePageTitle('Shop by Category - BYNDIO');
  const [productsByCategory, setProductsByCategory] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      const { data } = await supabase.from('products').select('*').limit(200);
      if (data) {
        const grouped: Record<string, any[]> = {};
        CATEGORIES.forEach(c => grouped[c.name] = []);
        data.forEach(p => {
          CATEGORIES.forEach(c => {
            if (p.category && p.category.includes(c.name)) {
              grouped[c.name].push({
                ...p, // Transform DB row to match ProductCard props if needed
                rating: p.rating || 4.5,
                reviews: p.reviews || 120,
                cat: c.name, // Give it a general category for icon fallback
              });
            }
          });
        });
        setProductsByCategory(grouped);
      }
      setLoading(false);
    }
    loadProducts();
  }, []);

  return (
    <PageWrapper>
      <div className="min-h-screen bg-[#F8F9FA] py-12 px-4 md:px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-16">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-black text-[#0D47A1] mb-5"
            >
              Shop by Category
            </motion.h1>
            <p className="text-gray-500 font-medium max-w-2xl mx-auto break-words text-[15px]">
              Explore our wide range of premium products curated across various categories. Find exactly what you're looking for with our newly redesigned experience.
            </p>
          </div>

          {loading ? (
             <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#0D47A1] border-t-transparent"></div>
             </div>
          ) : CATEGORIES.map((cat, i) => (
            <motion.div 
               key={cat.name}
               initial={{ opacity: 0, y: 30 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true, margin: "-100px" }}
               transition={{ duration: 0.5, delay: i * 0.05 }}
               className="mb-14 bg-white p-6 md:p-8 rounded-[24px] shadow-sm border border-gray-100"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-[14px] ${cat.bg} ${cat.color} flex items-center justify-center shadow-inner`}>
                    {cat.icon}
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">{cat.name}</h2>
                    <div className="text-[13px] text-gray-500 font-bold tracking-widest uppercase mt-1">
                      {productsByCategory[cat.name]?.length || 0} Products available
                    </div>
                  </div>
                </div>
                <Link to={`/products?cat=${cat.name}`} className="flex items-center gap-1.5 bg-[#F5F5F5] hover:bg-[#0D47A1] hover:text-white text-gray-800 px-5 py-2.5 rounded-full font-black text-[13px] transition-colors group">
                  View All {cat.name} <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 items-stretch">
                {productsByCategory[cat.name]?.slice(0, 5).map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
                
                {(!productsByCategory[cat.name] || productsByCategory[cat.name].length === 0) ? (
                  <div className="col-span-full py-12 bg-gray-50 rounded-[10px] border-2 border-dashed border-gray-200 text-center text-gray-500 font-bold">
                    No products added to this category yet. Check back soon!
                  </div>
                ) : productsByCategory[cat.name].length > 5 ? (
                  <Link to={`/products?cat=${cat.name}`} className="bg-gradient-to-br from-[#E3F2FD] to-blue-50/50 rounded-[10px] border border-blue-100 flex flex-col items-center justify-center p-6 text-[#0D47A1] hover:shadow-lg hover:-translate-y-1 transition-all h-full min-h-[250px]">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm text-[#1565C0] group-hover:scale-110 transition-transform">
                      <ChevronRight size={24} />
                    </div>
                    <span className="font-black text-[15px]">View All</span>
                    <span className="text-[11px] font-bold opacity-70 uppercase tracking-widest mt-1 text-center">{cat.name}</span>
                  </Link>
                ) : null}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
