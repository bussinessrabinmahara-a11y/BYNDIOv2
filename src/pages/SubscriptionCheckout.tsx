import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Check, ArrowLeft, CreditCard, Landmark, 
  Smartphone, Upload, Info, AlertCircle, Loader2, Sparkles, Crown, Zap
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store';
import { toast, toastSuccess } from '../components/Toast';
import { initiateSubscriptionPayment } from '../lib/subscriptionPayment';

export default function SubscriptionCheckout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<'razorpay' | 'manual'>('razorpay');
  const [uploading, setUploading] = useState(false);
  const [proofUrl, setProofUrl] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [fetchingMethods, setFetchingMethods] = useState(true);

  const planName = searchParams.get('plan') || 'Pro';
  const planPrice = parseInt(searchParams.get('price') || '1999');
  const planRole = (searchParams.get('role') as 'seller' | 'influencer') || 'seller';

  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=/pricing');
      return;
    }
    loadPaymentMethods();
  }, [user]);

  const loadPaymentMethods = async () => {
    setFetchingMethods(true);
    const { data } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('is_active', true);
    if (data) setPaymentMethods(data);
    setFetchingMethods(false);
  };

  const manualMethod = paymentMethods.find(m => m.provider === 'manual');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast('Screenshot must be less than 5MB', 'error');
      return;
    }

    setUploading(true);
    try {
      const path = `subscriptions/proofs/${user?.id}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(path);

      setProofUrl(publicUrl);
      toastSuccess('Payment proof uploaded!');
    } catch (err: any) {
      toast('Upload failed: ' + err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!proofUrl && !transactionId) {
      toast('Please provide either a screenshot or transaction ID', 'error');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('subscription_requests').insert({
        user_id: user?.id,
        plan_name: planName,
        plan_role: planRole,
        amount: planPrice,
        payment_method: 'manual',
        payment_proof_url: proofUrl,
        transaction_id: transactionId,
        status: 'pending'
      });

      if (error) throw error;

      toastSuccess('Subscription request submitted! Admin will verify it shortly.');
      navigate(planRole === 'seller' ? '/seller-dashboard' : '/creator-dashboard');
    } catch (err: any) {
      toast('Failed to submit request: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRazorpay = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await initiateSubscriptionPayment(
        { 
          name: planName, 
          price: planPrice, 
          priceDisplay: `₹${planPrice.toLocaleString()}/mo`, 
          role: planRole 
        },
        { id: user.id, name: user.name || user.email || '', email: user.email || '' },
        (pName) => {
          setLoading(false);
          toastSuccess(`🎉 ${pName} plan activated successfully!`);
          navigate(planRole === 'seller' ? '/seller-dashboard' : '/creator-dashboard');
        },
        (msg) => {
          setLoading(false);
          toast(msg, 'error');
        }
      );
    } catch (err: any) {
      setLoading(false);
      toast(err.message || 'Payment failed', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 pt-10">
      <div className="max-w-4xl mx-auto px-4">
        <Link to="/pricing" className="inline-flex items-center gap-2 text-gray-500 hover:text-[#0D47A1] font-bold text-sm mb-8 transition-colors group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Plans
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: Summary */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-blue-900/5 border border-gray-100 sticky top-24">
              <div className="mb-8">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
                  {planRole === 'seller' ? <Crown className="text-[#0D47A1]" /> : <Sparkles className="text-purple-600" />}
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-1">{planName}</h2>
                <p className="text-sm text-gray-400 font-medium capitalize">{planRole} Subscription</p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center py-3 border-b border-gray-50">
                  <span className="text-sm text-gray-500 font-bold">Monthly Price</span>
                  <span className="text-lg font-black text-gray-900">₹{planPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-50">
                  <span className="text-sm text-gray-500 font-bold">GST (0%)</span>
                  <span className="text-sm text-gray-400 font-bold">Included</span>
                </div>
                <div className="flex justify-between items-center py-4">
                  <span className="text-base text-gray-900 font-black">Total to Pay</span>
                  <span className="text-2xl font-black text-[#0D47A1]">₹{planPrice.toLocaleString()}</span>
                </div>
              </div>

              <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100">
                <div className="flex gap-3">
                  <Shield size={20} className="text-[#0D47A1] shrink-0" />
                  <div>
                    <div className="text-[11px] font-black text-[#0D47A1] uppercase tracking-wider mb-1">Secure Checkout</div>
                    <p className="text-[10px] text-blue-800/70 font-medium leading-relaxed">
                      Your subscription will be active for 30 days. You can cancel or change plans anytime.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Payment Methods */}
          <div className="lg:col-span-3 space-y-6">
            <h1 className="text-2xl font-black text-gray-900 mb-6">Choose Payment Method</h1>

            {/* Razorpay Option */}
            <button 
              onClick={() => setMethod('razorpay')}
              className={`w-full p-6 rounded-[24px] border-2 transition-all text-left flex items-center gap-4 ${method === 'razorpay' ? 'bg-white border-[#0D47A1] shadow-lg shadow-blue-900/5' : 'bg-white border-gray-100 hover:border-gray-200'}`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${method === 'razorpay' ? 'bg-[#0D47A1] text-white' : 'bg-gray-50 text-gray-400'}`}>
                <CreditCard size={24} />
              </div>
              <div className="flex-1">
                <div className="font-black text-gray-900">Instant Activation</div>
                <div className="text-xs text-gray-400 font-bold">UPI, Cards, Net Banking (via Razorpay)</div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${method === 'razorpay' ? 'border-[#0D47A1] bg-[#0D47A1]' : 'border-gray-200'}`}>
                {method === 'razorpay' && <Check size={12} className="text-white" strokeWidth={4} />}
              </div>
            </button>

            {/* Manual Option */}
            <button 
              onClick={() => setMethod('manual')}
              className={`w-full p-6 rounded-[24px] border-2 transition-all text-left flex items-center gap-4 ${method === 'manual' ? 'bg-white border-[#0D47A1] shadow-lg shadow-blue-900/5' : 'bg-white border-gray-100 hover:border-gray-200'}`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${method === 'manual' ? 'bg-[#0D47A1] text-white' : 'bg-gray-50 text-gray-400'}`}>
                <Smartphone size={24} />
              </div>
              <div className="flex-1">
                <div className="font-black text-gray-900">Manual Verification</div>
                <div className="text-xs text-gray-400 font-bold">Direct UPI Transfer / QR Scan</div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${method === 'manual' ? 'border-[#0D47A1] bg-[#0D47A1]' : 'border-gray-200'}`}>
                {method === 'manual' && <Check size={12} className="text-white" strokeWidth={4} />}
              </div>
            </button>

            {/* Payment Details Container */}
            <AnimatePresence mode="wait">
              {method === 'razorpay' ? (
                <motion.div 
                  key="razorpay"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-[#E3F2FD] p-6 rounded-[24px] border border-[#BBDEFB]"
                >
                  <p className="text-[13px] text-blue-900 font-bold mb-6">
                    Click the button below to pay securely via Razorpay. Your plan will be activated immediately after successful payment.
                  </p>
                  <button 
                    onClick={handleRazorpay}
                    disabled={loading}
                    className="w-full py-4 bg-[#0D47A1] text-white rounded-2xl font-black text-base shadow-xl shadow-blue-900/20 hover:bg-[#1565C0] active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : <><Shield size={20} /> Pay ₹{planPrice.toLocaleString()} Now</>}
                  </button>
                </motion.div>
              ) : (
                <motion.div 
                  key="manual"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {fetchingMethods ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="animate-spin text-[#0D47A1]" />
                    </div>
                  ) : manualMethod ? (
                    <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm space-y-6">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center shrink-0">
                          <AlertCircle className="text-yellow-600" size={20} />
                        </div>
                        <p className="text-xs text-gray-500 font-medium leading-relaxed">
                          Pay the exact amount to the details below, then upload the screenshot or enter the transaction ID for verification.
                        </p>
                      </div>

                      {/* Bank/UPI Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">UPI ID</div>
                          <div className="font-black text-gray-900">{manualMethod.config?.upi_id || 'byndio@upi'}</div>
                        </div>
                        {manualMethod.config?.bank_name && (
                          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Bank Details</div>
                            <div className="font-black text-gray-900 text-sm">{manualMethod.config.bank_name}</div>
                            <div className="text-[11px] text-gray-500 font-bold">A/C: {manualMethod.config.account_no}</div>
                            <div className="text-[11px] text-gray-500 font-bold">IFSC: {manualMethod.config.ifsc}</div>
                          </div>
                        )}
                      </div>

                      {manualMethod.config?.qr_url && (
                        <div className="flex flex-col items-center gap-3 py-4 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                          <img src={manualMethod.config.qr_url} alt="Payment QR" className="w-48 h-48 object-contain rounded-xl shadow-lg bg-white p-2" />
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Scan to Pay</span>
                        </div>
                      )}

                      {/* Manual Form */}
                      <div className="space-y-4 pt-4 border-t border-gray-50">
                        <div className="space-y-2">
                          <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Transaction ID / UTR</label>
                          <input 
                            placeholder="Enter 12-digit UPI Ref No." 
                            value={transactionId}
                            onChange={e => setTransactionId(e.target.value)}
                            className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:border-[#0D47A1] transition-all" 
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Upload Screenshot</label>
                          <div className="flex gap-2">
                            <label className="flex-1 cursor-pointer">
                              <div className={`w-full p-4 bg-gray-50 border border-dashed rounded-2xl flex items-center justify-center gap-3 transition-all ${proofUrl ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-[#0D47A1]'}`}>
                                {uploading ? <Loader2 className="animate-spin text-[#0D47A1]" /> : proofUrl ? <Check className="text-green-600" /> : <Upload className="text-gray-400" />}
                                <span className={`text-[13px] font-black ${proofUrl ? 'text-green-700' : 'text-gray-500'}`}>
                                  {proofUrl ? 'Screenshot Attached' : 'Choose File'}
                                </span>
                              </div>
                              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                            </label>
                          </div>
                        </div>

                        <button 
                          onClick={handleManualSubmit}
                          disabled={loading || uploading || (!transactionId && !proofUrl)}
                          className="w-full py-4 bg-black text-white rounded-2xl font-black text-base shadow-xl hover:bg-gray-800 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                          {loading ? <Loader2 className="animate-spin" /> : 'Submit for Verification'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 p-6 rounded-[24px] border border-yellow-200 text-center">
                      <p className="text-sm text-yellow-800 font-bold">Manual payment is currently unavailable. Please use Razorpay.</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* FAQ/Trust */}
        <div className="mt-20 pt-20 border-t border-gray-100">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { icon: <Shield size={24} className="text-green-600" />, title: 'Secure Payment', desc: 'All transactions are encrypted and secured.' },
                { icon: <Zap size={24} className="text-orange-500" />, title: 'Fast Activation', desc: 'Razorpay plans activate instantly.' },
                { icon: <Info size={24} className="text-blue-500" />, title: '24/7 Support', desc: 'Need help? Contact our support team.' }
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-gray-50">
                    {item.icon}
                  </div>
                  <h3 className="font-black text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-xs text-gray-500 font-medium leading-relaxed">{item.desc}</p>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}
