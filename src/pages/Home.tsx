import { Link, useNavigate } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { ChevronLeft, ChevronRight, Clock, Copy, Check, MapPin, Star, Zap, TrendingUp, ShoppingBag, Truck, RotateCcw, ShieldCheck, Shirt, Smartphone, Sparkles, Baby, Home as HomeIcon, Dumbbell, Book, Utensils, HeartPulse, Cat, Car, Search, Camera, Mic } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import ProductCard from '../components/ProductCard';
import { usePageTitle } from '../lib/usePageTitle';
import { useAppStore } from '../store';
import { CATEGORIES_DATA } from '../data/categories';

// ────────────────────────────────────────────────
// STATIC DATA
// ────────────────────────────────────────────────

const CATEGORIES = CATEGORIES_DATA.map(cat => ({
  icon: cat.icon,
  name: cat.name.split(' & ')[0], // Shorten for the grid if needed
  full_name: cat.name,
  bg: cat.bgColor,
  color: cat.color,
  cat: cat.name,
  subs: cat.subCategories.map(s => s.name)
}));

const COUPONS = [
  { code: 'FIRST50',   desc: '50% OFF on 1st Order',       color: '#E91E63', min: 'Min order ₹299' },
  { code: 'BYNDIO20',  desc: '20% OFF on Fashion',         color: '#1565C0', min: 'Min order ₹499' },
  { code: 'FREE100',   desc: 'Free Ship + ₹100 off',       color: '#1B5E20', min: 'Min order ₹599' },
  { code: 'CREATOR30', desc: '30% OFF Creator Picks',      color: '#7B1FA2', min: 'Min order ₹799' },
];

