const https = require('https');
const { createClient } = require('@supabase/supabase-js');

async function verifyAdmin(event) {
  const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return null;
  // Use SUPABASE_URL (no VITE_ prefix) — VITE_ vars are build-time only and not available in Netlify functions
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') return null;
  return user;
}

const ALLOWED_ORIGINS = ['https://byndio.in', 'https://www.byndio.in'];

function getAllowedOrigin(event) {
  const origin = event.headers['origin'] || event.headers['Origin'] || '';
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  if (process.env.CONTEXT === 'deploy-preview' || process.env.CONTEXT === 'branch-deploy') return origin;
  return 'https://byndio.in';
}

exports.handler = async (event) => {
  const hdrs = {
    'Access-Control-Allow-Origin': getAllowedOrigin(event),
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: hdrs, body: '' };
  const adminUser = await verifyAdmin(event);
  if (!adminUser) {
    return { statusCode: 401, headers: hdrs, body: JSON.stringify({ error: 'Unauthorized — admin access required' }) };
  }
  try {
    const { payment_id, amount, notes } = JSON.parse(event.body || '{}');
    if (!payment_id) return { statusCode: 400, headers: hdrs, body: JSON.stringify({ error: 'payment_id required' }) };
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return { statusCode: 500, headers: hdrs, body: JSON.stringify({ error: 'Payment gateway not configured' }) };
    if (payment_id.startsWith('DEMO-') || payment_id.startsWith('COD-')) {
      return { statusCode: 200, headers: hdrs, body: JSON.stringify({ id: 'rfnd_demo_' + Date.now(), status: 'processed', amount: amount || 0 }) };
    }
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const body = JSON.stringify({
      ...(amount ? { amount: Math.round(amount * 100) } : {}),
      notes: notes || { reason: 'Customer requested refund', source: 'BYNDIO Admin' },
    });
    const result = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.razorpay.com', path: `/v1/payments/${payment_id}/refund`, method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}`, 'Content-Length': Buffer.byteLength(body) },
      }, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(d) })); });
      req.on('error', reject); req.write(body); req.end();
    });
    return { statusCode: result.status, headers: hdrs, body: JSON.stringify(result.body) };
  } catch (err) {
    console.error('[razorpay-refund]', err);
    return { statusCode: 500, headers: hdrs, body: JSON.stringify({ error: err.message }) };
  }
};
