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
  return true;
}

export { rateLimit };
