// ================================================================
// VERIFY PAYMENT — Server-Side Razorpay Signature Verification
// Verifies HMAC-SHA256 signature to prevent payment fraud
// Also handles test mode payments gracefully
// ================================================================
import crypto from 'crypto';

const ALLOWED_ORIGINS = ['https://byndio.in', 'https://www.byndio.in'];

function getAllowedOrigin(event) {
  const origin = event.headers['origin'] || event.headers['Origin'] || '';
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  // Allow dev/preview origins
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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

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

    // Handle test mode payments (order_TEST_* IDs from our test razorpay-order)
    if (razorpay_order_id.startsWith('order_TEST_')) {
      console.log('[verify-payment] Test mode payment — auto-verified');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ verified: true, testMode: true }),
      };
    }

    // Handle demo payments
    if (razorpay_payment_id.startsWith('DEMO-')) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ verified: true, testMode: true }),
      };
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret || secret === 'NEEDS_YOUR_SECRET_KEY') {
      console.error('[verify-payment] RAZORPAY_KEY_SECRET not set');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ verified: false, error: 'Payment verification not configured' }),
      };
    }

    // Generate expected signature using HMAC-SHA256
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    let isValid = false;
    try {
      isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSig),
        Buffer.from(razorpay_signature),
      );
    } catch {
      isValid = false; // Length mismatch
    }

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
