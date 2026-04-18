const Razorpay = require('razorpay');
const { createClient } = require('@supabase/supabase-js');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { cartItems, shippingMethodId, userId, amount: directAmount, receipt: customReceipt } = JSON.parse(event.body);

    if (!userId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing userId' }) };
    }

    let total = 0;
    let subtotal = 0;
    let shippingFee = 0;
    let platformFee = 0;

    // PATH A: Direct amount (B2B / Subscriptions)
    if (directAmount) {
      total = directAmount / 100; // Expected in paise from client as per email.ts
      subtotal = total;
    } 
    // PATH B: Cart-based calculation
    else if (cartItems?.length) {
      const productIds = cartItems.map(i => i.product_id);
      const { data: products, error: productError } = await supabase
        .from('products')
        .select('id, price, stock_quantity, approval_status')
        .in('id', productIds)
        .eq('approval_status', 'approved');

      if (productError) throw productError;

      for (const item of cartItems) {
        const product = products.find(p => p.id === item.product_id);
        if (!product) {
          return { statusCode: 400, body: JSON.stringify({ error: `Product ${item.product_id} not found or not approved` }) };
        }
        if (product.stock_quantity < item.quantity) {
          return { statusCode: 400, body: JSON.stringify({ error: `Insufficient stock for product ${item.product_id}` }) };
        }
      }

      subtotal = cartItems.reduce((sum, item) => {
        const product = products.find(p => p.id === item.product_id);
        return sum + (product.price * item.quantity);
      }, 0);

      if (shippingMethodId) {
        const { data: shippingMethod } = await supabase
          .from('shipping_methods')
          .select('cost')
          .eq('id', shippingMethodId)
          .single();
        shippingFee = shippingMethod?.cost || 0;
      }

      platformFee = Math.round(subtotal * 0.02);
      total = subtotal + shippingFee + platformFee;
    } else {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing cartItems or amount' }) };
    }

    const order = await razorpay.orders.create({
      amount: Math.round(total * 100), // paise
      currency: 'INR',
      receipt: customReceipt || `order_${userId}_${Date.now()}`
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        orderId: order.id,
        id: order.id, // For compatibility with different frontend calls
        amount: total,
        subtotal,
        shippingFee,
        platformFee,
        currency: 'INR'
      })
    };
  } catch (err) {
    console.error('[razorpay-order]', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
