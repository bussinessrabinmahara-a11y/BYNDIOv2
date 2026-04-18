import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast, toastSuccess } from '../components/Toast';
import { useAppStore } from '../store';
import { supabase } from '../lib/supabase';
import { createRazorpayOrder } from '../lib/email';

type B2BTab = 'buyer' | 'supplier' | 'leads' | 'plans' | 'contracts';

export default function B2B() {
  const { user } = useAppStore();
  const [activeTab, setActiveTab] = useState<B2BTab>('buyer');
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  const handleSendOTP = async () => {
    if (!buyerForm.buyer_phone) { toast('Please enter phone number', 'error'); return; }
    setOtpError(null);
    try {
      const res = await fetch('/.netlify/functions/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: buyerForm.buyer_phone })
      });
      if (!res.ok) throw new Error('Failed to send OTP');
      setIsOtpSent(true);
      setOtpStep(true);
      toastSuccess('Verification code sent to ' + buyerForm.buyer_phone);
    } catch (err: any) {
      toast(err.message || 'Failed to send OTP', 'error');
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length < 4) { toast('Please enter a valid OTP', 'error'); return; }
    setIsVerifyingOtp(true);
    setOtpError(null);
    try {
      const res = await fetch('/.netlify/functions/verify-cod-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: buyerForm.buyer_phone, otp: otpCode })
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setIsOtpVerified(true);
        setOtpStep(false);
        toastSuccess('Mobile number verified!');
      } else {
        throw new Error(data.error || 'Invalid OTP');
      }
    } catch (err: any) {
      setOtpError(err.message);
      toast(err.message, 'error');
    } finally {
      setIsVerifyingOtp(false);
    }
  };
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [buyerForm, setBuyerForm] = useState({
    buyer_name: '', buyer_phone: '', buyer_email: '',
    company_name: '', gst_number: '',
    product_category: 'Fashion & Garments',
    product_description: '', quantity: '', budget: '',
    delivery_location: '', delivery_timeline: '1-2 weeks',
    advance_payment: 10,
  });
  const [supplierForm, setSupplierForm] = useState({
    business_name: '', contact_person: '', mobile: '', gst_number: '', email: '', location: '', category: '',
  });

  const handleBuyerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast('Please login to post a requirement', 'info');
      document.dispatchEvent(new CustomEvent('open-login'));
      return;
    }

    if (!isOtpVerified) {
      handleSendOTP();
      return;
    }

    setSubmitting(true);
    try {
      const fee = 10;
      const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
      
      if (!razorpayKeyId || !(window as any).Razorpay) {
        console.log('Razorpay not configured, proceeding with demo submission');
      } else {
        const order = await createRazorpayOrder(fee, user.id, `rfq_${Date.now()}`);
        if (!order) throw new Error('Failed to create validation order');

        const options = {
          key: razorpayKeyId,
          amount: fee * 100,
          currency: "INR",
          name: "BYNDIO B2B",
          description: "RFQ Validation Fee (Refundable)",
          order_id: order.id,
          handler: async (response: any) => {
            await finalizeRequirement(response.razorpay_payment_id);
          },
          modal: { ondismiss: () => setSubmitting(false) },
          theme: { color: "#1B5E20" }
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
        return;
      }

      await finalizeRequirement('demo_payment_id');
    } catch (err: any) {
      toast(err.message || 'Failed to submit. Please try again.', 'error');
      setSubmitting(false);
    }
  };

  const finalizeRequirement = async (paymentId: string) => {
    try {
      const { error } = await supabase.from('b2b_leads').insert({
        ...buyerForm,
        buyer_id: user?.id,
        lead_fee_paid: true,
        lead_fee_amount: 10,
        is_otp_verified: true,
        status: 'open',
        metadata: { payment_id: paymentId }
      });
      if (error) throw error;
      setSubmitted(true);
      toastSuccess('B2B Requirement Posted & Validated!');
    } catch (err: any) {
      toast(err.message || 'Save failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const plans = [
    { name: 'Basic', price: '₹2,999/month', leads: '20 verified leads', badge: '', color: 'border-gray-200', desc: 'Starting businesses' },
    { name: 'Silver', price: '₹6,999/month', leads: '60 verified leads', badge: 'Popular', color: 'border-[#1B5E20]', desc: 'Growing suppliers' },
    { name: 'Gold', price: '₹12,999/month', leads: '150 verified leads', badge: '★ Best Value', color: 'border-[#D4AF37]', desc: 'Large manufacturers' },
    { name: 'Premium', price: '₹19,999/month', leads: 'Unlimited + Featured', badge: 'Elite', color: 'border-[#0D47A1]', desc: 'Market leaders (Storefront included)' },
  ];

  return (
    <div className="bg-[#F5F5F5] min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#1B5E20] via-[#2E7D32] to-[#388E3C] text-white py-12 px-6 text-center">
        <div className="inline-block bg-white/15 border border-white/30 text-[#FF9800] text-xs font-extrabold px-4 py-1 rounded-full mb-4">
          🏢 BYNDIO B2B Supply Network
        </div>
        <h1 className="text-4xl font-black mb-3">India's Inventory-Free B2B Marketplace</h1>
        <p className="text-[15px] opacity-90 max-w-[600px] mx-auto mb-6">
          Buyers post requirements. Suppliers receive verified leads. BYNDIO never handles inventory — just connects you.
        </p>
        <div className="flex gap-4 justify-center flex-wrap mb-6">
          {[
            { val: '₹5,000', label: 'Min Order Value' },
            { val: '30–60%', label: 'Savings vs Retail' },
            { val: '50K+', label: 'Business Clients' },
            { val: '100%', label: 'GST Compliant' },
          ].map((s, i) => (
            <div key={i} className="bg-white/10 border-2 border-white/25 rounded-lg py-4 px-6 text-center min-w-[120px]">
              <span className="text-[24px] font-black block">{s.val}</span>
              <span className="text-xs opacity-85">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6 flex flex-col gap-5">

        {/* How it works */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="text-[16px] font-black mb-4">How BYNDIO B2B Works</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { step: '01', icon: '📝', title: 'Buyer Posts Requirement', desc: 'Fill category, quantity, budget, location. ₹10 validation fee ensures 100% genuine leads.' },
              { step: '02', icon: '🔍', title: 'System Matches Suppliers', desc: 'Lead automatically sent to relevant verified suppliers based on category and region.' },
              { step: '03', icon: '🤝', title: 'Supplier Directly Contacts', desc: 'Suppliers view your requirement and reach out with PDF quotes. Platform fee is only 2%.' },
            ].map((s, i) => (
              <div key={i} className="border border-gray-200 rounded-[10px] p-4">
                <div className="text-[11px] font-black text-[#1B5E20] opacity-50 mb-1">{s.step}</div>
                <div className="text-[26px] mb-2">{s.icon}</div>
                <div className="font-extrabold text-[14px] mb-1">{s.title}</div>
                <div className="text-[12px] text-gray-500 leading-relaxed">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 border-b border-gray-200">
          {([
            { id: 'buyer', label: '🛒 Post Requirement (Buyer)' },
            { id: 'supplier', label: '🏪 Register as Supplier' },
            { id: 'leads', label: '📋 Lead Inbox (Suppliers)' },
            { id: 'plans', label: '💳 Supplier Plans' },
            { id: 'contracts', label: '📝 Contracts' },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2.5 text-[13px] font-bold border-b-2 transition-colors ${activeTab === t.id ? 'text-[#1B5E20] border-[#1B5E20]' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Buyer requirement form */}
        {activeTab === 'buyer' && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h2 className="text-[16px] font-black text-[#1B5E20] mb-1.5">Post Your Buying Requirement</h2>
            <p className="text-[13px] text-gray-500 mb-5">We'll match you with 3–5 verified suppliers within minutes. OTP verification ensures your privacy.</p>
            {submitted ? (
              <div className="text-center py-10">
                <div className="text-5xl mb-3">🎉</div>
                <div className="font-black text-[18px] text-[#388E3C] mb-2">Requirement Posted Successfully!</div>
                <p className="text-gray-500 text-sm max-w-[400px] mx-auto mb-4">
                  Your lead has been released to verified suppliers. The ₹{buyerForm.advance_payment} advance payment is held securely in escrow until a supplier fulfills your request.
                </p>
                <div className="bg-[#E8F5E9] border border-[#388E3C]/30 text-[#1B5E20] px-4 py-3 rounded-lg text-xs font-bold inline-block mx-auto mb-6 shadow-sm">
                  🔒 Escrow Advance: ₹{buyerForm.advance_payment} Locked
                </div>
                <div>
                  <button onClick={() => { setSubmitted(false); setBuyerForm({ buyer_name: '', buyer_phone: '', buyer_email: '', company_name: '', gst_number: '', product_category: 'Fashion & Garments', product_description: '', quantity: '', budget: '', delivery_location: '', delivery_timeline: '1-2 weeks', advance_payment: 10 }); }}
                    className="bg-[#1B5E20] text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-[#2E7D32] transition-colors shadow-md hover:shadow-lg">
                    Post Another Requirement
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleBuyerSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-3.5">
                  {[
                    { label: 'Your Name *', field: 'buyer_name', type: 'text', placeholder: 'Full name' },
                    { label: 'Mobile / WhatsApp *', field: 'buyer_phone', type: 'tel', placeholder: '+91 98765 43210' },
                    { label: 'Email Address', field: 'buyer_email', type: 'email', placeholder: 'business@example.com' },
                    { label: 'Company / Business Name', field: 'company_name', type: 'text', placeholder: 'Your company (optional)' },
                  ].map(f => (
                    <div key={f.field} className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{f.label}</label>
                      <input type={f.type} required={f.label.includes('*')} placeholder={f.placeholder}
                        value={(buyerForm as any)[f.field]} onChange={e => setBuyerForm({ ...buyerForm, [f.field]: e.target.value })}
                        className="p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#1B5E20]" />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-3.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Product Category *</label>
                    <select value={buyerForm.product_category} onChange={e => setBuyerForm({ ...buyerForm, product_category: e.target.value })}
                      className="p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#1B5E20] bg-white">
                      {['Fashion & Garments', 'Electronics', 'Beauty & Personal Care', 'Home & Kitchen', 'Sports & Fitness', 'Kids & Baby', 'Raw Materials', 'Machinery', 'Food & Beverages', 'Other'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Quantity Required *</label>
                    <input type="text" required placeholder="e.g. 500 units, 100 kg" value={buyerForm.quantity}
                      onChange={e => setBuyerForm({ ...buyerForm, quantity: e.target.value })}
                      className="p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#1B5E20]" />
                  </div>
                </div>
                <div className="flex flex-col gap-1 mb-3.5">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Product Description *</label>
                  <textarea required rows={3} placeholder="Describe what you need in detail — material, specs, colour, design, etc."
                    value={buyerForm.product_description} onChange={e => setBuyerForm({ ...buyerForm, product_description: e.target.value })}
                    className="p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#1B5E20] resize-none" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Budget (Optional)</label>
                    <input type="text" placeholder="e.g. ₹50,000–₹1,00,000" value={buyerForm.budget}
                      onChange={e => setBuyerForm({ ...buyerForm, budget: e.target.value })}
                      className="p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#1B5E20]" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Delivery Location *</label>
                    <input type="text" required placeholder="City / State" value={buyerForm.delivery_location}
                      onChange={e => setBuyerForm({ ...buyerForm, delivery_location: e.target.value })}
                      className="p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#1B5E20]" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Delivery Timeline</label>
                    <select value={buyerForm.delivery_timeline} onChange={e => setBuyerForm({ ...buyerForm, delivery_timeline: e.target.value })}
                      className="p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#1B5E20] bg-white">
                      {['Within 1 week', '1-2 weeks', '2-4 weeks', '1-3 months', 'Flexible'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                {/* Advance Lead Fee Escrow Selector */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-5">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[12px] font-black text-gray-800 flex items-center gap-1.5">
                      🔒 Escrow Lead Fee
                      <span className="bg-[#E8F5E9] text-[#1B5E20] text-[9px] px-1.5 py-0.5 rounded-sm">Ensures 100% Genuine Suppliers</span>
                    </label>
                    <span className="font-black text-[#1B5E20]">₹{buyerForm.advance_payment}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mb-3 opacity-90 leading-tight">Pay a small advance to prove you're a serious buyer. This money acts as an escrow fee and will be deducted from your final order amount or refunded if no supplier is matched.</p>
                  
                  <div className="flex gap-2">
                    {[10, 20, 50].map((amt) => (
                      <button
                        type="button"
                        key={amt}
                        onClick={() => setBuyerForm({ ...buyerForm, advance_payment: amt })}
                        className={`flex-1 py-1.5 rounded-md text-[13px] font-bold transition-all border ${
                          buyerForm.advance_payment === amt
                            ? 'bg-[#1B5E20] text-white border-[#1B5E20]'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={submitting}
                  className="w-full bg-[#1B5E20] hover:bg-[#2E7D32] disabled:bg-gray-400 text-white border-none p-3 rounded-md text-[15px] font-bold transition-colors flex items-center justify-center gap-2">
                  {submitting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting...</> : '🏢 Post Requirement & Match Suppliers'}
                </button>
                <p className="text-[11px] text-gray-400 text-center mt-2">Your contact details are only shared with matched, verified suppliers.</p>
              </form>
            )}
          </div>
        )}

        {/* Supplier registration */}
        {activeTab === 'supplier' && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h2 className="text-[16px] font-black text-[#1B5E20] mb-1.5">Register as a B2B Supplier</h2>
            <p className="text-[13px] text-gray-500 mb-5">Receive qualified buyer leads directly. GST verified. Pay only for leads you want.</p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setSubmitting(true);
              try {
                const { error } = await supabase.from('b2b_supplier_applications').insert({
                  business_name: supplierForm.business_name,
                  contact_person: supplierForm.contact_person,
                  mobile: supplierForm.mobile,
                  gst_number: supplierForm.gst_number,
                  email: supplierForm.email,
                  location: supplierForm.location,
                  category: supplierForm.category,
                  status: 'pending',
                });
                if (error) throw error;
                toastSuccess('Supplier registration submitted! We will verify your GST within 24 hours.');
                setSupplierForm({ business_name: '', contact_person: '', mobile: '', gst_number: '', email: '', location: '', category: '' });
              } catch (err: any) {
                toast('Failed to submit: ' + err.message, 'error');
              } finally {
                setSubmitting(false);
              }
            }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-3.5">
                {[
                  { label: 'Business Name *', key: 'business_name', type: 'text', placeholder: 'Your company name' },
                  { label: 'Contact Person *', key: 'contact_person', type: 'text', placeholder: 'Full name' },
                  { label: 'Mobile Number *', key: 'mobile', type: 'tel', placeholder: '+91 98765 43210' },
                  { label: 'GST Number *', key: 'gst_number', type: 'text', placeholder: '22AAAAA0000A1Z5' },
                  { label: 'Email Address *', key: 'email', type: 'email', placeholder: 'business@company.com' },
                  { label: 'Business Location *', key: 'location', type: 'text', placeholder: 'City, State' },
                ].map(f => (
                  <div key={f.label} className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{f.label}</label>
                    <input type={f.type} required value={supplierForm[f.key as keyof typeof supplierForm]} onChange={e => setSupplierForm(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.placeholder} className="p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#1B5E20]" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Supply Category</label>
                  <select value={supplierForm.category} onChange={e => setSupplierForm(prev => ({ ...prev, category: e.target.value }))} className="p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#1B5E20] bg-white">
                    {['Fashion & Garments', 'Electronics', 'Beauty & Personal Care', 'Home & Kitchen', 'Sports & Fitness', 'Raw Materials', 'Multiple'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Monthly Supply Capacity</label>
                  <select className="p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#1B5E20] bg-white">
                    {['₹5L–₹25L', '₹25L–₹1Cr', '₹1Cr–₹10Cr', '₹10Cr+'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={submitting} className="w-full bg-[#1B5E20] hover:bg-[#2E7D32] disabled:bg-gray-400 text-white border-none p-3 rounded-md text-[15px] font-bold transition-colors">
                {submitting ? 'Submitting...' : '🏪 Register as Supplier'}
              </button>
            </form>
          </div>
        )}

        {/* Leads inbox for suppliers */}
        {activeTab === 'leads' && (
          <div className="bg-white rounded-xl p-5 shadow-sm text-center">
            <div className="text-4xl mb-3">📋</div>
            <h2 className="text-[15px] font-black text-[#1B5E20] mb-2">Supplier Lead Inbox</h2>
            <p className="text-[13px] text-gray-500 mb-4 max-w-md mx-auto">
              View and respond to verified buyer requirements matched to your product category and location. 
              Unlock full contact details by paying the escrow fee (₹10 - ₹50 depending on the lead value).
            </p>
            <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto text-left">
              {[
                { title: 'New Leads', value: '14' },
                { title: 'Unlocked', value: '3' },
                { title: 'Escrow Spent', value: '₹120' },
                { title: 'Converted', value: '1' },
              ].map((s, i) => (
                <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="text-[10px] text-gray-500 font-bold uppercase">{s.title}</div>
                  <div className="text-[18px] font-black text-gray-800">{s.value}</div>
                </div>
              ))}
            </div>
            <Link to="/supplier-leads" className="bg-[#1B5E20] hover:bg-[#2E7D32] text-white px-8 py-3 rounded-lg font-black text-[13px] transition-colors shadow-md hover:-translate-y-0.5 inline-block">
              Open Lead Inbox →
            </Link>
          </div>
        )}

        {activeTab === 'plans' && (
          <div>
            <div className="text-[16px] font-black mb-4">Supplier Subscription Plans</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {plans.map((plan, i) => (
                <div key={i} className={`bg-white border-2 ${plan.color} rounded-xl p-5 relative flex flex-col gap-2.5`}>
                  {plan.badge && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1B5E20] text-white text-[10px] font-black px-3 py-0.5 rounded-full">{plan.badge}</div>}
                  <div className="font-black text-[16px]">{plan.name}</div>
                  <div className="text-[22px] font-black text-[#1B5E20]">{plan.price}</div>
                  <div className="text-[13px] font-semibold text-gray-700">{plan.leads}</div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    {['GST verified badge', 'Lead inbox dashboard', 'Buyer contact details', 'Rating & review system', 'Analytics dashboard'].map(f => (
                      <div key={f} className="flex items-center gap-1.5 text-[12px] text-gray-600"><span className="text-[#388E3C] font-black">✓</span>{f}</div>
                    ))}
                  </div>
                  <button className="w-full bg-[#1B5E20] hover:bg-[#2E7D32] text-white py-2.5 rounded-md text-sm font-bold mt-2 transition-colors">
                    Subscribe
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 bg-[#E8F5E9] rounded-xl p-4 text-center">
              <div className="text-[13px] text-[#1B5E20] font-semibold">💡 Pay Per Lead option also available: ₹50–₹500 per lead depending on category value</div>
            </div>
          </div>
        )}

        {activeTab === 'contracts' && (
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="text-[15px] font-black mb-3">📝 Contract Management</div>
              <p className="text-[12px] text-gray-500 mb-4">Manage your B2B supply agreements, MOQ contracts, and subscription orders in one place.</p>
              <div className="flex flex-col gap-3">
                {[
                  { id: 'CNT-001', supplier: 'TechSource India', type: 'MOQ Contract', value: '₹2,40,000', status: 'active', start: '2026-01-01', end: '2026-12-31', items: 'Electronics — 500 units/month' },
                  { id: 'CNT-002', supplier: 'FashionHub Delhi', type: 'Subscription Order', value: '₹85,000', status: 'pending', start: '2026-03-01', end: '2026-06-30', items: 'Apparel — 200 units/month' },
                  { id: 'CNT-003', supplier: 'HomeDecor Surat', type: 'Custom Pricing', value: '₹1,20,000', status: 'expired', start: '2025-10-01', end: '2026-02-28', items: 'Home goods — Bulk order' },
                ].map((contract) => (
                  <div key={contract.id} className="border border-gray-200 rounded-xl p-4 hover:border-[#1B5E20] transition-colors">
                    <div className="flex items-start justify-between flex-wrap gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-black">{contract.supplier}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${contract.status === 'active' ? 'bg-[#E8F5E9] text-[#2E7D32]' : contract.status === 'pending' ? 'bg-[#FFF3E0] text-[#E65100]' : 'bg-gray-100 text-gray-500'}`}>
                            {(contract.status || 'p').charAt(0).toUpperCase() + contract.status.slice(1)}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">{contract.id} • {contract.type}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[15px] font-black text-[#1B5E20]">{contract.value}</div>
                        <div className="text-[10px] text-gray-400">Contract Value</div>
                      </div>
                    </div>
                    <div className="text-[11px] text-gray-600 mb-2">{contract.items}</div>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="text-[11px] text-gray-400">
                        {new Date(contract.start).toLocaleDateString('en-IN')} → {new Date(contract.end).toLocaleDateString('en-IN')}
                      </div>
                      <div className="flex gap-2">
                        <button className="px-3 py-1.5 bg-[#E8F5E9] text-[#2E7D32] rounded-md text-[11px] font-bold hover:bg-[#C8E6C9] transition-colors">View</button>
                        {contract.status === 'pending' && (
                          <button className="px-3 py-1.5 bg-[#1B5E20] text-white rounded-md text-[11px] font-bold hover:bg-[#2E7D32] transition-colors">Approve</button>
                        )}
                        {contract.status === 'expired' && (
                          <button className="px-3 py-1.5 bg-[#0D47A1] text-white rounded-md text-[11px] font-bold hover:bg-[#1565C0] transition-colors">Renew</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="text-[14px] font-black mb-3">➕ Create New Contract</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'Supplier Name', placeholder: 'e.g. TechSource India' },
                  { label: 'Contract Type', placeholder: 'MOQ / Subscription / Custom' },
                  { label: 'Contract Value (₹)', placeholder: 'e.g. 500000' },
                  { label: 'MOQ (units/month)', placeholder: 'e.g. 100' },
                  { label: 'Start Date', placeholder: '', type: 'date' },
                  { label: 'End Date', placeholder: '', type: 'date' },
                ].map((f, i) => (
                  <div key={i}>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1">{f.label}</label>
                    <input type={f.type || 'text'} placeholder={f.placeholder}
                      className="w-full p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#1B5E20]" />
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Terms & Conditions</label>
                <textarea rows={3} placeholder="Describe payment terms, delivery SLA, quality standards..."
                  className="w-full p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#1B5E20] resize-none" />
              </div>
              <button className="mt-3 bg-[#1B5E20] hover:bg-[#2E7D32] text-white px-6 py-2.5 rounded-md text-[13px] font-bold transition-colors">
                📝 Create Contract
              </button>
            </div>
          </div>
        )}

        {/* B2B Categories */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="text-[15px] font-black mb-3">B2B Product Categories</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
            {[
              { icon: '👗', name: 'Fashion', disc: 'Up to 55% off' },
              { icon: '📱', name: 'Electronics', disc: 'Up to 40% off' },
              { icon: '💄', name: 'Beauty', disc: 'Up to 60% off' },
              { icon: '🏠', name: 'Home', disc: 'Up to 50% off' },
              { icon: '🏋️', name: 'Sports', disc: 'Up to 45% off' },
              { icon: '🧸', name: 'Kids', disc: 'Up to 40% off' },
            ].map((c, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-[10px] p-4 text-center hover:border-[#1B5E20] transition-colors cursor-pointer">
                <span className="text-[26px] block mb-1.5">{c.icon}</span>
                <span className="text-xs font-bold block">{c.name}</span>
                <span className="text-[10px] text-[#388E3C] font-bold mt-0.5 block">{c.disc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
