// BYNDIO Rate Limiter - v1.2
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { identifier, action } = JSON.parse(event.body);
    if (!identifier || !action) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing identifier or action' }) };
    }
    const maxAttempts = 100;
    const lockMinutes = 0.1; // 6 seconds
    const { data: existing } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('identifier', identifier)
      .eq('action', action)
      .single();
    if (existing?.locked_until && new Date(existing.locked_until) > new Date()) {
      const retryAfter = Math.ceil(
        (new Date(existing.locked_until) - new Date()) / 1000 / 60
      );
      return {
        statusCode: 429,
        body: JSON.stringify({ allowed: false, retryAfter, message: `Too many attempts. Try again in ${retryAfter} minutes.` })
      };
    }
    const newAttempts = (existing?.attempts || 0) + 1;
    const shouldLock = newAttempts >= maxAttempts;
    const lockedUntil = shouldLock
      ? new Date(Date.now() + lockMinutes * 60 * 1000).toISOString()
      : null;
    await supabase.from('rate_limits').upsert({
      identifier,
      action,
      attempts: newAttempts,
      locked_until: lockedUntil,
      updated_at: new Date().toISOString()
    }, { onConflict: 'identifier,action' });
    if (shouldLock) {
      return {
        statusCode: 429,
        body: JSON.stringify({ allowed: false, retryAfter: lockMinutes, message: `Too many attempts. Try again in ${lockMinutes} minutes.` })
      };
    }
    return { statusCode: 200, body: JSON.stringify({ allowed: true, attemptsRemaining: maxAttempts - newAttempts }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  }
};
