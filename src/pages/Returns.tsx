import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store';
import { supabase } from '../lib/supabase';

export default function Returns() {
  const { user, myOrders, fetchMyOrders } = useAppStore();
  const [selectedOrderItem, setSelectedOrderItem] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [myReturns, setMyReturns] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchMyOrders();
      fetchMyReturns();
    }
  }, [user?.id]);

  const fetchMyReturns = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('return_requests')
        .select('*, orders(id, total_amount), order_items(id, quantity, price, products(name))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setMyReturns(data);
    } catch (err: any) {
      // silently fail — non-critical fetch
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderItem || !reason.trim()) return;
    setSubmitting(true);
    try {
      const [orderId, itemId] = selectedOrderItem.split('|');
      const { error } = await supabase.from('return_requests').insert({ order_id: orderId, order_item_id: itemId, user_id: user!.id, reason: reason.trim() });
      if (error) throw error;
      setMessage('✅ Return request submitted! Our team will respond within 24 hours.');
      setSelectedOrderItem(''); setReason('');
      fetchMyReturns();
    } catch (err: any) {
      setMessage('❌ ' + (err.message || 'Failed to submit return request'));
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (s: string) => ({ pending: 'bg-amber-100 text-amber-700', approved: 'bg-blue-100 text-blue-700', rejected: 'bg-red-100 text-red-700', picked_up: 'bg-purple-100 text-purple-700', refunded: 'bg-green-100 text-green-700' }[s] || 'bg-gray-100 text-gray-600');

  const deliveredOrders = myOrders.filter(o => o.status === 'delivered');

  return (
    <div className="bg-[#F5F5F5] min-h-screen">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 px-4 py-2.5 bg-white border-b border-gray-200">
        <Link to="/" className="text-[#1565C0] hover:underline">Home</Link> ›
        <Link to="/my-orders" className="text-[#1565C0] hover:underline">My Orders</Link> ›
        <span className="font-semibold text-gray-800">Returns & Refunds</span>
      </div>
      <div className="max-w-4xl mx-auto p-4 md:p-6 flex flex-col gap-5">
        <h1 className="text-[18px] font-black">↩️ Returns & Refunds</h1>

        {/* Policy */}
        <div className="bg-[#E3F2FD] border border-[#90CAF9] rounded-xl p-4">
          <div className="font-black text-[#0D47A1] text-[14px] mb-2">Return Policy</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: '📦', title: '7-Day Returns', desc: 'Return within 7 days of delivery for most products.' },
              { icon: '💰', title: 'Easy Refunds', desc: 'Refund to original payment method within 5–7 working days.' },
              { icon: '🚚', title: 'Free Pickup', desc: 'We arrange reverse pickup at no cost to you.' },
            ].map((p, i) => <div key={i} className="flex items-start gap-2"><span className="text-[20px]">{p.icon}</span><div><div className="text-[12px] font-bold text-[#0D47A1]">{p.title}</div><div className="text-[11px] text-gray-600">{p.desc}</div></div></div>)}
          </div>
        </div>

        {/* Request form */}
        {user ? (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="text-[15px] font-black mb-4">Submit Return Request</div>
            {deliveredOrders.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <div className="text-4xl mb-2">📦</div>
                <p className="text-sm">No delivered orders eligible for return yet.</p>
                <Link to="/my-orders" className="mt-3 inline-block text-[#1565C0] font-semibold text-sm hover:underline">View My Orders</Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Select Order Item</label>
                  <select value={selectedOrderItem} onChange={e => setSelectedOrderItem(e.target.value)} required className="p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#1565C0] bg-white">
                    <option value="">Choose an item to return...</option>
                    {deliveredOrders.flatMap(order => (order.order_items || []).map(item => (
                      <option key={item.id} value={`${order.id}|${item.id}`}>
                        #{(order.id || '').slice(0,8).toUpperCase()} — {(item.products as any)?.name || 'Product'} (Qty: {item.quantity})
                      </option>
                    )))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Reason for Return</label>
                  <select value={reason} onChange={e => setReason(e.target.value)} required className="p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#1565C0] bg-white">
                    <option value="">Select a reason...</option>
                    <option>Damaged / Defective product</option>
                    <option>Wrong item delivered</option>
                    <option>Product not as described</option>
                    <option>Size / Fit issue</option>
                    <option>Changed my mind</option>
                    <option>Missing accessories</option>
                    <option>Other</option>
                  </select>
                </div>
                {message && <div className={`text-[12px] font-semibold p-2 rounded ${message.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{message}</div>}
                <button type="submit" disabled={submitting} className="bg-[#0D47A1] hover:bg-[#1565C0] disabled:bg-gray-400 text-white py-2.5 rounded-md text-[14px] font-bold transition-colors">
                  {submitting ? 'Submitting...' : '↩️ Submit Return Request'}
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-6 text-center shadow-sm">
            <div className="text-4xl mb-3">🔒</div>
            <p className="text-gray-600 mb-4">Please login to submit a return request.</p>
            <Link to="/" className="bg-[#0D47A1] text-white px-5 py-2 rounded-md font-bold text-sm">Login</Link>
          </div>
        )}

        {/* My return history */}
        {myReturns.length > 0 && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="text-[15px] font-black mb-3">My Return Requests</div>
            <div className="flex flex-col gap-3">
              {myReturns.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <div className="text-[13px] font-bold">{(r.order_items?.products as any)?.name || 'Product'}</div>
                    <div className="text-[11px] text-gray-500">{r.reason}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{new Date(r.created_at).toLocaleDateString('en-IN')}</div>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${getStatusColor(r.status)}`}>{r.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
