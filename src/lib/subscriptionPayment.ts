// Subscription payment via Razorpay
// Works for both Seller (Dashboard) and Creator (CreatorDashboard) plans

import { supabase } from './supabase';
import { useAppStore } from '../store';

export interface PlanConfig {
  name: string;
  price: number;          // Monthly price in ₹
  priceDisplay: string;   // e.g. '₹1,999/mo'
  role: 'seller' | 'influencer';
  commissionRate?: number; // For creators
}

declare global {
  interface Window { Razorpay: any; }
}

export async function initiateSubscriptionPayment(
  plan: PlanConfig,
  user: { id: string; name: string; email: string },
  onSuccess: (planName: string) => void,
  onError: (msg: string) => void,
): Promise<void> {
  const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;

  if (!razorpayKey || !window.Razorpay) {
    // Demo mode — verify on server with demo ID
    try {
      await verifyAndSaveSubscription(plan, user, 'DEMO-SUB-' + Date.now());
      onSuccess(plan.name);
    } catch (err: any) {
      onError(err.message || 'Failed to activate plan in demo mode.');
    }
    return;
  }

  // Create server-side order to lock the amount
  const amount = plan.price; // Send in Rupees
  let orderId: string;
  try {
    const API_URL = '/api/razorpay-order';
    const orderRes = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, currency: 'INR', userId: user.id, receipt: `sub_${user.id}_${Date.now()}` }),
    });

    if (!orderRes.ok) {
       // Check if it's a 404 or non-JSON (likely dev server not running functions)
       const text = await orderRes.text();
       try {
         const errData = JSON.parse(text);
         throw new Error(errData.error || `Server error: ${orderRes.status}`);
       } catch {
         if (orderRes.status === 404 || text.includes('<!DOCTYPE html>')) {
           console.warn('[Subscription] API functions not reached. Using test order ID for local dev.');
           orderId = `order_TEST_${Date.now()}`;
         } else {
           throw new Error(`Failed to create order: ${orderRes.status}`);
         }
       }
    } else {
      const orderData = await orderRes.json();
      orderId = orderData.orderId;
    }
  } catch (err: any) {
    if (err.message.includes('Unexpected end of JSON input') || err.message.includes('Unexpected token')) {
       console.warn('[Subscription] JSON parse error, assuming test mode for local dev.');
       orderId = `order_TEST_${Date.now()}`;
    } else {
       onError(err.message || 'Failed to create payment order');
       return;
    }
  }
  if (orderId && orderId.startsWith('order_TEST_')) {
    console.warn('[Subscription] Test order ID detected. Bypassing Razorpay modal.');
    try {
      await verifyAndSaveSubscription(plan, user, 'DEMO-SUB-' + Date.now());
      onSuccess(plan.name);
    } catch (err: any) {
      onError(err.message || 'Failed to activate plan in test mode.');
    }
    return;
  }

  const options = {
    key: razorpayKey,
    amount: amount * 100, // paise
    currency: 'INR',
    name: 'BYNDIO',
    description: `${plan.name} Plan — Monthly Subscription`,
    order_id: orderId,
    notes: { plan_name: plan.name, user_id: user.id, role: plan.role },
    prefill: { name: user.name, email: user.email },
    theme: { color: plan.role === 'influencer' ? '#7B1FA2' : '#0D47A1' },
    handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
      try {
        await verifyAndSaveSubscription(
          plan, 
          user, 
          response.razorpay_payment_id, 
          response.razorpay_order_id, 
          response.razorpay_signature
        );
        onSuccess(plan.name);
      } catch (err: any) {
        onError(err.message || 'Failed to activate plan after payment.');
      }
    },
    modal: {
      ondismiss: () => {},
    },
  };

  const rzp = new window.Razorpay(options);
  rzp.on('payment.failed', (res: any) => {
    onError('Payment failed: ' + (res?.error?.description || 'Unknown error'));
  });
  rzp.open();
}

async function verifyAndSaveSubscription(
  plan: PlanConfig,
  user: { id: string },
  paymentId: string,
  orderId?: string,
  signature?: string
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('You must be logged in to activate a plan.');

  const API_URL = '/api/verify-subscription';
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({
      paymentId,
      paymentSignature: signature,
      orderId,
      planName: plan.name,
      amountMonthly: plan.price,
      planRole: plan.role,
      commissionRate: plan.commissionRate
    }),
  });

  const text = await res.text();
  let data: any = {};
  try {
    data = JSON.parse(text);
  } catch {
    // If Netlify functions are not running locally (404) AND we are using a demo payment ID,
    // mock a successful response so the frontend testing flow can complete.
    if (res.status === 404 && paymentId.startsWith('DEMO-')) {
      console.warn('[Subscription] API backend 404. Mocking successful verification for local dev.');
      const store = useAppStore.getState();
      if (store.user) {
        useAppStore.setState({
          user: {
            ...store.user,
            subscription_plan: plan.name.toLowerCase() as any,
            role: store.user.role === 'admin' ? 'admin' : plan.role,
          }
        });
      }
      return;
    }
    
    if (!res.ok) throw new Error(`Verification failed: ${res.status}`);
    // If OK but not JSON, something is wrong with the function response
    throw new Error('Invalid server response during verification');
  }

  if (!res.ok) throw new Error(data.error || 'Failed to verify subscription payment.');

  // S-04: Sync local Zustand state so UI reflects new plan immediately
  const store = useAppStore.getState();
  if (store.user) {
    useAppStore.setState({
      user: {
        ...store.user,
        subscription_plan: plan.name.toLowerCase() as any,
        role: store.user.role === 'admin' ? 'admin' : plan.role,
      }
    });
  }
}

