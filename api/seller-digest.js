// ================================================================
// WEEKLY SELLER DIGEST EMAIL — Vercel Cron Function
// Runs every Monday 8:30am IST (3:00 UTC)
// Setup: vercel.json → crons: [{ path: "/api/seller-digest", schedule: "0 3 * * 1" }]
// Sends each seller their weekly performance summary
// ================================================================

export default async function handler(req, res) {
  // Guard: Only allow Vercel cron invocations or dev testing
  const isVercelCron = req.headers['authorization'] === `Bearer ${process.env.CRON_SECRET}`;
  const isDev = process.env.NODE_ENV !== 'production';
  if (!isVercelCron && !isDev) {
    return res.status(403).json({ error: 'Forbidden — cron only' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const FROM_EMAIL     = process.env.FROM_EMAIL || 'noreply@byndio.in';
  const SUPABASE_URL   = process.env.SUPABASE_URL;
  const SUPABASE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const BASE_URL       = process.env.VITE_APP_URL || 'https://byndio.in';

  if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('[seller-digest] Missing env vars — skipping');
    return res.status(200).json({ message: 'Skipped — missing config' });
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };

  try {
    const sellersRes = await fetch(`${SUPABASE_URL}/rest/v1/users?select=id,full_name,email&role=eq.seller`, { headers });
    const sellers = await sellersRes.json();
    if (!Array.isArray(sellers) || sellers.length === 0) {
      console.info('[seller-digest] No sellers found');
      return res.status(200).json({ message: 'No sellers' });
    }

    let sent = 0;
    for (const seller of sellers) {
      try {
        const ordersRes = await fetch(
          `${SUPABASE_URL}/rest/v1/order_items?select=price,quantity,orders(status,created_at)&seller_id=eq.${seller.id}&orders.created_at=gte.${weekAgo}`,
          { headers }
        );
        const items = await ordersRes.json();
        const validItems = Array.isArray(items) ? items.filter(i => i.orders) : [];

        if (validItems.length === 0) continue;

        const totalOrders  = new Set(validItems.map(i => i.orders?.id).filter(Boolean)).size;
        const totalRevenue = validItems.reduce((s, i) => s + (i.price * i.quantity), 0);
        const delivered    = validItems.filter(i => i.orders?.status === 'delivered').length;

        const emailBody = {
          from: `BYNDIO Seller Reports <${FROM_EMAIL}>`,
          to:   [seller.email],
          subject: `📊 Your Weekly Report — ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}`,
          html: `
<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body{font-family:Arial,sans-serif;color:#212121;margin:0;background:#f5f5f5}
.wrap{max-width:600px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}
.header{background:#0D47A1;color:#fff;padding:24px;text-align:center}
.body{padding:24px}
.stat{background:#E3F2FD;border-radius:8px;padding:16px;text-align:center;flex:1}
.stats{display:flex;gap:12px;margin:20px 0}
.btn{display:inline-block;background:#0D47A1;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:700}
.footer{background:#f5f5f5;padding:16px;text-align:center;font-size:11px;color:#9e9e9e}
</style></head><body>
<div class="wrap">
  <div class="header">
    <h2 style="margin:0;font-size:20px">📊 Weekly Seller Report</h2>
    <p style="margin:4px 0;opacity:.85;font-size:13px">BYNDIO · Last 7 days</p>
  </div>
  <div class="body">
    <p>Hi <strong>${seller.full_name || 'Seller'}</strong>,</p>
    <p>Here's how your store performed this week:</p>
    <div class="stats">
      <div class="stat"><div style="font-size:28px;font-weight:900;color:#0D47A1">${totalOrders}</div><div style="font-size:12px;color:#555">Orders</div></div>
      <div class="stat"><div style="font-size:28px;font-weight:900;color:#0D47A1">₹${totalRevenue.toLocaleString('en-IN')}</div><div style="font-size:12px;color:#555">Revenue</div></div>
      <div class="stat"><div style="font-size:28px;font-weight:900;color:#2E7D32">${delivered}</div><div style="font-size:12px;color:#555">Delivered</div></div>
    </div>
    ${totalOrders === 0 ? '<div style="background:#FFF8E1;border-radius:8px;padding:14px;font-size:13px;color:#795548">💡 Tip: Add more products and complete your KYC to increase visibility.</div>' : '<div style="background:#E8F5E9;border-radius:8px;padding:14px;font-size:13px;color:#2E7D32">✅ Great week! Keep it up. Make sure to ship pending orders within 24 hours.</div>'}
    <center style="margin:24px 0"><a href="${BASE_URL}/seller-dashboard" class="btn">View Dashboard →</a></center>
    <p style="font-size:12px;color:#757575">Questions? seller-support@byndio.in</p>
  </div>
  <div class="footer">© ${new Date().getFullYear()} BYNDIO Technologies Pvt Ltd · <a href="#" style="color:#9e9e9e">Unsubscribe</a></div>
</div></body></html>`,
        };

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify(emailBody),
        });
        sent++;
      } catch (e) {
        console.error(`[seller-digest] Failed for seller ${seller.id}:`, e.message);
      }
    }

    console.info(`[seller-digest] Sent ${sent}/${sellers.length} digests`);
    return res.status(200).json({ sent, total: sellers.length });
  } catch (err) {
    console.error('[seller-digest] Error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
