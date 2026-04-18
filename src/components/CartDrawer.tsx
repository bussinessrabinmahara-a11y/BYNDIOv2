import { X, Trash2, ShoppingCart, LogIn, ArrowRight } from 'lucide-react';
import { useAppStore } from '../store';
import { useNavigate } from 'react-router-dom';

export default function CartDrawer({ isOpen, onClose, onOpenLogin }: {
  isOpen: boolean;
  onClose: () => void;
  onOpenLogin?: () => void;
}) {
  const { cart, products, addToCart, updateQty, removeFromCart, user, deliveryPincode, shippingMethodId } = useAppStore();
  const navigate = useNavigate();

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const savings = cart.reduce((sum, item) => sum + (item.mrp - item.price) * item.qty, 0);
  const subtotal = total;

  const handleCheckout = () => {
    if (!user) {
      onClose();
      onOpenLogin?.();
      return;
    }
    onClose();
    navigate('/checkout');
  };

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/45 z-[2000] transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div className={`fixed right-0 top-0 bottom-0 w-[380px] max-w-[95vw] bg-white z-[2001] flex flex-col shadow-[-4px_0_20px_rgba(0,0,0,0.2)] transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <span className="text-[15px] font-black text-[#0D47A1] flex items-center gap-2">
            <ShoppingCart size={18} /> My Bag
          </span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center py-5 text-center px-3">
              <span className="text-5xl block mb-3">🛒</span>
              <h3 className="text-[15px] font-bold text-gray-800 mb-1">Your cart is empty</h3>
              <p className="text-gray-500 text-[13px] mb-4">Add some amazing products!</p>
              {products.length > 0 && (
                <div className="w-full">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2 text-left">Popular picks</div>
                  <div className="flex flex-col gap-2">
                    {products.slice(0,3).map(p => (
                      <button key={p.id} onClick={() => { addToCart(p); }}
                        className="flex items-center gap-3 bg-gray-50 hover:bg-gray-100 rounded-xl p-2.5 text-left transition-colors w-full">
                        <div className="w-10 h-10 bg-white rounded-lg overflow-hidden flex items-center justify-center shrink-0 border border-gray-100">
                          {p.icon?.startsWith('http')
                            ? <img src={p.icon} alt={p.name} loading="lazy" className="w-full h-full object-cover"/>
                            : <span className="text-xl">{p.icon}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-bold truncate text-gray-800">{p.name}</div>
                          <div className="text-[11px] text-[#0D47A1] font-black">₹{p.price.toLocaleString('en-IN')}</div>
                        </div>
                        <div className="text-[10px] font-bold text-white bg-[#0D47A1] px-2 py-1 rounded-lg shrink-0">+ Add</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex gap-3 items-center p-2.5 border border-gray-100 rounded-xl bg-white shadow-sm">
                <div className="w-[44px] h-[44px] bg-gray-50 rounded-lg flex items-center justify-center shrink-0 overflow-hidden border border-gray-50">
                  {item.icon?.startsWith('http')
                    ? <img src={item.icon} alt={item.name} className="w-full h-full object-cover" />
                    : <span className="text-[24px]">{item.icon}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-black mb-0.5 truncate text-gray-800">{item.name}</div>
                  <div className="text-[13px] font-black text-[#0D47A1]">₹{item.price.toLocaleString('en-IN')}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <button onClick={() => updateQty(item.id, -1)} className="w-5 h-5 border border-gray-100 bg-white rounded-md flex items-center justify-center text-[10px] font-black hover:bg-gray-50">−</button>
                    <span className="text-[12px] font-bold min-w-[16px] text-center">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="w-5 h-5 border border-gray-100 bg-white rounded-md flex items-center justify-center text-[10px] font-black hover:bg-gray-50">+</button>
                  </div>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="text-gray-300 hover:text-red-500 ml-auto transition-colors p-1">
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-gray-100 p-3.5 bg-white">
            {savings > 0 && (
              <div className="text-[10px] text-[#388E3C] font-black mb-3 bg-green-50 px-2.5 py-1.5 rounded-lg flex items-center gap-2 border border-green-100/50">
                <span>🎉</span> SAVING ₹{savings.toLocaleString('en-IN')}
              </div>
            )}
 
            <div className="flex flex-col gap-1 mb-4">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Shipping Priority</div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 1, label: 'Standard', fee: 0 },
                  { id: 2, label: 'Express', fee: 80 },
                  { id: 3, label: 'Ultra', fee: 200 }
                ].map(s => (
                  <button 
                    key={s.id}
                    onClick={() => useAppStore.getState().setShippingMethodId(s.id)}
                    className={`flex flex-col items-center py-2 rounded-xl border text-[9px] font-black uppercase tracking-tight transition-all ${
                      shippingMethodId === s.id 
                        ? 'bg-[#0D47A1] border-[#0D47A1] text-white shadow-md' 
                        : 'bg-white border-gray-100 text-gray-400'
                    }`}>
                    {s.label}
                    <div className={shippingMethodId === s.id ? 'text-blue-200' : 'text-gray-300'}>₹{s.fee}</div>
                  </button>
                ))}
              </div>
            </div>
 
            <div className="space-y-3.5">
              <div className="flex justify-between items-end border-t border-gray-50 pt-3.5">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Total Payable</span>
                  <span className="text-[20px] font-black text-gray-900 leading-none">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="text-right">
                   <div className="text-[9px] font-black text-[#1565C0] uppercase tracking-widest mb-1">Estimating {deliveryPincode || 'Location'}</div>
                   <div className="text-[9px] text-[#1565C0]/60 font-black uppercase">Tax & VAT Included</div>
                </div>
              </div>
 
              <button
                onClick={handleCheckout}
                className="w-full bg-[#0D47A1] hover:bg-[#1565C0] text-white h-[48px] rounded-2xl font-black text-[14px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-blue-900/20 active:scale-95 transition-all"
              >
                {!user && <LogIn size={16} />}
                {user ? 'Secure Checkout' : 'Login Proceed'}
                {user && <ArrowRight size={16} />}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}