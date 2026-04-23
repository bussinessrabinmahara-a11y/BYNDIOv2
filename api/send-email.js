// ================================================================
// FIX #4 — TRANSACTIONAL EMAIL via Resend API
// Handles: order confirmation, KYC status, seller alerts,
//          password reset, welcome email, shipping updates
// ================================================================

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL     = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const FROM_NAME      = 'BYNDIO';
import { rateLimit } from './_rateLimit';

import { createClient } from '@supabase/supabase-js';

async function verifyAuthUser(event) {
  const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return null;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// HTML-encode user-supplied data to prevent XSS in emails
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}


function getHeaders(event) {
  const origin = event?.headers?.['origin'] || event?.headers?.['Origin'] || '';
  const allowed = ['https://byndio.in', 'https://www.byndio.in'];
  const allowedOrigin = allowed.includes(origin) ? origin : (process.env.NODE_ENV !== 'production' ? (origin || '*') : 'https://byndio.in');
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
}

const templates = {
  order_confirmation: (data) => ({
    subject: `✅ Order Confirmed — #${esc(data.orderId)} | BYNDIO`,
    html: `
<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>body{font-family:Arial,sans-serif;color:#212121;margin:0;padding:0;background:#f5f5f5}
.wrap{max-width:600px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)}
.header{background:#0D47A1;color:#fff;padding:24px;text-align:center}
.header h1{margin:0;font-size:24px;font-weight:900}
.body{padding:24px}
.order-box{background:#E3F2FD;border-radius:8px;padding:16px;margin:16px 0;text-align:center}
.order-id{font-size:22px;font-weight:900;color:#0D47A1}
.item{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee;font-size:14px}
.total{display:flex;justify-content:space-between;padding:14px 0;font-size:16px;font-weight:900;color:#0D47A1}
.btn{display:inline-block;background:#0D47A1;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:700;margin:16px 0}
.footer{background:#f5f5f5;padding:16px;text-align:center;font-size:11px;color:#9e9e9e}
</style></head><body>
<div class="wrap">
  <div class="header">
    <h1>🛍️ BYNDIO</h1>
    <p style="margin:4px 0;opacity:.85;font-size:14px">Your order is confirmed!</p>
  </div>
  <div class="body">
    <p>Hi <strong>${esc(data.buyerName)}</strong>,</p>
    <p>Thank you for shopping with BYNDIO! Your order has been placed successfully.</p>
    <div class="order-box">
      <div style="font-size:12px;color:#555">Order ID</div>
      <div class="order-id">#${esc(data.orderId)}</div>
      <div style="font-size:12px;color:#555;margin-top:4px">Estimated delivery: ${esc(data.deliveryDays || '2–5 business days')}</div>
    </div>
    <h3 style="margin:20px 0 10px">Order Summary</h3>
    ${(data.items || []).map(item => `
    <div class="item">
      <span>${esc(item.name)} × ${esc(item.qty)}</span>
      <span>₹${(item.price * item.qty).toLocaleString('en-IN')}</span>
    </div>`).join('')}
    <div class="total">
      <span>Total Paid</span>
      <span>₹${data.total.toLocaleString('en-IN')}</span>
    </div>
    <div style="background:#f9f9f9;border-radius:8px;padding:14px;margin:16px 0;font-size:13px">
      <strong>Shipping to:</strong><br/>
      ${esc(data.address || 'Address on file')}
    </div>
    <center>
      <a href="https://byndio.in/my-orders" class="btn">Track Your Order →</a>
    </center>
    <p style="font-size:12px;color:#757575">Questions? Reply to this email or contact support@byndio.in</p>
  </div>
  <div class="footer">© ${new Date().getFullYear()} BYNDIO Technologies Pvt Ltd · Mumbai, India<br/>
  <a href="https://byndio.in/legal/privacy" style="color:#9e9e9e">Privacy</a> ·
  <a href="https://byndio.in/legal/terms" style="color:#9e9e9e">Terms</a></div>
</div></body></html>`,
  }),

  kyc_submitted: (data) => ({
    subject: `📋 KYC Submitted — Under Review | BYNDIO`,
    html: `
<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>body{font-family:Arial,sans-serif;color:#212121;margin:0;padding:0;background:#f5f5f5}
.wrap{max-width:600px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)}
.header{background:#6A1B9A;color:#fff;padding:24px;text-align:center}
.body{padding:24px}.footer{background:#f5f5f5;padding:16px;text-align:center;font-size:11px;color:#9e9e9e}
.step{display:flex;align-items:center;gap:12px;padding:10px;background:#f9f9f9;border-radius:8px;margin:8px 0;font-size:13px}
</style></head><body>
<div class="wrap">
  <div class="header"><h1>🔒 BYNDIO KYC</h1><p style="opacity:.85;margin:4px 0">Verification in Progress</p></div>
  <div class="body">
    <p>Hi <strong>${esc(data.name)}</strong>,</p>
    <p>Your KYC documents have been successfully submitted and are currently under review by our team.</p>
    <div class="step"><span>✅</span><span>Documents received and uploaded securely</span></div>
    <div class="step"><span>⏳</span><span>Identity verification — 24–48 hours</span></div>
    <div class="step"><span>⏳</span><span>Bank account validation</span></div>
    <div class="step"><span>⏳</span><span>KYC approval notification sent</span></div>
    <p style="margin-top:20px;font-size:13px;color:#555">Once approved, you'll be able to withdraw earnings, access instant payouts, and unlock all seller features.</p>
    <p style="font-size:12px;color:#757575">Questions? Contact support@byndio.in</p>
  </div>
  <div class="footer">© ${new Date().getFullYear()} BYNDIO Technologies Pvt Ltd</div>
</div></body></html>`,
  }),

  kyc_approved: (data) => ({
    subject: `✅ KYC Approved — You're Verified! | BYNDIO`,
    html: `
<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>body{font-family:Arial,sans-serif;color:#212121;margin:0;padding:0;background:#f5f5f5}
.wrap{max-width:600px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)}
.header{background:#2E7D32;color:#fff;padding:24px;text-align:center}
.body{padding:24px}.footer{background:#f5f5f5;padding:16px;text-align:center;font-size:11px;color:#9e9e9e}
.btn{display:inline-block;background:#2E7D32;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:700}
</style></head><body>
<div class="wrap">
  <div class="header"><h1>🎉 KYC Approved!</h1></div>
  <div class="body">
    <p>Hi <strong>${esc(data.name)}</strong>,</p>
    <p style="font-size:15px;font-weight:700">Congratulations! Your KYC verification is complete. ✅</p>
    <p>You now have full access to:</p>
    <ul style="font-size:14px;line-height:2">
      <li>💰 Instant earnings withdrawal to your bank</li>
      <li>⚡ Instant payout on sales</li>
      <li>🏦 Full seller/creator features</li>
    </ul>
    <center style="margin:24px 0"><a href="https://byndio.in/rewards" class="btn">View Wallet →</a></center>
  </div>
  <div class="footer">© ${new Date().getFullYear()} BYNDIO Technologies Pvt Ltd</div>
</div></body></html>`,
  }),

  seller_new_order: (data) => ({
    subject: `🛒 New Order — #${data.orderId} | BYNDIO Seller`,
    html: `
<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>body{font-family:Arial,sans-serif;color:#212121;margin:0;background:#f5f5f5}
.wrap{max-width:600px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)}
.header{background:#E65100;color:#fff;padding:24px;text-align:center}
.body{padding:24px}.footer{background:#f5f5f5;padding:16px;text-align:center;font-size:11px;color:#9e9e9e}
.btn{display:inline-block;background:#E65100;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:700}
.box{background:#FFF3E0;border-radius:8px;padding:16px;margin:16px 0;font-size:14px}
</style></head><body>
<div class="wrap">
  <div class="header"><h1>📦 New Order!</h1><p style="opacity:.85;margin:4px 0">You have a new sale on BYNDIO</p></div>
  <div class="body">
    <p>Hi <strong>${esc(data.sellerName)}</strong>,</p>
    <p>You have received a new order. Please process it within 24 hours.</p>
    <div class="box">
      <strong>Order #${esc(data.orderId)}</strong><br/>
      ${(data.items || []).map(i => `• ${esc(i.name)} × ${esc(i.qty)} — ₹${(i.price*i.qty).toLocaleString('en-IN')}`).join('<br/>')}
    </div>
    <p><strong>Ship to:</strong> ${esc(data.address)}</p>
    <p style="color:#E65100;font-weight:700">⏰ Please ship within 24 hours to maintain your seller rating.</p>
    <center style="margin:24px 0"><a href="https://byndio.in/seller-dashboard" class="btn">View Dashboard →</a></center>
  </div>
  <div class="footer">© ${new Date().getFullYear()} BYNDIO Technologies Pvt Ltd</div>
</div></body></html>`,
  }),

  seller_application_submitted: (data) => ({
    subject: `🏪 Application Received — We're Building Your Store! | BYNDIO`,
    html: `
<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>body{font-family:Arial,sans-serif;color:#212121;margin:0;background:#f5f5f5}
.wrap{max-width:600px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)}
.header{background:#0D47A1;color:#fff;padding:24px;text-align:center}
.body{padding:24px}.footer{background:#f5f5f5;padding:16px;text-align:center;font-size:11px;color:#9e9e9e}
.step{display:flex;align-items:center;gap:12px;padding:10px;background:#f9f9f9;border-radius:8px;margin:8px 0;font-size:13px}
</style></head><body>
<div class="wrap">
  <div class="header"><h1>🏪 BYNDIO Onboarding</h1><p style="opacity:.85;margin:4px 0">Application Under Review</p></div>
  <div class="body">
    <p>Hi <strong>${esc(data.name)}</strong>,</p>
    <p>Thank you for applying to sell on BYNDIO! We've received your business details and KYC documents.</p>
    <p><strong>What happens next?</strong></p>
    <div class="step"><span>✅</span><span>Step 1: Application Received</span></div>
    <div class="step"><span>⏳</span><span>Step 2: Business & KYC Review (24h)</span></div>
    <div class="step"><span>⏳</span><span>Step 3: Store Activation</span></div>
    <div class="step"><span>⏳</span><span>Step 4: Start Listing Products</span></div>
    <p style="margin-top:20px;font-size:13px;color:#555">Our team will contact you if we need any further information. Once approved, you can log in to your Seller Dashboard to start selling.</p>
    <p style="font-size:12px;color:#757575">Questions? Contact support@byndio.in</p>
  </div>
  <div class="footer">© ${new Date().getFullYear()} BYNDIO Technologies Pvt Ltd</div>
</div></body></html>`,
  }),

  seller_approved: (data) => ({
    subject: `🚀 Store Activated! Welcome to the BYNDIO Seller Family`,
    html: `
<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>body{font-family:Arial,sans-serif;color:#212121;margin:0;background:#f5f5f5}
.wrap{max-width:600px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)}
.header{background:#1B5E20;color:#fff;padding:32px;text-align:center}
.body{padding:24px}.footer{background:#f5f5f5;padding:16px;text-align:center;font-size:11px;color:#9e9e9e}
.btn{display:inline-block;background:#F57C00;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:900}
</style></head><body>
<div class="wrap">
  <div class="header"><h1>🚀 Your Store is LIVE!</h1></div>
  <div class="body">
    <p>Hi <strong>${esc(data.name)}</strong>,</p>
    <p style="font-size:15px;font-weight:700">Congratulations! Your seller application for <strong>${esc(data.businessName)}</strong> has been approved. ✅</p>
    <p>Your store is now active and ready for business. You can now:</p>
    <ul style="font-size:14px;line-height:2">
      <li>📦 Upload your product catalog</li>
      <li>🚚 Set up your shipping settings</li>
      <li>📊 Access your sales analytics</li>
      <li>💰 Enable affiliate promotions</li>
    </ul>
    <center style="margin:24px 0"><a href="https://byndio.in/seller-dashboard" class="btn">Open Seller Dashboard →</a></center>
    <p style="font-size:13px;color:#555">We're excited to help you grow your business on BYNDIO!</p>
  </div>
  <div class="footer">© ${new Date().getFullYear()} BYNDIO Technologies Pvt Ltd</div>
</div></body></html>`,
  }),

  shipping_update: (data) => ({
    subject: `🚚 Your Order #${data.orderId} Has Been Shipped! | BYNDIO`,
    html: `
<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>body{font-family:Arial,sans-serif;color:#212121;margin:0;background:#f5f5f5}
.wrap{max-width:600px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)}
.header{background:#0D47A1;color:#fff;padding:24px;text-align:center}
.body{padding:24px}.footer{background:#f5f5f5;padding:16px;text-align:center;font-size:11px;color:#9e9e9e}
.btn{display:inline-block;background:#0D47A1;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:700}
.track-box{background:#E3F2FD;border-radius:8px;padding:16px;text-align:center;margin:16px 0}
</style></head><body>
<div class="wrap">
  <div class="header"><h1>🚚 Order Shipped!</h1></div>
  <div class="body">
    <p>Hi <strong>${esc(data.buyerName)}</strong>,</p>
    <p>Great news! Your order has been shipped and is on its way.</p>
    <div class="track-box">
      <div style="font-size:12px;color:#555">Tracking Number</div>
      <div style="font-size:20px;font-weight:900;color:#0D47A1">${esc(data.trackingNumber || 'Will be updated soon')}</div>
      <div style="font-size:12px;color:#555;margin-top:4px">Courier: ${esc(data.courier || 'BYNDIO Logistics')}</div>
    </div>
    <p>Estimated delivery: <strong>${esc(data.deliveryDate || '2–3 business days')}</strong></p>
    <center style="margin:24px 0"><a href="https://byndio.in/my-orders" class="btn">Track Order →</a></center>
  </div>
  <div class="footer">© ${new Date().getFullYear()} BYNDIO Technologies Pvt Ltd</div>
</div></body></html>`,
  }),

  welcome: (data) => ({
    subject: `🎉 Welcome to BYNDIO — India's 0% Commission Marketplace!`,
    html: `
<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>body{font-family:Arial,sans-serif;color:#212121;margin:0;background:#f5f5f5}
.wrap{max-width:600px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)}
.header{background:linear-gradient(135deg,#0D47A1,#1565C0);color:#fff;padding:32px;text-align:center}
.body{padding:24px}.footer{background:#f5f5f5;padding:16px;text-align:center;font-size:11px;color:#9e9e9e}
.btn{display:inline-block;background:#F57C00;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:900;font-size:15px}
.feature{display:flex;align-items:flex-start;gap:12px;margin:12px 0;font-size:14px}
</style></head><body>
<div class="wrap">
  <div class="header">
    <h1 style="margin:0;font-size:28px;font-weight:900">🛍️ Welcome to BYNDIO!</h1>
    <p style="margin:8px 0 0;opacity:.85">India's 0% Commission Marketplace</p>
  </div>
  <div class="body">
    <p>Hi <strong>${esc(data.name)}</strong>! 👋</p>
    <p>You're now part of India's fairest marketplace. Here's what you can do:</p>
    <div class="feature"><span>🛒</span><div><strong>Shop</strong> from 10 lakh+ products at transparent prices</div></div>
    <div class="feature"><span>🏪</span><div><strong>Sell</strong> with 0% commission — keep all your profits</div></div>
    <div class="feature"><span>⭐</span><div><strong>Earn</strong> reward points on every purchase</div></div>
    <div class="feature"><span>🔗</span><div><strong>Refer</strong> friends and earn ₹200 bonus points</div></div>
    ${data.referralCode ? `<div style="background:#E3F2FD;border-radius:8px;padding:14px;text-align:center;margin:16px 0">
      <div style="font-size:12px;color:#555">Your Referral Code</div>
      <div style="font-size:22px;font-weight:900;color:#0D47A1;letter-spacing:0.1em">${data.referralCode}</div>
      <div style="font-size:12px;color:#555">Share this to earn 200 points per referral!</div>
    </div>` : ''}
    <center style="margin:24px 0"><a href="https://byndio.in/products" class="btn">Start Shopping →</a></center>
  </div>
  <div class="footer">© ${new Date().getFullYear()} BYNDIO Technologies Pvt Ltd · Mumbai, India<br/>
  <a href="https://byndio.in/legal/privacy" style="color:#9e9e9e">Privacy Policy</a></div>
</div></body></html>`,
  }),

  seller_weekly_digest: (data) => ({
    subject: `📊 Your Weekly Sales Report — ${data.weekOf} | BYNDIO`,
    html: `
<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>body{font-family:Arial,sans-serif;color:#212121;margin:0;background:#f5f5f5}
.wrap{max-width:600px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)}
.header{background:#E65100;color:#fff;padding:24px;text-align:center}
.body{padding:24px}.footer{background:#f5f5f5;padding:16px;text-align:center;font-size:11px;color:#9e9e9e}
.stat{background:#FFF3E0;border-radius:8px;padding:16px;text-align:center;flex:1}
.stats{display:flex;gap:12px;margin:20px 0}
.btn{display:inline-block;background:#E65100;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:700}
</style></head><body>
<div class="wrap">
  <div class="header"><h1>📦 Weekly Sales Report</h1><p style="opacity:.85;margin:4px 0">Week of ${data.weekOf}</p></div>
  <div class="body">
    <p>Hi <strong>${esc(data.sellerName)}</strong>,</p>
    <p>Here's your BYNDIO performance for the past week:</p>
    <div class="stats">
      <div class="stat"><div style="font-size:28px;font-weight:900;color:#E65100">${esc(data.orders)}</div><div style="font-size:12px;color:#555">Orders</div></div>
      <div class="stat"><div style="font-size:28px;font-weight:900;color:#0D47A1">₹${esc(data.revenue)}</div><div style="font-size:12px;color:#555">Revenue</div></div>
      <div class="stat"><div style="font-size:28px;font-weight:900;color:#2E7D32">${esc(data.rating)}★</div><div style="font-size:12px;color:#555">Avg Rating</div></div>
    </div>
    ${data.topProduct ? `<div style="background:#E8F5E9;border-radius:8px;padding:14px;margin:16px 0">
      <div style="font-size:12px;color:#555">🏆 Top Product This Week</div>
      <div style="font-size:15px;font-weight:700;color:#2E7D32">${esc(data.topProduct)}</div>
    </div>` : ''}
    <center style="margin:24px 0"><a href="https://byndio.in/seller-dashboard" class="btn">View Full Dashboard →</a></center>
    <p style="font-size:12px;color:#757575">Keep up the great work! Add more products and enable flash sales to boost your sales this week.</p>
  </div>
  <div class="footer">© ${new Date().getFullYear()} BYNDIO Technologies Pvt Ltd<br/>
  <a href="#" style="color:#9e9e9e">Unsubscribe from weekly reports</a></div>
</div></body></html>`,
  }),

  password_reset: (data) => ({
    subject: `🔐 Reset Your BYNDIO Password`,
    html: `
<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>body{font-family:Arial,sans-serif;color:#212121;margin:0;background:#f5f5f5}
.wrap{max-width:600px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)}
.header{background:#0D47A1;color:#fff;padding:24px;text-align:center}
.body{padding:24px}.footer{background:#f5f5f5;padding:16px;text-align:center;font-size:11px;color:#9e9e9e}
.btn{display:inline-block;background:#0D47A1;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px}
</style></head><body>
<div class="wrap">
  <div class="header"><h1>🔐 Password Reset</h1></div>
  <div class="body">
    <p>Hi <strong>${esc(data.name || 'there')}</strong>,</p>
    <p>We received a request to reset your BYNDIO password. Click the button below to set a new password:</p>
    <center style="margin:28px 0"><a href="${esc(data.resetUrl)}" class="btn">Reset Password →</a></center>
    <p style="font-size:13px;color:#757575">This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.</p>
    <p style="font-size:12px;color:#9e9e9e">Or copy this URL: ${esc(data.resetUrl)}</p>
  </div>
  <div class="footer">© ${new Date().getFullYear()} BYNDIO Technologies Pvt Ltd</div>
</div></body></html>`,
  }),

  return_approved: (data) => ({
    subject: `✅ Return Approved — Refund of ₹${data.refundAmount?.toLocaleString('en-IN')} Initiated | BYNDIO`,
    html: `
<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>body{font-family:Arial,sans-serif;color:#212121;margin:0;background:#f5f5f5}
.wrap{max-width:600px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)}
.header{background:#388E3C;color:#fff;padding:24px;text-align:center}
.body{padding:24px}.footer{background:#f5f5f5;padding:16px;text-align:center;font-size:11px;color:#9e9e9e}
.badge{display:inline-block;background:#E8F5E9;color:#2E7D32;padding:6px 16px;border-radius:20px;font-weight:700;font-size:13px}
</style></head><body>
<div class="wrap">
  <div class="header"><h1>✅ Return Approved</h1></div>
  <div class="body">
    <p>Hi <strong>${esc(data.buyerName || 'there')}</strong>,</p>
    <p>Your return request for Order <strong>#${esc(data.orderId)}</strong> has been <span class="badge">Approved</span>.</p>
    <p>A refund of <strong>₹${data.refundAmount?.toLocaleString('en-IN')}</strong> has been initiated to your original payment method.</p>
    <p style="font-size:13px;color:#757575">Refund ID: <code>${esc(data.refundId)}</code><br>
    Refunds typically reflect in 5–7 business days depending on your bank.</p>
    <p>If you have any questions, reply to this email or contact us at <a href="mailto:support@byndio.in">support@byndio.in</a>.</p>
  </div>
  <div class="footer">© ${new Date().getFullYear()} BYNDIO Technologies Pvt Ltd</div>
</div></body></html>`,
  }),

  return_rejected: (data) => ({
    subject: `❌ Return Request Update — Order #${data.orderId} | BYNDIO`,
    html: `
<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>body{font-family:Arial,sans-serif;color:#212121;margin:0;background:#f5f5f5}
.wrap{max-width:600px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)}
.header{background:#C62828;color:#fff;padding:24px;text-align:center}
.body{padding:24px}.footer{background:#f5f5f5;padding:16px;text-align:center;font-size:11px;color:#9e9e9e}
.reason{background:#FFF3E0;border-left:4px solid #E65100;padding:12px 16px;border-radius:4px;font-size:13px;margin:16px 0}
</style></head><body>
<div class="wrap">
  <div class="header"><h1>Return Request Update</h1></div>
  <div class="body">
    <p>Hi <strong>${esc(data.buyerName || 'there')}</strong>,</p>
    <p>After reviewing your return request for Order <strong>#${esc(data.orderId)}</strong>, we were unable to approve it for the following reason:</p>
    <div class="reason">${esc(data.reason)}</div>
    <p>If you believe this is an error or need further assistance, please contact us at <a href="mailto:support@byndio.in">support@byndio.in</a> within 7 days.</p>
  </div>
  <div class="footer">© ${new Date().getFullYear()} BYNDIO Technologies Pvt Ltd</div>
</div></body></html>`,
  }),
};

