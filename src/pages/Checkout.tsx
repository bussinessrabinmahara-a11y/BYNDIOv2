import { useState, useEffect } from 'react';
import { usePageTitle } from '../lib/usePageTitle';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { supabase } from '../lib/supabase';
import { 
  ChevronLeft, ShieldCheck, Truck, CreditCard, 
  ShoppingBag, CheckCircle2, ChevronRight, Info, AlertCircle, Loader2, Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PageWrapper from '../components/PageWrapper';
import { INDIAN_STATES, canSellerShipToState } from '../lib/gstCompliance';

// INDIAN_STATES imported from gstCompliance.ts

export default function Checkout() {
  usePageTitle('Secure Checkout');
  const { cart, user, createOrder, buyerState, setBuyerState } = useAppStore();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [payment, setPayment] = useState('upi');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complianceErrors, setComplianceErrors] = useState<string[]>([]);
  const [sellerStates, setSellerStates] = useState<Record<string, {state: string, gst: string}>>({});
  
  // ── P0 Fix: Address state properly declared ──
  const [address, setAddress] = useState({
    fullName: user?.name || '',
    mobile: '',
    line1: '',
    city: '',
    state: '', // L-06: Default to empty instead of hardcoded 'Maharashtra'
    pin: '',
  });

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{code: string, discount: number} | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // H-02: Saved Addresses
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('new');
  const [saveNewAddress, setSaveNewAddress] = useState(false);

  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<any>(null);
  const [shippingMethods, setShippingMethods] = useState<any[]>([]);
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<any>(null);

  useEffect(() => {
    supabase.from('payment_methods').select('*').eq('is_active', true).order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) {
          setPaymentMethods(data);
          // Set default payment method
          const razorpay = data.find(m => m.provider === 'razorpay');
          if (razorpay) { setPayment(razorpay.id); setSelectedMethod(razorpay); }
          else if (data.length > 0) { setPayment(data[0].id); setSelectedMethod(data[0]); }
        }
      });
  }, []);

  // Sync user name if it loads after mount
  useEffect(() => {
    if (user?.name && !address.fullName && selectedAddressId === 'new') {
      setAddress(prev => ({ ...prev, fullName: user.name }));
    }
  }, [user?.name, selectedAddressId]);

  useEffect(() => {
    if (user?.id) {
      supabase.from('addresses').select('*').eq('user_id', user.id).then(({data}) => {
        if (data && data.length > 0) {
          setSavedAddresses(data);
        }
      });
      // M-07: Sync cart to carts table
      if (cart.length > 0) {
        supabase.from('carts').upsert({ user_id: user.id, cart_data: cart }).then();
      }
    }
    
    supabase.from('shipping_methods').select('*').eq('is_active', true).then(({data}) => {
      if (data && data.length > 0) {
        setShippingMethods(data);
        setSelectedShippingMethod(data[0]);
      }
    });
  }, [user?.id, cart]);

  // GST COMPLIANCE: Use cart-level seller info (populated from store)
  // Also sync address.state to global buyerState for cross-page consistency
  useEffect(() => {
    if (address.state && address.state !== buyerState) {
      setBuyerState(address.state);
    }
  }, [address.state]);

  // Pre-fill address state from global buyerState if set
  useEffect(() => {
    if (buyerState && !address.state) {
      setAddress(prev => ({ ...prev, state: buyerState }));
    }
  }, [buyerState]);

  // GST COMPLIANCE: Fetch seller info for cart items that don't have it
  const fetchSellerCompliance = async () => {
    const sellerIds = Array.from(new Set(cart.filter(i => i.seller_id).map(item => item.seller_id!)));
    if (sellerIds.length === 0) return;
    
    const { data } = await supabase.from('sellers').select('id, business_state, gst_number').in('id', sellerIds);
    if (data) {
      const mapping: Record<string, {state: string, gst: string}> = {};
      data.forEach(s => { mapping[s.id] = { state: s.business_state, gst: s.gst_number }; });
      setSellerStates(mapping);
    }
  };

  useEffect(() => {
    if (cart.length > 0) fetchSellerCompliance();
  }, [cart]);

  // Validate compliance whenever address state or seller info changes
  useEffect(() => {
    const errors: string[] = [];
    cart.forEach(item => {
      // Use cart-level GST info first, fall back to fetched sellerStates
      const sellerState = item.seller_state || sellerStates[item.seller_id!]?.state;
      const sellerHasGst = item.seller_has_gst ?? !!(sellerStates[item.seller_id!]?.gst);
      const check = canSellerShipToState(sellerState, sellerHasGst, address.state);
      if (!check.allowed) {
        errors.push(item.id as string);
      }
    });
    setComplianceErrors(errors);
    if (errors.length > 0) {
      setError(`${errors.length} item(s) can only ship within the seller's state (GST compliance). Remove them to proceed.`);
    } else if (error?.includes('ship within') || error?.includes('ships within')) {
      setError(null);
    }
  }, [address.state, sellerStates, cart]);

  const siteSettings = useAppStore(s => s.siteSettings);
  // M-08: Cap add-to-cart at 10 (applying here for subtotal as fallback)
  const cappedCart = cart.map(item => ({ ...item, qty: Math.min(item.qty, (item as any).stock_quantity ?? 10, 10) }));
  const subtotal = cappedCart.reduce((sum, item) => sum + item.price * item.qty, 0);
  
  const platformFee = siteSettings?.platform_fee ?? 10;
  // H-07: Use selected shipping method cost
  const shippingFee = selectedShippingMethod ? Number(selectedShippingMethod.cost) : 0;
  
  // Server-side price recalculation via razorpay-order.js
  const total = subtotal + shippingFee + platformFee - (appliedCoupon?.discount || 0);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsApplyingCoupon(true);
    setCouponError(null);
    try {
      const { data, error: err } = await supabase.rpc('validate_coupon', { p_code: couponCode.trim(), p_cart_total: subtotal });
      if (err) throw err;
      if (!data.valid) throw new Error(data.error);
      setAppliedCoupon({ code: data.code, discount: data.discount });
      setCouponCode('');
    } catch (err: any) {
      setCouponError(err.message || 'Invalid coupon code');
      setAppliedCoupon(null);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  // Address validation before proceeding
  const validateAddress = (): boolean => {
    if (!address.fullName.trim() || address.fullName.trim().length < 2) {
      setError('Please enter a valid full name.');
      return false;
    }
    if (!/^\d{10}$/.test(address.mobile)) {
      setError('Please enter a valid 10-digit mobile number.');
      return false;
    }
    if (!address.line1.trim()) {
      setError('Please enter your street address.');
      return false;
    }
    if (!address.city.trim()) {
      setError('Please enter your city.');
      return false;
    }
    if (!address.state) {
      setError('Please select your state.');
      return false;
    }
    if (!/^\d{6}$/.test(address.pin)) {
      setError('Please enter a valid 6-digit PIN code.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleProceedToPayment = () => {
    if (validateAddress()) {
      setStep(2);
    }
  };

  const handlePlaceOrder = async () => {
    setIsSubmitting(true);
    setError(null);
    
    // P0-PAY-03: COD Order Verification Flow
    const isCOD = selectedMethod?.provider === 'cod';
    if (isCOD && !isOtpSent) {
      try {
        // C-01: Remove import.meta.env.DEV fallback, call Netlify function directly
        const res = await fetch(`/.netlify/functions/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: address.mobile })
        });
        if (!res.ok) throw new Error('Failed to send OTP');
        setIsOtpSent(true);
        setIsSubmitting(false);
        return;
      } catch (err: any) {
        setError('Failed to send verification code. Please try again.');
        setIsSubmitting(false);
        return;
      }
    }

    try {
      // H-02: Save new address if checked
      if (saveNewAddress && selectedAddressId === 'new' && user?.id) {
        await supabase.from('addresses').insert({
          user_id: user.id,
          full_name: address.fullName,
          mobile: address.mobile,
          line1: address.line1,
          city: address.city,
          state: address.state,
          pin: address.pin
        });
      }

      // C-02: Pass selectedShippingMethod?.id to server-side order creation
      // H-GST: Final Compliance Guard
      const { data: compRes, error: compErr } = await supabase.rpc('validate_gst_compliance', {
        p_cart: cart.map(i => ({ id: i.id, seller_id: i.seller_id })),
        p_buyer_state: address.state
      });

      if (compErr || (compRes && !compRes.is_compliant)) {
        throw new Error(compRes?.message || 'GST Compliance check failed.');
      }

      const res = await (createOrder as any)(address, selectedMethod?.provider || 'manual', total, platformFee, shippingFee, appliedCoupon?.code, selectedShippingMethod?.id);
      if (res.success) {
        navigate('/order-success', { state: { orderId: res.orderId } });
      } else {
        setError(res.error || 'Failed to place order. Please try again.');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) {
      setError('Please enter a valid 6-digit verification code.');
      return;
    }
    setIsVerifying(true);
    setError(null);
    
    try {
      // C-01: OTP verification via server — no dev bypass
      // COD OTP verification via server
      const verifyRes = await fetch(`/.netlify/functions/verify-cod-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: otpValue, phone: address.mobile }),
      });
      const verifyData = await verifyRes.json().catch(() => ({}));
      if (verifyRes.ok && verifyData.valid) {
        await handlePlaceOrder(); 
      } else {
        setError(verifyData.error || 'Invalid verification code. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Verification service error. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
           <ShoppingBag size={32} className="text-gray-300" />
        </div>
        <h2 className="text-2xl font-black mb-2">Your basket is empty</h2>
        <p className="text-gray-500 mb-8 max-w-xs font-medium">Add some items from our premium collection to proceed.</p>
        <Link to="/products" className="bg-[#0D47A1] text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl shadow-blue-100 hover:bg-blue-800 transition-all">Start Shopping</Link>
      </div>
    );
  }

  return (
    <PageWrapper>
      <div className="min-h-screen bg-[#F8F9FA] pb-20">
        
        {/* PROGRESS HEADER */}
        <div className="bg-white border-b border-gray-100 sticky top-0 z-50">
           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
              <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-gray-900 font-bold text-[13px] transition-colors">
                <ChevronLeft size={18} /> BACK
              </button>
              
              <div className="flex items-center gap-4 lg:gap-8">
                {[
                  { n: 1, label: 'Delivery' },
                  { n: 2, label: 'Payment' },
                ].map((s) => (
                  <div key={s.n} className={`flex items-center gap-2 ${step >= s.n ? 'text-[#0D47A1]' : 'text-gray-300'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black border-2 ${step >= s.n ? 'border-[#0D47A1] bg-[#0D47A1] text-white' : 'border-gray-200'}`}>{s.n}</div>
                    <span className="hidden sm:inline text-[12px] font-black uppercase tracking-widest">{s.label}</span>
                  </div>
                ))}
              </div>

              <div className="hidden lg:flex items-center gap-2 text-[#388E3C] text-[11px] font-black uppercase tracking-widest">
                <ShieldCheck size={16} /> 100% SECURE
              </div>
           </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 lg:gap-12 items-start">
            
            {/* LEFT COLUMN: FORMS */}
            <div className="space-y-6">
              
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div 
                    key="step1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="bg-white rounded-[32px] p-8 lg:p-10 shadow-sm border border-gray-100"
                  >
                    <h2 className="text-2xl font-black text-gray-900 mb-8 font-inter">Delivery Information</h2>
                    
                    {error && (
                      <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-[13px] font-bold flex items-center gap-2">
                        <AlertCircle size={18} /> {error}
                      </div>
                    )}

                    {savedAddresses.length > 0 && (
                      <div className="mb-6 space-y-2">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Saved Address</label>
                        <select 
                          className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-[#0D47A1] outline-none transition-all font-bold text-gray-900 text-[15px] appearance-none"
                          value={selectedAddressId}
                          onChange={(e) => {
                            setSelectedAddressId(e.target.value);
                            if (e.target.value !== 'new') {
                              const addr = savedAddresses.find(a => a.id === e.target.value);
                              if (addr) {
                                setAddress({
                                  fullName: addr.full_name || '',
                                  mobile: addr.mobile || '',
                                  line1: addr.line1 || '',
                                  city: addr.city || '',
                                  state: addr.state || '',
                                  pin: addr.pin || ''
                                });
                              }
                            } else {
                              setAddress({
                                fullName: user?.name || '',
                                mobile: '',
                                line1: '',
                                city: '',
                                state: '',
                                pin: ''
                              });
                            }
                          }}
                        >
                          <option value="new">Enter new address</option>
                          {savedAddresses.map(a => (
                            <option key={a.id} value={a.id}>{a.full_name} - {a.line1}, {a.city}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name *</label>
                        <input 
                          id="checkout-fullname"
                          type="text" 
                          placeholder="Ex: John Doe" 
                          className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-[#0D47A1] outline-none transition-all font-bold text-gray-900 text-[15px]"
                          value={address.fullName}
                          onChange={(e) => setAddress({...address, fullName: e.target.value})}
                          maxLength={60}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Mobile Number *</label>
                        <input 
                          id="checkout-mobile"
                          type="tel" 
                          placeholder="10-digit mobile number" 
                          className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-[#0D47A1] outline-none transition-all font-bold text-gray-900 text-[15px]"
                          value={address.mobile}
                          onChange={(e) => setAddress({...address, mobile: e.target.value.replace(/\D/g, '').slice(0, 10)})}
                          maxLength={10}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 mb-6">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Street Address *</label>
                      <input 
                        id="checkout-address"
                        type="text" 
                        placeholder="House No, Road, Landmark" 
                        className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-[#0D47A1] outline-none transition-all font-bold text-gray-900 text-[15px]"
                        value={address.line1}
                        onChange={(e) => setAddress({...address, line1: e.target.value})}
                        maxLength={200}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">City *</label>
                        <input 
                          id="checkout-city"
                          type="text" 
                          placeholder="City" 
                          className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-[#0D47A1] outline-none transition-all font-bold text-gray-900 text-[15px]"
                          value={address.city}
                          onChange={(e) => setAddress({...address, city: e.target.value})}
                          maxLength={50}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">State *</label>
                        <select 
                          id="checkout-state"
                          className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-[#0D47A1] outline-none transition-all font-bold text-gray-900 text-[15px] appearance-none"
                          value={address.state}
                          onChange={(e) => setAddress({...address, state: e.target.value})}
                        >
                          <option value="">Select State</option>
                          {INDIAN_STATES.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">PIN Code *</label>
                        <input 
                          id="checkout-pin"
                          type="text" 
                          placeholder="6-digit PIN" 
                          className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-[#0D47A1] outline-none transition-all font-bold text-gray-900 text-[15px]"
                          value={address.pin}
                          onChange={(e) => setAddress({...address, pin: e.target.value.replace(/\D/g, '').slice(0, 6)})}
                          maxLength={6}
                        />
                      </div>
                    </div>

                    {selectedAddressId === 'new' && (
                      <div className="mb-6 flex items-center gap-2">
                        <input type="checkbox" id="save-address" checked={saveNewAddress} onChange={(e) => setSaveNewAddress(e.target.checked)} className="w-4 h-4 accent-[#0D47A1]" />
                        <label htmlFor="save-address" className="text-[13px] font-bold text-gray-700 cursor-pointer">Save this address for future</label>
                      </div>
                    )}

                    {/* H-07: Shipping Method Selection */}
                    {shippingMethods.length > 0 && (
                      <div className="mt-8 mb-6">
                        <h3 className="text-sm font-black text-gray-900 mb-4 uppercase tracking-widest">Shipping Method</h3>
                        <div className="space-y-3">
                          {shippingMethods.map(method => (
                            <label key={method.id} className={`flex items-center justify-between p-4 border-2 rounded-2xl cursor-pointer transition-all ${selectedShippingMethod?.id === method.id ? 'border-[#0D47A1] bg-[#EEF2FF]' : 'border-gray-50 bg-gray-50'}`}>
                              <div className="flex items-center gap-3">
                                <input type="radio" name="shippingMethod" checked={selectedShippingMethod?.id === method.id} onChange={() => setSelectedShippingMethod(method)} className="w-4 h-4 accent-[#0D47A1]" />
                                <div>
                                  <div className="text-[14px] font-black text-gray-900">{method.name}</div>
                                  <div className="text-[12px] text-gray-500 font-medium">Est. {method.min_days}-{method.max_days} days</div>
                                </div>
                              </div>
                              <div className="text-[14px] font-black text-gray-900">
                                {method.cost === 0 ? 'FREE' : `₹${method.cost}`}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <button 
                      onClick={handleProceedToPayment}
                      disabled={!address.fullName || !address.mobile || !address.line1 || !address.pin || !address.city || !address.state || complianceErrors.length > 0}
                      className="w-full bg-[#0D47A1] hover:bg-blue-800 disabled:opacity-30 text-white py-5 rounded-2xl font-black text-lg transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3"
                    >
                      {complianceErrors.length > 0 ? 'Shipping Restriction' : 'Process Payment'} <ChevronRight size={20} />
                    </button>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div 
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="bg-white rounded-[32px] p-8 lg:p-10 shadow-sm border border-gray-100"
                  >
                    <h2 className="text-2xl font-black text-gray-900 mb-8 font-inter">Payment Method</h2>
                    
                    <div className="space-y-4 mb-10">
                       {paymentMethods.map(opt => (
                         <div key={opt.id} className="space-y-3">
                            <label 
                              className={`flex items-center gap-5 p-5 border-2 rounded-2xl transition-all cursor-pointer ${payment === opt.id ? 'border-[#0D47A1] bg-[#EEF2FF]' : 'border-gray-50 bg-gray-50 hover:border-gray-200'}`}
                              onClick={() => { setPayment(opt.id); setSelectedMethod(opt); }}
                            >
                                <input type="radio" checked={payment === opt.id} readOnly className="w-5 h-5 accent-[#0D47A1]" />
                                <div className={`p-3 rounded-xl ${payment === opt.id ? 'bg-white text-[#0D47A1]' : 'bg-white text-gray-400'}`}>
                                   <CreditCard size={20} />
                                </div>
                                <div className="flex-1">
                                   <div className="text-[15px] font-black text-gray-900 leading-none">{opt.name}</div>
                                   <div className="text-xs text-gray-500 font-bold mt-1 uppercase tracking-tight">{opt.description || opt.provider}</div>
                                </div>
                            </label>

                            {/* Manual Payment Details */}
                            {payment === opt.id && opt.provider === 'manual' && (
                              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-white border-2 border-[#0D47A1] rounded-3xl shadow-lg space-y-4 mx-2">
                                <div className="text-[11px] font-black text-[#0D47A1] uppercase tracking-widest border-b pb-2">Payment Details (Pay Here)</div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px]">
                                   {opt.config?.bank_name && (
                                     <div className="space-y-1">
                                        <div className="text-gray-400 font-bold text-[10px] uppercase">Bank Transfer</div>
                                        <div className="font-black text-gray-900">{opt.config.bank_name}</div>
                                        <div className="font-medium text-gray-600">A/C: {opt.config.account_no}</div>
                                        <div className="font-medium text-gray-600">IFSC: {opt.config.ifsc}</div>
                                     </div>
                                   )}
                                   {opt.config?.upi_id && (
                                     <div className="space-y-1">
                                        <div className="text-gray-400 font-bold text-[10px] uppercase">UPI Payment</div>
                                        <div className="font-black text-[#0D47A1]">{opt.config.upi_id}</div>
                                     </div>
                                   )}
                                </div>
                                {opt.config?.qr_url && (
                                  <div className="flex flex-col items-center gap-2 pt-2 border-t border-dashed">
                                     <div className="text-[10px] font-black text-gray-400 uppercase">Scan QR to Pay</div>
                                     <img src={opt.config.qr_url} className="w-32 h-32 rounded-xl shadow-md border-2 border-white" alt="QR" />
                                  </div>
                                )}
                                {opt.config?.instructions && (
                                  <div className="p-3 bg-blue-50 rounded-xl text-[11px] text-[#0D47A1] font-bold italic">
                                     💡 {opt.config.instructions}
                                  </div>
                                )}
                              </motion.div>
                            )}
                         </div>
                       ))}
                    </div>

                    <div className="flex items-center gap-2 p-4 bg-green-50 rounded-2xl text-[#388E3C] text-[13px] font-bold mb-10">
                       <ShieldCheck size={18} /> Payments are 100% encrypted & secure
                    </div>

                    {error && (
                      <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-[13px] font-bold flex items-center gap-2">
                        <AlertCircle size={18} /> {error}
                      </div>
                    )}

                    <button 
                      onClick={handlePlaceOrder}
                      disabled={isSubmitting}
                      className="w-full bg-[#0D47A1] hover:bg-blue-800 text-white py-5 rounded-2xl font-black text-lg transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={24} className="animate-spin" />
                          Processing Transaction...
                        </>
                      ) : `Confirm & Pay ₹${total.toLocaleString('en-IN')}`}
                    </button>
                    <button onClick={() => setStep(1)} className="w-full mt-4 text-[13px] font-black text-gray-400 hover:text-gray-900 uppercase tracking-widest py-2">Edit Address</button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Secure Payment Overlay for real-money feel */}
              <AnimatePresence>
                {isSubmitting && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center"
                  >
                    <div className="relative mb-8">
                       <div className="w-24 h-24 border-4 border-gray-100 border-t-[#0D47A1] rounded-full animate-spin" />
                       <ShieldCheck size={40} className="text-[#0D47A1] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-2">Securing Your Transaction</h2>
                    <p className="text-gray-500 font-bold mb-8">Please do not close this window or press back button. Our bank server is processing your payment...</p>
                    
                    <div className="flex items-center gap-6 justify-center grayscale opacity-50">
                       <img src="https://upload.wikimedia.org/wikipedia/commons/c/cd/Razorpay_logo.svg" className="h-4" alt="Razorpay" />
                       <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo.png" className="h-6" alt="UPI" />
                       <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" className="h-4" alt="Visa" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* P0-PAY-03: OTP Verification Overlay for COD */}
              <AnimatePresence>
                {isOtpSent && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
                  >
                    <motion.div 
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      className="bg-white w-full max-w-sm rounded-[40px] p-10 text-center shadow-2xl"
                    >
                      <div className="w-20 h-20 bg-blue-50 text-[#0D47A1] rounded-full flex items-center justify-center mx-auto mb-6">
                        <Smartphone size={32} />
                      </div>
                      <h2 className="text-2xl font-black text-gray-900 mb-3">Verify COD Order</h2>
                      <p className="text-gray-500 font-medium mb-8 leading-relaxed">
                        To prevent fake orders, we've sent a 6-digit verification code to <span className="text-gray-900 font-black">+91 {address.mobile}</span>.
                      </p>
                      
                      <div className="flex flex-col gap-4">
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="0 0 0 0 0 0"
                          value={otpValue}
                          onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                          className="w-full text-center text-3xl font-black tracking-[0.5em] py-5 bg-gray-50 border-2 border-transparent focus:border-[#0D47A1] rounded-3xl outline-none transition-all placeholder:text-gray-200"
                        />
                        
                        {error && <div className="text-xs text-red-500 font-bold">{error}</div>}
                        
                        <button 
                          onClick={handleVerifyOtp}
                          disabled={isVerifying || otpValue.length !== 6}
                          className="w-full bg-black text-white py-5 rounded-3xl font-black shadow-xl hover:scale-105 transition-all disabled:opacity-30 disabled:hover:scale-100 flex items-center justify-center gap-2"
                        >
                          {isVerifying ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Confirm Order'}
                        </button>
                        
                        <button 
                          onClick={() => { setIsOtpSent(false); setOtpValue(''); setError(null); }}
                          className="text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-900"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>

            {/* RIGHT COLUMN: SUMMARY */}
            <div className="space-y-6 lg:sticky lg:top-[120px]">
               <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
                  <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center justify-between">
                     Order Details
                     <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">{cart.length} Items</span>
                  </h3>

                  <div className="max-h-[300px] overflow-y-auto pr-2 space-y-4 mb-8 custom-scrollbar">
                     {cappedCart.map(item => (
                       <div key={item.id} className="flex gap-4">
                          <div className="w-16 h-16 bg-gray-50 rounded-xl overflow-hidden shrink-0 border border-gray-100">
                             <img src={item.icon} className="w-full h-full object-cover" alt="item" />
                          </div>
                          <div className="flex-1">
                             <div className="text-[13px] font-black text-gray-900 leading-tight mb-1">{item.name}</div>
                             {complianceErrors.includes(item.id.toString()) && (
                                <div className="text-[9px] font-black text-red-500 uppercase mb-1">
                                  ⚠️ Shipping only within {item.seller_id ? sellerStates[item.seller_id]?.state : 'seller state'}
                                </div>
                             )}
                             <div className="flex items-center justify-between text-[11px] font-bold text-gray-400">
                                <span>QTY: {item.qty} {item.qty >= 10 ? '(Max)' : ''}</span>
                                <span className="text-gray-900">₹{(item.price * item.qty).toLocaleString('en-IN')}</span>
                             </div>
                          </div>
                       </div>
                     ))}
                  </div>

                  <div className="space-y-4 pt-6 border-t border-gray-100">
                     <div className="flex justify-between items-center text-[13px] font-bold">
                        <span className="text-gray-400 uppercase tracking-widest">Subtotal</span>
                        <span className="text-gray-900">₹{subtotal.toLocaleString('en-IN')}</span>
                     </div>
                     <div className="flex justify-between items-center text-[13px] font-bold">
                        <span className="text-gray-400 uppercase tracking-widest">Shipping</span>
                        <span className={`${shippingFee === 0 ? 'text-[#388E3C]' : 'text-gray-900'}`}>{shippingFee === 0 ? 'FREE' : `₹${shippingFee}`}</span>
                     </div>
                     <div className="flex justify-between items-center text-[13px] font-bold">
                        <span className="text-gray-400 uppercase tracking-widest">Platform Fee</span>
                        <span className="text-gray-900">₹{platformFee}</span>
                     </div>
                     {appliedCoupon && (
                       <div className="flex justify-between items-center text-[13px] font-bold text-green-600">
                          <span className="uppercase tracking-widest">Discount ({appliedCoupon.code})</span>
                          <span>-₹{appliedCoupon.discount.toLocaleString('en-IN')}</span>
                       </div>
                     )}
                     
                     {/* Coupon Input */}
                     <div className="pt-4 border-t border-gray-100">
                       {!appliedCoupon ? (
                         <div>
                           <div className="flex gap-2">
                             <input 
                               type="text" 
                               value={couponCode} 
                               onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                               placeholder="Have a promo code?" 
                               className="flex-1 p-2.5 bg-gray-50 border border-gray-200 rounded-md text-[13px] outline-none focus:border-[#0D47A1] uppercase"
                             />
                             <button 
                               type="button"
                               onClick={handleApplyCoupon}
                               disabled={!couponCode.trim() || isApplyingCoupon}
                               className="px-4 bg-gray-900 text-white text-[13px] font-bold rounded-md hover:bg-black disabled:opacity-50 transition-colors"
                             >
                               {isApplyingCoupon ? '...' : 'Apply'}
                             </button>
                           </div>
                           {couponError && <p className="text-red-500 text-xs mt-2 font-medium">{couponError}</p>}
                         </div>
                       ) : (
                         <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
                           <div className="flex items-center gap-2 text-green-700">
                             <CheckCircle2 size={16} />
                             <span className="text-[13px] font-bold">{appliedCoupon.code} applied!</span>
                           </div>
                           <button 
                             onClick={() => setAppliedCoupon(null)}
                             className="text-[11px] font-bold text-gray-500 hover:text-red-500 uppercase tracking-wider"
                           >
                             Remove
                           </button>
                         </div>
                       )}
                     </div>

                     <div className="flex justify-between items-center pt-4 border-t-2 border-dashed border-gray-100">
                        <div>
                           <span className="text-[15px] font-black text-gray-900 uppercase tracking-widest block">Total Pay</span>
                           <span className="text-[10px] text-gray-400 font-bold uppercase">(Inclusive of all taxes)</span>
                        </div>
                        <span className="text-2xl font-black text-[#0D47A1]">₹{total.toLocaleString('en-IN')}</span>
                     </div>
                  </div>
               </div>

               {/* Trust signals */}
               <div className="bg-gray-900 rounded-[32px] p-6 text-white flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <ShieldCheck size={20} className="text-blue-400" />
                   </div>
                   <div>
                      <div className="text-[13px] font-black mb-0.5">Buyer Protection</div>
                      <div className="text-[11px] text-gray-400 font-medium leading-relaxed">Safety is our priority. Your funds are kept safe until delivery.</div>
                   </div>
               </div>
            </div>

          </div>
        </div>

      </div>
    </PageWrapper>
  );
}
