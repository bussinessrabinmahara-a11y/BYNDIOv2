import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store';
import { supabase } from '../lib/supabase';
import { RefreshCw, Phone, Mail, MapPin, Package, Clock } from 'lucide-react';
import { toastSuccess, toast } from '../components/Toast';

interface Lead {
  id: string;
  buyer_name: string;
  buyer_phone: string;
  buyer_email: string;
  company_name: string;
  product_category: string;
  product_description: string;
  quantity: string;
  budget: string;
  delivery_location: string;
  delivery_timeline: string;
  status: string;
  created_at: string;
  is_unlocked?: boolean;
  unlock_fee?: number;
}

export default function SupplierLeads() {
  const { user, walletBalance, fetchWalletData } = useAppStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [supplierData, setSupplierData] = useState<{remaining_leads: number, performance_score: number} | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'matched' | 'closed'>('all');
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [quoteForm, setQuoteForm] = useState({
    unitPrice: '',
    totalAmount: '',
    estimatedDays: '',
    samplesAvailable: false,
    terms: ''
  });

  useEffect(() => {
    fetchLeads();
    if (user) {
      fetchWalletData();
      fetchSupplierB2BData();
    }
  }, [user?.id, filter]);

  const fetchSupplierB2BData = async () => {
    if (!user) return;
    const { data } = await supabase.from('sellers').select('remaining_leads, performance_score').eq('id', user.id).maybeSingle();
    if (data) setSupplierData(data);
  };

  const fetchLeads = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Fetch leads
      let query;
      if (user.role === 'admin') {
        query = supabase.from('b2b_leads').select('*').order('created_at', { ascending: false }).limit(50);
      } else {
        const { data: assignments } = await supabase
          .from('b2b_lead_assignments').select('lead_id').eq('supplier_id', user.id);
        const leadIds = assignments?.map(a => a.lead_id) || [];
        if (leadIds.length === 0) { setLeads([]); setIsLoading(false); return; }
        query = supabase.from('b2b_leads').select('*').in('id', leadIds).order('created_at', { ascending: false });
      }
      if (filter !== 'all') query = query.eq('status', filter);
      const { data: leadData } = await query;

      if (leadData) {
        // Fetch unlocks
        const { data: unlocks } = await supabase
          .from('b2b_lead_unlocks').select('lead_id').eq('supplier_id', user.id);
        const unlockedIds = new Set(unlocks?.map(u => u.lead_id) || []);

        setLeads(leadData.map(l => {
          // Dynamic pricing based on quantity or category (Demo logic)
          let fee = 150;
          const qty = parseInt(l.quantity) || 0;
          if (l.product_category.toLowerCase().includes('electronic')) fee = 300;
          else if (qty > 1000) fee = 500;
          else if (qty < 100) fee = 50;
          
          return {
            ...l,
            is_unlocked: user.role === 'admin' || unlockedIds.has(l.id),
            unlock_fee: fee
          };
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlock = async (lead: Lead) => {
    if (!user) return;

    // PRD Requirement: Mandatory KYC for lead access
    const { data: kycData } = await supabase.from('sellers').select('kyc_status').eq('id', user.id).maybeSingle();
    if (kycData?.kyc_status !== 'verified') {
      toast('KYC Verification Required. Please complete your profile KYC first.', 'error');
      return;
    }

    const fee = lead.unlock_fee || 10;
    
    // Check Subscription Credits First
    let useCredit = false;
    if (supplierData && supplierData.remaining_leads > 0) {
      if (window.confirm(`Use 1 lead credit from your subscription? (Remaining: ${supplierData.remaining_leads})`)) {
        useCredit = true;
      }
    }

    if (!useCredit && walletBalance < fee) {
      toast('Insufficient wallet balance. Please add funds.', 'error');
      return;
    }

    setUnlocking(lead.id);
    try {
      if (useCredit) {
        // Update remaining_leads
        const { error: creditError } = await supabase.rpc('deduct_lead_credit', { p_user_id: user.id });
        if (creditError) throw creditError;
      } else {
        const { error: walletError } = await supabase.rpc('deduct_wallet_balance', { p_user_id: user.id, p_amount: fee });
        if (walletError) throw walletError;
      }

      const { error } = await supabase.from('b2b_lead_unlocks').insert({
        lead_id: lead.id,
        supplier_id: user.id,
        fee_paid: useCredit ? 0 : fee
      });
      if (error) throw error;

      toastSuccess('Lead unlocked successfully!');
      fetchWalletData();
      fetchSupplierB2BData();
      fetchLeads();
    } catch (err: any) {
      toast(err.message || 'Unlock failed', 'error');
    } finally {
      setUnlocking(null);
    }
  };

  const handleRespond = async (leadId: string) => {
    if (!user) return;
    const { unitPrice, totalAmount, estimatedDays, samplesAvailable, terms } = quoteForm;
    
    if (!unitPrice || !totalAmount || !estimatedDays) {
      toast('Please fill all required fields.', 'error');
      return;
    }

    try {
      const { error: quoteError } = await supabase.from('b2b_quotes').insert({
        lead_id: leadId,
        supplier_id: user.id,
        unit_price: parseFloat(unitPrice),
        total_amount: parseFloat(totalAmount),
        estimated_days: parseInt(estimatedDays),
        samples_available: samplesAvailable,
        terms: terms.trim()
      });
      if (quoteError) throw quoteError;

      await supabase.from('b2b_lead_assignments').update({
        status: 'responded',
      }).eq('lead_id', leadId).eq('supplier_id', user.id);

      await supabase.from('b2b_leads').update({ status: 'matched' }).eq('id', leadId);
      
      setRespondingTo(null);
      setQuoteForm({ unitPrice: '', totalAmount: '', estimatedDays: '', samplesAvailable: false, terms: '' });
      toastSuccess('Professional quote sent to buyer!');
      fetchLeads();
    } catch (err: any) { 
      toast(err.message || 'Failed to send quote', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      open: 'bg-green-100 text-green-700',
      matched: 'bg-blue-100 text-blue-700',
      closed: 'bg-gray-100 text-gray-600',
      expired: 'bg-red-100 text-red-600',
    };
    return map[status] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="bg-[#F5F5F5] min-h-screen">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 px-4 py-2.5 bg-white border-b border-gray-200">
        <Link to="/" className="text-[#1565C0] hover:underline">Home</Link> ›
        <Link to="/b2b" className="text-[#1565C0] hover:underline">B2B Supply</Link> ›
        <span className="font-semibold text-gray-800">Supplier Lead Inbox</span>
      </div>

      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-[18px] font-black flex items-center gap-2">
              📋 B2B Lead Inbox
              <span className="bg-[#E8F5E9] text-[#1B5E20] text-[10px] font-bold px-2 py-0.5 rounded-full">{leads.length} leads</span>
            </h1>
            <div className="bg-white border border-gray-200 px-3 py-1 rounded-full text-[11px] font-bold text-gray-600 flex items-center gap-1.5 shadow-sm">
              💰 Wallet: <span className="text-[#1B5E20]">₹{walletBalance.toLocaleString('en-IN')}</span>
            </div>
            {supplierData && (
              <div className="bg-white border border-[#0D47A1] px-3 py-1 rounded-full text-[11px] font-bold text-[#0D47A1] flex items-center gap-1.5 shadow-sm">
                🎯 Performance: <span className="font-black">{supplierData.performance_score}/5.0</span>
              </div>
            )}
            {supplierData && supplierData.remaining_leads > 0 && (
              <div className="bg-[#E3F2FD] border border-[#1565C0]/30 px-3 py-1 rounded-full text-[11px] font-bold text-[#0D47A1] flex items-center gap-1.5 shadow-sm">
                📊 Credits: <span className="font-black">{supplierData.remaining_leads} left</span>
              </div>
            )}
          </div>
          <button onClick={() => { fetchLeads(); fetchSupplierB2BData(); }} className="flex items-center gap-1.5 text-[12px] text-[#1565C0] font-semibold hover:underline">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1.5 shadow-sm w-fit mb-5">
          {(['all', 'open', 'matched', 'closed'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-[12px] font-bold capitalize transition-colors ${filter === f ? 'bg-[#1B5E20] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              {f}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#1B5E20] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : leads.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center shadow-sm">
            <div className="text-5xl mb-3">📭</div>
            <div className="font-black text-[16px] text-gray-700 mb-2">No leads yet</div>
            <p className="text-[13px] text-gray-500 max-w-sm mx-auto mb-4">
              {user?.role === 'admin'
                ? 'B2B buyer requirements will appear here once buyers post them.'
                : 'Subscribe to a B2B plan or match your supply category to reach more buyers.'}
            </p>
            {user?.role !== 'admin' && (
              <Link to="/b2b" className="bg-[#1B5E20] hover:bg-[#2E7D32] text-white px-5 py-2 rounded-md font-bold text-sm transition-colors">
                View B2B Plans
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {leads.map(lead => (
              <div key={lead.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden group hover:border-[#1B5E20] transition-colors">
                {/* Lead header */}
                <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className="font-black text-[14px]">{lead.product_category}</span>
                    <span className="text-[11px] text-gray-400">
                      {new Date(lead.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full capitalize ${getStatusBadge(lead.status)}`}>
                    {lead.status}
                  </span>
                </div>

                <div className="p-5">
                  {/* Requirement */}
                  <div className="mb-4">
                    <div className="text-[13px] font-bold text-gray-700 mb-1">Requirement Overview</div>
                    <p className="text-[13px] text-gray-600 leading-relaxed">{lead.product_description}</p>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {[
                      { icon: Package, label: 'Quantity', val: lead.quantity },
                      { icon: MapPin, label: 'Location', val: lead.delivery_location },
                      { icon: Clock, label: 'Timeline', val: lead.delivery_timeline },
                      { icon: Package, label: 'Budget', val: lead.budget || 'Not specified' },
                    ].map((d, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-2.5 border border-transparent group-hover:bg-green-50/30 transition-colors">
                        <div className="text-[10px] text-gray-400 font-semibold uppercase">{d.label}</div>
                        <div className="text-[12px] font-bold mt-0.5">{d.val}</div>
                      </div>
                    ))}
                  </div>

                  {/* Buyer contact - HIDDEN BEHIND UNLOCK */}
                  <div className="border-t border-gray-100 pt-4 relative">
                    <div className="text-[12px] font-bold text-gray-500 mb-2">Buyer Contact Details</div>
                    
                    {lead.is_unlocked ? (
                      <div className="flex flex-wrap gap-4 animate-fadeIn">
                        <div className="flex items-center gap-1.5 text-[13px] font-semibold">
                          <div className="w-7 h-7 bg-[#0D47A1] rounded-full flex items-center justify-center text-white text-[11px] font-black">
                            {lead.buyer_name.charAt(0)}
                          </div>
                          {lead.buyer_name}
                          {lead.company_name && <span className="text-gray-400 font-normal text-[11px]">({lead.company_name})</span>}
                        </div>
                        <a href={`tel:${lead.buyer_phone}`} className="flex items-center gap-1 text-[12px] text-[#1B5E20] font-bold hover:underline">
                          <Phone size={13} /> {lead.buyer_phone}
                        </a>
                        {lead.buyer_email && (
                          <a href={`mailto:${lead.buyer_email}`} className="flex items-center gap-1 text-[12px] text-[#1565C0] font-bold hover:underline">
                            <Mail size={13} /> {lead.buyer_email}
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="relative overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-4">
                        <div className="flex items-center gap-3 blur-sm select-none pointer-events-none opacity-40">
                          <div className="w-7 h-7 bg-gray-400 rounded-full" />
                          <div className="h-4 bg-gray-400 rounded w-24" />
                          <div className="h-4 bg-gray-400 rounded w-32" />
                        </div>
                        
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                          <div className="flex items-center gap-1.5 text-[12px] font-black text-gray-700">
                             🔒 Contact Details Locked
                          </div>
                          <button 
                            onClick={() => handleUnlock(lead)}
                            disabled={unlocking === lead.id}
                            className="bg-[#1B5E20] hover:bg-[#2E7D32] text-white px-5 py-2 rounded-lg text-[11px] font-black transition-all active:scale-95 shadow-lg shadow-green-100 disabled:opacity-50">
                            {unlocking === lead.id ? 'Unlocking...' : `Unlock Lead for ₹${lead.unlock_fee}`}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Respond */}
                  {lead.is_unlocked && lead.status === 'open' && (
                    <div className="mt-6 border-t border-gray-100 pt-4">
                      {respondingTo === lead.id ? (
                        <div className="bg-blue-50/50 rounded-xl border border-blue-100 p-4 animate-fadeIn">
                          <h4 className="text-[13px] font-black text-[#0D47A1] mb-3 flex items-center gap-2">
                             📄 Submit Bulk Quote
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase">Unit Price (₹)</label>
                              <input type="number" 
                                value={quoteForm.unitPrice} 
                                onChange={e => setQuoteForm(p => ({ ...p, unitPrice: e.target.value }))}
                                placeholder="e.g. 250"
                                className="w-full p-2 border border-gray-300 rounded text-sm outline-none focus:border-[#0D47A1]" />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase">Total Offer (₹)</label>
                              <input type="number" 
                                value={quoteForm.totalAmount} 
                                onChange={e => setQuoteForm(p => ({ ...p, totalAmount: e.target.value }))}
                                placeholder="e.g. 125000"
                                className="w-full p-2 border border-gray-300 rounded text-sm outline-none focus:border-[#0D47A1]" />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase">Est. Delivery (Days)</label>
                              <input type="number" 
                                value={quoteForm.estimatedDays} 
                                onChange={e => setQuoteForm(p => ({ ...p, estimatedDays: e.target.value }))}
                                placeholder="e.g. 15"
                                className="w-full p-2 border border-gray-300 rounded text-sm outline-none focus:border-[#0D47A1]" />
                            </div>
                          </div>
                          
                          <div className="mb-3">
                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Additional Terms / Description</label>
                            <textarea
                              value={quoteForm.terms}
                              onChange={e => setQuoteForm(p => ({ ...p, terms: e.target.value }))}
                              placeholder="Describe your quality, MOQ fulfillment, or special terms..."
                              rows={3}
                              className="w-full p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#0D47A1] resize-none"
                            />
                          </div>

                          <div className="flex items-center gap-4 mb-4">
                             <label className="flex items-center gap-2 cursor-pointer">
                               <input type="checkbox" 
                                 checked={quoteForm.samplesAvailable} 
                                 onChange={e => setQuoteForm(p => ({ ...p, samplesAvailable: e.target.checked }))}
                                 className="accent-[#0D47A1]" />
                               <span className="text-[12px] font-bold text-gray-600">Physical Samples Available</span>
                             </label>
                          </div>

                          <div className="flex gap-2">
                            <button onClick={() => handleRespond(lead.id)}
                              className="bg-[#0D47A1] hover:bg-[#1565C0] text-white px-5 py-2 rounded-lg text-[12px] font-black transition-all shadow-lg shadow-blue-100">
                              Submit Formal Quote
                            </button>
                            <button onClick={() => setRespondingTo(null)}
                              className="text-[12px] font-bold text-gray-500 hover:text-gray-700 px-3">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setRespondingTo(lead.id)}
                          className="bg-[#1B5E20] hover:bg-[#2E7D32] text-white px-5 py-2.5 rounded-xl text-[13px] font-black transition-all shadow-lg shadow-green-100 flex items-center gap-2 group">
                          <span className="group-hover:translate-x-0.5 transition-transform">📩 Submit Professional Quote</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