async function sendEmail(to, template, data) {
  if (!RESEND_API_KEY) {
    console.warn('[send-email] RESEND_API_KEY not set — email not sent');
    return { success: false, error: 'Email service not configured' };
  }

  const tmpl = templates[template];
  if (!tmpl) return { success: false, error: `Unknown template: ${template}` };

  const { subject, html } = tmpl(data);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from:    `${FROM_NAME} <${FROM_EMAIL}>`,
      to:      [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[send-email] Resend error:', err);
    return { success: false, error: err };
  }

  return { success: true };
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
      
  const hdrs = getHeaders(event);

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: hdrs, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: hdrs, body: JSON.stringify({ error: 'Method not allowed' }) };

  // SECURITY: Require authenticated user
  const authUser = await verifyAuthUser(event);
  if (!authUser) {
    return { statusCode: 401, headers: hdrs, body: JSON.stringify({ success: false, error: 'Authentication required' }) };
  }

  // Rate limit check removed as requested


  try {
    const { to, template, data } = JSON.parse(event.body || '{}');
    if (!to || !template) return { statusCode: 400, headers: hdrs, body: JSON.stringify({ error: 'Missing to or template' }) };
    const result = await sendEmail(to, template, data || {});
    return { statusCode: result.success ? 200 : 500, headers: hdrs, body: JSON.stringify(result) };
  } catch (err) {
    console.error('[send-email] Error:', err);
    return { statusCode: 500, headers: hdrs, body: JSON.stringify({ success: false, error: err.message }) };
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
