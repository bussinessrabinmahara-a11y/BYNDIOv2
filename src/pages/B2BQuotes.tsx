import { useState, useEffect } from 'react';
import { usePageTitle } from '../lib/usePageTitle';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { supabase } from '../lib/supabase';
import { toast, toastSuccess } from '../components/Toast';
import { FileText, Shield, Clock, CheckCircle, ArrowRight, MessageSquare, Download } from 'lucide-react';

interface Quote {
  id: string;
  lead_id: string;
  supplier_id: string;
  unit_price: number;
  total_amount: number;
  estimated_days: number;
  samples_available: boolean;
  terms: string;
  status: string;
  created_at: string;
  supplier_name?: string;
  escrow?: {
    id: string;
    status: string;
    escrow_amount: number;
  };
  has_rated?: boolean;
}

interface Lead {
  id: string;
  product_category: string;
  product_description: string;
  quantity: string;
  status: string;
  created_at: string;
  quotes: Quote[];
}

export default function B2BQuotes() {
  usePageTitle('Manage B2B Quotes');
  const { user, walletBalance, fetchWalletData } = useAppStore();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchLeadsAndQuotes();
      fetchWalletData();
    }
  }, [user?.id]);

  const fetchLeadsAndQuotes = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // 1. Fetch user's leads
      const { data: leadData, error: leadError } = await supabase
        .from('b2b_leads')
        .select('*')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (leadError) throw leadError;

      if (leadData) {
        const leadIds = leadData.map(l => l.id);
        
        // 2. Fetch quotes, escrows and ratings
        const { data: quoteData } = await supabase
          .from('b2b_quotes')
          .select('*, users!supplier_id(full_name)')
          .in('lead_id', leadIds);

        const { data: escrowData } = await supabase
          .from('b2b_escrow')
          .select('*')
          .in('quote_id', quoteData?.map(q => q.id) || []);

        const { data: ratingData } = await supabase
          .from('b2b_supplier_ratings')
          .select('quote_id')
          .in('quote_id', quoteData?.map(q => q.id) || []);

        const ratingSet = new Set(ratingData?.map(r => r.quote_id) || []);

        // 3. Combine data
        const combined = leadData.map(l => ({
          ...l,
          quotes: (quoteData || [])
            .filter(q => q.lead_id === l.id)
            .map(q => {
              const escrow = escrowData?.find(e => e.quote_id === q.id);
              return {
                ...q,
                supplier_name: q.users?.full_name || 'Verified Supplier',
                escrow: escrow ? { id: escrow.id, status: escrow.status, escrow_amount: escrow.escrow_amount } : undefined,
                has_rated: ratingSet.has(q.id)
              };
            })
        }));

        setLeads(combined);
      }
    } catch (err: any) {
      console.error(err);
      toast('Failed to load quotes. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayEscrow = async (quote: Quote) => {
    if (!user) return;
    
    // Escrow deposit is typically 10-20% of total amount or a fixed fee
    // For BYNDIO Phase 4, we'll take a 5% deposit to hold in escrow
    const depositAmount = Math.round(quote.total_amount * 0.05);
    
    if (walletBalance < depositAmount) {
      toast(`Insufficient wallet balance. ₹${depositAmount} deposit required.`, 'error');
      return;
    }

    setIsPaying(quote.id);
    try {
      // 1. Deduct from wallet
      const { error: walletError } = await supabase.rpc('deduct_wallet_balance', {
        p_user_id: user.id,
        p_amount: depositAmount
      });
      if (walletError) throw walletError;

      // 2. Create Escrow record
      const { error: escrowError } = await supabase.from('b2b_escrow').insert({
        quote_id: quote.id,
        buyer_id: user.id,
        supplier_id: quote.supplier_id,
        escrow_amount: depositAmount,
        status: 'held',
        release_code: Math.floor(100000 + Math.random() * 900000).toString() // OTP for release
      });
      if (escrowError) throw escrowError;

      // 3. Update quote status
      await supabase.from('b2b_quotes').update({ status: 'paid' }).eq('id', quote.id);
      
      toastSuccess('Escrow deposit paid! Supplier notified to start production.');
      fetchWalletData();
      fetchLeadsAndQuotes();
    } catch (err: any) {
      toast(err.message || 'Payment failed', 'error');
    } finally {
      setIsPaying(null);
    }
  };

  const handleReleaseEscrow = async (escrowId: string) => {
    if (!user || !window.confirm('Are you sure the goods are received and verified? This will release funds to the supplier.')) return;
    try {
      const { error } = await supabase.rpc('release_escrow', {
        p_escrow_id: escrowId,
        p_user_id: user.id
      });
      if (error) throw error;
      toastSuccess('Funds released to supplier! Thank you for choosing BYNDIO.');
      fetchLeadsAndQuotes();
    } catch (err: any) {
      toast(err.message || 'Release failed', 'error');
    }
  };

  const [ratingQuote, setRatingQuote] = useState<Quote | null>(null);
  const [ratings, setRatings] = useState({ quality: 5, timeline: 5, comms: 5, text: '' });

  const submitRating = async () => {
    if (!user || !ratingQuote) return;
    try {
      const { error } = await supabase.from('b2b_supplier_ratings').insert({
        supplier_id: ratingQuote.supplier_id,
        buyer_id: user.id,
        quote_id: ratingQuote.id,
        quality_rating: ratings.quality,
        timeline_rating: ratings.timeline,
        communication_rating: ratings.comms,
        review_text: ratings.text
      });
      if (error) throw error;
      toastSuccess('Rating submitted! help others choose better.');
      setRatingQuote(null);
      fetchLeadsAndQuotes();
    } catch (err: any) {
      toast(err.message || 'Rating failed', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
        <div className="w-10 h-10 border-4 border-[#0D47A1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-[#F5F5F5] min-h-screen pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 px-4 py-2.5 max-w-6xl mx-auto">
          <Link to="/" className="text-[#1565C0] hover:underline">Home</Link> ›
          <Link to="/b2b" className="text-[#1565C0] hover:underline">B2B Portal</Link> ›
          <span className="font-semibold text-gray-800">Quotes & Escrow</span>
        </div>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-[20px] font-black flex items-center gap-2">
            🏗️ My B2B Quotes
            <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold">Buyer View</span>
          </h1>
          <div className="bg-[#E3F2FD] border border-[#BBDEFB] px-4 py-1.5 rounded-full text-[12px] font-black text-[#0D47A1] flex items-center gap-2 shadow-sm">
            💰 Wallet: ₹{walletBalance.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="flex flex-col gap-6">
          {leads.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
              <div className="text-6xl mb-4">📝</div>
              <h2 className="text-xl font-black text-gray-800 mb-2">No active leads found</h2>
              <p className="text-gray-500 max-w-sm mx-auto mb-6 text-sm">Post a requirement to start receiving quotes from verified manufacturers and suppliers.</p>
              <Link to="/b2b" className="bg-[#0D47A1] text-white px-8 py-3 rounded-xl font-black text-[14px] shadow-lg shadow-blue-100">
                Post Requirement
              </Link>
            </div>
          ) : (
            leads.map(lead => (
              <div key={lead.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Lead Info */}
                <div className="bg-gray-50 p-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-xl shadow-sm border border-gray-200">
                      📦
                    </div>
                    <div>
                      <div className="text-[14px] font-black text-gray-800">{lead.product_category}</div>
                      <div className="text-[11px] text-gray-500 font-bold">Requirement ID: {lead.id.substring(0,8).toUpperCase()} • Qty: {lead.quantity}</div>
                    </div>
                  </div>
                  <div className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    lead.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {lead.status}
                  </div>
                </div>

                {/* Quotes List */}
                <div className="p-4">
                  <div className="text-[12px] font-black text-gray-400 mb-4 flex items-center gap-1.5">
                    <FileText size={14} /> Received Quotes ({lead.quotes.length})
                  </div>

                  {lead.quotes.length === 0 ? (
                    <div className="py-6 text-center">
                      <p className="text-[12px] text-gray-400 font-medium italic">Waiting for suppliers to respond. Matching in progress...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {lead.quotes.map(quote => (
                        <div key={quote.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-[#0D47A1] transition-colors relative group">
                          {quote.status === 'paid' && (
                            <div className="absolute top-3 right-3 bg-green-500 text-white rounded-full p-1 shadow-sm">
                              <CheckCircle size={14} />
                            </div>
                          )}
                          
                          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                            <div>
                              <div className="text-[13px] font-black text-gray-800 flex items-center gap-1.5">
                                {quote.supplier_name}
                                <span className="bg-blue-50 text-[#0D47A1] text-[9px] px-1.5 py-0.5 rounded border border-blue-100">VERIFIED</span>
                              </div>
                              <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-3">
                                <span className="flex items-center gap-1"><Clock size={11} /> Est. {quote.estimated_days} Days</span>
                                {quote.samples_available && <span className="text-green-600 flex items-center gap-1">✨ Samples Ready</span>}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-[16px] font-black text-[#0D47A1]">₹{quote.total_amount.toLocaleString('en-IN')}</div>
                              <div className="text-[10px] text-gray-400 font-bold">₹{quote.unit_price}/unit</div>
                            </div>
                          </div>

                          <div className="bg-gray-50 rounded-lg p-3 mb-4">
                            <div className="text-[11px] font-bold text-gray-500 uppercase mb-1">Supplier Terms:</div>
                            <p className="text-[12px] text-gray-600 line-clamp-2 italic">"{quote.terms}"</p>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                               <button className="flex items-center gap-1.5 text-[11px] font-black text-gray-500 hover:text-[#0D47A1] transition-colors">
                                 <MessageSquare size={13} /> Chat
                               </button>
                               <button className="flex items-center gap-1.5 text-[11px] font-black text-gray-500 hover:text-[#0D47A1] transition-colors">
                                 <Download size={13} /> PDF
                               </button>
                            </div>
                            
                            {quote.status === 'paid' && quote.escrow?.status === 'held' ? (
                              <button 
                                onClick={() => handleReleaseEscrow(quote.escrow!.id)}
                                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-[11px] font-black shadow-lg shadow-green-100 transition-all active:scale-95 flex items-center gap-2">
                                ✅ Release Funds to Supplier
                              </button>
                            ) : quote.escrow?.status === 'released' ? (
                              <div className="flex items-center gap-3">
                                <div className="bg-gray-100 text-gray-500 px-4 py-2 rounded-lg text-[11px] font-extrabold border border-gray-200">
                                  COMPLETED
                                </div>
                                {!quote.has_rated && (
                                  <button 
                                    onClick={() => setRatingQuote(quote)}
                                    className="bg-amber-100 text-amber-700 border border-amber-200 px-4 py-2 rounded-lg text-[11px] font-black hover:bg-amber-200 transition-colors">
                                    ⭐ Rate Supplier
                                  </button>
                                )}
                              </div>
                            ) : (
                               <button 
                                 onClick={() => handlePayEscrow(quote)}
                                 disabled={isPaying === quote.id}
                                 className="bg-[#0D47A1] hover:bg-[#1565C0] text-white px-5 py-2 rounded-lg text-[11px] font-black shadow-lg shadow-blue-100 disabled:opacity-50 transition-all active:scale-95 flex items-center gap-2">
                                 {isPaying === quote.id ? 'Processing...' : (
                                   <>Pay Escrow Deposit (5%) <ArrowRight size={12} /></>
                                 )}
                               </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-[14px] font-black text-[#0D47A1] mb-3 flex items-center gap-2">
              <Shield size={16} /> BYNDIO Escrow Protection
            </h3>
            <p className="text-[11px] text-gray-600 leading-relaxed mb-4">
              Your bulk transactions are 100% safe on BYNDIO. We hold your deposit in a secure escrow account and only release it when:
            </p>
            <div className="space-y-3">
              {[
                'You receive and verify the goods',
                'Sample quality matches the quote',
                'Production reaches agreed milestones'
              ].map((text, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <CheckCircle size={12} className="text-green-500 mt-0.5 shrink-0" />
                  <span className="text-[11px] font-bold text-gray-700">{text}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-gray-100">
              <button className="text-[11px] font-black text-[#0D47A1] hover:underline flex items-center gap-1.5">
                Learn how Escrow works <ArrowRight size={10} />
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12" />
            <h3 className="text-[14px] font-black mb-1">Need customized support?</h3>
            <p className="text-[11px] text-white/80 mb-4">Get a dedicated procurement manager for orders above ₹5 Lakhs.</p>
            <button className="bg-white text-indigo-700 w-full py-2 rounded-lg text-[11px] font-black flex items-center justify-center gap-2 shadow-lg">
              Talk to Expert
            </button>
          </div>
        </div>
      </div>

      {/* Rating Modal */}
      {ratingQuote && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fadeIn">
            <div className="bg-[#0D47A1] p-5 text-white">
               <h3 className="text-lg font-black flex items-center gap-2">⭐ Rate {ratingQuote.supplier_name}</h3>
               <p className="text-[11px] opacity-75">Your feedback helps maintain high standards on BYNDIO.</p>
            </div>
            <div className="p-6 space-y-4">
               {[
                 { id: 'quality', label: 'Product Quality' },
                 { id: 'timeline', label: 'Meeting Deadlines' },
                 { id: 'comms', label: 'Communication' }
               ].map(r => (
                 <div key={r.id}>
                    <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1.5">{r.label}</label>
                    <div className="flex gap-2">
                       {[1,2,3,4,5].map(v => (
                         <button 
                           key={v}
                           onClick={() => setRatings(p => ({ ...p, [r.id]: v }))}
                           className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all ${
                             (ratings as any)[r.id] >= v ? 'bg-amber-100 border-amber-200 text-amber-600 scale-110' : 'bg-gray-50 border-gray-200 text-gray-300'
                           } border`}>
                           ★
                         </button>
                       ))}
                    </div>
                 </div>
               ))}
               
               <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1.5">Detailed Review</label>
                  <textarea 
                    value={ratings.text}
                    onChange={e => setRatings(p => ({ ...p, text: e.target.value }))}
                    placeholder="Describe your experience with this supplier..."
                    rows={4}
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#0D47A1] resize-none" />
               </div>

               <div className="flex gap-3 pt-2">
                  <button 
                    onClick={submitRating}
                    className="flex-1 bg-[#0D47A1] text-white py-3 rounded-xl font-black text-[14px] shadow-lg shadow-blue-100">
                    Submit Rating
                  </button>
                  <button 
                    onClick={() => setRatingQuote(null)}
                    className="px-6 bg-gray-100 text-gray-500 py-3 rounded-xl font-black text-[14px]">
                    Later
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
