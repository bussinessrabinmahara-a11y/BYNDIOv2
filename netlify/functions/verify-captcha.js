// ================================================================
// VERIFY CAPTCHA — Cloudflare Turnstile server-side verification
// LoginModal.tsx sends the token as `response`, so we accept both
// ================================================================
exports.handler = async (event) => {
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
      console.error('[verify-captcha] TURNSTILE_SECRET_KEY not set');
      // In dev/preview, allow through if no secret configured
      if (process.env.CONTEXT === 'deploy-preview' || process.env.CONTEXT === 'dev') {
        return { statusCode: 200, body: JSON.stringify({ success: true }) };
      }
      return { statusCode: 500, body: JSON.stringify({ success: false, error: 'CAPTCHA not configured' }) };
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
};
