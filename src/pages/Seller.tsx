import React, { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { usePageTitle } from '../lib/usePageTitle';
import { toastSuccess, toast } from '../components/Toast';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store';
import { initiateSubscriptionPayment } from '../lib/subscriptionPayment';
import {
  CheckCircle, ShieldCheck, Zap, TrendingUp, Package, IndianRupee,
  ChevronDown, ChevronUp, MessageCircle, Mail, Phone, Star,
  AlertTriangle, Info, RotateCcw, Truck, Award, BookOpen,
  Upload, Clock, Users, BarChart2, ArrowUpRight, CheckCircle2,
  ArrowRight, Mic, ChevronRight, X
} from 'lucide-react';
import { INDIAN_STATES } from '../lib/gstCompliance';

// ─── Static Data ───────────────────────────────────────────────
const TRUST_BADGES = [
  { icon: '0️⃣', label: '0% Commission',         color: '#1565C0', bg: '#E3F2FD' },
  { icon: '🆓', label: 'Zero Investment',         color: '#1B5E20', bg: '#E8F5E9' },
  { icon: '📦', label: 'No Inventory Needed',     color: '#7B1FA2', bg: '#F3E5F5' },
  { icon: '💸', label: 'Secure Fast Payouts',     color: '#E65100', bg: '#FFF3E0' },
  { icon: '🚚', label: 'Pan India Delivery',      color: '#006064', bg: '#E0F7FA' },
  { icon: '🤝', label: 'Trusted Seller Network',  color: '#BF360C', bg: '#FBE9E7' },
];

const WHY_TRUST = [
  { icon: <TrendingUp size={20}/>,  title: 'Transparent Commission',   desc: '0% always — no surprise deductions or forced discounts.' },
  { icon: <Package size={20}/>,     title: 'Real-Time Order Tracking', desc: 'Full visibility from order placed to doorstep delivery.' },
  { icon: <MessageCircle size={20}/>,title:'Dedicated Seller Support', desc: '24/7 help via chat, email & WhatsApp for all your queries.' },
  { icon: <Star size={20}/>,        title: 'Influencer Promotion',     desc: '20K+ creators ready to promote your products organically.' },
  { icon: <Clock size={20}/>,       title: 'Easy Onboarding (5 min)', desc: 'Register, list products and go live in under 5 minutes.' },
  { icon: <IndianRupee size={20}/>, title: 'Weekly Payouts',          desc: 'Direct bank settlement every week. No delays, no holds.' },
];

const HOW_IT_WORKS = [
  { step: '01', emoji: '📝', title: 'Create Account',       desc: 'Register free with your mobile number & basic details.' },
  { step: '02', emoji: '🔐', title: 'Complete KYC',          desc: 'Upload Aadhaar, PAN & bank details for verification.' },
  { step: '03', emoji: '📦', title: 'Upload Products',       desc: 'Add listings with photos, price, stock & description.' },
  { step: '04', emoji: '🚀', title: 'Go Live & Earn',        desc: 'Your products go live after admin approval. Start earning!' },
];

const PLANS = [
  {
    name: 'Free',    price: '₹0',      tag: 'Forever Free', tagColor: '#1565C0', tagBg: '#E3F2FD', highlight: false,
    features: ['Unlimited product listings','0% commission always','Basic analytics dashboard','Standard seller support','UPI & bank payouts','Community access'],
    cta: 'Get Started Free', ctaStyle: 'border-2 border-[#0D47A1] text-[#0D47A1] hover:bg-[#E3F2FD]',
  },
  {
    name: 'Starter', price: '₹499',    tag: 'Best for beginners', tagColor: '#E65100', tagBg: '#FFF3E0', highlight: false,
    features: ['Everything in Free','Priority search ranking','10 sponsored product slots','Basic creator promotion','WhatsApp support','Product boost credits'],
    cta: 'Start Starter Plan', ctaStyle: 'border-2 border-[#E65100] text-[#E65100] hover:bg-[#FFF3E0]',
  },
  {
    name: 'Pro',     price: '₹1,999',  tag: '',   tagColor: '#fff',   tagBg: 'transparent',  highlight: true,
    features: ['Everything in Starter','Creator partnerships (20K+ creators)','Advanced analytics & reports','24/7 priority support','Bulk upload & catalog tools','Featured seller badge','RTO risk alerts'],
    cta: 'Get Pro Plan', ctaStyle: 'bg-[#0D47A1] text-white hover:bg-[#1565C0]',
  },
  {
    name: 'Premium', price: 'Custom',  tag: 'Enterprise', tagColor: '#7B1FA2', tagBg: '#F3E5F5', highlight: false,
    features: ['Everything in Pro','Dedicated account manager','Custom API integrations','White-label storefront','Brand campaign management','SLA-backed support','Exclusive placement deals'],
    cta: 'Contact Sales', ctaStyle: 'border-2 border-[#7B1FA2] text-[#7B1FA2] hover:bg-[#F3E5F5]',
  },
];

const FAQS = [
  { q: 'Is there any registration fee?',          a: 'No. Registration on BYNDIO is completely free. You only pay optional subscription fees for advanced features.' },
  { q: 'Do I need inventory to sell?',             a: 'No inventory needed for dropshipping. However, if you list products, ensure you have or can source the items.' },
  { q: 'How do I get orders?',                     a: 'Through organic discovery on our platform, influencer/affiliate promotions, and paid boosting options.' },
  { q: 'When do I get paid?',                      a: 'Weekly payouts every Monday directly to your registered bank account after order delivery confirmation.' },
  { q: 'Do I need GST to sell on BYNDIO?',         a: 'GST is optional for sellers below ₹40 lakh annual turnover. Without GST, you can sell within your state only. With GST, you can sell pan-India.' },
  { q: 'What are RTO charges?',                    a: 'If an order is returned to origin (customer rejected / wrong address), you pay both forward + return shipping costs.' },
  { q: 'Can I set my own product price?',          a: 'Yes! You have 100% price control. BYNDIO does not force discounts or commission-based price cuts.' },
  { q: 'Is my earnings data safe?',                a: 'Absolutely. All transactions use bank-grade encryption. Your earnings are fully protected and transparently tracked.' },
];

const TRAINING = [
  { emoji: '🎬', title: 'How to Upload Products',     duration: '3 min', level: 'Beginner',     price: 'FREE' },
  { emoji: '📈', title: 'How to Increase Sales',      duration: '5 min', level: 'Intermediate', price: 'FREE' },
  { emoji: '⭐', title: 'Affiliate Strategy Guide',   duration: '4 min', level: 'Intermediate', price: '₹99'  },
  { emoji: '📦', title: 'Catalog & Bulk Upload',      duration: '4 min', level: 'Beginner',     price: 'FREE' },
  { emoji: '💡', title: 'SEO for Your Products',      duration: '5 min', level: 'Advanced',     price: '₹199' },
  { emoji: '🚀', title: 'Creator Collab Masterclass', duration: '6 min', level: 'Advanced',     price: '₹299' },
];

// ─── Component ─────────────────────────────────────────────────
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">{label}</label>
    {children}
  </div>
);

