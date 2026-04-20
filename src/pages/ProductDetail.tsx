import { useState, useCallback, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import { usePageTitle } from '../lib/usePageTitle';
import { useAppStore } from '../store';
import { 
  ChevronLeft, Share2, Heart, Star, Truck, ShieldCheck, 
  RotateCcw, Info, ShoppingBag, CheckCircle2, Award, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PageWrapper from '../components/PageWrapper';
import { supabase } from '../lib/supabase';
import { toast, toastSuccess } from '../components/Toast';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, addToCart, toggleWishlist, wishlist } = useAppStore();
  const product = products.find(p => p.id.toString() === id);
  
  usePageTitle(product ? `${product.name} - BYNDIO` : 'Product Not Found');

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pincode, setPincode ] = useState('');
  const [deliveryInfo, setDeliveryInfo] = useState<{days: number, valid: boolean} | null>(null);
  // H-05: Track real stock status
  const [stockQty, setStockQty] = useState<number | null>(null);
  // H-06: Real reviews from DB
  const [realReviews, setRealReviews] = useState<any[]>([]);
  const [hasReviewed, setHasReviewed] = useState(false); // H-05
  const [selectedSize, setSelectedSize] = useState<string | null>(null); // H-06
  const [selectedColor, setSelectedColor] = useState<string | null>(null); // H-06
  const { user } = useAppStore();
  const [sellerInfo, setSellerInfo] = useState<{state: string, gst_number: string} | null>(null);
  const [buyerState, setBuyerState] = useState<string | null>(null);

  // L-04: Track recently viewed on mount
  const addRecentlyViewed = useAppStore(s => s.addRecentlyViewed);
  useEffect(() => {
    if (product) addRecentlyViewed(product.id);
  }, [product?.id]);

  // H-05: Fetch real stock quantity from products table
  useEffect(() => {
    if (!product) return;
    supabase.from('products').select('stock_quantity').eq('id', product.id).single()
      .then(({ data }) => { if (data) setStockQty(data.stock_quantity); });
  }, [product?.id]);

  // H-06: Fetch real reviews joined with users
  useEffect(() => {
    if (!product) return;
    supabase.from('reviews')
      .select('*, users(full_name, avatar_url)')
      .eq('product_id', product.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { 
        if (data) setRealReviews(data); 
      });

    // Fetch Seller info for GST compliance
    supabase.from('sellers')
      .select('state, gst_number')
      .eq('id', product.seller_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setSellerInfo(data);
      });
  }, [product?.id]);

  // Fetch Buyer's state from default shipping address
  useEffect(() => {
    if (!user) return;
    supabase.from('shipping_addresses')
      .select('state')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setBuyerState(data.state);
      });
  }, [user?.id]);

  const avgRating = realReviews.length > 0 
    ? (realReviews.reduce((sum, r) => sum + r.rating, 0) / realReviews.length).toFixed(1)
    : product?.rating || 4.5;

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const scrollTo = useCallback((index: number) => emblaApi && emblaApi.scrollTo(index), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, onSelect]);

  if (!product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 bg-gray-50">
        <span className="text-4xl mb-4">🔍</span>
        <h2 className="text-xl font-bold mb-2">Product not found</h2>
        <Link to="/products" className="bg-[#0D47A1] text-white px-5 py-2.5 rounded-lg font-bold mt-2">Browse All</Link>
      </div>
    );
  }

  const isFavorited = wishlist.includes(product.id);
  const discount = Math.round(((product.mrp - product.price) / product.mrp) * 100);
  const isOutOfStock = stockQty !== null && stockQty <= 0;
  
  // Use only the product's actual images — no hardcoded unrelated images
  const images = [product.icon];

  const seller = {
    name: product.brand || 'Premium Vendor',
    joined: 'Jan 2023',
    isVerified: true,
    logo: 'https://i.pravatar.cc/150?u=seller'
  };

  // H-13: Real Delivery Estimates (Today + 3-7 days)
  const getDeliveryRange = () => {
    // TODO Session 9: Replace hardcoded +3/+7 days with actual min_days/max_days from shipping_methods table
    const today = new Date();
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + 3);
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 7);
    
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return `${minDate.toLocaleDateString('en-IN', options)} – ${maxDate.toLocaleDateString('en-IN', options)}`;
  };

  return (
    <PageWrapper>
      <div className="bg-white font-inter antialiased text-gray-900 pb-10">
        
        {/* Navigation / Header */}
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between border-b border-gray-100/50 mb-3">
           <nav className="flex items-center gap-1.5 text-[8px] font-bold text-gray-400 uppercase tracking-wider overflow-hidden">
              <Link to="/" className="hover:text-black shrink-0">Home</Link>
              <ChevronRight size={8} className="shrink-0" />
              <Link to="/products" className="hover:text-black shrink-0">Shop</Link>
              <ChevronRight size={8} className="shrink-0" />
              <span className="text-gray-900 truncate">{product.name}</span>
           </nav>
           <div className="flex gap-3">
              <button className="text-gray-400 hover:text-black"><Share2 size={14} /></button>
              <button onClick={() => toggleWishlist(product.id)} className={`transition-colors ${isFavorited ? 'text-red-500' : 'text-gray-400 hover:text-black'}`}>
                <Heart size={14} className={isFavorited ? 'fill-current' : ''} />
              </button>
           </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 lg:px-8">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 items-start">
              
              {/* LEFT: PREMIUM GALLERY AREA */}
              <div className="flex flex-col gap-4">
                 {/* Main Image View (Island Design) */}
                 <div className="relative aspect-[4/3] md:aspect-square lg:aspect-[4/5] max-h-[220px] md:max-h-[450px] lg:max-h-[520px] bg-[#F8F9FA] rounded-[16px] overflow-hidden border border-gray-100/50 shadow-sm mx-auto w-full">
                    <div className="h-full overflow-hidden" ref={emblaRef}>
                       <div className="flex h-full">
                          {images.map((img, i) => (
                            <div key={i} className="flex-[0_0_100%] min-w-0 h-full flex items-center justify-center p-4 md:p-8">
                               <img src={img} className="max-w-full max-h-full object-contain drop-shadow-2xl" alt="product" />
                            </div>
                          ))}
                       </div>
                    </div>
                    
                    {/* Banners */}
                    <div className="absolute top-6 left-6 flex flex-col gap-2">
                       <span className="bg-black text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">New Arrival</span>
                       {discount > 0 && <span className="bg-[#F50057] text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">-{discount}%</span>}
                    </div>

                    {/* Wishlist Button - Floating */}
                    <button 
                      onClick={() => toggleWishlist(product.id)}
                      className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md shadow-lg flex items-center justify-center text-gray-900 transition-all hover:scale-110 active:scale-95 z-20"
                    >
                      <Heart size={18} className={isFavorited ? 'fill-[#F50057] text-[#F50057]' : 'text-gray-400'} />
                    </button>
                 </div>

                 {/* Desktop Thumbnails / Pagination */}
                 <div className="flex items-center justify-center gap-2">
                    {images.map((img, i) => (
                      <button 
                        key={i}
                        onClick={() => scrollTo(i)}
                        className={`transition-all duration-300 rounded-full ${selectedIndex === i ? 'w-8 h-1.5 bg-gray-900' : 'w-2 h-1.5 bg-gray-200 hover:bg-gray-300'}`}
                      />
                    ))}
                 </div>
              </div>

              {/* RIGHT: COMPACT CONTENT AREA */}
              <div className="py-0">
                 <div className="space-y-4">
                                   <div className="space-y-2">
                        <div className="flex items-center gap-3">
                           <div className="flex items-center gap-1 bg-[#F5A623] text-white text-[11px] font-black px-2 py-1 rounded-full shadow-md">
                              {avgRating} <Star size={10} className="fill-current" />
                           </div>
                           <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{realReviews.length || product.reviews} Verified Reviews</span>
                        </div>
                        
                        <h1 className="text-[20px] lg:text-[24px] font-black text-gray-900 leading-tight uppercase">
                          {product.name}
                        </h1>
                        
                        <div className="flex items-end gap-3">
                           <span className="text-[22px] lg:text-[28px] font-black text-gray-900 leading-none">₹{product.price.toLocaleString('en-IN')}</span>
                           <div className="flex flex-col mb-0.5">
                              <span className="text-[10px] lg:text-[12px] text-gray-400 line-through font-bold">₹{product.mrp.toLocaleString('en-IN')}</span>
                              <span className="text-[8px] lg:text-[10px] font-black text-[#F50057] uppercase tracking-wider">Save ₹{(product.mrp - product.price).toLocaleString('en-IN')} ({discount}%)</span>
                           </div>
                        </div>
                     </div>

                        {/* H-06: SKU Variations Selection (Only for Fashion) */}
                       {product.cat === 'Fashion' && (
                         <div className="space-y-4 pt-2">
                            {/* Size Selection */}
                            <div className="space-y-2">
                               <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Select Size</span>
                                  <button className="text-[9px] font-bold text-[#0D47A1] uppercase">Size Guide</button>
                               </div>
                               <div className="flex flex-wrap gap-2">
                                  {['S', 'M', 'L', 'XL', 'XXL'].map(size => (
                                    <button 
                                      key={size} 
                                      onClick={() => setSelectedSize(size)}
                                      className={`w-10 h-10 rounded-lg text-[11px] font-black transition-all border ${selectedSize === size ? 'bg-black text-white border-black' : 'bg-white text-gray-900 border-gray-100 hover:border-gray-300'}`}
                                    >
                                      {size}
                                    </button>
                                  ))}
                               </div>
                            </div>

                            {/* Color Selection */}
                            <div className="space-y-2">
                               <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Select Color</span>
                               <div className="flex flex-wrap gap-2">
                                  {[
                                    { id: 'black', hex: '#000000' },
                                    { id: 'white', hex: '#FFFFFF' },
                                    { id: 'navy', hex: '#000080' },
                                    { id: 'maroon', hex: '#800000' }
                                  ].map(color => (
                                    <button 
                                      key={color.id} 
                                      onClick={() => setSelectedColor(color.id)}
                                      className={`w-8 h-8 rounded-full border-2 transition-all p-0.5 ${selectedColor === color.id ? 'border-black' : 'border-transparent'}`}
                                    >
                                      <div className="w-full h-full rounded-full border border-gray-200 shadow-inner" style={{ backgroundColor: color.hex }} />
                                    </button>
                                  ))}
                               </div>
                            </div>
                         </div>
                       )}

                        <p className="text-gray-500 leading-relaxed font-medium text-[12px] lg:text-[13px] border-l-3 border-gray-100 pl-3 py-0.5 italic">
                          "Authentic {(product.cat || 'Premium').toLowerCase()} design. Verified for quality and performance. No extra commission, direct factory pricing."
                        </p>
                    </div>

                    {/* Product Details (High Density) */}
                    <div className="space-y-3 pt-3 border-t border-gray-100">
                       <div className="flex items-center gap-2.5 py-2 px-3 bg-gray-50/50 rounded-lg border border-gray-100">
                          <img src={seller.logo} className="w-4 h-4 rounded-full border border-gray-200" alt="partner" />
                          <div className="flex flex-col">
                             <span className="text-[9px] font-black text-gray-900 uppercase tracking-tight">{seller.name}</span>
                             <span className="text-[7px] text-[#0D47A1] font-black uppercase tracking-widest">Premium Partner</span>
                          </div>
                          {seller.isVerified && <CheckCircle2 size={8} className="text-blue-500 ml-auto" />}
                       </div>

                       {/* GST COMPLIANCE INFO */}
                       {sellerInfo && !sellerInfo.gst_number && (
                         <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg flex items-start gap-2.5">
                            <Info size={14} className="text-orange-500 shrink-0 mt-0.5" />
                            <div className="flex flex-col">
                               <span className="text-[10px] font-black text-orange-900 uppercase">Intra-State Shipping Only</span>
                               <span className="text-[9px] text-orange-700 font-bold leading-tight">
                                 This seller is not GST-registered and can only ship within <span className="underline">{sellerInfo.state}</span>.
                               </span>
                            </div>
                         </div>
                       )}
                    </div>

                     {/* Actions (Sticky Mobile, Static Desktop) */}
                     <div className="flex flex-col gap-2.5 fixed bottom-0 left-0 right-0 p-3 bg-white border-t border-gray-100 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] md:static md:p-0 md:bg-transparent md:border-0 md:z-auto md:shadow-none pb-[calc(env(safe-area-inset-bottom)+12px)] md:pb-0">
                        <div className="flex gap-2.5 max-w-5xl mx-auto w-full">
                            <button 
                             onClick={() => {
                                 if (product.cat === 'Fashion' && (!selectedSize || !selectedColor)) {
                                   alert('Please select a size and color first.');
                                   return;
                                 }
                                 
                                 // GST Restriction Check
                                 if (sellerInfo && !sellerInfo.gst_number && buyerState && buyerState !== sellerInfo.state) {
                                   toast(`This seller is based in ${sellerInfo.state} and is not GST registered. They can only ship within ${sellerInfo.state}.`, 'error');
                                   return;
                                 }

                                 addToCart({ ...product, metadata: { size: selectedSize || 'Standard', color: selectedColor || 'Original' } } as any, 1);
                                 navigate('/checkout');
                             }}
                             disabled={isOutOfStock || !!(sellerInfo && !sellerInfo.gst_number && buyerState && buyerState !== sellerInfo.state)}
                             className={`flex-[2] py-3.5 rounded-xl font-black text-[13px] lg:text-[15px] uppercase tracking-widest lg:tracking-[0.15em] transition-all shadow-md active:scale-[0.98] ${isOutOfStock || !!(sellerInfo && !sellerInfo.gst_number && buyerState && buyerState !== sellerInfo.state) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-black text-white'}`}
                            >
                              {isOutOfStock ? 'Sold Out' : (sellerInfo && !sellerInfo.gst_number && buyerState && buyerState !== sellerInfo.state) ? 'Not Available in Your State' : 'Buy Now'}
                            </button>
                           <button 
                             onClick={() => {
                               if (product.cat === 'Fashion' && (!selectedSize || !selectedColor)) {
                                 alert('Please select a size and color first.');
                                 return;
                               }
                               
                               // GST Restriction Check
                               if (sellerInfo && !sellerInfo.gst_number && buyerState && buyerState !== sellerInfo.state) {
                                 toast(`Shipping restricted to ${sellerInfo.state} only (GST Compliance).`, 'error');
                                 return;
                               }

                               addToCart({ ...product, metadata: { size: selectedSize || 'Standard', color: selectedColor || 'Original' } } as any, 1);
                               toastSuccess('Added to bag!');
                             }}
                             disabled={isOutOfStock || !!(sellerInfo && !sellerInfo.gst_number && buyerState && buyerState !== sellerInfo.state)}
                             className="flex-1 border-2 border-gray-900 text-gray-900 py-3 rounded-xl font-black text-[11px] lg:text-[12px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 hover:bg-gray-50 active:scale-[0.98] bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                           >
                             <ShoppingBag size={16} /> Bag
                           </button>
                        </div>
                     </div>
                     <div className="flex items-center justify-center gap-2 py-2 px-4 bg-gray-50/50 rounded-lg text-[10px] font-bold text-gray-500 border border-gray-100/50 mt-4 md:mt-2 mb-10 md:mb-0">
                        <Truck size={14} /> Estimated Delivery: {getDeliveryRange()}
                        <span className="mx-1 text-gray-300">|</span>
                        {product.seller_has_gst || (sellerInfo && sellerInfo.gst_number) ? (
                          <span className="text-[9px] font-black text-green-600 bg-green-50 px-1.5 py-0.5 rounded">🇮🇳 Ships Pan-India</span>
                        ) : (
                          <span className="text-[9px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">📍 {product.seller_state || sellerInfo?.state || 'Local'} Only</span>
                        )}
                     </div>

                    {/* Protection Guarantees (Minimalist Row) */}
                    <div className="flex justify-between items-center px-2 py-4 border-t border-gray-50">
                       {[
                         { icon: <ShieldCheck size={14} />, label: 'Escrow' },
                         { icon: <RotateCcw size={14} />, label: '7 Days' },
                         { icon: <Award size={14} />, label: 'Verified' },
                         { icon: <Info size={14} />, label: 'Support' }
                       ].map((p, i) => (
                         <div key={i} className="flex flex-col items-center gap-1 opacity-40 hover:opacity-100 transition-opacity">
                            {p.icon}
                            <span className="text-[8px] font-black uppercase tracking-widest">{p.label}</span>
                         </div>
                       ))}
                    </div>

                 </div>
              </div>
           </div>

        {/* ══════════ SOCIAL PROOF & REVIEWS ══════════ */}
        <div className="max-w-5xl mx-auto px-4 lg:px-6 mt-8 border-t border-gray-100 pt-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
               <div>
                  <h2 className="text-[18px] font-black text-gray-900 tracking-tight leading-none mb-2">Customer Experiences</h2>
                  <div className="flex items-center gap-3">
                     <div className="flex text-[#F5A623] gap-0.5">
                        {[...Array(5)].map((_, i) => <Star key={i} size={14} className="fill-current" />)}
                     </div>
                     <span className="text-[12px] font-black text-gray-900">{product.rating} / 5.0</span>
                     <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">• Based on {product.reviews} reviews</span>
                  </div>
               </div>
               {hasReviewed ? (
                 <div className="px-4 py-2 bg-green-50 text-green-700 text-[10px] font-black uppercase rounded-lg border border-green-100">
                   You have already reviewed this product
                 </div>
               ) : (
                 <button 
                   onClick={() => {
                     if (!user) {
                       const event = new CustomEvent('open-login');
                       document.dispatchEvent(event);
                     } else {
                       // Review form logic handled in separate component or session
                       alert('Review form opening...');
                     }
                   }}
                   className="w-fit bg-gray-50 border border-gray-200 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all active:scale-95"
                 >
                   {user ? 'Write a Review' : 'Login to Review'}
                 </button>
               )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* H-06: Real reviews fetched from DB */}
                {realReviews.length > 0 ? realReviews.map((rev: any) => {
                const timeAgo = (d: string) => { const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); if (m < 60) return `${m}m ago`; if (m < 1440) return `${Math.floor(m/60)}h ago`; return `${Math.floor(m/1440)}d ago`; };
                return (
                <div key={rev.id} className="p-4 bg-[#FAFAFA]/50 border border-gray-100 rounded-[16px] flex flex-col gap-2.5 group hover:bg-white hover:shadow-lg hover:shadow-gray-900/5 transition-all duration-300">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-[10px] font-black text-gray-500 border border-white overflow-hidden">
                             {rev.users?.avatar_url ? <img src={rev.users.avatar_url} className="w-full h-full object-cover" /> : (rev.users?.full_name || 'U')[0]}
                          </div>
                          <div className="flex flex-col">
                             <span className="text-[11px] font-black text-gray-900 leading-none mb-1">{rev.users?.full_name || 'Verified Buyer'}</span>
                             <div className="flex items-center gap-1.5">
                                <span className="text-[8px] font-bold text-green-600 uppercase tracking-tighter flex items-center gap-0.5"><CheckCircle2 size={8}/> Verified</span>
                                <span className="text-[8px] text-gray-400 font-medium">• {timeAgo(rev.created_at)}</span>
                             </div>
                          </div>
                       </div>
                       <div className="flex text-[#F5A623] gap-0.5">
                          {[...Array(rev.rating)].map((_: any, j: number) => <Star key={j} size={8} className="fill-current" />)}
                       </div>
                    </div>
                    
                    <p className="text-[11.5px] font-medium leading-[1.6] text-gray-600 tracking-tight italic">
                       "{rev.comment || rev.text}"
                    </p>
                </div>
                );
                }) : (
                  <div className="col-span-full py-10 text-center text-gray-400 text-sm font-bold uppercase tracking-widest bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">
                    No reviews yet for this product
                  </div>
                )}
            </div>
            
            <button className="w-full mt-6 py-3 bg-white border border-gray-100 rounded-xl text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-gray-900 transition-all">View All Global Reviews</button>
        </div>
         
      </div>
    </PageWrapper>
  );
}