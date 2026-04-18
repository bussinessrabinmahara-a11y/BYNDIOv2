import React, { useEffect } from 'react';
import { usePageTitle } from '../lib/usePageTitle';
import { Link } from 'react-router-dom';
import { useAppStore, Order } from '../store';
import { supabase } from '../lib/supabase';
import { toast, toastSuccess } from '../components/Toast';
import { Package, Truck, CheckCircle, Clock, XCircle, ChevronRight, Download } from 'lucide-react';
import { generateGSTInvoice } from '../lib/gstInvoice';

const STATUS_CONFIG: Record<Order['status'], { icon: React.ElementType; color: string; bg: string; label: string }> = {
  pending:    { icon: Clock,         color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200',   label: 'Order Placed' },
  processing: { icon: Package,       color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',     label: 'Processing' },
  shipped:    { icon: Truck,         color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', label: 'Shipped' },
  delivered:  { icon: CheckCircle,   color: 'text-green-700',  bg: 'bg-green-50 border-green-200',   label: 'Delivered' },
  cancelled:  { icon: XCircle,       color: 'text-red-700',    bg: 'bg-red-50 border-red-200',       label: 'Cancelled' },
};

const PAYMENT_STATUS_COLORS: Record<Order['payment_status'], string> = {
  pending:  'text-amber-600',
  paid:     'text-green-600',
  failed:   'text-red-600',
  refunded: 'text-blue-600',
};

export default function MyOrders() {
  usePageTitle('My Orders');
  const { myOrders: realOrders, isLoadingOrders, fetchMyOrders, user } = useAppStore();

  // Mock orders for previewing when not logged in
  const mockOrders: Order[] = [
    {
      id: 'BYN-9982-X',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'processing',
      total_amount: 12450,
      buyer_id: 'demo',
      payment_status: 'paid',
      payment_method: 'card',
      shipping_address: { fullName: 'Rabin Mahara', line1: 'Kathmandu, NP', city: 'KTM', state: 'Bagmati', pin: '44600' },
      order_items: [
        { id: 'item-1', order_id: 'BYN-9982-X', product_id: 'p1', quantity: 2, price: 6225, products: { name: 'Premium Tech Watch V2', images: ['https://p1.pxfuel.com/preview/653/702/439/analog-watch-clocks-time.jpg'] } } as any
      ]
    },
    {
      id: 'BYN-7721-Y',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date().toISOString(),
      status: 'delivered',
      total_amount: 8900,
      buyer_id: 'demo',
      payment_status: 'paid',
      payment_method: 'card',
      shipping_address: { fullName: 'Rabin Mahara', line1: 'Lalitpur, NP', city: 'LPT', state: 'Bagmati', pin: '44700' },
      order_items: [
        { id: 'item-2', order_id: 'BYN-7721-Y', product_id: 'p2', quantity: 1, price: 8900, products: { name: 'Elite Leather Satchel', images: ['https://c1.staticflickr.com/9/8390/8617154235_5e8d1a1df2_b.jpg'] } } as any
      ]
    }
  ];

  const myOrders = realOrders.length > 0 ? realOrders : mockOrders;

  const handleCancelOrder = async (orderId: string, paymentStatus: string, paymentId: string | undefined, totalAmount: number) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      // RLS policy only allows cancelling 'pending' orders
      const { error } = await supabase.from('orders').update({
        status: 'cancelled',
      }).eq('id', orderId).eq('buyer_id', user?.id).eq('status', 'pending');
      if (error) throw error;

      // Trigger refund if order was already paid
      if (paymentStatus === 'paid' && paymentId && !paymentId.startsWith('DEMO-') && !paymentId.startsWith('COD-')) {
        const { processRefund } = await import('../lib/email');
        const result = await processRefund(paymentId, totalAmount, { reason: 'Cancelled by buyer' });
        if (result.success) {
          await supabase.from('orders').update({ payment_status: 'refunded' }).eq('id', orderId);
          toastSuccess('Order cancelled. Refund of ₹' + totalAmount.toLocaleString('en-IN') + ' initiated — arrives in 5–7 business days.');
        } else {
          toastSuccess('Order cancelled. Contact support@byndio.in to process your refund.');
        }
      } else {
        toastSuccess('Order cancelled successfully.');
      }
      fetchMyOrders();
    } catch {
      toast('Could not cancel this order. Only pending orders can be cancelled — contact support if needed.', 'error');
    }
  };

  const downloadInvoice = async (order: Order) => {
    await generateGSTInvoice({
      orderId: order.id,
      orderDate: order.created_at,
      buyerName: order.shipping_address.fullName || user?.name || 'Customer',
      buyerAddress: `${order.shipping_address.line1 || ''}, ${order.shipping_address.city || ''}, ${order.shipping_address.state || ''} - ${order.shipping_address.pin || ''}`,
      sellerName: 'BYNDIO Technologies Pvt Ltd',
      sellerGST: '',
      items: (order.order_items || []).map(item => ({
        name: (item.products as any)?.name || 'Product',
        qty: item.quantity,
        price: item.price,
        gstRate: 18,
        hsn: '6203',
      })),
      shippingFee: 0,
      platformFee: 10,
      totalAmount: order.total_amount,
    });
  };

  useEffect(() => {
    fetchMyOrders();
  }, []);

  if (isLoadingOrders) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#0D47A1] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500 font-medium">Loading your orders...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FAFAFA] min-h-screen pb-20">
      {/* High-Density Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between sticky top-0 z-50">
        <div>
           <div className="flex items-center gap-1.5 text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">
              <Link to="/" className="hover:text-[#0D47A1]">Portal</Link> / <span>Orders</span>
           </div>
           <h1 className="text-[17px] font-black text-gray-900 leading-none">📦 Your Pipeline</h1>
        </div>
        <div className="flex flex-col items-end">
           <span className="text-[10px] font-black text-[#0D47A1] bg-blue-50 px-2 py-0.5 rounded-full">{myOrders.length} Tracks</span>
           <button onClick={fetchMyOrders} className="text-[8px] font-black text-gray-300 uppercase tracking-widest mt-1">↻ Refresh</button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-3 space-y-3">
        {myOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-white rounded-3xl border border-dashed border-gray-200 mt-4">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-4xl mb-4">🛒</div>
            <h3 className="text-xl font-black text-gray-900">Pipeline Empty</h3>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wide mt-2">Start your procurement journey</p>
            <Link to="/products" className="bg-[#0D47A1] text-white px-8 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest mt-6 shadow-xl shadow-blue-900/10">Browse Supply</Link>
          </div>
        ) : (
          myOrders.map(order => {
            const statusCfg = STATUS_CONFIG[order.status];
            const StatusIcon = statusCfg.icon;
            const date = new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

            return (
              <div key={order.id} className="bg-white rounded-[24px] border border-gray-100 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] overflow-hidden transition-all active:scale-[0.98]">
                {/* Micro Header */}
                <div className="px-4 py-3 flex items-center justify-between bg-gray-50/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400">
                      <Package size={18} />
                    </div>
                    <div>
                      <div className="text-[12px] font-black text-gray-900 italic tracking-tighter">#{(order.id || '').split('-')[0].toUpperCase()}</div>
                      <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{date} • ₹{order.total_amount.toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-tight ${statusCfg.bg} ${statusCfg.color}`}>
                    <StatusIcon size={10} />
                    {statusCfg.label}
                  </div>
                </div>

                {/* Progress Spark */}
                <div className="px-4 py-2 border-y border-gray-50">
                  <div className="flex items-center justify-between gap-1">
                    {(['pending', 'processing', 'shipped', 'delivered'] as const).map((step, i) => {
                      const isCompleted = ['pending', 'processing', 'shipped', 'delivered'].indexOf(order.status) >= i;
                      return (
                        <div key={step} className="flex-1 flex flex-col items-center gap-1">
                          <div className={`h-1 w-full rounded-full ${isCompleted ? 'bg-[#0D47A1]' : 'bg-gray-100'}`} />
                          <span className={`text-[6px] font-black uppercase tracking-tighter ${isCompleted ? 'text-gray-900' : 'text-gray-300'}`}>{step}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Compact Item List */}
                <div className="p-4 space-y-3">
                  {(order.order_items || []).map(item => (
                    <div key={item.id} className="flex items-center gap-3">
                       <div className="w-12 h-12 bg-[#FAFAFA] rounded-xl border border-gray-50 flex items-center justify-center p-2">
                          <img src={item.products?.images?.[0] || 'https://via.placeholder.com/100'} className="w-full h-full object-contain mix-blend-multiply" alt="item" />
                       </div>
                       <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-black text-gray-900 truncate tracking-tight">{item.products?.name}</div>
                          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{item.quantity} UNITS @ ₹{item.price}</div>
                       </div>
                    </div>
                  ))}
                </div>

                {/* Actions Grid */}
                <div className="px-3 pb-3 grid grid-cols-3 gap-2">
                   <button onClick={() => downloadInvoice(order)} className="bg-gray-50 text-gray-600 h-9 rounded-xl flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-widest border border-gray-100 transition-colors active:bg-gray-100">
                      <Download size={12}/> Bill
                   </button>
                   {order.tracking_awb ? (
                      <a href={order.tracking_url || '#'} className="bg-[#E3F2FD] text-[#0D47A1] h-9 rounded-xl flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-widest border border-[#BBDEFB]">
                        <Truck size={12}/> Track
                      </a>
                   ) : (
                      <button disabled className="bg-gray-50 text-gray-300 h-9 rounded-xl flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-widest border border-gray-100 opacity-50">
                        <Clock size={12}/> Wait
                      </button>
                   )}
                   <Link to="/returns" className="bg-gray-50 text-[#F50057] h-9 rounded-xl flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-widest border border-[#FF80AB]">
                      Return <ChevronRight size={10}/>
                   </Link>
                </div>
                
                {order.status === 'pending' && (
                   <div className="px-3 pb-3">
                      <button onClick={() => handleCancelOrder(order.id, order.payment_status, order.payment_id, order.total_amount)}
                        className="w-full h-8 text-[9px] font-black text-red-500 uppercase tracking-[0.2em] border border-red-50 hover:bg-red-50 rounded-lg transition-colors">
                        ⚠ Terminate Purchase
                      </button>
                   </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
