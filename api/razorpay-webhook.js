// ================================================================
// RAZORPAY WEBHOOK HANDLER
// Handles payment.captured, payment.failed, order.paid events
// CRITICAL: Verifies X-Razorpay-Signature header
// ================================================================
import crypto from 'crypto';
import https from 'https';
import { createClient } from '@supabase/supabase-js';

const ALLOWED_ORIGINS = ['https://byndio.in', 'https://www.byndio.in'];

function getAllowedOrigin(event) {
  const origin = event.headers['origin'] || event.headers['Origin'] || '';
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  // Allow Vercel preview/dev deployments
  if (origin && origin.endsWith('.vercel.app')) return origin;
  if (process.env.NODE_ENV !== 'production') return origin || '*';
  return 'https://byndio.in';
}


export default async function handler(req, res) {
  const event = {
    body: req.body ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body)) : '',
    httpMethod: req.method,
    headers: req.headers,
    queryStringParameters: req.query,
    path: req.url,
  };

  try {
    const result = await (async (event) => {
      
  const headers = {
    'Access-Control-Allow-Origin': getAllowedOrigin(event),
    'Access-Control-Allow-Headers': 'Content-Type, X-Razorpay-Signature',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Initialize Supabase with service role (admin access)
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const signature = event.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      console.error('[razorpay-webhook] Missing signature or webhook secret');
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing verification' }) };
    }

    // Verify webhook signature using timing-safe comparison
    const expectedSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(event.body)
      .digest('hex');

    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSig, 'hex');

    if (sigBuffer.length !== expectedBuffer.length || 
        !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      console.error('[razorpay-webhook] Invalid signature');
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid signature' }) };
    }

    const payload = JSON.parse(event.body);
    const eventType = payload.event;
    const eventId = payload.event_id || payload.payload?.payment?.entity?.id;

    console.log('[razorpay-webhook] Received event:', eventType, eventId);

    // Idempotency check — skip if already processed
    if (eventId) {
      const { data: existing } = await supabase
        .from('webhook_events')
        .select('id')
        .eq('event_id', eventId)
        .single();
      if (existing) {
        console.log('[razorpay-webhook] Duplicate event, skipping:', eventId);
        return { statusCode: 200, headers, body: JSON.stringify({ received: true, duplicate: true }) };
      }
      // Record the event
      await supabase.from('webhook_events').insert({
        event_id: eventId,
        event_type: eventType,
        payload: payload,
      }).then(() => {}).catch(() => {});
    }

    // Handle payment events
    if (eventType === 'payment.captured') {
      const payment = payload.payload?.payment?.entity;
      if (!payment) return { statusCode: 200, headers, body: JSON.stringify({ received: true }) };

      console.log('[razorpay-webhook] Payment captured:', payment.id, 'Order ID:', payment.order_id);

      // 1. Try to find the order by payment_id OR razorpay_order_id
      let { data: order } = await supabase
        .from('orders')
        .select('*')
        .or(`payment_id.eq.${payment.id},razorpay_order_id.eq.${payment.order_id}`)
        .maybeSingle();

      // 2. RECOVERY LOGIC: If order doesn't exist, create it from notes
      if (!order && payment.notes) {
        console.log('[razorpay-webhook] ORDER NOT FOUND — Attempting recovery from notes...');
        try {
          const notes = payment.notes;
          const userId = notes.userId;
          const address = JSON.parse(notes.address || '{}');
          const cart = JSON.parse(notes.cart || '[]');
          
          if (userId && cart.length > 0) {
            // Create the order
            const { data: newOrder, error: createError } = await supabase
              .from('orders')
              .insert({
                buyer_id: userId,
                total_amount: payment.amount / 100,
                payment_id: payment.id,
                razorpay_order_id: payment.order_id,
                payment_method: payment.method || 'card',
                payment_status: 'paid',
                status: 'processing',
                shipping_address: address,
                platform_fee: notes.platformFee || 10,
                shipping_fee: notes.shippingFee || 0
              })
              .select()
              .single();

            if (createError) throw createError;
            order = newOrder;

            // Create order items
            const orderItems = cart.map(item => ({
              order_id: order.id,
              product_id: item.id,
              quantity: item.q,
              price: item.p,
              seller_id: '00000000-0000-0000-0000-000000000000' // Fallback or lookup
            }));

            const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
            if (itemsError) console.error('[razorpay-webhook] Error creating recovered items:', itemsError);
            
            console.log('[razorpay-webhook] Order successfully recovered:', order.id);
          }
        } catch (err) {
          console.error('[razorpay-webhook] Recovery failed:', err);
        }
      }

      // 3. Status Update (Fallback/Standard)
      if (order && order.payment_status !== 'paid') {
        await supabase.from('orders').update({
          payment_status: 'paid',
          status: 'processing',
          payment_id: payment.id, // Ensure payment_id is mapped
          updated_at: new Date().toISOString()
        }).eq('id', order.id);

        console.log('[razorpay-webhook] Order updated to paid:', order.id);
      }
    }

    if (eventType === 'payment.failed') {
      const payment = payload.payload?.payment?.entity;
      if (!payment) {
        return { statusCode: 200, headers, body: JSON.stringify({ received: true }) };
      }
      console.log('[razorpay-webhook] Payment failed:', payment.id);

      // Find and update order
      const { data: order } = await supabase
        .from('orders')
        .select('id')
        .eq('payment_id', payment.id)
        .single();

      if (order) {
        await supabase.from('orders').update({
          payment_status: 'failed',
          status: 'cancelled',
          updated_at: new Date().toISOString()
        }).eq('id', order.id);
      }
    }

    if (eventType === 'order.paid') {
      const order = payload.payload?.order?.entity;
      console.log('[razorpay-webhook] Order paid:', order?.id);
    }

    return { statusCode: 200, headers, body: JSON.stringify({ received: true }) };
  } catch (err) {
    console.error('[razorpay-webhook] Error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Webhook processing failed' }) };
  }

    })(event);

    res.status(result.statusCode || 200);
    if (result.headers) {
      Object.entries(result.headers).forEach(([key, value]) => res.setHeader(key, value));
    }
    res.send(result.body);
  } catch (error) {
    console.error('Error in function:', error);
    res.status(500).json({ error: error.message });
  }
}
;
