// ================================================================
// EMAIL CLIENT — calls the Netlify /api/send-email function
// Usage: await sendEmail('user@email.com', 'order_confirmation', data)
// ================================================================

import { supabase } from './supabase';

const API_BASE = '/.netlify/functions/';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  } catch {}
  return headers;
}

export async function sendEmail(
  to: string,
  template: string,
  data: Record<string, any>,
): Promise<boolean> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/send-email`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ to, template, data }),
    });
    if (!res.ok) return false;
    const result = await res.json();
    return result.success === true;
  } catch {
    return false;
  }
}

export async function verifyPayment(
  razorpay_order_id: string,
  razorpay_payment_id: string,
  razorpay_signature: string,
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/verify-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ razorpay_order_id, razorpay_payment_id, razorpay_signature }),
    });
    if (!res.ok) return false;
    const result = await res.json();
    return result.verified === true;
  } catch {
    return false;
  }
}

export async function createRazorpayOrder(
  amount: number,
  userId: string,
  receipt?: string,
): Promise<{ orderId: string; id: string; amount: number } | null> {
  try {
    const res = await fetch(`${API_BASE}/razorpay-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amount * 100, userId, receipt }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ================================================================
// SHIPPING CLIENT — calls /api/shiprocket
// ================================================================
export async function shiprocket(action: string, data: Record<string, any> = {}): Promise<any> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/shiprocket`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, ...data }),
    });
    return await res.json();
  } catch { return null; }
}

export async function createShipment(order: any): Promise<any> {
  return shiprocket('create_shipment', { order });
}

export async function generateAWB(shipmentId: string, courierId?: string): Promise<any> {
  return shiprocket('generate_awb', { shipment_id: shipmentId, courier_id: courierId });
}

export async function requestPickup(shipmentId: string): Promise<any> {
  return shiprocket('request_pickup', { shipment_id: shipmentId });
}

export async function trackShipment(awb: string): Promise<any> {
  return shiprocket('track', { awb });
}

export async function checkServiceability(pickupPin: string, deliveryPin: string, cod: boolean): Promise<any> {
  return shiprocket('check_serviceability', { pickup_pin: pickupPin, delivery_pin: deliveryPin, cod });
}

// ================================================================
// REFUND CLIENT — calls /api/razorpay-refund (admin-only)
// ================================================================
export async function processRefund(
  paymentId: string,
  amount?: number,
  notes?: Record<string, string>,
): Promise<{ success: boolean; refundId?: string; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/razorpay-refund`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ payment_id: paymentId, amount, notes }),
    });
    const data = await res.json();
    if (data.id) return { success: true, refundId: data.id };
    return { success: false, error: data.error || 'Refund failed' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