const FEATURED_SELLERS = [
  { id: 'seller-stylehub', name: 'StyleHub India',  icon: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200', products: 234, rating: 4.8, followers: '12K', cat: 'Fashion',     tagline: 'Trendy fashion for all' },
  { id: 'seller-techzone', name: 'TechZone Store',  icon: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&q=80&w=200', products: 156, rating: 4.9, followers: '8K',  cat: 'Electronics', tagline: 'Latest gadgets & deals' },
  { id: 'seller-glamour',  name: 'GlamourBox',      icon: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=200', products: 89,  rating: 4.7, followers: '5K',  cat: 'Beauty',      tagline: 'Glow up essentials' },
  { id: 'seller-kids',     name: 'KidsParadise',    icon: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&q=80&w=200', products: 312, rating: 4.8, followers: '9K',  cat: 'Kids',        tagline: 'Fun stuff for little ones' },
  { id: 'seller-homenest', name: 'HomeNest',        icon: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=200', products: 178, rating: 4.6, followers: '6K',  cat: 'Home',        tagline: 'Modern home & decor' },
];

const VIBES = [
  { img: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=600', title: 'Everyday Essentials',  tagline: 'Simple. Clean. Daily wear.',    cat: 'Fashion' },
  { img: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&q=80&w=600', title: 'Party & Glam',          tagline: 'Stand out. Go bold.',           cat: 'Fashion' },
  { img: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=600', title: 'Creator Picks',         tagline: 'Trending on BYNDIO.',           cat: null, link: '/influencer' },
  { img: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&q=80&w=600', title: 'Budget Finds',          tagline: 'Under ₹999.',                   cat: null, link: '/products?max=999' },
  { img: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=600', title: 'Festive Ready',         tagline: 'Celebrate in style.',           cat: 'Fashion' },
];

// ────────────────────────────────────────────────────────────────
// COMPONENT
// ────────────────────────────────────────────────────────────────
export default function Home() {
  usePageTitle('');

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [mobileEmblaRef, mobileEmblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mobileSelectedIndex, setMobileSelectedIndex] = useState(0);
  const products         = useAppStore(s => s.products);
  const isLoadingProducts= useAppStore(s => s.isLoadingProducts);
  const siteSettings     = useAppStore(s => s.siteSettings);
  const user             = useAppStore(s => s.user);
  const recentlyViewed   = useAppStore(s => s.recentlyViewed);
  const fetchFlashSales  = useAppStore(s => s.fetchFlashSales);

  const navigate = useNavigate();
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);

  const [activeCat,    setActiveCat]    = useState<number|null>(null);
  const [copiedCoupon, setCopiedCoupon] = useState<string|null>(null);
  const follows          = useAppStore(s => s.follows);
  const toggleFollow     = useAppStore(s => s.toggleFollow);
  const [timeLeft,     setTimeLeft]     = useState({ h: 5, m: 23, s: 45 });

  const handleMobileSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (mobileSearchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(mobileSearchQuery.trim())}`);
    }
  };

  const handleMobileVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice search is not supported in this browser. Try Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.start();
    setIsListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setMobileSearchQuery(transcript);
      setIsListening(false);
      navigate(`/products?search=${encodeURIComponent(transcript)}`);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
  };

  useEffect(() => { fetchFlashSales(); }, [fetchFlashSales]);

  // Countdown
  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft(prev => {
        let { h, m, s } = prev;
        s--; if (s < 0) { s = 59; m--; } if (m < 0) { m = 59; h--; } if (h < 0) { h = 23; m = 59; s = 59; }
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Embla
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo   = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);
  const onSelect   = useCallback(() => { if (emblaApi) setSelectedIndex(emblaApi.selectedScrollSnap()); }, [emblaApi]);
  const onMobileSelect = useCallback(() => { if (mobileEmblaApi) setMobileSelectedIndex(mobileEmblaApi.selectedScrollSnap()); }, [mobileEmblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!mobileEmblaApi) return;
    onMobileSelect();
    mobileEmblaApi.on('select', onMobileSelect);
    mobileEmblaApi.on('reInit', onMobileSelect);
  }, [mobileEmblaApi, onMobileSelect]);

  // Derived product lists
  const trending    = products.slice(0, 8);
  const fashion     = products.filter(p => (p.category || p.cat) === 'Fashion').slice(0, 4);
  const electronics = products.filter(p => (p.category || p.cat) === 'Electronics').slice(0, 4);
  const beauty      = products.filter(p => (p.category || p.cat) === 'Beauty').slice(0, 4);
  const kids        = products.filter(p => (p.category || p.cat) === 'Kids').slice(0, 5);
  const offerProduct= products.find(p => p.mrp > p.price * 1.4) || products[0] || null;
  const creatorPicks= products.filter(p => p.inf).slice(0, 6);
  const recentProds = products.filter(p => (recentlyViewed || []).includes(p.id)).slice(0, 6);

  const heroTitle   = siteSettings?.hero_title    || 'Shop Beyond Ordinary';
  const heroSubtitle= siteSettings?.hero_subtitle || "0% commission for sellers · 20,000+ creators · India's fairest marketplace.";

  const slides = [
    { title: heroTitle,                   desc: heroSubtitle,                                                                       bg: 'linear-gradient(135deg,#0D47A1 0%,#1565C0 60%,#0277BD 100%)', badge: "🚀 India's #1 Zero Commission", cta: '🛒 Shop Now',         cta2: '🏪 Sell FREE',      icon: <ShoppingBag size={120} color="white" className="opacity-80" />, link: '/products',  link2: '/seller'  },
    { title: 'Summer Fashion Sale',        desc: 'Up to 70% off on the latest fashion trends. Shop ethnic, western & kids.',        bg: 'linear-gradient(135deg,#E91E63 0%,#C2185B 50%,#880E4F 100%)', badge: '👗 Fashion Week',            cta: '👗 Shop Fashion',     cta2: '💄 Beauty Deals',   icon: <Shirt size={120} color="white" className="opacity-80" />, link: '/products?cat=Fashion', link2: '/products?cat=Beauty' },
    { title: 'Zero Commission Revolution', desc: "Sellers keep 100% earnings. No hidden fees. India's fairest marketplace.",        bg: 'linear-gradient(135deg,#1B5E20 0%,#2E7D32 50%,#388E3C 100%)', badge: '🏪 Seller Special',          cta: '🏪 Start Selling',    cta2: '📊 Learn More',     icon: <TrendingUp size={120} color="white" className="opacity-80" />, link: '/seller',    link2: '/about'   },
    { title: 'Creator-Powered Commerce',   desc: 'Products recommended by your favorite influencers. Authentic reviews, real value.', bg: 'linear-gradient(135deg,#6A1B9A 0%,#4A148C 50%,#7B1FA2 100%)', badge: '⭐ Creator Picks',          cta: '⭐ Explore Creators', cta2: '🎯 Join Creator',   icon: <Star size={120} color="white" className="opacity-80" />, link: '/influencer', link2: '/affiliate' },
    { title: "Today's Drop Deals",         desc: 'Limited-time drops. Gone when sold out. New deals every hour!',                  bg: 'linear-gradient(135deg,#E65100 0%,#BF360C 50%,#DD2C00 100%)', badge: '⚡ Flash Sale LIVE',         cta: '⚡ Grab Deals',       cta2: '🔔 Set Alert',      icon: <Zap size={120} color="white" fill="white" className="opacity-80" />, link: '/flash-sales', link2: '/products' },
  ];

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCoupon(code);
    setTimeout(() => setCopiedCoupon(null), 2000);
  };

  const onToggleFollow = (id: string) => {
    if (!user) {
      alert('Please login to follow sellers');
      return;
    }
    toggleFollow(id);
  };

  const fmt = (n: number) => String(n).padStart(2, '0');

  // Skeleton loader
  const Skeleton = ({ count = 4, h = 'h-[160px]' }: { count?: number; h?: string }) => (
    <>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-white border border-gray-100 rounded-2xl overflow-hidden animate-pulse">
          <div className={`${h} bg-gray-100`} />
          <div className="p-3 space-y-2">
            <div className="h-3 bg-gray-100 rounded w-4/5" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
            <div className="h-7 bg-gray-100 rounded" />
          </div>
        </div>
      ))}
    </>
  );

  // Section header
  const SectionHeader = ({ title, link, linkText = 'See All →' }: { title: string; link: string; linkText?: string }) => (
    <div className="flex items-end justify-between w-full mb-4 md:mb-6 px-1 md:px-2 border-l-4 border-[#0D47A1]">
      <div className="flex flex-col">
        <h2 className="text-[14px] md:text-[15px] font-black text-gray-900 leading-none uppercase tracking-[0.05em]">{title}</h2>
        <div className="hidden md:block h-1 w-12 bg-[#0D47A1] mt-2 rounded-full opacity-30" />
      </div>
      <Link to={link} className="text-[10px] md:text-[11px] text-[#0D47A1] font-black shrink-0 hover:underline uppercase tracking-[0.15em] flex items-center gap-1">
        {linkText}
      </Link>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="flex flex-col min-h-screen bg-[#F4F6F8] overflow-x-hidden"
    >
      
      {/* ══════════════════ MOBILE UI (< md) ══════════════════ */}
      <div className="md:hidden flex flex-col w-full bg-[#f8f9fa]">
        
        {/* Mobile Header - Search Bar Container */}
        <div className="bg-white px-3 pt-2 pb-2 border-b border-gray-100 w-full">
          <form onSubmit={handleMobileSearch} className="relative w-full flex items-center bg-[#F4F6F8] border border-gray-100 rounded-full h-[38px] px-1 shadow-inner">
            <Search className="absolute left-4 w-3.5 h-3.5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search brands, styles & more" 
              value={mobileSearchQuery}
              onChange={(e) => setMobileSearchQuery(e.target.value)}
              className={`w-full h-full pl-10 pr-10 bg-transparent text-[12px] text-gray-900 placeholder-gray-400 font-medium focus:outline-none rounded-full ${isListening ? 'animate-pulse' : ''}`} 
            />
            <button 
              type="button"
              onClick={handleMobileVoiceSearch}
              className={`absolute right-3 p-1.5 transition-colors ${isListening ? 'text-red-500 animate-bounce' : 'text-gray-400 hover:text-[#0D47A1]'}`}
              aria-label="Voice Search"
            >
              <Mic className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Categories Section - Individual Container */}
        <div className="bg-white py-3 mb-1 border-b border-gray-50 overflow-hidden">
          <div className="flex overflow-x-auto gap-1 px-2 scrollbar-hide snap-x items-start">
            {CATEGORIES.map(cat => (
              <Link key={cat.cat} to={`/products?cat=${cat.cat}`} className="flex flex-col items-center gap-1 snap-start shrink-0 group w-[72px]">
                <div className="w-[32px] h-[32px] rounded-lg flex items-center justify-center transition-all shadow-sm group-active:scale-90" style={{ backgroundColor: cat.bg }}>
                   {React.cloneElement(cat.icon as React.ReactElement, { size: 14, strokeWidth: 2, color: cat.color } as any)}
                </div>
                <span className="text-[8px] font-bold text-gray-500 tracking-tight uppercase text-center line-clamp-2 px-1 leading-[1.1]">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Hero Banner - Mobile */}
        <div className="px-3 mt-1 mb-5 relative group w-full">
          <div className="overflow-hidden rounded-[16px] shadow-sm relative" ref={mobileEmblaRef}>
            <div className="flex">
              {slides.map((s, idx) => (
                <div key={idx} className="flex-[0_0_100%] min-w-0 text-white relative overflow-hidden" style={{ background: s.bg, minHeight: '145px' }}>
                  <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-3xl" />
                  
                  <div className="px-5 py-4 flex flex-col justify-center relative z-10 w-full h-full max-w-[75%]">
                    <span className="inline-block bg-white/20 backdrop-blur-md border border-white/25 px-2 py-0.5 rounded-full text-[7px] font-black mb-1 uppercase w-fit tracking-[0.1em]">{s.badge}</span>
                    <h2 className="text-[17px] font-black leading-[1.1] mb-1 tracking-tight">{s.title}</h2>
                    <p className="text-[10px] opacity-85 leading-tight mb-3 line-clamp-2 md:line-clamp-none">{s.desc}</p>
                    <div className="flex gap-2">
                       <Link to={s.link} className="bg-white text-gray-900 px-4 py-1.5 rounded-full text-[9px] font-black transition-all shadow-md active:scale-95">{s.cta}</Link>
                    </div>
                  </div>
                  <div className="absolute right-0 bottom-0 opacity-40 select-none scale-[0.55] translate-x-4 translate-y-4">
                    {s.icon}
                  </div>
                </div>
              ))}
            </div>
            {/* Mobile Pagination Dots */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 bg-black/20 px-2 py-1 rounded-full backdrop-blur-md">
              {slides.map((_, i) => (
                <div key={i} className={`rounded-full transition-all duration-300 ${i === mobileSelectedIndex ? 'bg-white w-4 h-1.5' : 'bg-white/50 w-1.5 h-1.5'}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Feature Strips - Mobile */}
        <div className="px-3 mb-4">
          <div className="bg-white border border-gray-100 rounded-[12px] p-3 flex justify-between items-center overflow-x-auto gap-4 scrollbar-hide shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-2 shrink-0 pr-4 border-r border-gray-100 last:border-0">
              <Truck className="w-4 h-4 text-[#F57C00]" />
              <div className="flex flex-col"><span className="text-[10px] font-black text-gray-900 leading-none mb-0.5">Free Delivery</span><span className="text-[8px] text-gray-500">Above ₹999</span></div>
            </div>
            <div className="flex items-center gap-2 shrink-0 pr-4 border-r border-gray-100 last:border-0">
              <RotateCcw className="w-4 h-4 text-[#E65100]" />
              <div className="flex flex-col"><span className="text-[10px] font-black text-gray-900 leading-none mb-0.5">Easy Returns</span><span className="text-[8px] text-gray-500">14 days return</span></div>
            </div>
            <div className="flex items-center gap-2 shrink-0 pr-4 border-r border-gray-100 last:border-0">
              <ShieldCheck className="w-4 h-4 text-[#0D47A1]" />
              <div className="flex flex-col"><span className="text-[10px] font-black text-gray-900 leading-none mb-0.5">100% Original</span><span className="text-[8px] text-gray-500">Trusted Brands</span></div>
            </div>
          </div>
        </div>

        {/* Coupons / Exclusive Offers - Mobile Scroller */}
        <div className="px-3 mb-4">
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-[13px] font-black flex items-center gap-1.5 uppercase tracking-tight text-gray-900">🎟️ Exclusive Offers</h2>
            <div className="flex gap-1.5 z-10 shrink-0">
              <button 
                onClick={() => { document.getElementById('mobile-coupons-scroller')?.scrollBy({ left: -220, behavior: 'smooth' }) }} 
                className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center border border-gray-100 text-gray-600 hover:bg-gray-50 active:scale-95 transition-all"
                aria-label="Scroll left"
              >
                <ChevronLeft size={14} />
              </button>
              <button 
                onClick={() => { document.getElementById('mobile-coupons-scroller')?.scrollBy({ left: 220, behavior: 'smooth' }) }} 
                className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center border border-gray-100 text-gray-600 hover:bg-gray-50 active:scale-95 transition-all"
                aria-label="Scroll right"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
          <div id="mobile-coupons-scroller" className="flex overflow-x-auto gap-2.5 pb-2 scrollbar-hide snap-x scroll-smooth relative">
            {COUPONS.map((c, i) => (
              <div key={i} className="min-w-[220px] shrink-0 snap-start overflow-hidden rounded-[14px] p-3 shadow-sm border border-gray-100 bg-white relative cursor-pointer" onClick={() => copyCode(c.code)}>
                <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-[80px] opacity-10" style={{ background: c.color }} />
                <div className="absolute inset-y-0 left-0 w-1" style={{ background: c.color }} />
                <div className="flex flex-col h-full justify-between relative z-10 pl-1.5">
                  <div>
                    <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest text-white mb-1.5 shadow-sm" style={{ background: c.color }}>OFFER</span>
                    <p className="text-[12px] font-black leading-tight text-gray-900 mb-0.5 truncate">{c.desc}</p>
                    <p className="text-[9px] text-gray-500 font-medium mb-3">{c.min}</p>
                  </div>
                  <div className="flex items-center justify-between border-t border-dashed border-gray-200 pt-2.5 mt-auto">
                    <code className="text-[10px] font-black tracking-widest text-gray-800 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{c.code}</code>
                    <button className="w-6 h-6 rounded-full flex items-center justify-center shadow-sm text-white transition-transform active:scale-90" style={{ background: c.color }}>
                      {copiedCoupon === c.code ? <Check size={12}/> : <Copy size={12}/>}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trending Next Right Now - Mobile */}
        <div className="px-3 mb-6">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-[14px] font-black flex items-center gap-1.5 uppercase tracking-tight text-gray-900">
              <span className="text-orange-500">🔥</span> Trending Right Now
            </h2>
            <Link to="/products" className="text-[11px] text-[#0D47A1] font-bold">View All</Link>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {trending.slice(0, 6).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
        
      </div>

      {/* ══════════════════ DESKTOP UI (>= md) ══════════════════ */}
      <div className="hidden md:flex flex-col w-full">

        {/* ══════════════════ TICKER ══════════════════ */}
        <div className="bg-[#F57C00] text-white overflow-hidden h-[32px] flex items-center">
        <div className="flex whitespace-nowrap animate-[ticker_35s_linear_infinite]">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex">
              {["🚀 India's #1 Zero Commission Marketplace", '👗 50K+ Fashion Products', '📱 Latest Electronics', '💄 Beauty at Unbeatable Prices', '0% Commission for Sellers', '⭐ 20K+ Creator Partners', '🚚 Fast Delivery Across India', '🔒 Secure & Trusted Payments', '🎁 Refer & Earn Rewards'].map((t, j) => (
                <span key={j} className="px-6 text-[11px] font-bold flex items-center gap-1">{t}</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════ HERO SLIDER ══════════════════ */}
      <div className="relative group w-full">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {slides.map((s, idx) => (
              <div key={idx} className="flex-[0_0_100%] min-w-0 text-white relative overflow-hidden" style={{ background: s.bg, minHeight: '300px' }}>
                {/* decorative circles */}
                <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-10" style={{ background: 'rgba(255,255,255,0.3)' }} />
                <div className="absolute -bottom-16 -left-10 w-48 h-48 rounded-full opacity-10" style={{ background: 'rgba(255,255,255,0.2)' }} />

                <div className="max-w-7xl mx-auto px-5 py-10 md:py-14 flex items-center gap-8 relative z-10">
                  <div className="flex-1">
                    <span className="inline-block bg-white/20 backdrop-blur-sm border border-white/25 px-3 py-1 rounded-full text-[11px] font-bold mb-3">{s.badge}</span>
                    <h1 className="text-[28px] md:text-[46px] font-black leading-tight mb-3 drop-shadow-sm">{s.title}</h1>
                    <p className="text-[13px] md:text-[15px] opacity-90 max-w-[480px] leading-relaxed mb-6">{s.desc}</p>
                    <div className="flex gap-3 flex-wrap">
                      <Link to={s.link}  className="bg-white text-gray-900 hover:bg-gray-100 px-6 py-2.5 rounded-xl text-[13px] font-black transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">{s.cta}</Link>
                      <Link to={s.link2} className="bg-white/15 hover:bg-white/25 border border-white/35 text-white px-6 py-2.5 rounded-xl text-[13px] font-black transition-all backdrop-blur-sm">{s.cta2}</Link>
                    </div>
                    <div className="flex gap-8 mt-5 flex-wrap">
                      {[[`${Math.max(products.length, 10)}+`,'Products'],['0%','Commission'],['100%','Verified']].map(([v,l]) => (
                        <div key={l}><span className="text-2xl md:text-3xl font-black block">{v}</span><span className="text-[10px] opacity-75 uppercase tracking-wider">{l}</span></div>
                      ))}
                    </div>
                  </div>
                  <div className="hidden md:block shrink-0 drop-shadow-2xl select-none" style={{ animation: 'float 3s ease-in-out infinite' }}>{s.icon}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Arrows */}
        <button onClick={scrollPrev} aria-label="Previous" className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg p-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10 hover:scale-110"><ChevronLeft size={20} className="text-gray-800"/></button>
        <button onClick={scrollNext} aria-label="Next"     className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg p-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10 hover:scale-110"><ChevronRight size={20} className="text-gray-800"/></button>
        {/* Dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {slides.map((_, i) => (
            <button key={i} onClick={() => scrollTo(i)} className={`rounded-full transition-all duration-300 ${i === selectedIndex ? 'bg-white w-7 h-2' : 'bg-white/50 w-2 h-2 hover:bg-white/80'}`} />
          ))}
        </div>
      </div>

      {/* ══════════════════ ALL CATEGORIES (FLIPKART STYLE) ══════════════════ */}
      <div className="bg-white shadow-sm py-5">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[17px] font-black text-gray-900">🛒 Shop by Category</h2>
            <Link to="/products" className="text-[12px] text-[#1565C0] font-bold hover:underline">View All →</Link>
          </div>

          {/* Category grid */}
          <motion.div 
             initial="hidden"
             whileInView="visible"
             viewport={{ once: true, margin: "-50px" }}
             variants={{
               visible: { transition: { staggerChildren: 0.05 } },
               hidden: {}
             }}
             className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2"
          >
            {CATEGORIES.map((cat, i) => (
              <motion.div 
                key={i} 
                className="relative"
                variants={{
                  hidden: { opacity: 0, scale: 0.8, y: 20 },
                  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 12 } }
                }}
                onMouseEnter={() => setActiveCat(i)}
                onMouseLeave={() => setActiveCat(null)}
              >
                <Link
                  to={`/products?cat=${cat.cat}`}
                  className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl cursor-pointer transition-all duration-200 hover:scale-110 hover:shadow-lg"
                  style={{ backgroundColor: cat.bg }}
                >
                  <span className="flex items-center justify-center min-h-[30px] rounded-full">{cat.icon}</span>
                  <span className="text-[10px] font-bold text-center leading-tight" style={{ color: cat.color }}>{cat.name}</span>
                </Link>
                {/* Subcategory dropdown */}
                {cat.subs && cat.subs.length > 0 && activeCat === i && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 min-w-[150px] py-2 overflow-hidden">
                    <div className="px-3 pb-1.5 text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100 mb-1">{cat.full_name}</div>
                    {cat.subs.map((sub, j) => (
                      <Link key={j} to={`/products?cat=${cat.cat}&sub=${encodeURIComponent(sub)}`}
                        className="block px-3 py-1.5 text-[12px] text-gray-700 hover:bg-blue-50 hover:text-[#1565C0] font-medium whitespace-nowrap transition-colors">
                        {sub}
                      </Link>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ══════════════════ COUPONS (REDESIGNED) ══════════════════ */}
      <div className="max-w-7xl mx-auto w-full px-4 pt-8 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[20px] font-black flex items-center gap-2">🎟️ Exclusive Offers</h2>
        </div>
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } }, hidden: {} }}
        >
          {COUPONS.map((c, i) => (
            <motion.div 
              key={i}
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { type: 'spring', bounce: 0.4 } }
              }}
              whileHover={{ y: -5, scale: 1.02 }}
              className="relative overflow-hidden rounded-[20px] p-5 shadow-sm hover:shadow-xl transition-all group border border-gray-100 bg-white cursor-pointer" 
              onClick={() => copyCode(c.code)}
            >
              {/* Premium Background Accent */}
              <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-[100px] opacity-10 transition-transform group-hover:scale-110" style={{ background: c.color }} />
              <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: c.color }} />
              
              <div className="flex flex-col h-full justify-between relative z-10 pl-2">
                <div>
                  <span className="inline-block px-2 py-0.5 rounded text-[9px] font-black tracking-widest text-white mb-2" style={{ background: c.color }}>OFFER</span>
                  <p className="text-[14px] font-black leading-tight text-gray-900 mb-1">{c.desc}</p>
                  <p className="text-[11px] text-gray-500 font-medium mb-4">{c.min}</p>
                </div>
                
                <div className="flex items-center justify-between border-t border-dashed border-gray-200 pt-3 mt-auto">
                  <code className="text-[13px] font-black tracking-widest text-gray-800 bg-gray-50 px-2 py-1 rounded inline-block">{c.code}</code>
                  <button className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm text-white transition-transform group-hover:-translate-y-1" style={{ background: c.color }}>
                    {copiedCoupon === c.code ? <Check size={14}/> : <Copy size={14}/>}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* ══════════════════ TRENDING NOW ══════════════════ */}
      <div className="max-w-7xl mx-auto w-full px-4 py-5">
        <SectionHeader title="🔥 Trending Now" link="/products" linkText="See All →" />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-2 md:gap-2.5"
        >
          {isLoadingProducts ? <Skeleton count={9} /> : trending.map(p => <ProductCard key={p.id} product={p} />)}
        </motion.div>
      </div>

      </div>

      {/* ══════════════════ SHARED SECTIONS (MOBILE & DESKTOP) ══════════════════ */}
      
      {/* ══════════════════ DROP DEALS (FLASH SALE) ══════════════════ */}
      <div className="max-w-7xl mx-auto w-full px-4 py-2">
        <motion.div 
           initial={{ opacity: 0, scale: 0.95 }}
           whileInView={{ opacity: 1, scale: 1 }}
           viewport={{ once: true }}
           transition={{ duration: 0.6, type: 'spring' }}
           className="bg-gradient-to-r from-[#B71C1C] via-[#C62828] to-[#E53935] rounded-2xl md:rounded-3xl p-3 md:p-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div>
              <h2 className="text-[14px] md:text-xl font-black text-white flex items-center gap-1.5">⚡ Drop Deals <span className="bg-white/20 text-[7px] md:text-[9px] px-1.5 py-0.5 rounded-full animate-pulse">LIVE</span></h2>
            </div>
            <div className="flex items-center gap-1.5 bg-black/20 rounded-lg px-2 py-1">
              <Clock size={10} className="text-white/80" />
              <span className="text-white text-[8px] md:text-[11px] font-bold">Ends:</span>
              {[timeLeft.h, timeLeft.m, timeLeft.s].map((v, i) => (
                <span key={i} className="flex items-center">
                  <span className="bg-white text-[#B71C1C] font-black text-[10px] md:text-[13px] px-1.5 py-0.5 rounded-md min-w-[20px] md:min-w-[30px] text-center">{fmt(v)}</span>
                  {i < 2 && <span className="text-white font-bold text-[10px] px-0.5">:</span>}
                </span>
              ))}
            </div>
          </div>

          {/* Offer product */}
          <Link to="/products">
            <div className="bg-gradient-to-r from-red-600 to-[#B71C1C] border border-red-400 shadow-2xl rounded-xl md:rounded-3xl p-3 md:p-5 flex flex-row items-center gap-3 md:gap-10 transition-transform hover:-translate-y-1">
              <div className="w-20 h-20 md:w-52 md:h-52 bg-white rounded-xl md:rounded-[24px] overflow-hidden flex items-center justify-center shrink-0 shadow-lg relative group border-2 md:border-[5px] border-white z-10">
                <span className="absolute top-1 left-1 md:top-3 md:left-3 bg-red-600 shadow-lg text-white text-[7px] md:text-[11px] font-black px-1.5 md:px-3 py-0.5 md:py-1 rounded-full z-10">HOT</span>
                <img 
                  src="/premium_style_pack_banner_1776436987985.png" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  alt="Exclusive Style Pack" 
                />
              </div>
              <div className="flex-1 text-white relative z-20 text-left w-full">
                <p className="text-[8px] md:text-[11px] font-black uppercase text-red-200 tracking-widest mb-0.5">Premium Collection</p>
                <h3 className="text-[14px] md:text-[26px] font-black leading-tight mb-1 md:mb-3 drop-shadow-md line-clamp-2 uppercase">Exclusive Limited Time Style Pack</h3>
                <div className="flex flex-row items-baseline gap-2 mb-2">
                  <span className="text-[18px] md:text-[30px] font-black drop-shadow-lg leading-none">₹799</span>
                  <span className="line-through opacity-60 text-[10px] md:text-[16px] font-bold">₹2,499</span>
                  <span className="bg-[#FFD600] text-[#B71C1C] px-1.5 py-0.5 rounded-full font-black text-[8px] md:text-[12px] shadow-sm ml-auto animate-pulse">68% OFF</span>
                </div>
                <div className="flex items-center gap-3 text-[9px] md:text-[13px] font-bold opacity-90">
                  <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-green-400 animate-pulse"/> 432 viewing</span>
                  <span className="flex items-center gap-1 backdrop-blur-sm bg-black/20 px-1.5 py-0.5 rounded-md">📦 14 left</span>
                </div>
              </div>
            </div>
          </Link>

          <div className="mt-3 text-center">
            <Link to="/flash-sales" className="inline-block text-white/80 hover:text-white text-[12px] font-bold hover:underline">See all flash deals →</Link>
          </div>
        </motion.div>
      </div>

      {/* ══════════════════ FASHION PICKS ══════════════════ */}
      {fashion.length > 0 && (
        <div className="max-w-7xl mx-auto w-full px-4 py-5">
          <div className="flex items-center justify-between mb-1">
            <SectionHeader title="👗 Fashion Picks" link="/products?cat=Fashion" />
            <div className="md:hidden flex gap-1.5 mb-3">
              <button onClick={() => document.getElementById('fashion-scroller')?.scrollBy({ left: -200, behavior: 'smooth' })} className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center border border-gray-100 active:scale-90 transition-all"><ChevronLeft size={16} /></button>
              <button onClick={() => document.getElementById('fashion-scroller')?.scrollBy({ left: 200, behavior: 'smooth' })} className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center border border-gray-100 active:scale-90 transition-all"><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="flex flex-col md:grid md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-9 gap-4">
            <div id="fashion-scroller" className="flex md:contents overflow-x-auto gap-3 scrollbar-hide pb-2 snap-x scroll-smooth">
              {/* Promo Card - Integrated into scroller on mobile */}
              <div className="min-w-[160px] md:min-w-0 md:w-full rounded-2xl overflow-hidden relative shrink-0 snap-start shadow-md hover:shadow-xl transition-all" style={{ background: 'linear-gradient(135deg,#E91E63,#880E4F)', minHeight: '160px' }}>
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 70%, rgba(255,255,255,0.4) 0%, transparent 60%)' }} />
                <div className="relative p-4 text-white h-full flex flex-col justify-between">
                  <div>
                    <span className="block mb-2 bg-white/20 p-2 rounded-full w-fit backdrop-blur-sm"><Shirt size={28} /></span>
                    <div className="text-lg font-black leading-tight">Fashion Sale</div>
                    <div className="text-[10px] opacity-75 mt-1">Up to 60% OFF</div>
                    <div className="hidden md:flex flex-col gap-1 mt-3">
                      {['Men','Women','Kids','Ethnic'].map(s => (
                        <Link key={s} to={`/products?cat=Fashion&sub=${s}`} className="text-[11px] font-semibold opacity-80 hover:opacity-100 hover:underline">{s} →</Link>
                      ))}
                    </div>
                  </div>
                  <Link to="/products?cat=Fashion" className="inline-block bg-white text-[#E91E63] text-[10px] font-black px-3 py-1 rounded-full mt-2 hover:bg-gray-100 w-fit">Shop Now →</Link>
                </div>
              </div>
              
              {/* Products - Side by side on mobile scroll */}
              {isLoadingProducts ? <Skeleton count={4} /> : fashion.map(p => (
                <div key={p.id} className="min-w-[130px] md:min-w-0 snap-start">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ ELECTRONICS DEALS ══════════════════ */}
      {electronics.length > 0 && (
        <div className="max-w-7xl mx-auto w-full px-4 py-5">
          <div className="flex items-center justify-between mb-1">
            <SectionHeader title="📱 Electronics Deals" link="/products?cat=Electronics" />
            <div className="md:hidden flex gap-1.5 mb-3">
              <button onClick={() => document.getElementById('electronics-scroller')?.scrollBy({ left: -200, behavior: 'smooth' })} className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center border border-gray-100 active:scale-90 transition-all"><ChevronLeft size={16} /></button>
              <button onClick={() => document.getElementById('electronics-scroller')?.scrollBy({ left: 200, behavior: 'smooth' })} className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center border border-gray-100 active:scale-90 transition-all"><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="flex flex-col md:grid md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-9 gap-4">
            <div id="electronics-scroller" className="flex md:contents overflow-x-auto gap-3 scrollbar-hide pb-2 snap-x scroll-smooth">
              {/* Promo Card */}
              <div className="min-w-[160px] md:min-w-0 md:w-full rounded-2xl overflow-hidden relative shrink-0 snap-start shadow-md hover:shadow-xl transition-all" style={{ background: 'linear-gradient(135deg,#1565C0,#0D47A1)', minHeight: '160px' }}>
                <div className="relative p-4 text-white h-full flex flex-col justify-between">
                  <div>
                    <span className="block mb-2 bg-white/20 p-2 rounded-full w-fit backdrop-blur-sm"><Smartphone size={28} /></span>
                    <div className="text-lg font-black leading-tight">Gadget Hub</div>
                    <div className="text-[10px] opacity-75 mt-1">Latest deals on Tech</div>
                    <div className="hidden md:flex flex-col gap-1 mt-3">
                      {['Phones','Laptops','Watch','Audio'].map(s => (
                        <Link key={s} to={`/products?cat=Electronics&sub=${s}`} className="text-[11px] font-semibold opacity-80 hover:opacity-100 hover:underline">{s} →</Link>
                      ))}
                    </div>
                  </div>
                  <Link to="/products?cat=Electronics" className="inline-block bg-white text-[#1565C0] text-[10px] font-black px-3 py-1 rounded-full mt-2 hover:bg-gray-100 w-fit">Explore →</Link>
                </div>
              </div>

              {/* Products */}
              {isLoadingProducts ? <Skeleton count={4} /> : electronics.map(p => (
                <div key={p.id} className="min-w-[130px] md:min-w-0 snap-start">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ BEAUTY SECTION ══════════════════ */}
      {beauty.length > 0 && (
        <div className="max-w-7xl mx-auto w-full px-4 py-5">
          <div className="flex items-center justify-between mb-1">
            <SectionHeader title="💄 Beauty & Skincare" link="/products?cat=Beauty" />
            <div className="md:hidden flex gap-1.5 mb-3">
              <button onClick={() => document.getElementById('beauty-scroller')?.scrollBy({ left: -200, behavior: 'smooth' })} className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center border border-gray-100 active:scale-90 transition-all"><ChevronLeft size={16} /></button>
              <button onClick={() => document.getElementById('beauty-scroller')?.scrollBy({ left: 200, behavior: 'smooth' })} className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center border border-gray-100 active:scale-90 transition-all"><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="flex flex-col md:grid md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-9 gap-4">
            <div id="beauty-scroller" className="flex md:contents overflow-x-auto gap-3 scrollbar-hide pb-2 snap-x scroll-smooth">
              {/* Promo Card */}
              <div className="min-w-[160px] md:min-w-0 md:w-full rounded-2xl overflow-hidden relative shrink-0 snap-start shadow-md hover:shadow-xl transition-all" style={{ background: 'linear-gradient(135deg,#C2185B,#880E4F)', minHeight: '160px' }}>
                <div className="relative p-4 text-white h-full flex flex-col justify-between">
                  <div>
                    <span className="block mb-2 bg-white/20 p-2 rounded-full w-fit backdrop-blur-sm"><Sparkles size={28} /></span>
                    <div className="text-lg font-black leading-tight">Glow Up</div>
                    <div className="text-[10px] opacity-75 mt-1">Skincare, makeup & more</div>
                    <div className="hidden md:flex flex-col gap-1 mt-3">
                      {['Skincare','Makeup','Haircare','Fragrances'].map(s => (
                        <Link key={s} to={`/products?cat=Beauty&sub=${s}`} className="text-[11px] font-semibold opacity-80 hover:opacity-100 hover:underline">{s} →</Link>
                      ))}
                    </div>
                  </div>
                  <Link to="/products?cat=Beauty" className="inline-block bg-white text-[#C2185B] text-[10px] font-black px-3 py-1 rounded-full mt-2 hover:bg-gray-100 w-fit">Shop Now →</Link>
                </div>
              </div>

              {/* Products - Side by side on mobile scroll */}
              {isLoadingProducts ? <Skeleton count={4} /> : beauty.map(p => (
                <div key={p.id} className="min-w-[130px] md:min-w-0 snap-start">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ SHOP YOUR VIBE (REALISTIC) ══════════════════ */}
      <div className="max-w-7xl mx-auto w-full px-4 py-8">
        <div className="mb-4 md:mb-6 flex flex-col items-center text-center px-2">
          <h2 className="text-[18px] md:text-[22px] font-black text-gray-900">✨ Shop Your Vibe</h2>
          <p className="text-[11px] md:text-[13px] text-gray-500 mt-1 max-w-sm">Curated aesthetic collections to match your mood.</p>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
          {VIBES.map((v, i) => (
            <Link key={i}
              to={v.link || `/products${v.cat ? `?cat=${v.cat}` : ''}`}
              className="rounded-xl md:rounded-2xl overflow-hidden relative group/vibe cursor-pointer hover:-translate-y-2 transition-all duration-300 shadow-sm hover:shadow-2xl h-[150px] md:h-[220px]">
              <img src={v.img} alt={v.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/vibe:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent" />
              <div className="relative p-2 md:p-4 flex flex-col justify-end h-full">
                <div>
                  <div className="text-white font-black text-[11px] md:text-[15px] leading-tight mb-0.5">{v.title}</div>
                  <div className="hidden md:block text-white/80 text-[11px] font-medium tracking-wide">{v.tagline}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ══════════════════ KIDS SECTION ══════════════════ */}
      {kids.length > 0 && (
        <div className="max-w-7xl mx-auto w-full px-4 py-5">
          <SectionHeader title="🧸 Kids & Baby" link="/products?cat=Kids" />
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-2 md:gap-2.5">
            {isLoadingProducts ? <Skeleton count={6} /> : kids.map(p => <ProductCard key={p.id} product={p}/>)}
          </div>
        </div>
      )}

      {/* ══════════════════ FEATURED SELLERS (REALISTIC) ══════════════════ */}
      <div className="bg-white py-8 md:py-10 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-end justify-between mb-4 md:mb-6 border-l-4 border-[#0D47A1] pl-3 md:pl-4">
            <h2 className="text-[16px] md:text-[16px] font-black flex items-center gap-1.5 md:gap-2 uppercase tracking-[0.05em]">🏪 Top Sellers <span className="bg-green-100 text-green-700 text-[8px] md:text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">0% COMMS</span></h2>
            <div className="flex items-center gap-4">
              <div className="md:hidden flex gap-1">
                <button onClick={() => document.getElementById('sellers-scroller')?.scrollBy({ left: -180, behavior: 'smooth' })} className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center border border-gray-100"><ChevronLeft size={14} /></button>
                <button onClick={() => document.getElementById('sellers-scroller')?.scrollBy({ left: 180, behavior: 'smooth' })} className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center border border-gray-100"><ChevronRight size={14} /></button>
              </div>
              <Link to="/seller" className="text-[10px] md:text-[11px] bg-[#0D47A1] text-white px-4 py-1.5 md:px-5 md:py-2 rounded-full font-black uppercase tracking-wider">Become a Seller</Link>
            </div>
          </div>
          <div id="sellers-scroller" className="flex md:grid md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 md:gap-3 pb-4 md:pb-0 scrollbar-hide snap-x scroll-smooth">
            {FEATURED_SELLERS.map((seller, i) => (
              <div key={i} className="min-w-[150px] md:min-w-0 bg-white border border-gray-100 rounded-2xl md:rounded-[20px] p-4 md:p-5 text-center hover:border-[#1565C0] hover:shadow-xl transition-all duration-300 cursor-pointer group shrink-0 snap-start">
                <div className="w-14 h-14 md:w-20 md:h-20 rounded-full mx-auto mb-2 md:mb-3 overflow-hidden shadow-sm ring-4 ring-gray-50 group-hover:ring-blue-50 transition-all">
                   <img src={seller.icon} alt={seller.name} className="w-full h-full object-cover" />
                </div>
                <div className="text-[12px] md:text-[14px] font-black text-gray-900 truncate mb-0.5 md:mb-1">{seller.name}</div>
                <div className="text-[9px] md:text-[11px] text-gray-500 mb-1.5 md:mb-2 font-medium">{seller.tagline}</div>
                <div className="flex items-center justify-center gap-1 text-[9px] md:text-[11px] text-[#F57C00] font-bold mb-2 md:mb-3 bg-orange-50 w-fit mx-auto px-1.5 py-0.5 rounded-full">
                  <Star size={8} fill="#F57C00"/> {seller.rating}
                </div>
                <div className="text-[9px] md:text-[11px] text-gray-400 font-medium mb-3 md:mb-4 flex flex-col gap-0.5">
                  <span>{seller.products} items • {seller.followers} followers</span>
                </div>
                <button onClick={() => onToggleFollow(seller.id)}
                  className={`w-full text-[10px] md:text-[12px] font-black py-1.5 md:py-2 rounded-lg md:rounded-xl transition-all shadow-sm ${(follows || []).includes(seller.id) ? 'bg-[#1565C0] text-white' : 'bg-[#EEF2FF] text-[#1565C0]'}`}>
                  {(follows || []).includes(seller.id) ? '✓ Followed' : '+ Follow'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════ SHOP REELS (REALISTIC) ══════════════════ */}
      <div className="bg-[#050B14] py-8 md:py-10 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[18px] md:text-[22px] font-black text-white flex items-center gap-1.5">
              🎬 Shop from Reels
              <span className="bg-red-500/20 border border-red-500/50 text-red-500 text-[8px] md:text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse ml-0.5">LIVE</span>
            </h2>
            <div className="flex items-center gap-3">
              <div className="md:hidden flex gap-1">
                <button onClick={() => document.getElementById('reels-scroller')?.scrollBy({ left: -140, behavior: 'smooth' })} className="w-6 h-6 rounded-full bg-white/10 shadow-sm flex items-center justify-center border border-white/10 text-white"><ChevronLeft size={14} /></button>
                <button onClick={() => document.getElementById('reels-scroller')?.scrollBy({ left: 140, behavior: 'smooth' })} className="w-6 h-6 rounded-full bg-white/10 shadow-sm flex items-center justify-center border border-white/10 text-white"><ChevronRight size={14} /></button>
              </div>
              <Link to="/videos" className="text-[11px] md:text-[13px] bg-white/10 text-white px-3.5 py-1.5 rounded-full font-bold">View All</Link>
            </div>
          </div>
          <div id="reels-scroller" className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x scroll-smooth">
            {[
              { img: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=400', label: 'Festive Haul',    creator: '@StyleByRiya',   views: '1.2M' },
              { img: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=400', label: 'Secret Skincare', creator: '@GlowNisha',      views: '800K' },
              { img: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&q=80&w=400', label: 'Audio Tech',      creator: '@TechArjun',      views: '2.1M' },
              { img: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=400', label: 'Home Makeover',   creator: '@HomeNest',       views: '450K' },
              { img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=400', label: 'Sneaker Drop',    creator: '@SneakerHead',    views: '3.4M' },
              { img: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80&w=400', label: 'Fitness Goals',   creator: '@FitIndia',       views: '920K' },
            ].map((reel, i) => (
              <div key={i} className="shrink-0 w-[130px] h-[220px] md:w-[170px] md:h-[280px] rounded-2xl md:rounded-[20px] overflow-hidden relative cursor-pointer group/reel snap-start shadow-xl border border-white/5 bg-gray-900">
                <img src={reel.img} alt={reel.label} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 opacity-90 group-hover/reel:scale-105" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/40 shadow-xl transition-all duration-300">
                     <span className="text-white text-base md:text-xl ml-0.5">▶</span>
                  </div>
                </div>
                <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm text-white text-[8px] md:text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1">
                   {reel.views}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-2.5 md:p-4 bg-gradient-to-t from-black via-black/80 to-transparent pt-12">
                  <div className="text-white text-[11px] md:text-[14px] font-black leading-tight mb-0.5 truncate">{reel.label}</div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-4 h-4 rounded-full overflow-hidden bg-gray-600">
                       <img src={reel.img} className="w-full h-full object-cover" />
                    </div>
                    <div className="text-white/80 text-[9px] font-bold truncate">{reel.creator}</div>
                  </div>
                  <Link to="/products" className="block w-full bg-white/20 hover:bg-white text-white hover:text-black py-1 rounded-md text-[9px] md:text-[11px] font-black backdrop-blur-md transition-colors text-center">
                    Shop Products
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════ FLASH STRIP ══════════════════ */}
      <div className="bg-gradient-to-r from-[#E65100] to-[#BF360C] py-3 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="bg-white text-[#E65100] text-[10px] font-black px-2.5 py-1 rounded-full">⚡ FLASH SALE</span>
            <span className="text-white text-[13px] font-bold">Up to 70% off — Limited time deals live now!</span>
          </div>
          <Link to="/flash-sales" className="bg-white/20 hover:bg-white/30 text-white border border-white/40 px-4 py-1.5 rounded-xl text-[11px] font-bold transition-colors whitespace-nowrap">
            Shop Flash Deals →
          </Link>
        </div>
      </div>

      {/* ══════════════════ RECENTLY VIEWED ══════════════════ */}
      {recentProds.length > 0 && (
        <div className="max-w-7xl mx-auto w-full px-4 py-5">
          <SectionHeader title="🕐 Recently Viewed" link="/products" />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
            {recentProds.map(p => <ProductCard key={p.id} product={p}/>)}
          </div>
        </div>
      )}

      {/* ══════════════════ CUSTOMER TRUST ══════════════════ */}
      <div className="bg-white border-y border-gray-100 py-6 md:py-8">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-[15px] md:text-[17px] font-black text-center mb-5 md:mb-6">Why Millions Trust BYNDIO 💙</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            {[
              { icon: <Truck size={18}/>,       color: '#1565C0', bg: '#EEF2FF', title: 'Free Delivery',    desc: 'On orders above ₹299' },
              { icon: <RotateCcw size={18}/>,   color: '#1B5E20', bg: '#E8F5E9', title: 'Easy Returns',     desc: '7-day hassle-free' },
              { icon: <ShieldCheck size={18}/>, color: '#7B1FA2', bg: '#F3E5F5', title: 'Secure Pay',  desc: 'Bank-grade encryption' },
              { icon: <TrendingUp size={18}/>,  color: '#E65100', bg: '#FFF3E0', title: 'Zero Comms',  desc: '100% seller earnings' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center text-center p-3 md:p-5 rounded-xl md:rounded-2xl transition-all" style={{ background: item.bg }}>
                <div className="mb-2" style={{ color: item.color }}>{item.icon}</div>
                <div className="text-[11px] md:text-[13px] font-black mb-1" style={{ color: item.color }}>{item.title}</div>
                <div className="text-[9px] md:text-[11px] text-gray-600 leading-tight">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </motion.div>
  );
}
