import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Check, Star, Plus, MapPin, AlertTriangle } from 'lucide-react';
import { Product, useAppStore } from '../store';
import { canSellerShipToState, getShippingBadge } from '../lib/gstCompliance';
import { getOptimizedImageUrl } from '../lib/images';
import { toast } from './Toast';

export default function ProductCard({ product }: { product: Product }) {
  const { addToCart, toggleWishlist, wishlist, buyerState } = useAppStore();
  const [justAdded, setJustAdded] = useState(false);
  const disc = Math.round((1 - product.price / product.mrp) * 100);
  const isWishlisted = (wishlist || []).includes(product.id);

  // GST Compliance: Check if this product can ship to buyer's state
  const gstCheck = canSellerShipToState(
    product.seller_state,
    product.seller_has_gst ?? false,
    buyerState
  );
  const shippingBadge = getShippingBadge(product.seller_state, product.seller_has_gst ?? false);
  const isRestricted = !gstCheck.allowed;

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // GST Compliance: Block add-to-cart for restricted items
    if (isRestricted) {
      toast(`⚠️ This seller ships within ${product.seller_state} only. Not available in ${buyerState}.`, 'error');
      return;
    }
    
    addToCart(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1800);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group"
    >
      <Link
        to={`/product/${product.id}`}
        className={`bg-white border text-left border-gray-100 rounded-xl overflow-hidden flex flex-col h-full transition-all duration-300 hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)] ${isRestricted ? 'opacity-60' : ''}`}
      >
        {/* Aspect Ratio Image Container */}
        <div className="aspect-square md:aspect-[3/4] bg-white relative overflow-hidden group/img">
          <img
            src={getOptimizedImageUrl(product.icon, 400, 500)}
            alt={product.name}
            className="w-full h-full object-contain p-2 transition-transform duration-700 group-hover/img:scale-110"
            loading="lazy"
            onError={e => { 
                const fallbacks: Record<string, string> = {
                  'Fashion': 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&q=80',
                  'Electronics': 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&q=80',
                  'Beauty': 'https://images.unsplash.com/photo-1596462502278-27bfdc4033c8?w=400&q=80',
                  'Kids': 'https://images.unsplash.com/photo-1515488442805-95967f7e81dd?w=400&q=80',
                  'Sports': 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80'
                };
                const catKey = product.category || product.cat || '';
                const matchedKey = Object.keys(fallbacks).find(k => catKey.toLowerCase().includes(k.toLowerCase()));
                (e.target as HTMLImageElement).src = (matchedKey ? fallbacks[matchedKey] : null) || 'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=400&q=80'; 
            }}
          />
          
          {/* Discount Badge */}
          {disc > 0 && (
            <div className="absolute top-2 left-2 bg-[#F50057] text-white text-[7px] md:text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm z-10">
              {disc}% OFF
            </div>
          )}

          {/* GST Restriction Overlay */}
          {isRestricted && (
            <div className="absolute inset-0 bg-black/10 flex items-center justify-center z-20">
              <div className="bg-white/95 backdrop-blur-sm rounded-lg px-2 py-1.5 shadow-md flex items-center gap-1 border border-orange-200">
                <AlertTriangle size={10} className="text-orange-500 shrink-0" />
                <span className="text-[7px] md:text-[8px] font-black text-orange-700 leading-tight">
                  Only ships in {product.seller_state}
                </span>
              </div>
            </div>
          )}

          {/* Desktop Floating Action - Premium Feel */}
          {!isRestricted && (
            <div className="hidden md:flex absolute inset-0 bg-black/5 opacity-0 group-hover/img:opacity-100 transition-opacity items-center justify-center gap-2">
               <button
                  onClick={handleAddToCart}
                  className="w-10 h-10 rounded-full bg-white text-[#0D47A1] shadow-xl flex items-center justify-center hover:bg-[#0D47A1] hover:text-white transition-all transform translate-y-4 group-hover/img:translate-y-0 duration-300"
                >
                  {justAdded ? <Check size={18} /> : <ShoppingCart size={18} />}
               </button>
            </div>
          )}

          {/* Wishlist Button */}
          <button
            onClick={handleWishlist}
            className="absolute top-2 right-2 z-10 bg-white/90 hover:bg-white text-gray-800 p-1.5 rounded-full shadow-md transition-all duration-300 md:opacity-0 md:group-hover/img:opacity-100 md:translate-x-2 md:group-hover/img:translate-x-0"
          >
            <Heart
              size={14}
              fill={isWishlisted ? '#F50057' : 'transparent'}
              color={isWishlisted ? '#F50057' : '#424242'}
            />
          </button>

          {/* Creator Tag */}
          {product.inf && (
            <div className="absolute bottom-2 left-2 bg-[#0D47A1] text-white text-[7px] md:text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-sm">
              CREATOR PICK
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="p-1.5 md:p-2.5 flex flex-col flex-1">
          <div className="flex items-center gap-1 mb-1">
            <div className="flex bg-[#388E3C] px-1 md:px-1 py-[1px] md:py-0.5 rounded-[2px] items-center gap-0.5">
              <span className="text-white text-[8px] md:text-[9px] font-black">{product.rating}</span>
              <Star size={6} fill="white" className="text-white md:w-2 md:h-2" />
            </div>
            <span className="hidden sm:inline text-[8px] md:text-[9px] text-gray-400 font-bold font-inter uppercase tracking-tighter">({product.reviews})</span>
          </div>

          <h3 className="text-[10px] md:text-[12px] font-black text-gray-800 leading-[1.1] md:leading-tight mb-1 md:mb-1.5 line-clamp-2 h-[22px] md:h-8 group-hover:text-[#0D47A1] transition-colors">
            {product.name}
          </h3>

          {/* GST Shipping Badge */}
          {product.seller_state && (
            <div className={`flex items-center gap-0.5 mb-1 ${
              shippingBadge.type === 'pan-india' ? 'text-green-600' : 
              shippingBadge.type === 'state-only' ? 'text-orange-500' : 'text-gray-400'
            }`}>
              <MapPin size={7} className="shrink-0" />
              <span className="text-[6px] md:text-[7px] font-black uppercase tracking-wider leading-none truncate">
                {shippingBadge.text}
              </span>
            </div>
          )}

          <div className="mt-auto flex flex-col md:flex-row md:items-end md:justify-between gap-1 md:gap-0">
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1">
                <span className="text-[11px] md:text-[14px] font-black text-gray-900">₹{product.price.toLocaleString('en-IN')}</span>
                <span className="text-[8px] md:text-[9px] text-gray-400 line-through font-bold">₹{product.mrp.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              onClick={handleAddToCart}
              className={`transition-all duration-300 flex items-center justify-center ${
                isRestricted
                  ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                  : justAdded
                  ? 'bg-[#388E3C] text-white border-[#388E3C]'
                  : 'bg-white hover:bg-gray-50 text-[#0D47A1] border border-gray-100 shadow-sm'
              } ${
                /* Mobile: full width button | Desktop: circle icon */
                'w-full py-1 rounded-md md:w-7 md:h-7 md:rounded-full text-[10px]'
              }`}
            >
              <span className="md:hidden font-black tracking-widest">
                {isRestricted ? 'UNAVAILABLE' : justAdded ? 'ADDED' : 'ADD'}
              </span>
              <span className="hidden md:block">
                {isRestricted ? <AlertTriangle size={12} /> : justAdded ? <Check size={14} /> : <Plus size={16} />}
              </span>
            </button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
