import { useState, useEffect } from 'react';
import { FileText, Download, Search, Eye, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store';
import { generatePDFInvoice } from '../lib/pdfInvoice';
import { toast } from '../components/Toast';

export default function Invoices() {
  const { user, myOrders, fetchMyOrders, isLoadingOrders } = useAppStore();
  const [search, setSearch] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => { if (user) fetchMyOrders(); }, [user?.id]);

  const handleDownload = async (order: any) => {
    setDownloading(order.id);
    try {
      const items = order.order_items?.map((item: any) => ({
        name: item.products?.name || 'Product',
        qty: item.quantity || 1,
        price: item.price || 0,
        gstRate: 18,
        hsn: '',
      })) || [{ name: 'Order Items', qty: 1, price: order.total_amount, gstRate: 18, hsn: '' }];

      const addr = order.shipping_address || {};

      generatePDFInvoice({
        orderId: order.id,
        orderDate: order.created_at,
        paymentMethod: order.payment_method || 'Online',
        paymentStatus: order.payment_status || 'paid',
        buyerName: user?.name || 'Customer',
        buyerEmail: user?.email || '',
        buyerAddress: [addr.line1, addr.city, addr.state, addr.pin].filter(Boolean).join(', ') || 'Address not available',
        sellerName: 'BYNDIO Technologies Pvt Ltd',
        sellerGST: '',
        items,
        shippingFee: order.shipping_fee || 0,
        platformFee: order.platform_fee || 10,
        codFee: order.cod_fee || 0,
        totalAmount: order.total_amount,
      });
    } catch {
      toast('Failed to generate invoice. Please try again.', 'error');
    } finally {
      setDownloading(null);
    }
  };

  const statusColor: Record<string, string> = {
    paid: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    failed: 'bg-red-100 text-red-700',
    refunded: 'bg-purple-100 text-purple-700',
  };

  const filtered = myOrders.filter(o =>
    o.id.toLowerCase().includes(search.toLowerCase()) ||
    o.status.toLowerCase().includes(search.toLowerCase()) ||
    o.payment_status.toLowerCase().includes(search.toLowerCase())
  );

  if (!user) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <FileText size={48} className="text-gray-300 mb-4" />
      <h2 className="text-xl font-black mb-2">Login to view invoices</h2>
      <Link to="/" className="bg-[#0D47A1] text-white px-6 py-2.5 rounded-md font-bold mt-4">Go Home</Link>
    </div>
  );

  return (
    <div className="bg-[#F5F5F5] min-h-screen">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 px-4 py-2.5 bg-white border-b border-gray-200">
        <Link to="/" className="text-[#1565C0] hover:underline">Home</Link> ›
        <span className="font-semibold text-gray-800">My Invoices</span>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h1 className="text-[18px] font-black">🧾 My Invoices</h1>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search orders..."
              className="pl-8 pr-4 py-2 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#1565C0] w-[200px]"
            />
          </div>
        </div>

        {/* Info banner */}
        <div className="bg-[#E3F2FD] border border-[#90CAF9] rounded-xl p-4 mb-5 flex gap-3">
          <FileText size={18} className="text-[#1565C0] shrink-0 mt-0.5" />
          <div className="text-[12px] text-[#0D47A1]">
            <strong>PDF Invoices:</strong> Click "Download PDF" to open a print-ready invoice. In the print dialog, choose <strong>"Save as PDF"</strong> to save it. Works in Chrome, Firefox, Safari, and Edge.
          </div>
        </div>

        {isLoadingOrders ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-[#0D47A1] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center shadow-sm">
            <Package size={48} className="mx-auto text-gray-200 mb-4" />
            <div className="text-[16px] font-black text-gray-400 mb-1">No invoices yet</div>
            <p className="text-gray-400 text-[13px] mb-4">Place your first order to get invoices here.</p>
            <Link to="/products" className="bg-[#0D47A1] text-white px-5 py-2.5 rounded-md font-bold text-sm">
              Shop Now
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(order => (
              <div key={order.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#E3F2FD] rounded-lg flex items-center justify-center shrink-0">
                      <FileText size={18} className="text-[#1565C0]" />
                    </div>
                    <div>
                      <div className="font-black text-[14px]">
                        INV-{order.id.slice(0, 8).toUpperCase()}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' · '}
                        {order.order_items?.length || 0} item{(order.order_items?.length || 0) !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="text-right">
                      <div className="font-black text-[15px]">₹{order.total_amount.toLocaleString('en-IN')}</div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${statusColor[order.payment_status] || 'bg-gray-100 text-gray-600'}`}>
                        {order.payment_status}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        to="/my-orders"
                        className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-md text-[12px] font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        <Eye size={13} /> Track
                      </Link>
                      <button
                        onClick={() => handleDownload(order)}
                        disabled={downloading === order.id}
                        className="flex items-center gap-1.5 px-3 py-2 bg-[#0D47A1] hover:bg-[#1565C0] disabled:bg-gray-300 text-white rounded-md text-[12px] font-bold transition-colors"
                      >
                        {downloading === order.id ? (
                          <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating...</>
                        ) : (
                          <><Download size={13} /> Download PDF</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Item preview */}
                {order.order_items && order.order_items.length > 0 && (
                  <div className="border-t border-gray-100 px-4 py-3 flex gap-2 flex-wrap">
                    {order.order_items.slice(0, 3).map((item: any, i: number) => (
                      <span key={i} className="text-[11px] text-gray-500 bg-gray-50 px-2 py-1 rounded-md">
                        {item.products?.name || 'Product'} × {item.quantity}
                      </span>
                    ))}
                    {order.order_items.length > 3 && (
                      <span className="text-[11px] text-gray-400 px-2 py-1">+{order.order_items.length - 3} more</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
