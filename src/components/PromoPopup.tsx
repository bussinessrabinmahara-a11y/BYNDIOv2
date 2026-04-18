import React, { useState, useEffect } from 'react';
import { X, Gift, Zap, Users, ArrowRight, Share2, DollarSign } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';

type PopupType = 'new_user' | 'referral' | 'exit_intent' | 'first_purchase' | 'returning_user' | 'referral_success' | null;

export default function PromoPopup() {
  const [activePopup, setActivePopup] = useState<PopupType>(null);
  const [isVisible, setIsVisible] = useState(false);
  const user = useAppStore(s => s.user);
  const rewardPoints = useAppStore(s => s.rewardPoints);
  const navigate = useNavigate();

  useEffect(() => {
    const lastSeen = localStorage.getItem('byndio_last_popup');
    const hasPurchased = localStorage.getItem('byndio_has_purchased');
    const isReturning = localStorage.getItem('byndio_visited_before');
    const now = Date.now();
    
    // Don't show too frequently (every 10 minutes for testing, prod should be longer)
    if (lastSeen && now - parseInt(lastSeen) < 600000) return;

    const timer = setTimeout(() => {
      if (!user) {
        setActivePopup('new_user');
      } else if (!hasPurchased) {
        setActivePopup('first_purchase');
      } else if (isReturning && rewardPoints > 0) {
        setActivePopup('returning_user');
      } else {
        const rand = Math.random();
        if (rand > 0.5) setActivePopup('referral');
        else setActivePopup('referral_success');
      }
      
      setIsVisible(true);
      localStorage.setItem('byndio_last_popup', now.toString());
      localStorage.setItem('byndio_visited_before', 'true');
    }, 5000);

    // Exit intent 
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !isVisible) {
        setActivePopup('exit_intent');
        setIsVisible(true);
        localStorage.setItem('byndio_last_popup', Date.now().toString());
      }
    };
    
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [user, rewardPoints, isVisible]);

  const closePopup = () => {
    setIsVisible(false);
    setTimeout(() => setActivePopup(null), 300);
  };

  if (!activePopup) return null;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join BYNDIO',
        text: `Use my referral code ${user?.id?.slice(0, 8).toUpperCase() || 'REF123'} to get ₹100 bonus on BYNDIO!`,
        url: 'https://byndio.in'
      }).catch(() => {});
    }
  };

  const popups = {
    new_user: {
      icon: <SparkleIcon />,
      title: "Start Earning While You Shop",
      desc: "+50 Points on signup & Referral rewards. Join India's 0% commission marketplace.",
      cta: "Create Account & Earn",
      action: () => { closePopup(); document.dispatchEvent(new Event('open-login')); },
      color: "from-[#0D47A1] to-[#1565C0]",
      accent: "text-blue-200"
    },
    referral: {
      icon: <Users size={40} className="text-white" />,
      title: "Invite Friends. Earn More Points.",
      desc: "Share your code with friends. They get a bonus, you get points!",
      cta: "Share & Earn 50 Points",
      action: handleShare,
      code: user?.id?.slice(0, 8).toUpperCase() || 'JOINBYNDIO',
      color: "from-[#7B1FA2] to-[#4A148C]",
      accent: "text-purple-200"
    },
    exit_intent: {
      icon: <Gift size={40} className="text-white fill-current" />,
      title: "Wait! Don't Miss Your Rewards",
      desc: "You have unredeemed rewards waiting. Use them before they expire!",
      cta: "Continue & Save",
      action: closePopup,
      color: "from-[#E65100] to-[#F57C00]",
      accent: "text-orange-100"
    },
    first_purchase: {
      icon: <DollarSign size={40} className="text-white" />,
      title: "Complete Your First Order & Earn Bonus",
      desc: "Get an extra 10-20 points directly to your wallet when you make your first purchase.",
      cta: "Shop Now",
      action: () => { closePopup(); navigate('/products'); },
      color: "from-[#1B5E20] to-[#2E7D32]",
      accent: "text-green-200"
    },
    returning_user: {
      icon: <Zap size={40} className="text-white" />,
      title: "You Have Points Waiting",
      desc: `Welcome back! You have ${rewardPoints} points ready to be used as discounts.`,
      cta: "Use Points Now",
      action: () => { closePopup(); navigate('/products'); },
      color: "from-[#0277BD] to-[#01579B]",
      accent: "text-blue-100"
    },
    referral_success: {
      icon: <SparkleIcon />,
      title: "You Earned 50 Points 🎉",
      desc: "A friend just signed up using your code. Points have been added to your wallet.",
      cta: "Invite More Friends",
      action: handleShare,
      color: "from-[#C2185B] to-[#880E4F]",
      accent: "text-pink-200"
    }
  };

  const content = popups[activePopup];

  return (
    <div className={`fixed inset-0 z-[10000] flex items-center justify-center p-4 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closePopup} />
      
      <div className={`relative w-full max-w-[420px] bg-gradient-to-br ${content.color} rounded-[32px] overflow-hidden shadow-2xl transition-transform duration-500 transform ${isVisible ? 'scale-100 translate-y-0' : 'scale-90 translate-y-10'}`}>
        {/* Background shapes */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full -ml-10 -mb-10 blur-xl" />

        <button onClick={closePopup} className="absolute top-4 right-4 w-10 h-10 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center text-white transition-colors z-10">
          <X size={20} />
        </button>

        <div className="p-8 pb-10 flex flex-col items-center text-center text-white">
          <div className="mb-6 transform hover:rotate-12 transition-transform duration-300">
            {content.icon}
          </div>
          
          <h2 className="text-2xl font-black mb-3 drop-shadow-md leading-tight">
            {content.title}
          </h2>
          
          <p className={`text-[13px] font-medium leading-relaxed mb-6 ${content.accent} opacity-90`}>
            {content.desc}
          </p>
          
          {'code' in content && (
            <div className="mb-6 bg-black/20 border border-white/20 rounded-xl px-4 py-2 w-full">
              <div className="text-[10px] uppercase tracking-widest opacity-70 mb-1">Your Code</div>
              <div className="text-xl font-black tracking-widest">{content.code}</div>
            </div>
          )}

          <button 
            onClick={content.action}
            className="group w-full bg-white text-gray-900 py-3.5 rounded-2xl font-black text-[14px] flex items-center justify-center gap-2 hover:bg-gray-100 transition-all active:scale-95 shadow-xl shadow-black/20"
          >
            {content.cta}
            {activePopup === 'referral' || activePopup === 'referral_success' ? <Share2 size={16}/> : <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /> }
          </button>
          
          <button onClick={closePopup} className="mt-5 text-[11px] font-bold opacity-60 hover:opacity-100 uppercase tracking-widest">
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}

function SparkleIcon() {
  return (
    <div className="relative">
      <Gift size={40} className="text-white" />
      <div className="absolute -top-1 -right-1">
        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
      </div>
    </div>
  );
}
