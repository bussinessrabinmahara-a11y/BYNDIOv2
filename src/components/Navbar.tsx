import React, { useState, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Search, Heart, User, ShoppingCart, MapPin, Mic, ChevronDown } from 'lucide-react';
import { useAppStore } from '../store';
import { supabase } from '../lib/supabase';
import LocationPicker from './LocationPicker';
import { motion, AnimatePresence } from 'framer-motion';
import { CATEGORIES_DATA } from '../data/categories';

interface NavbarProps {
  onOpenCart: () => void;
  onOpenLogin: () => void;
}

export default function Navbar({ onOpenCart, onOpenLogin }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const loc = useLocation();
  const navigate = useNavigate();
  const { user, cart, deliveryPincode, deliveryAddress, deliveryCoords } = useAppStore();
  const cartCount = cart?.length || 0;

  const displayLocation = deliveryAddress
    ? (deliveryAddress.length > 18 ? deliveryAddress.slice(0, 18) + '…' : deliveryAddress)
    : deliveryPincode || '';

  const handleLocationSelect = (location: { lat: number; lng: number; address: string; pincode: string; displayName: string }) => {
    useAppStore.setState({
      deliveryPincode: location.pincode || null,
      deliveryAddress: location.displayName || location.address || null,
      deliveryCoords: location.lat && location.lng ? { lat: location.lat, lng: location.lng } : null,
    });
  };

  const navLinks = [
    { href: '/categories', label: 'Categories' },
    { href: '/products', label: 'Shop' },
    { href: '/seller', label: 'Sell' },
    { href: '/affiliate', label: 'Affiliate' },
    { href: '/flash-sales', label: 'Flash Sales' },
    { href: '/contact', label: 'Contact Us' },
  ];

  const [isListening, setIsListening] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSuggestions([]);
      setIsMenuOpen(false);
    }
  };

  const handleVoiceSearch = () => {
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
      setSearchQuery(transcript);
      setIsListening(false);
      navigate(`/products?search=${encodeURIComponent(transcript)}`);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
  };

  // Real-time DB search suggestions with debounce
  const updateSuggestions = useCallback((query: string) => {
    setSearchQuery(query);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from('products')
          .select('name, category, brand')
          .eq('is_active', true)
          .or(`name.ilike.%${query}%,brand.ilike.%${query}%,category.ilike.%${query}%`)
          .limit(8);

        if (data && data.length > 0) {
          // Deduplicate and prioritize name matches
          const names = data.map(p => p.name);
          const categories = [...new Set(data.map(p => p.category).filter(Boolean))];
          const combined = [...new Set([...names, ...categories])].slice(0, 7);
          setSuggestions(combined);
        } else {
          // Fallback: match against local CATEGORIES_DATA names
          const catMatches = CATEGORIES_DATA
            .filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
            .map(c => c.name)
            .slice(0, 4);
          setSuggestions(catMatches.length > 0 ? catMatches : []);
        }
      } catch {
        // Fallback to local categories on error
        const catMatches = CATEGORIES_DATA
          .filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
          .map(c => c.name)
          .slice(0, 4);
        setSuggestions(catMatches);
      }
    }, 250); // 250ms debounce
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] bg-[#0D47A1]/95 backdrop-blur-md text-white shadow-sm md:shadow-lg border-b border-white/5 pt-[env(safe-area-inset-top)]">
      <div className="w-full px-2.5 md:px-6">
        <div className="flex items-center justify-between h-[44px] md:h-[60px]">
          
          {/* LOGO - Scaled Down Perfectly to Left Edge */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center"
          >
            <Link to="/" className="shrink-0 flex items-center group -ml-1 md:ml-2 w-[90px] h-[32px] md:w-[130px] md:h-[42px] relative z-20">
              <div className="transition-transform duration-300 w-full h-full flex items-center origin-left scale-[0.35] md:scale-[0.52] group-hover:scale-[0.37] md:group-hover:scale-[0.55]">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '250px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontFamily: '"Arial Black", sans-serif',
                      fontSize: '56px',
                      fontWeight: 900,
                      letterSpacing: '-1.5px',
                      lineHeight: 1,
                      paddingBottom: '8px', 
                      marginBottom: '-8px',
                      background: 'linear-gradient(180deg, #40C4FF 0%, #0277BD 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      filter: 'drop-shadow(0px 2px 2px rgba(0, 0, 0, 0.3))'
                    }}>Byndio</span>
                    <div style={{
                      position: 'relative',
                      width: '44px',
                      height: '40px',
                      marginTop: '8px',
                      borderRadius: '8px',
                      background: 'linear-gradient(180deg, #FFCA28 0%, #E65100 100%)',
                      boxShadow: '0 2px 5px rgba(0, 0, 0, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: '-10px',
                        width: '22px',
                        height: '14px',
                        border: '3px solid #FFB300',
                        borderRadius: '20px 20px 0 0',
                        borderBottom: 'none'
                      }}></div>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#7F0000" strokeWidth="3" strokeLinecap="round" style={{ width: '22px', height: '22px', marginTop: '4px' }}>
                        <path d="M7 10 Q 12 16 17 10" />
                      </svg>
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginTop: '8px',
                    paddingLeft: '4px',
                    fontFamily: '"Arial Black", sans-serif',
                    fontSize: '11px',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                  }}>
                    <span style={{ color: 'white', opacity: 0.9 }}>Shop</span>
                    <span style={{ color: '#FFCA28' }}>•</span>
                    <span style={{ color: '#FFCA28' }}>Sell</span>
                    <span style={{ color: '#FFCA28' }}>•</span>
                    <span style={{ color: '#FFCA28' }}>Earn</span>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* MAIN NAVIGATION DESKTOP */}
          <div className="hidden lg:flex items-center gap-4 xl:gap-6 ml-4 xl:ml-8">
            {/* Categories Mega Dropdown */}
            <div className="relative group/mega h-[60px] flex items-center">
              <button
                className={`text-[12px] font-medium uppercase tracking-wide transition-all duration-300 relative group flex items-center gap-1
                  ${loc.pathname === '/categories' ? 'text-white' : 'text-blue-100 hover:text-white'}
                `}
              >
                Categories
                <ChevronDown className="w-3 h-3 transition-transform group-hover/mega:rotate-180" />
                <span className={`absolute -bottom-1.5 left-0 h-[2px] bg-[#F57C00] transition-all duration-300 ${loc.pathname === '/categories' ? 'w-full' : 'w-0 group-hover/mega:w-full'}`} />
              </button>

              {/* Mega Menu Content */}
              <div className="absolute top-[60px] left-0 w-[1000px] bg-white text-gray-900 rounded-b-2xl shadow-2xl border-t border-gray-100 opacity-0 invisible group-hover/mega:opacity-100 group-hover/mega:visible transition-all duration-300 z-[100] grid grid-cols-4 p-6 gap-6 origin-top transform scale-95 group-hover/mega:scale-100">
                <div className="col-span-1 border-r border-gray-100 pr-6 overflow-y-auto max-h-[500px] scrollbar-hide">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">BYNDIO Categories</div>
                  {CATEGORIES_DATA.map((cat) => (
                    <Link
                      key={cat.id}
                      to={`/products?cat=${cat.id}`}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors group/cat"
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover/cat:scale-110" style={{ backgroundColor: cat.bgColor, color: cat.color }}>
                        {React.cloneElement(cat.icon as React.ReactElement, { size: 16 } as any)}
                      </div>
                      <span className="text-[12px] font-bold group-hover/cat:text-[#0D47A1]">{cat.name}</span>
                    </Link>
                  ))}
                </div>
                <div className="col-span-3 grid grid-cols-3 gap-6">
                  {CATEGORIES_DATA.slice(0, 9).map((cat) => (
                    <div key={cat.id} className="space-y-3">
                      <Link to={`/products?cat=${cat.id}`} className="text-[13px] font-black text-[#0D47A1] hover:underline flex items-center gap-2">
                        {cat.name}
                      </Link>
                      <div className="flex flex-col gap-1.5">
                        {cat.subCategories.map((sub) => (
                          <div key={sub.name} className="flex flex-col">
                            <Link to={`/products?cat=${cat.id}&sub=${sub.name}`} className="text-[11px] font-bold text-gray-700 hover:text-[#F57C00] transition-colors uppercase tracking-wider">
                              {sub.name}
                            </Link>
                            {sub.items && (
                              <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1 pl-1">
                                {sub.items.map((item) => (
                                  <Link 
                                    key={item} 
                                    to={`/products?cat=${cat.id}&search=${encodeURIComponent(item)}`}
                                    className="text-[10px] text-gray-500 hover:text-gray-900 transition-colors"
                                  >
                                    {item}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {navLinks.slice(1).map((link, idx) => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-[12px] font-medium uppercase tracking-wide transition-all duration-300 relative group
                  ${loc.pathname === link.href ? 'text-white' : 'text-blue-100 hover:text-white'}
                  ${idx > 2 ? 'hidden 2xl:block' : ''}
                `}
              >
                {link.label}
                <span className={`absolute -bottom-1.5 left-0 h-[2px] bg-[#F57C00] transition-all duration-300 ${loc.pathname === link.href ? 'w-full' : 'w-0 group-hover:w-full'}`} />
              </Link>
            ))}
          </div>

          {/* SEARCH BAR */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center flex-[2] min-w-[300px] max-w-[800px] px-4 xl:px-12">
            <div className="relative w-full flex items-center bg-white/10 hover:bg-white/15 border border-white/20 rounded-lg transition-colors backdrop-blur-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70" />
              <input
                type="text"
                placeholder="Search premium products..."
                value={searchQuery}
                onChange={(e) => updateSuggestions(e.target.value)}
                onFocus={() => searchQuery.length > 1 && updateSuggestions(searchQuery)}
                className={`w-full pl-9 pr-10 py-2.5 rounded-lg text-[13px] ${isListening ? 'ring-2 ring-red-400 animate-pulse' : ''} text-white placeholder-white/60 focus:outline-none focus:bg-white focus:text-gray-900 focus:placeholder-gray-400 transition-colors shadow-inner`}
                autoComplete="off"
              />
              <button 
                type="button" 
                onClick={handleVoiceSearch}
                className={`absolute right-2 top-1/2 -translate-y-1/2 ${isListening ? 'text-red-500 animate-bounce' : 'text-white/70 hover:text-[#0D47A1]'} transition-colors p-1`} 
                aria-label="Voice Search"
              >
                <Mic className="w-4 h-4" />
              </button>

              {/* Suggestions Dropdown */}
              <AnimatePresence>
                {suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden text-gray-900 z-[60]"
                  >
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { setSearchQuery(s); navigate(`/products?search=${encodeURIComponent(s)}`); setSuggestions([]); }}
                        className="w-full text-left px-4 py-2.5 text-[13px] hover:bg-gray-50 flex items-center justify-between group transition-colors"
                      >
                        <span className="font-medium">{s}</span>
                        <Search className="w-3 h-3 text-gray-300 group-hover:text-[#0D47A1]" />
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </form>

          {/* RIGHT ICONS & LOCATION */}
          <div className="flex items-center gap-1.5 xl:gap-3 shrink-0">
            
            {/* Location Picker Button */}
            <button 
              onClick={() => setShowLocationPicker(true)}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-white/10 rounded-lg transition-all text-left group shrink-0"
              aria-label="Set delivery location"
            >
              <MapPin className="w-4 h-4 text-white/80 shrink-0 group-hover:text-white transition-colors" />
              <div className="flex flex-col leading-none max-w-[100px]">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-white/60">Deliver to</span>
                <span className="text-[12px] font-bold text-white mt-0.5 truncate">
                  {displayLocation || <span className="text-white/80">Set location</span>}
                </span>
              </div>
            </button>

            <Link to="/notifications" className="hover:bg-white/10 p-1.5 rounded-full transition-colors relative group text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-[18px] h-[18px] md:w-5 md:h-5 group-hover:scale-105 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              <span className="absolute top-[3px] right-[3px] w-[4px] h-[4px] bg-[#F50057] rounded-full"></span>
            </Link>
            <Link to="/wishlist" className="hover:bg-white/10 p-1.5 rounded-full transition-colors relative group text-white" aria-label="Wishlist">
              <Heart className="w-[18px] h-[18px] md:w-5 md:h-5 group-hover:scale-105 transition-transform stroke-[2]" />
            </Link>
            <button
              onClick={onOpenCart}
              className="relative hover:bg-white/10 p-1.5 rounded-full transition-colors group text-white"
              aria-label="Cart"
            >
              <ShoppingCart className="w-[18px] h-[18px] md:w-5 md:h-5 group-hover:scale-105 transition-transform stroke-[2]" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-0.5 w-[11px] h-[11px] bg-[#F57C00] shadow-sm text-white text-[6px] font-black rounded-full flex items-center justify-center animate-bounce ring-1 ring-[#0D47A1]">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>
            {user ? (
              <Link to="/profile" className="hidden sm:flex items-center gap-2 px-2 py-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-lg transition-all ml-0.5 xl:ml-1 group shadow-sm">
                <div className="flex flex-col items-end leading-none">
                  <span className="text-[11px] font-extrabold group-hover:text-blue-200 transition-colors line-clamp-1">{user.name}</span>
                  <span className="text-[8px] font-black text-[#FFCA28] uppercase tracking-[0.05em] mt-0.5 opacity-90">{user.role}</span>
                </div>
                <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-white/20 to-transparent rounded-md border border-white/10 group-hover:scale-105 transition-transform">
                  <User className="w-[17px] h-[17px] stroke-[2]" />
                </div>
              </Link>
            ) : (
              <button
                onClick={onOpenLogin}
                className="hidden sm:flex items-center px-4 py-2 bg-gradient-to-r from-[#F57C00] to-[#E65100] hover:from-[#E65100] hover:to-[#DD2C00] text-white rounded-[6px] text-[12px] font-bold shadow-md transition-all ml-2 hover:scale-[1.02] active:scale-95 tracking-wide uppercase"
              >
                Login
              </button>
            )}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden flex p-1 -mr-1 hover:bg-white/10 rounded-full transition-colors ml-1 text-white"
              aria-label="Menu"
            >
              {isMenuOpen ? <X className="w-[18px] h-[18px] sm:w-6 sm:h-6 stroke-[1.5]" /> : <Menu className="w-[18px] h-[18px] sm:w-6 sm:h-6 stroke-[1.5]" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="lg:hidden fixed top-[44px] md:top-[65px] left-0 w-full h-[calc(100vh-44px)] md:h-[calc(100vh-65px)] bg-white text-gray-900 overflow-y-auto pb-20 shadow-[-10px_10px_30px_rgba(0,0,0,0.1)] z-40 border-t border-gray-100 px-4 pt-4"
            >
              {/* Mobile Location Picker - Light Theme */}
              <button 
                onClick={() => { setShowLocationPicker(true); setIsMenuOpen(false); }} 
                className="flex items-center gap-2.5 w-full mb-4 bg-[#F4F6F8] rounded-lg p-3 border border-gray-100 hover:bg-gray-100 transition-colors text-left shadow-sm"
              >
                <MapPin className="w-4 h-4 text-[#0D47A1] shrink-0" />
                <div className="flex-1">
                  <span className="block text-[9px] text-gray-500 uppercase tracking-widest font-black mb-0.5">Deliver To</span>
                  <span className="text-[12px] font-bold text-gray-900 leading-tight">
                    {deliveryAddress || deliveryPincode || 'Set your location'}
                  </span>
                </div>
              </button>
              
              <form onSubmit={handleSearch} className="mb-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-8 py-2.5 rounded-lg text-[13px] font-medium bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1] shadow-sm transition-all"
                  />
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </form>
              
              <motion.div 
                initial="hidden"
                animate="visible"
                variants={{
                  visible: { transition: { staggerChildren: 0.05 } },
                  hidden: {}
                }}
                className="flex flex-col"
              >
                <div className="text-[10px] uppercase tracking-widest font-black text-gray-400 mb-2 ml-1">Shop by Category</div>
                <div className="flex flex-col bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-5">
                  {CATEGORIES_DATA.map((cat, i) => (
                    <div key={cat.id} className={`border-b border-gray-100 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}>
                      <Link
                        to={`/products?cat=${cat.id}`}
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2.5 p-3 hover:bg-blue-50 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-md flex items-center justify-center shadow-sm" style={{ backgroundColor: cat.bgColor, color: cat.color }}>
                          {React.cloneElement(cat.icon as React.ReactElement, { size: 14 } as any)}
                        </div>
                        <span className="text-[13px] font-black text-gray-800">{cat.name}</span>
                      </Link>
                      <div className="pl-[46px] pr-3 flex flex-wrap gap-1.5 pb-3">
                        {cat.subCategories.map(sub => (
                          <Link
                            key={sub.name}
                            to={`/products?cat=${cat.id}&sub=${sub.name}`}
                            onClick={() => setIsMenuOpen(false)}
                            className="text-[10px] bg-white border border-gray-200 px-2.5 py-1 rounded-full text-gray-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 font-bold shadow-sm transition-all"
                          >
                            {sub.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-[10px] uppercase tracking-widest font-black text-gray-400 mb-2 ml-1">Quick Links</div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-100">
                  {navLinks.slice(1).map(link => (
                    <motion.div key={link.href} variants={{ hidden: { x: -20, opacity: 0 }, visible: { x: 0, opacity: 1 } }}>
                      <Link
                        to={link.href}
                        onClick={() => setIsMenuOpen(false)}
                        className={`block p-3 text-[13px] font-black transition-colors ${
                          loc.pathname === link.href
                            ? 'bg-blue-50 text-[#0D47A1]'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  ))}
                </div>
                
                {!user && (
                  <motion.button
                    variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
                    onClick={() => { onOpenLogin(); setIsMenuOpen(false); }}
                    className="mt-4 py-3 px-4 rounded-lg text-[13px] font-black bg-gradient-to-r from-[#0D47A1] to-[#1565C0] text-white hover:shadow-lg hover:from-[#1565C0] hover:to-[#1976D2] transition-all text-center shadow-md border border-[#0D47A1]"
                  >
                     Login / Create Account
                  </motion.button>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Location Picker Modal */}
      <LocationPicker
        isOpen={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onLocationSelect={handleLocationSelect}
        currentPincode={deliveryPincode || undefined}
        currentAddress={deliveryAddress || undefined}
        currentCoords={deliveryCoords}
      />
    </nav>
  );
}