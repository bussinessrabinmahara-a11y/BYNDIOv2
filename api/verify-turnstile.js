
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
    'Access-Control-Allow-Origin': event.headers['origin'] || '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const { token } = JSON.parse(event.body);
    if (!token) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'CAPTCHA token required' }) };

    // Skip validation in local development if secret is missing (fallback to allow)
    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    if (!secretKey) {
      if (process.env.NODE_ENV !== 'production') {
         return { statusCode: 200, headers, body: JSON.stringify({ success: true, warning: 'Development mode: Turnstile skipped' }) };
      }
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Turnstile not configured' }) };
    }

    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (!data.success) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'CAPTCHA verification failed' }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Internal server error' }) };
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
