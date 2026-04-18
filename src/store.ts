import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from './lib/supabase';
import { PRODUCTS as LOCAL_PRODUCTS } from './data';

export type {
  Product,
  CartItem,
  User,
  SiteSettings,
  Order,
  AffiliateLink,
  FlashSale,
} from './types';

import type {
  Product,
  CartItem,
  User,
  SiteSettings,
  Order,
  AffiliateLink,
  FlashSale,
} from './types';

interface AppState {
   products: Product[];
   isLoadingProducts: boolean;
   cart: CartItem[];
   wishlist: (number | string)[];
   recentlyViewed: (number | string)[];
   user: User | null;
   isAuthLoading: boolean;
   referralCode: string | null;
   siteSettings: SiteSettings | null;
   myOrders: Order[];
   isLoadingOrders: boolean;
   affiliateLinks: AffiliateLink[];
   flashSales: FlashSale[];
   walletBalance: number;
   rewardPoints: number;
   deliveryPincode: string | null;
   deliveryAddress: string | null;
   deliveryCoords: { lat: number; lng: number } | null;
   shippingMethodId: number | null;
   profileFetchError: boolean;
   isSubmittingOrder: boolean; // C-05

  fetchProducts: () => Promise<void>;
  fetchSiteSettings: () => Promise<void>;
  fetchShippingMethods: () => Promise<void>;
  fetchMyOrders: () => Promise<void>;
  fetchAffiliateLinks: () => Promise<void>;
  fetchFlashSales: () => Promise<void>;
  fetchWalletData: () => Promise<void>;
  generateAffiliateLink: (productId: string) => Promise<string | null>;
  addRecentlyViewed: (id: number | string) => void;
  setReferralCode: (code: string | null) => void;

  addToCart: (product: Product, qty?: number, affiliateCode?: string) => void;
  removeFromCart: (id: number | string) => void;
  updateQty: (id: number | string, delta: number) => void;
  toggleWishlist: (id: number | string) => void;
  clearCart: () => void;

  setShippingMethodId: (id: number) => void;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  initAuth: () => void;
  subscribeWithRazorpay: (planName: string, amountMonthly: number) => Promise<void>;
  createOrder: (address: any, paymentMethod: string, total: number, platformFee?: number, shippingFee?: number, couponCode?: string) => Promise<{ success: boolean; orderId?: string; error?: string }>;
  updateProfile: (data: { name?: string; address?: string; pincode?: string }) => Promise<{ success: boolean; error?: string }>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
       products: LOCAL_PRODUCTS,
       isLoadingProducts: false,
       cart: [],
       wishlist: [],
       recentlyViewed: [],
       user: null,
       isAuthLoading: true,
       referralCode: null,
       siteSettings: null,
       myOrders: [],
       isLoadingOrders: false,
       affiliateLinks: [],
       flashSales: [],
       walletBalance: 0,
       rewardPoints: 0,
       deliveryPincode: null,
       deliveryAddress: null,
       deliveryCoords: null,
       shippingMethodId: 1, // Default to Standard
       profileFetchError: false,
       isSubmittingOrder: false, // C-05

       initAuth: () => {
         const urlParams = new URLSearchParams(window.location.search);
         const ref = urlParams.get('ref');
         const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

         if (ref) {
           set({ referralCode: ref });
           // H-14: Store referral code with expiry timestamp (30 days)
           localStorage.setItem('referral', JSON.stringify({ 
             code: ref, 
             referrerId: ref, 
             expiry: Date.now() + THIRTY_DAYS 
           }));
         } else {
           const savedRefRaw = localStorage.getItem('referral');
           if (savedRefRaw) {
             try {
               const parsed = JSON.parse(savedRefRaw);
               if (parsed.expiry && Date.now() < parsed.expiry) {
                 set({ referralCode: parsed.code });
               } else {
                 localStorage.removeItem('referral'); // Expired
               }
             } catch {
               localStorage.removeItem('referral');
             }
           }
         }

         if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
           set({ isAuthLoading: false });
           return;
         }

