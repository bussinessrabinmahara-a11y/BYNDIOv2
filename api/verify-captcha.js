// ================================================================
// VERIFY CAPTCHA — Cloudflare Turnstile server-side verification
// LoginModal.tsx sends the token as `response`, so we accept both
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
      
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const body = JSON.parse(event.body);
    // Accept both `token` and `response` fields from client
    const token = body.token || body.response;
    if (!token) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Missing CAPTCHA token' }) };
    }
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
      console.warn('[verify-captcha] TURNSTILE_SECRET_KEY not set. Bypassing CAPTCHA for test mode.');
      // Allow through when no secret is configured (test/dev mode)
      return { 
        statusCode: 200, 
        body: JSON.stringify({ 
          success: true, 
          message: 'CAPTCHA skipped (Test Mode — no TURNSTILE_SECRET_KEY configured)' 
        }) 
      };
    }
    const verifyRes = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, response: token })
      }
    );
    const data = await verifyRes.json();
    if (!data.success) {
      return { statusCode: 403, body: JSON.stringify({ success: false, error: 'CAPTCHA verification failed' }) };
    }
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error('[verify-captcha] Error:', err);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: 'Server error' }) };
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
