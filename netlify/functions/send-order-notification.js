// ================================================================
// SEND ORDER NOTIFICATION — Email buyer on order placement
// Uses Resend API (set RESEND_API_KEY and FROM_EMAIL in env vars)
// ================================================================
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { orderId, userEmail, userName, buyerEmail, buyerName, sellerEmail, total, items } = JSON.parse(event.body);
    
    const recipientEmail = userEmail || buyerEmail;
    const recipientName = userName || buyerName || 'Customer';
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';

    if (!apiKey) {
      console.warn('[send-order-notification] RESEND_API_KEY not configured — skipping email');
      return { statusCode: 200, body: JSON.stringify({ success: true, skipped: true }) };
    }

    if (!recipientEmail) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing recipient email' }) };
    }

    // Build item list HTML
    const itemsHtml = (items || []).map(i => 
      `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#333">${i.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#666;text-align:center">${i.qty}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#333;text-align:right;font-weight:600">₹${(i.price * i.qty).toLocaleString('en-IN')}</td>
      </tr>`
    ).join('');

    const emailHtml = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#0D47A1,#1565C0);padding:32px 24px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:900;letter-spacing:-0.5px">BYNDIO</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px">Order Confirmed ✓</p>
        </div>
        <div style="padding:32px 24px">
          <h2 style="margin:0 0 8px;font-size:20px;color:#1a1a1a">Thank you, ${recipientName}!</h2>
          <p style="margin:0 0 24px;color:#666;font-size:14px;line-height:1.6">Your order <strong>#${orderId?.slice(0, 8).toUpperCase() || 'N/A'}</strong> has been placed successfully. We're getting it ready for you.</p>
          
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
            <thead>
              <tr style="background:#f8f9fa">
                <th style="padding:10px 12px;text-align:left;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;font-weight:700">Item</th>
                <th style="padding:10px 12px;text-align:center;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;font-weight:700">Qty</th>
                <th style="padding:10px 12px;text-align:right;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;font-weight:700">Amount</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding:12px;text-align:right;font-size:16px;font-weight:900;color:#1a1a1a">Total</td>
                <td style="padding:12px;text-align:right;font-size:18px;font-weight:900;color:#0D47A1">₹${(total || 0).toLocaleString('en-IN')}</td>
              </tr>
            </tfoot>
          </table>

          <div style="background:#f0f7ff;border-radius:8px;padding:16px;margin-bottom:24px">
            <p style="margin:0;font-size:13px;color:#0D47A1;font-weight:600">📦 You can track your order in the "My Orders" section of your BYNDIO account.</p>
          </div>

          <a href="https://byndio.in/my-orders" style="display:block;text-align:center;background:#0D47A1;color:#fff;padding:14px 24px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none">Track My Order</a>
        </div>
        <div style="background:#f8f9fa;padding:20px 24px;text-align:center;border-top:1px solid #e5e5e5">
          <p style="margin:0;font-size:11px;color:#999">© ${new Date().getFullYear()} BYNDIO Technologies Pvt Ltd. All rights reserved.</p>
          <p style="margin:4px 0 0;font-size:11px;color:#999">Need help? Reply to this email or WhatsApp us.</p>
        </div>
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `BYNDIO <${fromEmail}>`,
        to: [recipientEmail],
        subject: `Order Confirmed — #${orderId?.slice(0, 8).toUpperCase() || 'N/A'} | BYNDIO`,
        html: emailHtml
      })
    });

    const result = await res.json();
    if (!res.ok) {
      console.error('[send-order-notification] Resend error:', result);
      return { statusCode: 200, body: JSON.stringify({ success: false, error: result.message }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error('[send-order-notification] Error:', err);
    // Non-blocking — don't fail the order just because email failed
    return { statusCode: 200, body: JSON.stringify({ success: false, error: err.message }) };
  }
};