          const buildUser = (sessionUser: any, profileData: any): User => {
           let activePlan = (profileData?.subscription_plan as User['subscription_plan']) || 'free';
           const expiresAt = profileData?.subscription_expires_at;
           if (expiresAt && new Date(expiresAt) < new Date() && activePlan !== 'free') {
             activePlan = 'free';
             supabase.from('users').update({ subscription_plan: 'free' }).eq('id', sessionUser.id).then(() => {});
           }
           
           // Get role from profile data, default to 'buyer'
           const role = (profileData?.role as User['role']) || 'buyer';
           
           return {
             id: sessionUser.id,
             email: sessionUser.email || '',
             name: profileData?.full_name || sessionUser.email?.split('@')[0] || 'User',
             role: role,
             subscription_plan: activePlan,
             reward_points: profileData?.reward_points,
           };
         };

          const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
              supabase.from('users').select('*').eq('id', session.user.id).maybeSingle()
                .then(({ data, error }) => {
                  if (error) {
                    // DB failed - use hardcoded admin check
                    const builtUser = buildUser(session.user, null);
                    set({ user: builtUser, isAuthLoading: false, profileFetchError: true });
                    return;
                  }
                  const builtUser = buildUser(session.user, data);
                  set({ user: builtUser, isAuthLoading: false });
                  
                  // Sync wishlist
                  supabase.from('wishlists').select('product_id').eq('user_id', session.user.id)
                    .then(({ data: wl }) => {
                      if (wl && wl.length > 0) {
                        const dbWishlist = wl.map((w: any) => w.product_id);
                        const localWishlist = get().wishlist;
                        const merged = Array.from(new Set([...localWishlist.map(String), ...dbWishlist]));
                        set({ wishlist: merged });
                        const toUpload = localWishlist.filter(id => !dbWishlist.includes(String(id)));
                        if (toUpload.length > 0) {
                          supabase.from('wishlists').upsert(
                            toUpload.map(id => ({ user_id: session.user.id, product_id: String(id) })),
                            { onConflict: 'user_id,product_id' }
                          ).then(() => {});
                        }
                      }
                    });
                });
            } else {
              set({ user: null, isAuthLoading: false });
            }
          });

         if ((window as any).__byndioAuthUnsub) {
           (window as any).__byndioAuthUnsub();
         }
         (window as any).__byndioAuthUnsub = () => subscription.unsubscribe();

         supabase.auth.getSession().then(({ data: { session } }) => {
           if (session?.user) {
             supabase.from('users').select('*').eq('id', session.user.id).maybeSingle()
               .then(({ data, error }) => {
                 const builtUser = buildUser(session.user, error ? null : data);
                 set({ user: builtUser, isAuthLoading: false, profileFetchError: !!error });
               });
           } else {
             set({ isAuthLoading: false });
           }
         });
       },

       fetchSiteSettings: async () => {
         if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) return;
         try {
           const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).single();
           if (error) {
             console.warn('[store] Site settings table not found, using defaults');
             return;
           }
           if (data) set({ siteSettings: data });
         } catch (err) { console.warn('[store] Site settings fetch failed:', err); }
       },

       fetchProducts: async () => {
         if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) return;
         set({ isLoadingProducts: true });
         try {
           const { data, error } = await supabase.from('products').select('*').eq('is_active', true);
           if (error) {
             console.warn('[store] Products table not found or empty, using local data');
             set({ isLoadingProducts: false });
             return;
           }
           if (data && data.length > 0) {
             set({ products: data.map(p => ({
               id: p.id, name: p.name,
               brand: p.description?.replace('Brand: ', '') || 'Brand',
               cat: p.category, price: p.price, mrp: p.mrp,
               icon: p.images?.[0] || '📦',
               rating: p.avg_rating ?? 4.5, reviews: p.review_count ?? 0,
               inf: p.is_creator_pick ?? false, creator: p.creator_name,
               specs: Object.entries(p.specifications || {}) as [string, string][],
               is_sponsored: p.is_sponsored ?? false,
             })) });
           }
         } catch (err) { 
           console.warn('[store] Products fetch failed, using local data:', err);
         }
         finally { set({ isLoadingProducts: false }); }
       },

       fetchMyOrders: async () => {
         const { user } = get();
         if (!user || !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) return;
         set({ isLoadingOrders: true });
         try {
           const { data } = await supabase.from('orders').select(`id,buyer_id,total_amount,status,payment_status,shipping_address,payment_method,created_at,order_items(id,quantity,price,products(name,images))`).eq('buyer_id', user.id).order('created_at', { ascending: false });
           if (data) set({ myOrders: data as unknown as Order[] });
         } catch (err) { console.error('[store]', err); }
         finally { set({ isLoadingOrders: false }); }
       },

       fetchAffiliateLinks: async () => {
         const { user } = get();
         if (!user || !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) return;
         try {
           const { data } = await supabase.from('affiliate_links').select('*, products(name, images, price)').eq('user_id', user.id).order('created_at', { ascending: false });
           if (data) set({ affiliateLinks: data.map(l => ({ ...l, product: l.products ? { name: l.products.name, icon: l.products.images?.[0] || '📦', price: l.products.price } : undefined })) });
         } catch (err) { console.error('[store]', err); }
       },

       fetchFlashSales: async () => {
         if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) return;
         try {
           const now = new Date().toISOString();
           const { data } = await supabase.from('flash_sales').select('*, products(name,images)').eq('is_active', true).gte('ends_at', now).order('ends_at');
           if (data) set({ flashSales: data });
         } catch (err) { console.error('[store]', err); }
       },

       fetchWalletData: async () => {
         const { user } = get();
         if (!user || !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) return;
         try {
           const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', user.id).single();
           const { data: points } = await supabase.from('reward_points').select('points').eq('user_id', user.id);
           const totalPoints = points?.reduce((s, p) => s + p.points, 0) ?? 0;
           set({ walletBalance: wallet?.balance ?? 0, rewardPoints: totalPoints });
         } catch (err) { console.error('[store]', err); }
       },

       generateAffiliateLink: async (productId: string) => {
         const { user } = get();
         if (!user) return null;
         try {
           const code = `${user.id.slice(0,8)}-${productId.slice(0,8)}-${Date.now().toString(36)}`;
           const { data, error } = await supabase.from('affiliate_links').upsert({
             user_id: user.id, product_id: productId, link_code: code,
             commission_rate: user.role === 'influencer' ? 10 : 8,
           }, { onConflict: 'user_id,product_id' }).select().single();
           if (error) throw error;
           await get().fetchAffiliateLinks();
           return data.link_code;
         } catch (err) { console.error('[store]', err); return null; }
       },

       addRecentlyViewed: (id) => {
         set(state => ({
           recentlyViewed: [id, ...state.recentlyViewed.filter(i => i !== id)].slice(0, 20),
         }));
       },

        // M-08: Cart quantity capped at 10 per item
        addToCart: (product, qty = 1, affiliateCode) =>
          set(state => {
            const existing = state.cart.find(i => i.id === product.id);
            if (existing) {
              const newQty = Math.min(10, existing.qty + qty);
              return { cart: state.cart.map(i => i.id === product.id ? { ...i, qty: newQty } : i) };
            }
            return { cart: [...state.cart, { ...product, qty: Math.min(10, qty), affiliate_code: affiliateCode }] };
          }),
        removeFromCart: id => set(state => ({ cart: state.cart.filter(i => i.id !== id) })),
        updateQty: (id, delta) => set(state => ({ cart: state.cart.map(i => i.id === id ? { ...i, qty: Math.min(10, Math.max(1, i.qty + delta)) } : i) })),
       toggleWishlist: (id) => {
         const { user, wishlist } = get();
         const isIn = wishlist.includes(id);
         set({ wishlist: isIn ? wishlist.filter(w => w !== id) : [...wishlist, id] });
         if (user) {
           if (isIn) {
             supabase.from('wishlists').delete().eq('user_id', user.id).eq('product_id', String(id)).then(() => {});
           } else {
             supabase.from('wishlists').upsert({ user_id: user.id, product_id: String(id) }, { onConflict: 'user_id,product_id' }).then(() => {});
           }
         }
       },
       clearCart: () => set({ cart: [] }),
       setUser: user => set({ user }),
       subscribeWithRazorpay: async (planName: string, amountMonthly: number) => {
         const { user } = get();
         if (!user) throw new Error('Login required');
         const razorpayKeyId = (import.meta as any).env.VITE_RAZORPAY_KEY_ID;
         const isDev = (import.meta as any).env.DEV;
         if (!razorpayKeyId || !(window as any).Razorpay) {
           if (!isDev) {
             throw new Error('Payment service not configured. Please contact support.');
           }
            // P1-FUNC-02: Use update-then-insert (upsert onConflict was broken)
            const demoExpiry = new Date(Date.now() + 30 * 24 * 3600000).toISOString();
            const { data: existDemoSub } = await supabase.from('subscriptions')
              .select('id').eq('user_id', user.id).eq('status', 'active').maybeSingle();
            if (existDemoSub) {
              await supabase.from('subscriptions').update({
                plan_name: planName, status: 'active', amount: amountMonthly,
                started_at: new Date().toISOString(), expires_at: demoExpiry, payment_method: 'demo',
              }).eq('id', existDemoSub.id);
            } else {
              await supabase.from('subscriptions').insert({
                user_id: user.id, plan_type: planName, plan_name: planName,
                status: 'active', amount: amountMonthly,
                started_at: new Date().toISOString(), expires_at: demoExpiry, payment_method: 'demo',
              });
            }
            await supabase.from('users').update({
              subscription_plan: planName, subscription_expires_at: demoExpiry,
            }).eq('id', user.id);
            set(state => ({ user: state.user ? { ...state.user, subscription_plan: planName } : null }));
            return;
         }
         return new Promise((resolve, reject) => {
           const options = {
             key: razorpayKeyId,
             amount: amountMonthly * 100,
             currency: 'INR',
             name: 'BYNDIO',
             description: `${planName} Plan — Monthly`,
             handler: async (response: { razorpay_payment_id: string }) => {
               try {
                 await supabase.from('subscriptions').upsert({
                   user_id: user.id,
                   plan_name: planName,
                   status: 'active',
                   amount: amountMonthly,
                   started_at: new Date().toISOString(),
                   expires_at: new Date(Date.now() + 30 * 24 * 3600000).toISOString(),
                   payment_method: 'razorpay',
                   payment_id: response.razorpay_payment_id,
                 }, { onConflict: 'user_id' });
                 await supabase.from('users').update({
                   subscription_plan: planName,
                   subscription_expires_at: new Date(Date.now() + 30 * 24 * 3600000).toISOString(),
                 }).eq('id', user.id);
                 set(state => ({ user: state.user ? { ...state.user, subscription_plan: planName } : null }));
                 resolve();
               } catch (err) { reject(err); }
             },
             prefill: { name: user.name, email: user.email },
             theme: { color: '#0D47A1' },
             modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
           };
           const rzp = new (window as any).Razorpay(options);
           rzp.on('payment.failed', () => reject(new Error('Payment failed')));
           rzp.open();
         });
       },

       fetchShippingMethods: async () => {
         try {
           const { data } = await supabase.from('shipping_methods').select('*').eq('is_active', true);
           if (data && data.length > 0) (window as any)._shippingMethods = data;
         } catch (err) { console.warn('[Logistics] Shipping fetch failed'); }
       },

       setShippingMethodId: (id) => set({ shippingMethodId: id }),

       // ════════════════════════════════════════════════════════════════
       // SECURE ORDER CREATION — Server-side Razorpay flow
       // Flow: Create Razorpay order (server) → Pay (client) → Verify (server) → Create DB order
       // ════════════════════════════════════════════════════════════════
        createOrder: async (address, paymentMethod, total, platformFee = 10, shippingFee = 0, couponCode) => {
         const { user, cart, clearCart, isSubmittingOrder } = get();
         if (isSubmittingOrder) return { success: false, error: 'Order is already being processed. Please wait.' };
         if (!user) return { success: false, error: 'Login required' };
         if (cart.length === 0) return { success: false, error: 'Cart is empty' };

         set({ isSubmittingOrder: true });

         // COD limit enforcement
         if (paymentMethod === 'cod' && total > 5000) {
           set({ isSubmittingOrder: false });
           return { success: false, error: 'Cash on Delivery is limited to ₹5,000. Please choose online payment.' };
         }

         // Address validation
         if (!address || !address.fullName || !address.mobile || !address.line1 || !address.city || !address.state || !address.pin) {
           set({ isSubmittingOrder: false });
           return { success: false, error: 'Please fill in all address fields.' };
         }
         if (!/^\d{10}$/.test(address.mobile)) {
           set({ isSubmittingOrder: false });
           return { success: false, error: 'Please enter a valid 10-digit mobile number.' };
         }
         if (!/^\d{6}$/.test(address.pin)) {
           set({ isSubmittingOrder: false });
           return { success: false, error: 'Please enter a valid 6-digit PIN code.' };
         }

         const API_BASE = '/.netlify/functions/';

         // ── C-05: Deterministic idempotency key (prevents duplicate orders) ──
         const cartHash = btoa(JSON.stringify(cart.map(i => i.id + ':' + i.qty).sort()));
         const idempotencyKey = `${user.id}_${cartHash}_${paymentMethod}`;

         try {
           // ── C-02: Server-side validation of order total before proceeding ──
           // Subtract fees from total to get just the product sum to validate
           const productTotal = total - platformFee - shippingFee;
           const { data: isValidTotal, error: valError } = await supabase.rpc('validate_order_total', {
             p_cart: cart.map(i => ({ id: i.id, qty: i.qty })),
             p_claimed_total: productTotal
           });
           
           if (valError || !isValidTotal) {
             return { success: false, error: 'Price mismatch detected. Please refresh and try again.' };
           }

           let paymentId: string | null = null;

           let serverTotal = total; // Fallback for COD, but ideally validated

           // ── ONLINE PAYMENT: Razorpay server-side flow ──
           if (paymentMethod !== 'cod') {
             // Step 1: Create Razorpay order SERVER-SIDE (amount secured on backend)
             const orderRes = await fetch(`${API_BASE}/razorpay-order`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                 cartItems: cart.map(i => ({ product_id: i.id, quantity: i.qty })),
                 receipt: `rcpt_${user.id.slice(0,8)}_${Date.now()}`,
                 platformFee: platformFee,
                 shippingFee: shippingFee,
                 couponCode: couponCode,
                 userId: user.id,
                 notes: {
                   userId: user.id,
                   address: JSON.stringify(address)
                 }
               }),
             });
             if (!orderRes.ok) {
               const errData = await orderRes.json().catch(() => ({}));
               throw new Error(errData.error || 'Failed to create payment order. Please try again.');
             }
             const rzpOrder = await orderRes.json();
             serverTotal = rzpOrder.serverCalculatedTotal || total;

             // Step 2: Open Razorpay checkout modal
             const razorpayKeyId = (import.meta as any).env.VITE_RAZORPAY_KEY_ID;
             if (!razorpayKeyId || !(window as any).Razorpay) {
               if ((import.meta as any).env.DEV) {
                 paymentId = `DEMO-${Date.now()}`;
               } else {
                 throw new Error('Payment service is temporarily unavailable. Please try COD or contact support.');
               }
             } else {
               const razorpayPromise = new Promise<{
                 razorpay_payment_id: string;
                 razorpay_order_id: string;
                 razorpay_signature: string;
               }>((resolve, reject) => {
                 const options = {
                   key: razorpayKeyId,
                   amount: rzpOrder.amount,
                   currency: 'INR',
                   name: 'BYNDIO',
                   description: `Order — ${cart.length} item(s)`,
                   order_id: rzpOrder.orderId,
                   handler: (response: any) => resolve(response),
                   prefill: { name: user.name, email: user.email },
                   theme: { color: '#0D47A1' },
                   modal: { ondismiss: () => reject(new Error('Payment cancelled by user.')) },
                 };
                 const rzp = new (window as any).Razorpay(options);
                 rzp.on('payment.failed', (response: any) => {
                   reject(new Error(response.error?.description || 'Payment failed. Please try again.'));
                 });
                 rzp.open();
               });

               // H-08: 10-minute timeout for payment window
               const paymentResult = await Promise.race([
                 razorpayPromise,
                 new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10 * 60 * 1000))
               ]).catch(async (err) => {
                 if (err.message === 'timeout') {
                   // Order is not in DB yet, so we just throw to show user message.
                   throw new Error('Payment timed out. Please try again.');
                 }
                 throw err;
               });

               // Step 3: VERIFY payment signature SERVER-SIDE (prevents fraud)
               const verifyRes = await fetch(`${API_BASE}/verify-payment`, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                   razorpay_order_id: paymentResult.razorpay_order_id,
                   razorpay_payment_id: paymentResult.razorpay_payment_id,
                   razorpay_signature: paymentResult.razorpay_signature,
                 }),
               });
               const verifyData = await verifyRes.json();
               if (!verifyData.verified) {
                 throw new Error('Payment verification failed. Your money is safe — please contact support if debited.');
               }
               paymentId = paymentResult.razorpay_payment_id;
             }
           }

             // ── C-08: Validate stock BEFORE creating order ──
             const { data: outOfStockItems, error: stockErr } = await supabase.rpc('check_stock', {
               items: cart.map(i => ({ id: i.id, qty: i.qty }))
             });
             
             if (stockErr) {
               return { success: false, error: 'Failed to verify stock availability.' };
             }
             if (outOfStockItems && outOfStockItems.length > 0) {
               const failedProds = cart.filter(c => outOfStockItems.some((o: any) => o.product_id === c.id));
               return { success: false, error: `Insufficient stock for: ${failedProds.map(p => p.name).join(', ')}` };
             }

            // ── Step 4: Create Order in Database (ONLY after payment is verified) ──
            const { data: order, error: orderError } = await supabase
              .from('orders')
              .insert({
                buyer_id: user.id,
                total_amount: serverTotal,
                payment_method: paymentMethod,
                shipping_address: address,
                status: paymentMethod === 'cod' ? 'pending' : 'processing',
                payment_status: paymentMethod === 'cod' ? 'pending' : 'paid',
                payment_id: paymentId,
                idempotency_key: idempotencyKey,
                coupon_code: couponCode || null,
              })
              .select()
              .single();

           if (orderError) {
              // If idempotency key conflict, order already exists
              if (orderError.code === '23505') {
                return { success: false, error: 'This order was already placed. Check My Orders.' };
              }
              throw orderError;
            }

           // ── Step 5: Create Order Items ──
           const orderItems = cart.map(item => ({
             order_id: order.id,
             product_id: item.id,
             quantity: item.qty,
             price: item.price,
             seller_id: (item as any).seller_id || null,
           }));

           const { error: itemsError } = await supabase
             .from('order_items')
             .insert(orderItems);

           if (itemsError) throw itemsError;

             // H-17: Send order confirmation email via Netlify function
             try {
               await fetch('/.netlify/functions/send-order-notification', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                   orderId: order.id,
                   userEmail: user.email,
                   userName: user.name,
                   total: total,
                   items: cart.map(i => ({ name: i.name, qty: i.qty, price: i.price }))
                 })
               });
             } catch {} // Non-blocking

             clearCart();
           return { success: true, orderId: order.id };
         } catch (err: any) {
           console.error('[store] Order creation failed:', err);
           return { success: false, error: err.message };
         } finally {
           set({ isSubmittingOrder: false }); // C-05 reset
         }
       },

       logout: async () => { await supabase.auth.signOut(); set({ user: null, cart: [], wishlist: [], myOrders: [], affiliateLinks: [], walletBalance: 0, rewardPoints: 0 }); },
       setReferralCode: (code) => {
         set({ referralCode: code });
         if (code) localStorage.setItem('byndio_ref_code', code);
         else localStorage.removeItem('byndio_ref_code');
       },

        updateProfile: async (data: { name?: string; address?: string; pincode?: string }) => {
          const { user } = get();
          if (!user) return { success: false, error: 'Not logged in' };
          try {
            const updates: any = {};
            if (data.name) updates.full_name = data.name;
            if (data.address) updates.address = data.address;
            if (data.pincode) updates.pincode = data.pincode;

            const { error: profileError } = await supabase
              .from('users')
              .update(updates)
              .eq('id', user.id);

            if (profileError) throw profileError;

            // Updated local state
            set((state: any) => ({
              user: state.user ? { ...state.user, name: data.name || state.user.name } : null,
              deliveryAddress: data.address || state.deliveryAddress,
              deliveryPincode: data.pincode || state.deliveryPincode,
            }));

            return { success: true };
          } catch (err: any) {
            console.error('[store] Update profile failed:', err);
            return { success: false, error: err.message };
          }
        },
     }),
     { name: 'byndio-storage', partialize: state => ({ cart: state.cart, wishlist: state.wishlist, recentlyViewed: state.recentlyViewed }) }
   )
);
