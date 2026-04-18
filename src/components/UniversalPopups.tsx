import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, ArrowRight, Zap, Wallet, Megaphone } from 'lucide-react';
import { useAppStore } from '../store';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function UniversalPopups() {
  const { user, walletBalance } = useAppStore();
  const location = useLocation();
  const [activePopup, setActivePopup] = useState<'new_user' | 'exit_intent' | 'balance_reminder' | 'dynamic' | null>(null);
  const [dynamicContent, setDynamicContent] = useState<any>(null);
  const [hasDismissed, setHasDismissed] = useState(false);

  const isAdminPage = location.pathname.startsWith('/admin') || 
                      location.pathname.startsWith('/seller-dashboard') || 
                      location.pathname.startsWith('/creator-dashboard');

  useEffect(() => {
    if (isAdminPage) return;

    // Load dynamic popups from DB
    supabase.from('popups').select('*').eq('is_active', true)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const timed = data.find(p => p.type === 'timed');
          if (timed && !localStorage.getItem(`popup_${timed.id}`)) {
            setTimeout(() => {
              if (!hasDismissed) {
                setDynamicContent(timed);
                setActivePopup('dynamic');
              }
            }, timed.trigger_delay || 5000);
          }
        }
      });

    // 1. New User Popup
    if (!user && !localStorage.getItem('byndio_new_user_popup_shown')) {
      const timer = setTimeout(() => {
        if (!hasDismissed) setActivePopup('new_user');
      }, 5000);
      return () => clearTimeout(timer);
    }

    // 2. Balance Reminder
    if (user && walletBalance > 100 && !localStorage.getItem('byndio_balance_popup_shown')) {
      const timer = setTimeout(() => {
        if (!hasDismissed) setActivePopup('balance_reminder');
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [user, walletBalance, hasDismissed, isAdminPage]);

  // 3. Exit Intent Detection
  useEffect(() => {
    if (isAdminPage) return;
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !activePopup && !localStorage.getItem('byndio_exit_popup_shown')) {
        // Find if we have an exit intent popup in DB
        supabase.from('popups').select('*').eq('type', 'exit_intent').eq('is_active', true).maybeSingle()
          .then(({ data }) => {
            if (data) {
              setDynamicContent(data);
              setActivePopup('dynamic');
            } else {
              setActivePopup('exit_intent'); // Fallback to hardcoded
            }
          });
      }
    };
    window.addEventListener('mouseout', handleMouseLeave);
    return () => window.removeEventListener('mouseout', handleMouseLeave);
  }, [activePopup, isAdminPage]);

  if (isAdminPage) return null;

  const dismiss = (key: string) => {
    localStorage.setItem(key, 'true');
    setActivePopup(null);
    setHasDismissed(true);
  };

  return (
    <AnimatePresence>
      {activePopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-2xl md:rounded-3xl overflow-hidden max-w-[320px] md:max-w-[400px] w-[95%] md:w-full relative shadow-2xl shadow-blue-500/20"
          >
            <button 
              onClick={() => dismiss(`byndio_${dynamicContent?.id || activePopup}_popup_shown`)}
              className="absolute top-3 right-3 md:top-4 md:right-4 z-10 w-6 h-6 md:w-8 md:h-8 flex items-center justify-center bg-white/20 hover:bg-white/40 md:bg-gray-100 md:hover:bg-gray-200 rounded-full text-white md:text-gray-500 transition-colors"
            >
              <X size={16} className="md:w-[18px] md:h-[18px]" />
            </button>

            {/* DYNAMIC CONTENT FROM DB */}
            {activePopup === 'dynamic' && dynamicContent && (
              <div className="p-0">
                <div className="p-6 md:p-8 text-center" style={{ backgroundColor: dynamicContent.background_color || '#0D47A1' }}>
                   <div className="w-12 h-12 md:w-16 md:h-16 bg-white/20 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-4 border border-white/30 backdrop-blur-md">
                    <Megaphone size={24} className="text-white md:w-8 md:h-8" />
                  </div>
                  <h3 className="text-[18px] md:text-2xl font-black text-white leading-tight">{dynamicContent.title}</h3>
                </div>
                <div className="p-5 md:p-8 text-center">
                  <div className="text-[22px] md:text-3xl font-black text-red-600 mb-1.5 md:mb-2">{dynamicContent.discount_text}</div>
                  <p className="text-gray-600 text-[11px] md:text-sm mb-4 md:mb-6">{dynamicContent.description}</p>
                  <Link to={dynamicContent.target_url || '/products'} onClick={() => dismiss(`popup_${dynamicContent.id}`)}
                    className="block w-full bg-gray-900 text-white flex items-center justify-center py-3 md:py-4 rounded-lg md:rounded-xl font-black text-[13px] md:text-lg">
                    {dynamicContent.button_text || 'Claim Now'}
                  </Link>
                </div>
              </div>
            )}

            {/* HARDCODED FALLBACKS */}
            {activePopup === 'new_user' && (
              <div className="p-0">
                <div className="bg-gradient-to-br from-[#0D47A1] to-[#1565C0] p-6 md:p-8 text-center text-white">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-white/20 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-4 border border-white/30 backdrop-blur-md">
                    <Gift size={24} className="text-[#FFD600] md:w-8 md:h-8" />
                  </div>
                  <h3 className="text-[18px] md:text-2xl font-black mb-1.5 md:mb-2 leading-tight">Start Earning While You Shop!</h3>
                  <p className="text-white/80 text-[11px] md:text-sm">Join India's most reward-focused marketplace today.</p>
                </div>
                <div className="p-5 md:p-6">
                  <div className="space-y-4 mb-4 md:mb-6">
                    <div className="flex items-center gap-2.5 md:gap-3">
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-black text-[10px] md:text-xs">50</div>
                      <div className="text-[12px] md:text-sm font-bold text-gray-700">Points on Mobile Signup</div>
                    </div>
                  </div>
                  <button onClick={() => { dismiss('byndio_new_user_popup_shown'); document.dispatchEvent(new CustomEvent('open-login')); }}
                    className="w-full bg-[#E65100] flex items-center justify-center gap-1.5 text-white py-3 md:py-4 rounded-lg md:rounded-xl font-black text-[13px] md:text-lg shadow-lg">
                    Claim My 50 Points <ArrowRight size={16} className="md:w-5 md:h-5" />
                  </button>
                </div>
              </div>
            )}

            {activePopup === 'balance_reminder' && (
              <div className="p-6 md:p-8 text-center">
                <div className="w-14 h-14 md:w-20 md:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                  <Wallet size={28} className="text-green-600 md:w-10 md:h-10" />
                </div>
                <h3 className="text-[18px] md:text-2xl font-black text-gray-800 mb-1.5 md:mb-2">You Have Points Waiting!</h3>
                <p className="text-gray-500 text-[11px] md:text-sm mb-4 md:mb-6">
                  You have <span className="text-green-600 font-bold">₹{Math.floor(walletBalance/10)}</span> ready to spend.
                </p>
                <Link to="/products" onClick={() => dismiss('byndio_balance_popup_shown')}
                  className="w-full bg-[#0D47A1] text-white py-3 md:py-4 rounded-lg md:rounded-xl font-black text-[13px] md:text-lg flex items-center justify-center gap-1.5">
                  Use Points Now <ArrowRight size={14} className="md:w-[18px] md:h-[18px]" />
                </Link>
              </div>
            )}
            {activePopup === 'exit_intent' && (
              <div className="p-0">
                <div className="bg-gradient-to-br from-[#E65100] to-[#F57C00] p-6 md:p-8 text-center text-white">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-white/20 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-4 border border-white/30 backdrop-blur-md">
                    <Zap size={24} className="text-white md:w-8 md:h-8" />
                  </div>
                  <h3 className="text-[18px] md:text-2xl font-black mb-1.5 md:mb-2 leading-tight">Wait! Don't Miss Out</h3>
                  <p className="text-white/90 text-[11px] md:text-sm">You have items in your cart ready for checkout.</p>
                </div>
                <div className="p-5 md:p-6">
                  <Link to="/products" onClick={() => dismiss('byndio_exit_popup_shown')}
                    className="block w-full bg-gray-900 text-white flex justify-center py-3 md:py-4 rounded-lg md:rounded-xl font-black text-[13px] md:text-lg text-center shadow-lg">
                    Continue Shopping
                  </Link>
                </div>
              </div>
            )}

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

