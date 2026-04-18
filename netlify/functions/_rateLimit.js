// ================================================================
// RATE LIMITER for Netlify serverless functions
// Uses in-memory rate limiting (resets on cold start)
// For production Redis rate limiting, add UPSTASH_REDIS_REST_URL
// and UPSTASH_REDIS_REST_TOKEN to Netlify env vars
// ================================================================

const hits = {};
const MAX_KEYS = 10000; // Prevent memory leak

/**
 * @param {string} key  — IP or user identifier
 * @param {number} max  — max requests allowed
 * @param {number} windowMs — time window in milliseconds
 * @returns {Promise<boolean>} true if request is allowed
 */
async function rateLimit(key, max = 20, windowMs = 60_000) {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  // If Upstash Redis is configured, use it for distributed rate limiting
  if (upstashUrl && upstashToken) {
    try {
      const redisKey = `ratelimit:${key}`;
      // Basic rate limiting with Redis INCR + EXPIRE
      // Note: This is an approximation. For exact window, use a Lua script or Upstash Ratelimit lab.
      const res = await fetch(`${upstashUrl}/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${upstashToken}` },
        body: JSON.stringify([
          ['INCR', redisKey],
          ['PEXPIRE', redisKey, windowMs, 'NX']
        ])
      });
      const [[, count]] = await res.json();
      return count <= max;
    } catch (err) {
      console.error('[rateLimit] Redis error, falling back to in-memory:', err);
    }
  }

  // --- Fallback: In-memory rate limiting (per instance) ---
  const now = Date.now();
  if (!hits[key]) hits[key] = [];
  hits[key] = hits[key].filter(t => now - t < windowMs);
  if (hits[key].length >= max) return false;
  hits[key].push(now);
  return true;
}

module.exports = { rateLimit };
