import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../store';

export default function OrderSuccess() {
  const { fetchMyOrders } = useAppStore();
  const location = useLocation();

  useEffect(() => {
    fetchMyOrders();
  }, [fetchMyOrders]);

  // Use passed order ID or fallback
  const passedId = location.state?.orderId;
  const orderId = passedId
    ? `#${passedId.slice(0, 8).toUpperCase()}`
    : '#ORD-PENDING';

  const steps = [
    { icon: '✓', label: 'Order Placed', sub: 'Verified & Confirmed', done: true },
    { icon: '📦', label: 'Processing', sub: 'Quality Check Stage', done: false },
    { icon: '🚚', label: 'Shipped', sub: 'Est. Shipment Today', done: false },
    { icon: '🏠', label: 'Delivered', sub: 'Express: 2-4 Days', done: false },
  ];

  return (
    <div className="flex items-center justify-center min-h-[70vh] p-6 bg-[#F5F5F5]">
      <div className="bg-white rounded-2xl p-8 max-w-[500px] w-full text-center shadow-lg">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-[40px]">✅</span>
        </div>
        <div className="text-2xl font-black text-[#388E3C] mb-1">Order Placed!</div>
        <div className="text-sm text-gray-500 mb-4">Thank you for shopping with BYNDIO 🎉</div>

        <div className="inline-flex items-center gap-2 bg-[#E3F2FD] text-[#0D47A1] font-bold px-5 py-2 rounded-md mb-6 text-[14px]">
          <span>Order ID:</span>
          <span className="font-black">{orderId}</span>
        </div>

        {/* Progress steps */}
        <div className="bg-gray-50 rounded-xl p-4 text-left mb-6">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 transition-colors ${step.done ? 'bg-[#388E3C] text-white' : 'bg-gray-200 text-gray-500'}`}>
                {step.icon}
              </div>
              <div>
                <div className={`text-[13px] font-bold ${step.done ? 'text-gray-900' : 'text-gray-500'}`}>{step.label}</div>
                <div className="text-[11px] text-gray-400">{step.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Delivery info */}
        <div className="bg-blue-50 rounded-lg px-4 py-3 text-left mb-6 flex items-start gap-2">
          <span className="text-lg">📧</span>
          <p className="text-[12px] text-blue-800">
            Order confirmation has been sent to your registered email. You can track your order anytime from <strong>My Orders</strong>.
          </p>
        </div>

        <div className="flex gap-2.5 justify-center flex-wrap">
          <Link
            to="/my-orders"
            className="bg-[#0D47A1] hover:bg-[#1565C0] text-white px-5 py-2.5 rounded-md text-sm font-bold transition-colors"
          >
            📦 Track My Order
          </Link>
          <Link
            to="/products"
            className="bg-white text-[#0D47A1] border-2 border-[#0D47A1] hover:bg-[#E3F2FD] px-5 py-2.5 rounded-md text-sm font-bold transition-colors"
          >
            🛍 Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
