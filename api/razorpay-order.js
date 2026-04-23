// ================================================================
// RAZORPAY ORDER CREATION — Server-Side
// Creates a Razorpay order with server-calculated prices
// Supports: Cart-based orders, B2B/subscription direct amounts
// ================================================================
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);


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
    'Access-Control-Allow-Origin': event.headers['origin'] || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };

  try {
    const { cartItems, shippingMethodId, userId, couponCode, amount: directAmount, receipt: customReceipt, notes } = JSON.parse(event.body);

    if (!userId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing userId' }) };
    }

    let total = 0;
    let subtotal = 0;
    let shippingFee = 0;
    let platformFee = 0;
    let discount = 0;

    // PATH A: Direct amount (B2B / Subscriptions)
    if (directAmount) {
      total = directAmount;
    }
    // PATH B: Cart-based calculation (server-side price authority)
    else if (cartItems?.length) {
      const productIds = cartItems.map(i => i.product_id);
      const { data: products, error: productError } = await supabase
        .from('products')
        .select('id, price, stock_quantity, approval_status, is_active')
        .in('id', productIds);

      if (productError) throw productError;

      // Validate all products exist and are available
      for (const item of cartItems) {
        const product = products.find(p => p.id === item.product_id);
        if (!product) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: `Product ${item.product_id} not found` }) };
        }
        if (product.stock_quantity !== null && product.stock_quantity < item.quantity) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: `Insufficient stock for product ${item.product_id}` }) };
        }
      }

      // Calculate subtotal from DB prices (not client prices)
      subtotal = cartItems.reduce((sum, item) => {
        const product = products.find(p => p.id === item.product_id);
        return sum + (product.price * item.quantity);
      }, 0);

      // Shipping fee from DB
      if (shippingMethodId) {
        const { data: shippingMethod } = await supabase
          .from('shipping_methods')
          .select('cost')
          .eq('id', shippingMethodId)
          .single();
        shippingFee = shippingMethod?.cost || 0;
      }

      // Platform fee from site_settings or default
      const { data: settings } = await supabase
        .from('site_settings')
        .select('platform_fee')
        .eq('id', 1)
        .single();
      platformFee = settings?.platform_fee ?? 10;

      // Validate coupon server-side
      if (couponCode) {
        try {
          const { data: couponResult } = await supabase.rpc('validate_coupon', {
            p_code: couponCode,
            p_cart_total: subtotal
          });
          if (couponResult?.valid) {
            discount = couponResult.discount || 0;
          }
        } catch (e) {
          console.warn('[razorpay-order] Coupon validation failed:', e);
        }
      }

      total = subtotal + shippingFee + platformFee - discount;
    } else {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing cartItems or amount' }) };
    }

    // Ensure total is positive
    if (total <= 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid order total' }) };
    }

    const amountInPaise = Math.round(total * 100);
    const receiptId = customReceipt || `order_${userId.slice(0, 8)}_${Date.now()}`;

    // ── Try Razorpay SDK, fall back to REST API, then test mode ──
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    let orderId;

    if (keyId && keySecret && keySecret !== 'NEEDS_YOUR_SECRET_KEY') {
      // Production: Use Razorpay REST API directly (no npm dependency needed)
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const orderPayload = JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: receiptId,
        notes: notes || { userId, source: 'BYNDIO' }
      });

      const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: orderPayload
      });

      const rzpData = await rzpRes.json();
      if (!rzpRes.ok) {
        console.error('[razorpay-order] Razorpay API error:', rzpData);
        throw new Error(rzpData.error?.description || 'Failed to create Razorpay order');
      }
      orderId = rzpData.id;
    } else {
      // Test mode: Generate a test order ID
      console.warn('[razorpay-order] RAZORPAY_KEY_SECRET not configured — using test mode');
      orderId = `order_TEST_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        orderId,
        id: orderId,
        amount: amountInPaise,
        serverCalculatedTotal: total,
        subtotal,
        shippingFee,
        platformFee,
        discount,
        currency: 'INR',
        receipt: receiptId,
      })
    };
  } catch (err) {
    console.error('[razorpay-order]', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
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
