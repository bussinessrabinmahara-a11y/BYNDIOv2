// ================================================================
// FIX #1 — PAYMENT SIGNATURE VERIFICATION (Server-Side)
// Razorpay requires HMAC-SHA256 verification on backend ONLY
// A user cannot fake a payment without knowing your secret key
// ================================================================
const crypto = require('crypto');

const ALLOWED_ORIGINS = ['https://byndio.in', 'https://www.byndio.in'];

function getAllowedOrigin(event) {
  const origin = event.headers['origin'] || event.headers['Origin'] || '';
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  if (process.env.CONTEXT === 'deploy-preview' || process.env.CONTEXT === 'branch-deploy') return origin;
  return 'https://byndio.in';
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': getAllowedOrigin(event),
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = JSON.parse(event.body || '{}');

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ verified: false, error: 'Missing payment parameters' }),
      };
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      console.error('[verify-payment] RAZORPAY_KEY_SECRET not set');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ verified: false, error: 'Payment verification not configured' }),
      };
    }

    // Generate expected signature
    const body        = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSig),
      Buffer.from(razorpay_signature),
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ verified: isValid }),
    };
  } catch (err) {
    console.error('[verify-payment] Error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ verified: false, error: 'Verification failed' }),
    };
  }
};
