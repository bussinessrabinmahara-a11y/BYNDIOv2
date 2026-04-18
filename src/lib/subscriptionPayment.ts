// Subscription payment via Razorpay
// Works for both Seller (Dashboard) and Creator (CreatorDashboard) plans

import { supabase } from './supabase';

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
    // Demo mode — update DB directly without real payment
    await savePlanToDB(plan, user, 'DEMO-SUB-' + Date.now());
    onSuccess(plan.name);
    return;
  }

  // Create server-side order to lock the amount
  const amount = plan.price * 100;
  let orderId: string;
  try {
    const orderRes = await fetch('/api/razorpay-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, currency: 'INR', receipt: `sub_${user.id}_${Date.now()}` }),
    });
    const orderData = await orderRes.json();
    if (!orderData.orderId) throw new Error(orderData.error || 'Failed to create order');
    orderId = orderData.orderId;
  } catch (err: any) {
    onError(err.message || 'Failed to create payment order');
    return;
  }

  const options = {
    key: razorpayKey,
    amount,
    currency: 'INR',
    name: 'BYNDIO',
    description: `${plan.name} Plan — Monthly Subscription`,
    order_id: orderId,
    notes: { plan_name: plan.name, user_id: user.id, role: plan.role },
    prefill: { name: user.name, email: user.email },
    theme: { color: plan.role === 'influencer' ? '#7B1FA2' : '#0D47A1' },
    handler: async (response: { razorpay_payment_id: string }) => {
      try {
        await savePlanToDB(plan, user, response.razorpay_payment_id);
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

async function savePlanToDB(
  plan: PlanConfig,
  user: { id: string },
  paymentId: string,
): Promise<void> {
  const now      = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  // 1. Upsert subscription record
  const { error: subError } = await supabase.from('subscriptions').upsert({
    user_id:    user.id,
    plan_name:  plan.name,
    plan_role:  plan.role,
    status:     'active',
    price:      plan.price,
    payment_id: paymentId,
    started_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  }, { onConflict: 'user_id' });

  if (subError) throw subError;

  // 2. Update user's subscription_plan column
  await supabase.from('users').update({
    subscription_plan: plan.name.toLowerCase(),
  }).eq('id', user.id);

  // 3. If creator plan, update commission rate
  if (plan.role === 'influencer' && plan.commissionRate) {
    await supabase.from('influencers').upsert({
      id: user.id,
      commission_rate: plan.commissionRate,
    }, { onConflict: 'id' });
  }
}