export default function Seller() {
  usePageTitle('Start Selling on BYNDIO — 0% Commission');
  const { user } = useAppStore();
  const navigate = useNavigate();

  // Redirect if already a seller
  useEffect(() => {
    if (user?.role === 'seller') {
      navigate('/seller-dashboard');
    }
  }, [user, navigate]);

  const [revenue, setRevenue]       = useState(50000);
  const [submitting, setSubmitting] = useState(false);
  const [hasGst, setHasGst]         = useState<boolean | null>(null);
  const [openFaq, setOpenFaq]       = useState<number | null>(null);
  const [agreedTerms, setAgreedTerms]   = useState(false);
  const [agreedGst,   setAgreedGst]     = useState(false);
  const [formStep, setFormStep]         = useState(1);
  
  // Embla Carousel for Plans
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'center', skipSnaps: false });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  const scrollTo = useCallback((index: number) => emblaApi && emblaApi.scrollTo(index), [emblaApi]);

  // Embla Carousel for Profit Calculator
  const [profRef, profApi] = useEmblaCarousel({ align: 'center', skipSnaps: false });
  const [profIdx, setProfIdx] = useState(0);
  const [profSnaps, setProfSnaps] = useState<number[]>([]);

  const onProfSelect = useCallback(() => {
    if (!profApi) return;
    setProfIdx(profApi.selectedScrollSnap());
  }, [profApi]);

  useEffect(() => {
    if (!profApi) return;
    setProfSnaps(profApi.scrollSnapList());
    profApi.on('select', onProfSelect);
    profApi.on('reInit', onProfSelect);
  }, [profApi, onProfSelect]);

  const profScrollTo = useCallback((index: number) => profApi && profApi.scrollTo(index), [profApi]);

  // Courses Embla
  const [courseRef, courseApi] = useEmblaCarousel({ align: 'center', skipSnaps: false });
  const [courseIdx, setCourseIdx] = useState(0);
  const [courseSnaps, setCourseSnaps] = useState<number[]>([]);
  const onCourseSelect = useCallback(() => courseApi && setCourseIdx(courseApi.selectedScrollSnap()), [courseApi]);
  useEffect(() => {
    if (!courseApi) return;
    setCourseSnaps(courseApi.scrollSnapList());
    courseApi.on('select', onCourseSelect).on('reInit', onCourseSelect);
  }, [courseApi, onCourseSelect]);

  // Affiliate Embla
  const [affRef, affApi] = useEmblaCarousel({ align: 'center', skipSnaps: false });
  const [affIdx, setAffIdx] = useState(0);
  const [affSnaps, setAffSnaps] = useState<number[]>([]);
  const onAffSelect = useCallback(() => affApi && setAffIdx(affApi.selectedScrollSnap()), [affApi]);
  useEffect(() => {
    if (!affApi) return;
    setAffSnaps(affApi.scrollSnapList());
    affApi.on('select', onAffSelect).on('reInit', onAffSelect);
  }, [affApi, onAffSelect]);

  // RTO Embla
  const [rtoRef, rtoApi] = useEmblaCarousel({ align: 'center', skipSnaps: false });
  const [rtoIdx, setRtoIdx] = useState(0);
  const [rtosnaps, setRtoSnaps] = useState<number[]>([]);
  const onRtoSelect = useCallback(() => rtoApi && setRtoIdx(rtoApi.selectedScrollSnap()), [rtoApi]);
  useEffect(() => {
    if (!rtoApi) return;
    setRtoSnaps(rtoApi.scrollSnapList());
    rtoApi.on('select', onRtoSelect).on('reInit', onRtoSelect);
  }, [rtoApi, onRtoSelect]);

  // Policy Embla
  const [polRef, polApi] = useEmblaCarousel({ align: 'center', skipSnaps: false });
  const [polIdx, setPolIdx] = useState(0);
  const [polSnaps, setPolSnaps] = useState<number[]>([]);
  const onPolSelect = useCallback(() => polApi && setPolIdx(polApi.selectedScrollSnap()), [polApi]);
  useEffect(() => {
    if (!polApi) return;
    setPolSnaps(polApi.scrollSnapList());
    polApi.on('select', onPolSelect).on('reInit', onPolSelect);
  }, [polApi, onPolSelect]);
  const polScrollTo = useCallback((index: number) => polApi && polApi.scrollTo(index), [polApi]);

  const [formData, setFormData]         = useState(() => {
    try {
      const saved = localStorage.getItem('byndio_seller_form');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    setSubmitting(true);
    try {
      const uploadedUrls = formData.kycDocuments || [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 5 * 1024 * 1024) {
          toast(`File ${file.name} is too large (max 5MB)`, 'error');
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${i}.${fileExt}`;
        const filePath = `onboarding/${fileName}`; 


        const { error: uploadError } = await supabase.storage
          .from('seller-documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('seller-documents')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      setFormData((prev: any) => ({ ...prev, kycDocuments: uploadedUrls }));
      toastSuccess('Documents linked successfully!');
    } catch (err: any) {
      toast(err.message || 'Upload failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveForLater = () => {
    localStorage.setItem('byndio_seller_form', JSON.stringify(formData));
    toastSuccess('Progress saved! You can return later to complete your registration.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedTerms) return;
    if (!user) {
      toast('Please login to submit an application', 'error');
      setSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase.from('seller_applications').insert({
        user_id:         user.id,
        full_name:       formData.fullName || '',
        email:           formData.email || '',
        phone:           formData.phone || '',
        business_name:   formData.businessName || '',
        category:        formData.category || 'Fashion & Clothing',
        has_gst:         !!formData.gstNumber,
        gst_number:      formData.gstNumber || '',
        role:            formData.role || 'seller',
        
        // KYC Data
        pan_number:      formData.panNumber || '',
        aadhaar_number:  formData.aadhaarNumber || '',
        bank_account:    formData.bankAccount || '',
        ifsc_code:       formData.ifscCode || '',
        kyc_documents:   formData.kycDocuments || [],
        state:           formData.state || '',
        business_state:  formData.state || '', // GST Compliance field
        
        status: 'pending',
      });
      if (error) throw error;
      toastSuccess('✅ Registration submitted! Our team will contact you within 24 hours.');
      setFormData({});
      localStorage.removeItem('byndio_seller_form');
      setFormStep(1);
    } catch (err: any) {
      toast('❌ ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'w-full p-3 border border-gray-200 rounded-xl text-[13px] outline-none focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/10 transition-all bg-gray-50 focus:bg-white';

  return (
    <div className="bg-[#F4F6F8]">

      {/* ══════════ HERO ══════════ */}
      <div className="relative overflow-hidden bg-[#0D47A1] text-white py-8 md:py-16 px-4 md:px-5">
        {/* Boutique Mesh Gradient Background */}
        <div className="absolute inset-0 opacity-40 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] rounded-full bg-blue-400 blur-[80px]" />
          <div className="absolute bottom-[5%] left-[-5%] w-[250px] h-[250px] rounded-full bg-indigo-500 blur-[70px]" />
          <div className="absolute top-[20%] left-[30%] w-[150px] h-[150px] rounded-full bg-cyan-300 blur-[60px] opacity-30" />
        </div>

        <div className="max-w-6xl mx-auto relative z-10 flex flex-col items-start">
          {/* Sizing Pill */}
          <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/20 text-[8px] md:text-[10px] font-black px-2 py-0.5 rounded-full mb-3 uppercase tracking-[0.1em] text-blue-50">
            <ShieldCheck size={10} className="text-blue-300"/> Pan-India Verified Seller Ecosystem
          </span>

          <h1 className="text-[20px] md:text-[42px] font-black leading-[1.1] mb-2.5 max-w-[650px] tracking-tight">
            Launch Your Store on BYNDIO — 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-400"> 0% Commission</span> Forever.
          </h1>
          
          <p className="text-[11px] md:text-[14px] text-blue-50/70 max-w-[450px] leading-relaxed mb-5 font-medium">
            India's most trusted social commerce directory. Join 50K+ sellers earning with zero technical knowledge and zero inventory risk.
          </p>

          {/* Boutique Stats Row */}
          <div className="flex gap-6 md:gap-10 border-t border-white/10 pt-4 mb-6 w-full max-w-[500px]">
            {[
              { v: '50K+', l: 'Sellers', i: <Users size={12}/> },
              { v: '0%', l: 'Commission', i: <TrendingUp size={12}/> },
              { v: '7 Days', l: 'Payouts', i: <Clock size={12}/> },
            ].map((s, i) => (
              <div key={i} className="flex flex-col gap-0">
                <div className="flex items-center gap-1">
                   <div className="text-blue-300 scale-75">{s.i}</div>
                   <div className="text-[14px] md:text-[22px] font-black tracking-tighter">{s.v}</div>
                </div>
                <div className="text-[8px] md:text-[10px] opacity-50 font-black uppercase tracking-widest leading-none">{s.l}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => document.getElementById('seller-reg-form')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex-1 sm:flex-none bg-[#F57C00] hover:bg-[#E65100] text-white px-5 py-2.5 rounded-full text-[12px] font-black transition-all shadow-xl shadow-orange-950/20 active:scale-95 flex items-center justify-center gap-1.5 group">
              🏪 Start Now <ArrowUpRight size={13} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"/>
            </button>
            <Link to="/seller-dashboard" className="flex-1 sm:flex-none bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/20 text-white px-5 py-2.5 rounded-full text-[12px] font-black transition-all shadow-lg active:scale-95 flex items-center justify-center gap-1.5">
              📊 Dashboard
            </Link>
          </div>

          <div className="mt-5 flex items-center justify-between md:justify-start gap-3 md:gap-6 py-2 border-y border-white/5 w-full max-w-[500px]">
            {['No Commission', 'Instant KYC', 'Bank Encrypted'].map(t => (
              <div key={t} className="flex items-center gap-1 text-[8px] font-black text-blue-200/50 uppercase tracking-widest whitespace-nowrap">
                <CheckCircle size={9}/> {t}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════ TRUST BADGES ══════════ */}
      <div className="bg-white border-b border-gray-100 py-5">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {TRUST_BADGES.map((b, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl text-center" style={{ backgroundColor: b.bg }}>
                <span className="text-2xl">{b.icon}</span>
                <span className="text-[10px] font-black leading-tight" style={{ color: b.color }}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-6 pb-2 flex flex-col gap-5">

        {/* ══════════ HOW IT WORKS ══════════ */}
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[14px] md:text-[17px] font-black text-gray-900 leading-none mb-1">🚀 Get Started</h2>
              <p className="text-[10px] md:text-[12px] text-gray-400 font-bold uppercase tracking-wider">4 Simple Steps to Sell</p>
            </div>
            <div className="hidden md:flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded-full border border-blue-100">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
              <span className="text-[9px] font-black text-blue-600 uppercase">Live Demo</span>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4 relative">
            {/* Visual connector line for mobile */}
            <div className="md:hidden absolute top-1/2 left-0 right-0 h-px bg-gray-100 -translate-y-1/2 pointer-events-none" />
            <div className="md:hidden absolute left-1/2 top-0 bottom-0 w-px bg-gray-100 -translate-x-1/2 pointer-events-none" />

            {HOW_IT_WORKS.map((s, i) => (
              <div key={i} className="relative p-3.5 rounded-xl bg-gray-50/50 border border-gray-100 hover:border-[#1565C0] transition-all flex flex-col items-center text-center">
                <div className="absolute -top-1.5 -left-1.5 w-[18px] h-[18px] rounded-full bg-[#0D47A1] text-white text-[8px] font-black flex items-center justify-center shadow-md ring-2 ring-white z-10">
                  {s.step}
                </div>
                <div className="text-2xl mb-2 filter drop-shadow-sm">{s.emoji}</div>
                <div className="text-[11px] md:text-[13px] font-black text-gray-900 mb-0.5 leading-none">{s.title}</div>
                <div className="text-[9px] md:text-[11px] text-gray-400 font-medium leading-tight line-clamp-2">{s.desc}</div>
                
                {/* Desktop Arrows */}
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 text-gray-200 text-xl font-black z-10">→</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ══════════ WHY SELLERS TRUST US ══════════ */}
        <div className="bg-gradient-to-br from-[#0D47A1] to-[#1565C0] rounded-2xl p-4 md:p-6 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="mb-4">
            <h2 className="text-[14px] md:text-[17px] font-black leading-none mb-1">💙 Why Trust BYNDIO</h2>
            <p className="text-[10px] md:text-[12px] opacity-60 font-bold uppercase tracking-widest leading-none">The Seller Advantage</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
            {WHY_TRUST.map((w, i) => (
              <div key={i} className="bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/10 rounded-xl p-3 md:p-4 transition-all hover:scale-[1.02] flex flex-col items-start text-left">
                <div className="text-[#FFCA28] bg-white/10 p-1.5 rounded-lg mb-2 shadow-sm">
                  {React.cloneElement(w.icon as React.ReactElement, { size: 14, strokeWidth: 2.5 } as any)}
                </div>
                <div className="text-[11px] md:text-[13px] font-black mb-0.5 leading-tight tracking-tight">{w.title}</div>
                <div className="text-[9px] md:text-[11px] opacity-60 leading-tight font-medium line-clamp-2">{w.desc}</div>
              </div>
            ))}
          </div>
        </div>

          {/* ══════════ SUBSCRIPTION PLANS ══════════ */}
          <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[14px] md:text-[17px] font-black text-gray-900 leading-none mb-1 uppercase tracking-tight">📋 Choose Your Plan</h2>
                <p className="text-[10px] md:text-[12px] text-gray-400 font-bold uppercase tracking-wider">0% Commission on All Plans</p>
              </div>
            </div>

            <div className="overflow-hidden -mx-4 px-4" ref={emblaRef}>
              <div className="flex md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-4 pb-2 pt-4">
                {PLANS.map((plan, i) => (
                  <div key={i} className={`flex-[0_0_85%] md:flex-auto md:w-auto relative rounded-2xl p-4 md:p-5 flex flex-col gap-3 border transition-all ${plan.highlight ? 'border-[#0D47A1] bg-[#EEF2FF]/50 border-2 shadow-sm' : 'border-gray-100 bg-gray-50/30'}`}>
                    {plan.highlight && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#F57C00] text-white text-[8px] md:text-[9px] font-black px-3 py-1 rounded-full whitespace-nowrap shadow-md uppercase tracking-widest z-10 border-2 border-white">
                        ⭐ Best Value
                      </div>
                    )}
                    <div className="flex flex-col gap-1 min-h-[32px]">
                      {plan.tag && (
                        <span className="text-[8px] md:text-[10px] font-black px-2 py-0.5 rounded-full w-fit uppercase tracking-wider" style={{ color: plan.tagColor, background: plan.tagBg }}>{plan.tag}</span>
                      )}
                      <div className="text-[14px] md:text-[16px] font-black text-gray-900">{plan.name}</div>
                    </div>

                    <div className="flex items-baseline gap-1">
                       <div className="text-[22px] md:text-[26px] font-black text-[#1565C0] leading-none">{plan.price}</div>
                       {plan.price !== 'Custom' && <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">/ mo</span>}
                    </div>

                    <div className="flex-1 space-y-1.5 pt-1 border-t border-gray-200/50">
                      {plan.features.slice(0, 5).map((f, j) => (
                        <div key={j} className="flex items-start gap-1.5 text-[10px] md:text-[12px] text-gray-600 leading-tight">
                          <CheckCircle size={10} className="text-[#388E3C] shrink-0 mt-0.5"/>
                          <span className="line-clamp-1">{f}</span>
                        </div>
                      ))}
                      {plan.features.length > 5 && (
                        <div className="text-[8px] font-black text-blue-600 uppercase tracking-widest pl-4">+ {plan.features.length - 5} Features</div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        if (!user) {
                          document.getElementById('seller-reg-form')?.scrollIntoView({ behavior: 'smooth' });
                          return;
                        }
                        navigate('/pricing?role=seller');
                      }}
                      className={`w-full py-2.5 rounded-xl text-[9.5px] md:text-[12px] font-black transition-all hover:scale-[1.02] border-2 uppercase tracking-wider ${plan.ctaStyle}`}>
                      {plan.cta}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          
          {/* Mobile Clickable Pagination Dots */}
          <div className="flex md:hidden justify-center gap-1.5 mt-2">
            {scrollSnaps.map((_, i) => (
              <button key={i} onClick={() => scrollTo(i)} 
                className={`transition-all duration-300 rounded-full ${selectedIndex === i ? 'w-4 h-1 bg-[#1565C0]' : 'w-1.5 h-1 bg-gray-200'}`} />
            ))}
          </div>
        </div>

        {/* ══════════ COMMISSION SIMULATOR ══════════ */}
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[14px] md:text-[17px] font-black text-gray-900 leading-none mb-1">💰 Profit Calculator</h2>
              <p className="text-[10px] md:text-[12px] text-gray-400 font-bold uppercase tracking-wider">See Your Real Earnings</p>
            </div>
          </div>

          <div className="bg-gray-50/50 rounded-2xl p-4 md:p-5 border border-gray-100">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none">Monthly Sales Revenue</label>
                <span className="text-[16px] md:text-[20px] font-black text-[#1565C0]">₹{revenue.toLocaleString('en-IN')}</span>
              </div>
              <input type="range" min="10000" max="500000" step="5000" value={revenue}
                onChange={e => setRevenue(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#1565C0] transition-all hover:h-2" />
            </div>

            <div className="overflow-hidden -mx-4 px-4" ref={profRef}>
              <div className="flex gap-3 pb-2">
                {[
                  { name:'Amazon India', pct:'8–15%', keep:0.88, color: '#FF9900' },
                  { name:'Flipkart',     pct:'5–12%', keep:0.91, color: '#2874F0' },
                  { name:'Meesho',       pct:'1.8%',  keep:0.982, color: '#F43397' },
                  { name:'BYNDIO',       pct:'0%',    keep:1.00,  color: '#388E3C', isBest: true },
                ].map(r => (
                  <div key={r.name} className={`flex-none w-[190px] p-3.5 rounded-2xl border transition-all ${r.isBest ? 'bg-[#E8F5E9] border-[#4CAF50]/30 shadow-sm' : 'bg-white border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.03)]'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-black text-gray-900 tracking-tight">{r.name}</span>
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${r.isBest ? 'bg-[#388E3C] text-white' : 'bg-gray-100 text-gray-500'}`}>{r.pct} Fee</span>
                    </div>
                    
                    <div className="space-y-2.5">
                      <div>
                        <div className="text-[8px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">Total Payout</div>
                        <div className={`text-[15px] font-black tracking-tighter ${r.isBest ? 'text-[#1B5E20]' : 'text-gray-900'}`}>₹{Math.round(revenue * r.keep).toLocaleString('en-IN')}</div>
                      </div>
                      
                      <div className="pt-2 border-t border-gray-100">
                        <div className="text-[8px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">{r.isBest ? 'Savings' : 'Lost to Fee'}</div>
                        <div className={`text-[12px] font-black tracking-tight ${r.isBest ? 'text-[#388E3C]' : 'text-red-500'}`}>
                          {r.isBest ? `+₹${Math.round(revenue * 0.12).toLocaleString('en-IN')}*` : `-₹${Math.round(revenue * (1 - r.keep)).toLocaleString('en-IN')}`}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile Clickable Pagination Dots */}
            <div className="flex md:hidden justify-center gap-1.5 mt-2">
              {profSnaps.map((_, i) => (
                <button key={i} onClick={() => profScrollTo(i)} 
                  className={`transition-all duration-300 rounded-full ${profIdx === i ? 'w-4 h-1 bg-[#1565C0]' : 'w-1.5 h-1 bg-gray-200'}`} />
              ))}
            </div>
            
            <div className="mt-4 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-[8px] text-gray-400 font-black uppercase tracking-widest justify-center">
                 <div className="w-1.5 h-1.5 bg-[#388E3C] rounded-full" /> *Potential savings compared to Amazon/Flipkart
              </div>
              <p className="text-[8px] text-gray-400 text-center opacity-60">Calculations based on standard category commission averages.</p>
            </div>
          </div>
        </div>

        {/* ══════════ AFFILIATE SYSTEM ══════════ */}
        <div className="bg-gradient-to-r from-[#7B1FA2] to-[#6A1B9A] rounded-2xl p-4 md:p-6 text-white overflow-hidden">
          <div className="mb-4">
            <h2 className="text-[14px] md:text-[17px] font-black leading-none mb-1">⭐ Affiliate & Creator System</h2>
            <p className="text-[10px] md:text-[12px] opacity-60 font-bold uppercase tracking-widest leading-none">20,000+ Creators Promoting You</p>
          </div>

          <div className="overflow-hidden -mx-4 px-4" ref={affRef}>
            <div className="flex gap-3">
              {[
                { step: '1', title: 'Set Commission', desc: 'You decide what % affiliates earn (e.g. 5–15%).' },
                { step: '2', title: 'Creators Share',  desc: 'Influencers share your products with their fans.' },
                { step: '3', title: 'You Get Sales',    desc: 'Orders roll in. Affiliates earn. You profit.' },
              ].map((s, i) => (
                <div key={i} className="flex-none w-[170px] bg-white/10 backdrop-blur-md border border-white/10 rounded-xl p-3.5">
                  <div className="w-5 h-5 bg-[#FFCA28] text-[#7B1FA2] rounded-full text-[9px] font-black flex items-center justify-center mb-2 shadow-sm">{s.step}</div>
                  <div className="text-[11px] font-black mb-1 leading-tight">{s.title}</div>
                  <div className="text-[9px] opacity-70 leading-tight font-medium line-clamp-2">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex md:hidden justify-center gap-1.5 mt-3">
            {affSnaps.map((_, i) => (
              <button key={i} onClick={() => affApi?.scrollTo(i)} 
                className={`transition-all duration-300 rounded-full ${affIdx === i ? 'w-4 h-1 bg-white' : 'w-1.5 h-1 bg-white/30'}`} />
            ))}
          </div>
        </div>

        {/* ══════════ RTO CHARGES ══════════ */}
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
          <div className="mb-4">
            <h2 className="text-[14px] md:text-[17px] font-black text-gray-900 leading-none mb-1">🚚 RTO & Shipping Rules</h2>
            <p className="text-[10px] md:text-[12px] text-gray-400 font-bold uppercase tracking-wider">Understand The Fine Print</p>
          </div>

          <div className="overflow-hidden -mx-4 px-4" ref={rtoRef}>
            <div className="flex gap-3 pb-1">
              {[
                { title: 'When RTO Happens',  color:'#1565C0', items:['Customer rejects','Delivery failed','Wrong address','Unavailable'] },
                { title: 'With GST Seller',   color:'#1B5E20', items:['Pan-India sales','RTO fees (both)','Prime courier rates','Low RTO score'] },
              ].map((c, i) => (
                <div key={i} className="flex-none w-[160px] rounded-xl p-3.5 border" style={{ borderColor: c.color + '20', background: c.color + '05' }}>
                  <div className="text-[11px] font-black mb-2" style={{ color: c.color }}>{c.title}</div>
                  {c.items.map(item => (
                    <div key={item} className="flex items-start gap-1 text-[9px] text-gray-600 mb-1 leading-none">
                      <span style={{ color: c.color }} className="font-bold">•</span> {item}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex md:hidden justify-center gap-1.5 mt-1 mb-2">
            {rtosnaps.map((_, i) => (
              <button key={i} onClick={() => rtoApi?.scrollTo(i)} 
                className={`transition-all duration-300 rounded-full ${rtoIdx === i ? 'w-4 h-1 bg-[#1565C0]' : 'w-1.5 h-1 bg-gray-200'}`} />
            ))}
          </div>
          <div className="bg-[#FFF8E1]/50 border border-[#FFB300]/20 rounded-xl p-2.5 flex gap-2 text-[10px] text-[#795548]">
            <Info size={12} className="text-[#F57C00] shrink-0 mt-0.5"/>
            <div>💡 <strong>Risk Meter</strong> is available in your dashboard: Low / Medium / High based on success.</div>
          </div>
        </div>

        {/* ══════════ RETURN & REFUND POLICY ══════════ */}
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
          <div className="mb-4">
            <h2 className="text-[14px] md:text-[17px] font-black text-gray-900 leading-none mb-1">⚖️ Returns & Refunds</h2>
            <p className="text-[10px] md:text-[12px] text-gray-400 font-bold uppercase tracking-wider">Protecting Sellers & Buyers</p>
          </div>

          <div className="overflow-hidden -mx-4 px-4" ref={polRef}>
            <div className="flex gap-3">
              <div className="flex-none w-[190px] bg-[#E8F5E9]/60 rounded-xl p-3.5 border border-green-100">
                <div className="text-[11px] font-black text-[#1B5E20] mb-2 leading-none uppercase tracking-tight">✅ ALLOWED (7D)</div>
                {['Damaged product','Wrong item sent','Quality issue','Not as described'].map(t => (
                  <div key={t} className="flex items-center gap-1.5 text-[9px] text-gray-700 mb-1 leading-none"><CheckCircle size={9} className="text-[#388E3C] shrink-0"/>{t}</div>
                ))}
              </div>
              <div className="flex-none w-[190px] bg-[#FCE4EC]/60 rounded-xl p-3.5 border border-pink-100">
                <div className="text-[11px] font-black text-[#C2185B] mb-2 leading-none uppercase tracking-tight">❌ NON-RETURNABLE</div>
                {['Used products','Customer damage','Customized items','Hygiene products'].map(t => (
                  <div key={t} className="flex items-center gap-1.5 text-[9px] text-gray-700 mb-1 leading-none"><span className="text-[#C2185B] font-black shrink-0 text-[8px]">✗</span>{t}</div>
                ))}
              </div>
              <div className="flex-none w-[190px] bg-[#E3F2FD]/60 rounded-xl p-3.5 border border-blue-100">
                <div className="text-[11px] font-black text-[#1565C0] mb-2 leading-none uppercase tracking-tight">💸 REFUND STEPS</div>
                {['Pickup verified','Quality check done','Refund initiated','3–5 business days'].map(t => (
                  <div key={t} className="flex items-center gap-1.5 text-[9px] text-gray-700 mb-1 leading-none"><span className="text-[#1565C0] font-black shrink-0 text-[8px]">→</span>{t}</div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex md:hidden justify-center gap-1.5 mt-2">
            {polSnaps.map((_, i) => (
              <button key={i} onClick={() => polScrollTo(i)} 
                className={`transition-all duration-300 rounded-full ${polIdx === i ? 'w-4 h-1 bg-[#1565C0]' : 'w-1.5 h-1 bg-gray-200'}`} />
            ))}
          </div>
        </div>

        {/* ══════════ SELLER RESPONSIBILITIES ══════════ */}
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
          <div className="mb-4">
            <h2 className="text-[14px] md:text-[17px] font-black text-gray-900 leading-none mb-1">📝 Seller Rules</h2>
            <p className="text-[10px] md:text-[12px] text-gray-400 font-bold uppercase tracking-wider">Your Responsibilities</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {[
              ['Correct details & images','Proper packaging'],
              ['Prompt shipping','Dispatch verification'],
              ['Valid returns only','GST compliance'],
            ].flat().map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] text-gray-700 bg-gray-50/50 rounded-lg px-2.5 py-1.5 border border-gray-100/50">
                <CheckCircle size={10} className="text-[#1565C0] shrink-0"/>
                <span className="font-medium tracking-tight">{r}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 bg-[#E3F2FD]/50 border border-[#1565C0]/10 rounded-xl p-2.5 flex gap-2 text-[9px] text-[#1565C0]">
            <Info size={11} className="shrink-0 mt-0.5"/>
            <div className="leading-tight font-medium"><strong>Verification Required:</strong> Submit an image/video of the product before dispatch. This protects your payout from fraudulent returns.</div>
          </div>
        </div>

        {/* ══════════ SELLER ACADEMY ══════════ */}
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
          <div className="mb-4 text-center md:text-left">
            <h2 className="text-[14px] md:text-[17px] font-black text-gray-900 leading-none mb-1 uppercase tracking-tight">🎓 Seller Academy</h2>
            <p className="text-[10px] md:text-[12px] text-gray-400 font-bold uppercase tracking-wider">Master The Marketplace</p>
          </div>

          <div className="overflow-hidden -mx-4 px-4" ref={courseRef}>
            <div className="flex gap-3">
              {TRAINING.map((t, i) => (
                <div key={i} className="flex-none w-[170px] bg-gray-50/50 rounded-xl p-3.5 border border-gray-100 flex flex-col gap-2">
                   <div className="text-[28px] mb-1">{t.emoji}</div>
                   <div className="text-[11px] font-black text-gray-900 leading-tight line-clamp-2 min-h-[32px]">{t.title}</div>
                   <div className="flex items-center gap-1.5 text-[8px] text-gray-400 font-bold uppercase tracking-widest leading-none">
                      <Clock size={8}/> {t.duration} • {t.level}
                   </div>
                   <div className="flex items-center justify-between">
                     <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest ${t.price === 'FREE' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{t.price}</span>
                     <span className="text-[8px] font-black text-blue-600 bg-white px-2 py-0.5 rounded-lg border border-blue-50">VIEW</span>
                   </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex md:hidden justify-center gap-1.5 mt-3">
            {courseSnaps.map((_, i) => (
              <button key={i} onClick={() => courseApi?.scrollTo(i)} 
                className={`transition-all duration-300 rounded-full ${courseIdx === i ? 'w-4 h-1 bg-[#1565C0]' : 'w-1.5 h-1 bg-gray-200'}`} />
            ))}
          </div>
          
          <div className="mt-4 bg-[#f8f9fa] rounded-2xl p-3 border border-dashed border-gray-300 flex items-center gap-3">
             <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-[18px] shrink-0">📽️</div>
             <div className="flex-1">
                <div className="text-[11px] font-black text-gray-900 leading-tight">Onboarding Masterclass</div>
                <div className="text-[8px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-0.5">5-Min step-by-step video guide coming soon.</div>
             </div>
             <div className="text-[8px] font-black text-blue-600 bg-white px-2 py-1 rounded-lg border border-blue-50">SOON</div>
          </div>
        </div>

        {/* ══════════ SUPPORT SECTION ══════════ */}
        <div className="bg-gradient-to-br from-[#1B5E20] to-[#2E7D32] rounded-2xl p-4 md:p-6 text-white overflow-hidden relative shadow-lg shadow-green-950/20">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="mb-4 text-center md:text-left relative z-10">
            <h2 className="text-[14px] md:text-[17px] font-black leading-none mb-1 uppercase tracking-tight italic">🤝 We Build Partners</h2>
            <p className="text-[10px] md:text-[12px] opacity-60 font-bold uppercase tracking-widest leading-none">24/7 Dedicated Support</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 relative z-10">
            {[
              { icon: <Zap size={13}/>,     title: 'WhatsApp', sub:'Instant Help', color:'#25D366' },
              { icon: <Mail size={13}/>,    title: 'Email',    sub:'Case Support', color:'#fff' },
              { icon: <ArrowUpRight size={13}/>, title: 'Telegram', sub:'Growth Hub',  color:'#0088cc' },
            ].map((s, i) => (
              <button key={i} className="bg-white/10 backdrop-blur-md border border-white/10 rounded-xl p-2.5 flex items-center gap-2 transition-all hover:bg-white/20 active:scale-95 group">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center shadow-md bg-white/20 group-hover:scale-110 transition-transform" style={{ color: s.color }}>{s.icon}</div>
                <div className="text-left">
                  <div className="text-[10px] font-black leading-none mb-0.5">{s.title}</div>
                  <div className="text-[7px] opacity-60 font-black uppercase tracking-widest">{s.sub}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {['Product Help','Growth Tips','Listing Aid','Payout Support'].map(t => (
              <div key={t} className="bg-white/10 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest border border-white/5">{t}</div>
            ))}
          </div>
        </div>

        {/* ══════════ FAQ ══════════ */}
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
          <div className="mb-4 text-center md:text-left">
            <h2 className="text-[14px] md:text-[17px] font-black text-gray-900 leading-none mb-1 uppercase tracking-tight">❓ Help Center</h2>
            <p className="text-[10px] md:text-[12px] text-gray-400 font-bold uppercase tracking-wider">Quick Answers For Sellers</p>
          </div>
          <div className="space-y-1.5">
            {FAQS.map((faq, i) => (
              <div key={i} className="border border-gray-100 rounded-xl overflow-hidden bg-gray-50/30">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-white transition-all">
                  <span className="text-[11px] font-black text-gray-800 pr-3 leading-tight">{faq.q}</span>
                  {openFaq === i ? <ChevronUp size={12} className="text-[#1565C0] shrink-0"/> : <ChevronDown size={12} className="text-gray-400 shrink-0"/>}
                </button>
                {openFaq === i && (
                  <div className="px-3 pb-3 text-[10px] text-gray-500 font-medium leading-relaxed border-t border-gray-50 pt-2 animate-in slide-in-from-top-1 duration-200">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ══════════ REGISTRATION FORM ══════════ */}
        <div id="seller-reg-form" className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          {/* Progress */}
          <div className="flex items-center gap-2 mb-5">
            {['Basic Info','Business','KYC','Agreement'].map((s, i) => (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full text-[11px] font-black flex items-center justify-center shrink-0 ${formStep > i ? 'bg-[#1565C0] text-white' : formStep === i + 1 ? 'bg-[#1565C0] text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {formStep > i + 1 ? '✓' : i + 1}
                </div>
                <div className="flex-1">
                  <div className={`text-[10px] font-black ${formStep === i + 1 ? 'text-[#1565C0]' : 'text-gray-400'}`}>{s}</div>
                  {i < 3 && <div className={`h-0.5 mt-1 rounded-full transition-all ${formStep > i + 1 ? 'bg-[#1565C0]' : 'bg-gray-200'}`}/>}
                </div>
              </div>
            ))}
          </div>

          <div className="mb-4 text-center md:text-left">
            <h2 className="text-[14px] md:text-[18px] font-black text-[#0D47A1] leading-none mb-1 uppercase tracking-tight">🏪 Seller Onboarding</h2>
            <p className="text-[9px] md:text-[11px] text-gray-400 font-bold uppercase tracking-widest leading-none">Verified • 100% Secure • 24h Approval</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-2">
            {/* Step 1 */}
            {formStep === 1 && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Full Name"><input type="text" name="fullName" value={formData.fullName || ''} onChange={handleInputChange} placeholder="Legal name" className={`${inputCls} py-2 text-[11px] h-9`} required /></Field>
                  <Field label="Mobile"><input type="tel" name="phone" value={formData.phone || ''} onChange={handleInputChange} placeholder="+91..." className={`${inputCls} py-2 text-[11px] h-9`} required /></Field>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Email Address"><input type="email" name="email" value={formData.email || ''} onChange={handleInputChange} placeholder="you@example.com" className={`${inputCls} py-2 text-[11px] h-9`} required /></Field>
                  <Field label="Join As">
                    <select name="role" value={formData.role || 'seller'} onChange={handleInputChange} className={`${inputCls} py-2 text-[11px] h-9`} required>
                      <option value="seller">Product Seller</option>
                      <option value="influencer">Influencer / Creator</option>
                    </select>
                  </Field>
                </div>
                  <Field label="Business State">
                    <select name="state" value={formData.state || ''} onChange={handleInputChange} className={`${inputCls} py-2 text-[11px] h-9`} required>
                      <option value="">Select State</option>
                      {INDIAN_STATES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </Field>
                <button type="button" onClick={() => setFormStep(2)} className="w-full bg-[#0D47A1] hover:bg-[#1565C0] text-white py-2.5 rounded-xl text-[11px] font-black transition-all shadow-md uppercase tracking-widest mt-2">Next: Business →</button>
                <button type="button" onClick={handleSaveForLater} className="w-full mt-1 text-gray-400 text-[9px] font-black uppercase tracking-widest hover:text-gray-600 flex items-center justify-center gap-1.5"><Clock size={10}/> Save Progress</button>
              </div>
            )}

            {/* Step 2 */}
            {formStep === 2 && (
              <div className="space-y-2">
                <div className="grid grid-cols-1 gap-2">
                  <Field label="Store Name"><input type="text" name="businessName" value={formData.businessName || ''} onChange={handleInputChange} placeholder="Your brand name" className={`${inputCls} py-2 text-[11px] h-9`} required /></Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Category">
                      <select name="category" value={formData.category || ''} onChange={handleInputChange} className={`${inputCls} py-2 text-[11px] h-9`} required>
                        {['Fashion','Beauty','Home','Kitchen','Gadgets','Toys','Wellness'].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field label="GST Number (Optional)">
                    <div className="space-y-1">
                      <input type="text" name="gstNumber" value={formData.gstNumber || ''} onChange={handleInputChange} placeholder="Optional (Required for All-India Shipping)" className={`${inputCls} py-2 text-[11px] h-9`} />
                      {!formData.gstNumber && <p className="text-[8px] text-orange-500 font-bold uppercase">⚠️ Missing GST restricts you to selling within {formData.state || 'your state'}.</p>}
                    </div>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button type="button" onClick={() => setFormStep(1)} className="bg-gray-100 text-gray-600 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest">Back</button>
                  <button type="button" onClick={() => setFormStep(3)} className="bg-[#0D47A1] text-white py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest">Next: KYC</button>
                </div>
              </div>
            )}

            {/* Step 3 */}
            {formStep === 3 && (
              <div className="space-y-2">
                <div className="bg-[#E3F2FD]/50 rounded-xl p-3 border border-[#0D47A1]/10 flex gap-2 text-[10px] text-[#0D47A1]">
                    <ShieldCheck size={14} className="shrink-0 mt-0.5"/>
                    <div className="leading-tight"><strong>KYC Required:</strong> Indian law requires verification for payout security. Data is 256-bit encrypted.</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="PAN Number"><input type="text" name="panNumber" value={formData.panNumber || ''} onChange={handleInputChange} placeholder="ABCDE..." className={`${inputCls} py-2 text-[11px] h-9`} required /></Field>
                  <Field label="Aadhaar"><input type="text" name="aadhaarNumber" value={formData.aadhaarNumber || ''} onChange={handleInputChange} placeholder="0000..." className={`${inputCls} py-2 text-[11px] h-9`} required /></Field>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Field label="Bank Account"><input type="text" name="bankAccount" value={formData.bankAccount || ''} onChange={handleInputChange} placeholder="Account Number" className={`${inputCls} py-2 text-[11px] h-9`} required /></Field>
                  <Field label="IFSC Code"><input type="text" name="ifscCode" value={formData.ifscCode || ''} onChange={handleInputChange} placeholder="SBIN..." className={`${inputCls} py-2 text-[11px] h-9`} required /></Field>
                </div>
                <div className="space-y-1 mt-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Upload Documents (PAN / GST)</label>
                  <div className="flex flex-col gap-2">
                    <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileUpload} className="hidden" id="seller-docs-upload" />
                    <label htmlFor="seller-docs-upload" className="w-full border border-dashed border-gray-300 rounded-lg p-3 text-center cursor-pointer hover:bg-gray-50 flex items-center justify-center gap-2 transition-all">
                      <Upload size={14} className="text-gray-400"/>
                      <span className="text-[11px] font-bold text-gray-500">Click to upload scans</span>
                    </label>
                    {formData.kycDocuments && formData.kycDocuments.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.kycDocuments.map((url: string, idx: number) => (
                          <div key={idx} className="relative w-12 h-12 bg-gray-100 rounded border border-gray-200 overflow-hidden group">
                            {url.toLowerCase().endsWith('.pdf') ? <div className="text-[8px] font-black text-center mt-4">PDF</div> : <img src={url} className="w-full h-full object-cover" />}
                            <button type="button" onClick={() => setFormData((prev: any) => ({ ...prev, kycDocuments: prev.kycDocuments.filter((_: any, i: number) => i !== idx) }))} className="absolute top-0 right-0 bg-red-500 text-white p-0.5 opacity-0 group-hover:opacity-100"><X size={8}/></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button type="button" onClick={() => setFormStep(2)} className="bg-gray-100 text-gray-600 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest">Back</button>
                  <button type="button" onClick={() => setFormStep(4)} className="bg-[#0D47A1] text-white py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest">Next: Sign</button>
                </div>
              </div>
            )}

            {/* Step 4 */}
            {formStep === 4 && (
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-[9px] text-gray-500 leading-tight max-h-24 overflow-y-auto font-medium">
                  <p className="font-black text-gray-800 mb-1 uppercase tracking-tight">📜 Seller Agreement Summary</p>
                  You agree to: (1) Provide accurate info, (2) Fulfill orders fast, (3) Follow BYNDIO returns, (4) Comply with GST laws, (5) No fraud. We may suspend for violations. Full terms at byndio.in/legal.
                </div>

                <label className="flex items-start gap-2 cursor-pointer bg-blue-50/30 p-2 rounded-lg border border-blue-100/50">
                  <input type="checkbox" checked={agreedTerms} onChange={e => setAgreedTerms(e.target.checked)} className="mt-0.5 accent-[#0D47A1] shrink-0 w-3.5 h-3.5"/>
                  <span className="text-[10px] text-gray-700 leading-tight font-medium">
                    I agree to the <Link to="/legal/terms" target="_blank" className="text-[#1565C0] font-black hover:underline">Seller Agreement</Link> and <Link to="/legal/terms" target="_blank" className="text-[#1565C0] font-black hover:underline">Terms of Use</Link>.
                  </span>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setFormStep(3)} className="bg-gray-100 text-gray-600 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest">Back</button>
                  <button type="submit" disabled={submitting || !agreedTerms}
                    className="bg-[#0D47A1] text-white py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-900/10">
                    {submitting ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/> Processing...</> : '🚀 Submit Now'}
                  </button>
                </div>

                <p className="text-center text-[8px] text-gray-400 font-bold uppercase tracking-widest">🔒 Encrypted · Secure · No Spam</p>
              </div>
            )}
          </form>
        </div>

        {/* ══════════ FINAL SOCIAL PROOF ══════════ */}
        <div className="bg-gradient-to-br from-[#0D47A1] to-[#041e42] rounded-2xl p-5 md:p-8 text-white relative overflow-hidden text-center mb-0 shadow-2xl shadow-blue-950/40 border border-white/5 mx-[-8px] rounded-b-none">
          <div className="absolute top-0 left-0 w-32 h-32 bg-blue-400/10 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full blur-3xl translate-y-1/2 translate-x-1/2" />
          
          <h2 className="text-[18px] md:text-[24px] font-black leading-tight mb-2 tracking-tighter">Ready to Build Your Empire? 🇮🇳</h2>
          <p className="text-[10px] md:text-[14px] opacity-50 font-medium mb-6 px-6">Join 500+ successful sellers and 20,000+ creator partners powering the next generation of Indian e-commerce.</p>
          
          <div className="grid grid-cols-4 gap-1.5 mb-5 max-w-sm mx-auto">
            {[ ['500+','Sellers'], ['20K+','Partners'], ['0%','Fee'], ['₹0','Entry'] ].map(([v,l]) => (
              <div key={l} className="bg-white/5 backdrop-blur-sm rounded-xl p-2 border border-white/5">
                <div className="text-[12px] font-black leading-none mb-1 tracking-tight">{v}</div>
                <div className="text-[6px] opacity-40 uppercase font-black tracking-widest">{l}</div>
              </div>
            ))}
          </div>

          <button 
             onClick={() => document.getElementById('seller-reg-form')?.scrollIntoView({ behavior: 'smooth' })}
             className="w-full md:w-auto bg-white text-[#0D47A1] px-10 py-3 rounded-xl text-[12px] md:text-[14px] font-black shadow-xl hover:bg-gray-50 transition-all uppercase tracking-widest active:scale-95 group flex items-center justify-center gap-2 mx-auto">
             🏪 Launch Shop <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform"/>
          </button>
        </div>

      </div>
    </div>
  );
}
