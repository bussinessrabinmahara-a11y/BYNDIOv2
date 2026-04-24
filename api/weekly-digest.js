// ================================================================
// WEEKLY SELLER DIGEST — Vercel Cron Function
// Runs every Monday at 9 AM IST (3:30 UTC)
// Setup: vercel.json → crons: [{ path: "/api/weekly-digest", schedule: "30 3 * * 1" }]
// ================================================================
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Guard: Only allow Vercel cron invocations or dev testing
  const isVercelCron = req.headers['authorization'] === `Bearer ${process.env.CRON_SECRET}`;
  const isDev = process.env.NODE_ENV !== 'production';
  if (!isVercelCron && !isDev) {
    return res.status(403).json({ error: 'Forbidden — cron only' });
  }

  try {
    const reqVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
    const miss = reqVars.filter(v => !process.env[v]);
    if (miss.length) {
      console.error('[weekly-digest] Missing:', miss);
      return res.status(500).json({ error: 'Missing config' });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const weekOf = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    const { data: sellers } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('role', 'seller');

    if (!sellers?.length) return res.status(200).json({ message: 'No sellers' });

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@byndio.in';
    const BASE_URL = process.env.VITE_APP_URL || 'https://byndio.in';

    if (!RESEND_API_KEY) {
      console.warn('[weekly-digest] RESEND_API_KEY missing — skipping email send');
      return res.status(200).json({ message: 'Skipped — no email key' });
    }

    let sent = 0;
    for (const seller of sellers) {
      try {
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('price, quantity, products(name), orders(created_at, status)')
          .eq('seller_id', seller.id)
          .gte('orders.created_at', weekAgo);

        const orders = (orderItems || []).length;
        const revenue = (orderItems || []).reduce((s, i) => s + (i.price * i.quantity), 0);
        const topProduct = orderItems?.sort((a, b) => (b.quantity || 0) - (a.quantity || 0))[0]?.products?.name;

        if (orders === 0) continue;

        // Send email via Resend directly
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: `BYNDIO Reports <${FROM_EMAIL}>`,
            to: [seller.email],
            subject: `📊 Your Weekly Report — Week of ${weekOf}`,
            html: `<h2>Hi ${seller.full_name || 'Seller'},</h2>
              <p>Here's your weekly performance summary:</p>
              <ul>
                <li><strong>Orders:</strong> ${orders}</li>
                <li><strong>Revenue:</strong> ₹${revenue.toLocaleString('en-IN')}</li>
                ${topProduct ? `<li><strong>Top Product:</strong> ${topProduct}</li>` : ''}
              </ul>
              <p><a href="${BASE_URL}/seller-dashboard">View Full Dashboard →</a></p>
              <p style="font-size:12px;color:#757575">Questions? seller-support@byndio.in</p>`,
          }),
        });
        sent++;
      } catch (err) {
        console.error(`Failed to send digest to ${seller.email}:`, err.message);
      }
    }

    console.info(`[weekly-digest] Sent ${sent} digests to ${sellers.length} sellers`);
    return res.status(200).json({ sent, total: sellers.length });
  } catch (err) {
    console.error('[weekly-digest] Error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
