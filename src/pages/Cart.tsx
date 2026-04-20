import { Link } from 'react-router-dom';
import { usePageTitle } from '../lib/usePageTitle';
import { useAppStore } from '../store';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, ShieldCheck, AlertTriangle, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PageWrapper from '../components/PageWrapper';
import { checkCartCompliance, canSellerShipToState, INDIAN_STATES } from '../lib/gstCompliance';

export default function Cart() {
  usePageTitle('Your Shopping Cart - BYNDIO');
  const { cart, removeFromCart, updateQty, buyerState, setBuyerState } = useAppStore();

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalMrp = cart.reduce((sum, item) => sum + item.mrp * item.qty, 0);
  const savings = totalMrp - subtotal;
  const deliveryCharges = subtotal > 500 ? 0 : 49;
  const total = subtotal + deliveryCharges;

  // GST Compliance: Check cart items against buyer state
  const compliance = checkCartCompliance(
    cart.map(item => ({
      id: item.id,
      name: item.name,
      seller_state: item.seller_state,
      seller_has_gst: item.seller_has_gst,
    })),
    buyerState
  );

  if (cart.length === 0) {
    return (
      <PageWrapper>
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 bg-gray-50 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-[#0D47A1] mb-6"
          >
            <ShoppingBag size={48} />
          </motion.div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-500 mb-8 max-w-xs">Looks like you haven't added anything to your cart yet. Let's find some amazing products!</p>
          <Link to="/products" className="bg-[#0D47A1] text-white px-8 py-3.5 rounded-xl font-black shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
            Continue Shopping
          </Link>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="min-h-screen bg-gray-50 py-8 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-[28px] font-black text-gray-900 mb-8">Shopping Cart ({cart.length})</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">

              {/* GST Compliance Warning Banner */}
              {compliance.hasIssues && buyerState && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4 flex gap-3"
                >
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                    <AlertTriangle size={20} className="text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[13px] font-black text-orange-800 mb-1">Shipping Restriction – GST Compliance</h3>
                    <p className="text-[11px] text-orange-700 font-medium leading-relaxed mb-2">
                      {compliance.restrictedItems.length} item(s) in your cart cannot be shipped to <strong>{buyerState}</strong> because the seller(s) are not GST registered and can only sell within their state.
                    </p>
                    <div className="space-y-1">
                      {compliance.restrictedItems.map(item => (
                        <div key={String(item.id)} className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-1.5 border border-orange-100">
                          <span className="text-[11px] font-bold text-gray-700 truncate">{item.name}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[9px] font-black text-orange-600 uppercase">Ships in {item.sellerState} only</span>
                            <button 
                              onClick={() => removeFromCart(item.id)}
                              className="text-[9px] font-black text-red-500 hover:text-red-700 underline uppercase"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              <AnimatePresence>
                {cart.map((item) => {
                  const itemRestricted = buyerState ? !canSellerShipToState(item.seller_state, item.seller_has_gst ?? false, buyerState).allowed : false;
                  
                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`bg-white p-4 rounded-2xl shadow-sm border flex gap-4 ${itemRestricted ? 'border-orange-200 bg-orange-50/30' : 'border-gray-100'}`}
                    >
                      <div className="w-24 h-24 bg-gray-50 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                        {item.icon.startsWith('http') ? (
                          <img src={item.icon} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-4xl">{item.icon}</span>
                        )}
                      </div>
                      
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <Link to={`/product/${item.id}`} className="text-[15px] font-bold text-gray-900 hover:text-[#0D47A1] line-clamp-1">{item.name}</Link>
                            <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 size={18} />
                            </button>
                          </div>
                          <div className="text-[12px] text-gray-500 font-medium">{item.brand}</div>
                          
                          {/* GST Shipping Info */}
                          {item.seller_state && (
                            <div className={`flex items-center gap-1 mt-1 ${
                              item.seller_has_gst ? 'text-green-600' : itemRestricted ? 'text-orange-500' : 'text-gray-400'
                            }`}>
                              <MapPin size={10} />
                              <span className="text-[9px] font-black uppercase tracking-wider">
                                {item.seller_has_gst ? 'Ships Pan-India' : `Ships within ${item.seller_state} only`}
                              </span>
                              {itemRestricted && (
                                <span className="text-[8px] font-black text-red-500 bg-red-50 px-1.5 py-0.5 rounded ml-1">RESTRICTED</span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between items-end">
                          <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1 border border-gray-100">
                            <button 
                              onClick={() => updateQty(item.id, -1)}
                              className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-md transition-colors text-gray-600 disabled:opacity-30"
                              disabled={item.qty <= 1}
                            >
                              <Minus size={14} />
                            </button>
                            <span className="text-sm font-black w-4 text-center">{item.qty}</span>
                            <button 
                              onClick={() => updateQty(item.id, 1)}
                              className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-md transition-colors text-gray-600"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-black text-gray-900">₹{(item.price * item.qty).toLocaleString('en-IN')}</div>
                            {item.mrp > item.price && (
                              <div className="text-[11px] text-gray-400 line-through">₹{(item.mrp * item.qty).toLocaleString('en-IN')}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Price Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-24">
                <h2 className="text-[17px] font-black text-gray-900 mb-6 uppercase tracking-wider">Price Details</h2>
                
                {/* Buyer State Selector */}
                <div className="mb-6 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                  <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    <MapPin size={10} /> Your Delivery State
                  </label>
                  <select
                    value={buyerState || ''}
                    onChange={(e) => setBuyerState(e.target.value || null)}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-blue-200 text-[12px] font-bold text-gray-900 outline-none focus:border-[#0D47A1] transition-all appearance-none"
                  >
                    <option value="">Select your state</option>
                    {INDIAN_STATES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {!buyerState && (
                    <p className="text-[8px] text-blue-500 font-bold mt-1 uppercase">Select state to check shipping availability</p>
                  )}
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-[14px] text-gray-600">
                    <span>Price ({cart.length} items)</span>
                    <span>₹{totalMrp.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-[14px] text-gray-600">
                    <span>Discount</span>
                    <span className="text-green-600">-₹{savings.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-[14px] text-gray-600">
                    <span>Delivery Charges</span>
                    <span className="font-bold">{deliveryCharges === 0 ? <span className="text-green-600">FREE</span> : `₹${deliveryCharges}`}</span>
                  </div>
                  
                  <div className="border-t border-dashed border-gray-200 pt-4 flex justify-between text-lg font-black text-gray-900">
                    <span>Total Amount</span>
                    <span>₹{total.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="bg-green-50 text-green-700 text-[12px] font-bold p-3 rounded-lg border border-green-100 mb-6">
                  🎉 You will save ₹{savings.toLocaleString('en-IN')} on this order
                </div>

                {compliance.hasIssues && (
                  <div className="bg-orange-50 text-orange-700 text-[11px] font-bold p-3 rounded-lg border border-orange-200 mb-4 flex items-start gap-2">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>Remove restricted items to proceed. {compliance.restrictedItems.length} item(s) can't ship to {buyerState}.</span>
                  </div>
                )}

                <Link 
                  to={compliance.hasIssues ? '#' : '/checkout'}
                  onClick={(e) => { if (compliance.hasIssues) e.preventDefault(); }}
                  className={`w-full py-4 rounded-xl font-black text-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${
                    compliance.hasIssues 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-[#E65100] hover:bg-[#F57C00] text-white'
                  }`}
                >
                  {compliance.hasIssues ? 'REMOVE RESTRICTED ITEMS' : 'PLACE ORDER'} <ArrowRight size={20} />
                </Link>

                <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-gray-400 font-bold uppercase tracking-widest">
                  <ShieldCheck size={14} className="text-[#388E3C]"/> 100% SECURE TRANSACTIONS
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
