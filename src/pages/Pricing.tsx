import React, { useState } from 'react';
import { usePageTitle } from '../lib/usePageTitle';
import { useAppStore } from '../store';
import { initiateSubscriptionPayment } from '../lib/subscriptionPayment';
import { toast, toastSuccess } from '../components/Toast';
import { 
  Check, Shield, Zap, Star, Rocket, Info, ChevronRight, 
  ArrowLeft, Crown, Sparkles, TrendingUp, Users 
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

const SELLER_PLANS = [
  {
    name: 'Free',
    price: 0,
    priceDisplay: '₹0',
    description: 'Perfect for testing the waters',
    features: [
      'List up to 5 products',
      'Basic analytics dashboard',
      'Standard seller support',
      'COD + Online payments',
      'Basic community access'
    ],
    color: 'gray',
    icon: <Zap className="text-gray-400" />
  },
  {
    name: 'Starter',
    price: 499,
    priceDisplay: '₹499',
    description: 'Grow your small business',
    features: [
      'List up to 25 products',
      'Basic analytics',
      'Email support',
      'Bulk upload CSV',
      'Coupon creation tools',
      '10 sponsored slots'
    ],
    color: 'blue',
    icon: <Rocket className="text-blue-500" />
  },
  {
    name: 'Pro',
    price: 1999,
    priceDisplay: '₹1,999',
    description: 'Scale with advanced tools',
    features: [
      'List up to 100 products',
      'Advanced analytics suite',
      'AI product descriptions',
      '3 free boosts/month',
      'Priority 24/7 support',
      'GST invoicing system',
      'Creator partnerships'
    ],
    color: 'indigo',
    popular: true,
    icon: <Crown className="text-indigo-500" />
  },
  {
    name: 'Premium',
    price: 4999,
    priceDisplay: '₹4,999',
    description: 'The ultimate power for brands',
    features: [
      'Unlimited products',
      'Full analytics + Export',
      'AI tools + Video creator',
      '10 free boosts/month',
      'Dedicated manager',
      'Custom store page',
      'Featured placement'
    ],
    color: 'purple',
    icon: <Sparkles className="text-purple-500" />
  }
];

const CREATOR_PLANS = [
  {
    name: 'Basic',
    price: 0,
    priceDisplay: '₹0',
    description: 'Start your journey',
    features: [
      'Access to product catalog',
      'Standard commission rates',
      'Basic affiliate links',
      'Community access'
    ],
    color: 'gray'
  },
  {
    name: 'Influencer Pro',
    price: 999,
    priceDisplay: '₹999',
    description: 'Higher earnings for pros',
    features: [
      'Higher commission rates (+5%)',
      'Verified creator badge',
      'Priority sample requests',
      'Advanced link tracking',
      'Brand collaboration tools'
    ],
    color: 'pink',
    popular: true
  }
];

export default function Pricing() {
  usePageTitle('Choose Your Plan — BYNDIO');
  const { user } = useAppStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState<'seller' | 'influencer'>((searchParams.get('role') as any) || 'seller');
  const [loading, setLoading] = useState(false);

  const plans = role === 'seller' ? SELLER_PLANS : CREATOR_PLANS;

  const handlePlanSelect = async (plan: any) => {
    if (!user) {
      toast('Please login to continue', 'info');
      navigate('/login?redirect=/pricing');
      return;
    }

    if (plan.price === 0) {
      // For free plans, we can still use the direct activation or just show a message
      toastSuccess(`You are already on the ${plan.name} plan!`);
      return;
    }

    // Redirect to the dedicated checkout page
    const params = new URLSearchParams({
      plan: plan.name,
      price: plan.price.toString(),
      role: role
    });
    navigate(`/subscription-checkout?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      {/* Header */}
      <div className="bg-[#0D47A1] text-white pt-16 pb-32 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="max-w-6xl mx-auto relative z-10">
          <Link to={role === 'seller' ? '/seller-dashboard' : '/dashboard'} className="inline-flex items-center gap-2 text-blue-100 hover:text-white transition-colors mb-8 group">
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold text-sm">Back to Dashboard</span>
          </Link>
          
          <h1 className="text-3xl md:text-5xl font-black mb-4 tracking-tight text-center md:text-left">
            Elevate Your Business with <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-400">BYNDIO Premium</span>
          </h1>
          <p className="text-blue-100/70 text-lg md:text-xl font-medium max-w-2xl mb-8 text-center md:text-left">
            Choose the perfect plan to scale your reach, increase your sales, and build a lasting brand in the social commerce era.
          </p>

          {/* Role Toggle */}
          <div className="flex justify-center md:justify-start">
            <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 inline-flex gap-2">
              <button 
                onClick={() => setRole('seller')}
                className={`px-8 py-3 rounded-xl text-sm font-black transition-all ${role === 'seller' ? 'bg-white text-[#0D47A1] shadow-lg shadow-blue-900/20' : 'text-white hover:bg-white/10'}`}
              >
                Seller Plans
              </button>
              <button 
                onClick={() => setRole('influencer')}
                className={`px-8 py-3 rounded-xl text-sm font-black transition-all ${role === 'influencer' ? 'bg-white text-[#0D47A1] shadow-lg shadow-blue-900/20' : 'text-white hover:bg-white/10'}`}
              >
                Creator Plans
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="max-w-7xl mx-auto px-4 -mt-16 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, i) => (
            <div 
              key={plan.name}
              className={`bg-white rounded-[32px] p-8 shadow-xl shadow-blue-900/5 border transition-all hover:scale-[1.02] flex flex-col ${plan.popular ? 'border-2 border-[#0D47A1] relative' : 'border-gray-100'}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#0D47A1] text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
                  {(plan as any).icon || <Zap className="text-gray-400" />}
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-1">{plan.name}</h3>
                <p className="text-xs text-gray-500 font-medium">{plan.description}</p>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-gray-900">{plan.priceDisplay}</span>
                  <span className="text-sm font-bold text-gray-400">/mo</span>
                </div>
              </div>

              <div className="flex-1 space-y-4 mb-8">
                {plan.features.map(f => (
                  <div key={f} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={12} className="text-green-600" />
                    </div>
                    <span className="text-sm text-gray-600 font-medium leading-tight">{f}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handlePlanSelect(plan)}
                disabled={loading || (user?.subscription_plan === plan.name.toLowerCase())}
                className={`w-full py-4 rounded-2xl font-black text-sm transition-all shadow-lg active:scale-95 ${
                  user?.subscription_plan === plan.name.toLowerCase()
                    ? 'bg-green-50 text-green-700 cursor-default'
                    : plan.popular 
                      ? 'bg-[#0D47A1] text-white hover:bg-[#1565C0] shadow-blue-200' 
                      : 'bg-white border-2 border-gray-100 text-gray-900 hover:border-[#0D47A1] hover:text-[#0D47A1]'
                }`}
              >
                {user?.subscription_plan === plan.name.toLowerCase() ? 'Current Plan' : plan.price === 0 ? 'Get Started' : `Buy ${plan.name}`}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison Table Section (Simple) */}
      <div className="max-w-4xl mx-auto px-4 mt-24">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-black text-gray-900 mb-2">Frequently Asked Questions</h2>
          <p className="text-gray-500 font-medium">Everything you need to know about our plans</p>
        </div>

        <div className="space-y-4">
          {[
            { q: 'Can I upgrade or downgrade later?', a: 'Yes! You can upgrade your plan at any time. Downgrades take effect at the end of your current billing cycle.' },
            { q: 'Is there a long-term commitment?', a: 'No, all our plans are month-to-month and you can cancel anytime from your settings.' },
            { q: 'How do free boosts work?', a: 'Free boosts are credited to your account every month. They allow you to feature your products at the top of category feeds for 24 hours.' },
            { q: 'What payment methods do you accept?', a: 'We accept all major UPI apps (GPay, PhonePe, Paytm), Credit/Debit cards, and Net Banking via Razorpay.' }
          ].map((faq, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h4 className="font-black text-gray-900 mb-2">{faq.q}</h4>
              <p className="text-sm text-gray-600 font-medium leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Trust Badge */}
      <div className="flex justify-center mt-16 px-4">
        <div className="bg-white px-6 py-3 rounded-full border border-gray-100 shadow-sm flex items-center gap-3">
          <Shield size={20} className="text-[#388E3C]" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
            Secure Payments by Razorpay • SSL Encrypted
          </span>
        </div>
      </div>
    </div>
  );
}
