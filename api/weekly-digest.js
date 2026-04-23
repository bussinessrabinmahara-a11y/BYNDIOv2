// ================================================================
// WEEKLY SELLER DIGEST — Scheduled Netlify Function
// Runs every Monday at 9 AM IST
// Setup: Add to netlify.toml:
//   [[scheduled_functions]]
//     name = "weekly-digest"
//     cron = "30 3 * * 1"  (3:30 UTC = 9:00 AM IST)
// ================================================================


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
      
  // Guard: Only allow Netlify scheduled function invocations
  const isScheduled = event.headers['x-netlify-schedule'] === 'true'
    || (event.httpMethod === 'POST' && event.headers['user-agent']?.includes('Netlify'));
  // In dev/testing, always allow
  const isDev = process.env.NODE_ENV !== 'production';
  if (!isScheduled && !isDev) {
    return { statusCode: 403, body: 'Forbidden — scheduled function' };
  }

  try {
    const reqVars = ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'];
    const miss = reqVars.filter(v => !process.env[v]);
    if (miss.length) { console.error('[weekly-digest] Missing:', miss); return { statusCode: 500, body: 'Missing config' }; }
    import { createClient } from '@supabase/supabase-js';
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const weekOf  = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    const { data: sellers } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('role', 'seller');

    if (!sellers?.length) return { statusCode: 200, body: 'No sellers' };

    let sent = 0;
    for (const seller of sellers) {
      try {
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('price, quantity, products(name), orders(created_at, status)')
          .eq('seller_id', seller.id)
          .gte('orders.created_at', weekAgo);

        const orders    = (orderItems || []).length;
        const revenue   = (orderItems || []).reduce((s, i) => s + (i.price * i.quantity), 0);
        const topProduct = orderItems?.sort((a, b) => (b.quantity || 0) - (a.quantity || 0))[0]?.products?.name;

        if (orders === 0) continue;

        // Call send-email with auth header from service role
        await fetch(`${process.env.URL || 'https://byndio.in'}/.netlify/functions/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            to: seller.email,
            template: 'seller_weekly_digest',
            data: {
              sellerName: seller.full_name,
              weekOf,
              orders,
              revenue: revenue.toLocaleString('en-IN'),
              rating: '4.5',
              topProduct,
            },
          }),
        });
        sent++;
      } catch (err) {
        console.error(`Failed to send digest to ${seller.email}:`, err.message);
      }
    }

    console.info(`[weekly-digest] Sent ${sent} digests to ${sellers.length} sellers`);
    return { statusCode: 200, body: JSON.stringify({ sent, total: sellers.length }) };
  } catch (err) {
    console.error('[weekly-digest] Error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal error' }) };
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
