// ================================================================
// RATE LIMITER for Netlify serverless functions
// Uses Upstash Redis for distributed rate limiting (production)
// Falls back to in-memory for dev/preview (resets on cold start)
// ================================================================

const hits = {};

/**
 * @param {string} key  — IP or user identifier
 * @param {number} max  — max requests allowed
 * @param {number} windowMs — time window in milliseconds
 * @returns {boolean|Promise<boolean>} true if request is allowed
 */
async function rateLimit(key, max = 20, windowMs = 60_000) {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  // If Upstash Redis is configured, use it for distributed rate limiting
  if (upstashUrl && upstashToken) {
    try {
      const redisKey = `rl:${key}`;
      const windowSec = Math.ceil(windowMs / 1000);

      // Pipeline: INCR the key + set TTL only if key is new (NX)
      const res = await fetch(`${upstashUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', redisKey],
          ['EXPIRE', redisKey, windowSec, 'NX']
        ])
      });

      if (!res.ok) {
        console.error('[rateLimit] Upstash HTTP error:', res.status);
        return true; // Allow on error
      }

      const results = await res.json();
      // Upstash pipeline response: [{ result: count }, { result: 0|1 }]
      const count = results?.[0]?.result;
      if (typeof count === 'number') {
        return count <= max;
      }
      return true; // Allow on parse error
    } catch (err) {
      console.error('[rateLimit] Redis error, falling back to in-memory:', err.message);
    }
  }

  // --- Fallback: In-memory rate limiting (per instance) ---
  const now = Date.now();
  if (!hits[key]) hits[key] = [];
  hits[key] = hits[key].filter(t => now - t < windowMs);
  if (hits[key].length >= max) return false;
  hits[key].push(now);

  // Periodic cleanup to prevent memory leak
  if (Object.keys(hits).length > 5000) {
    const cutoff = now - windowMs;
    for (const k of Object.keys(hits)) {
      hits[k] = hits[k].filter(t => t > cutoff);
      if (hits[k].length === 0) delete hits[k];
    }
  }

  return true;
}

module.exports = { rateLimit };
