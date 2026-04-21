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
    const { identifier, action, increment = true } = JSON.parse(event.body);
    if (!identifier || !action) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing identifier or action' }) };
    }

    // Set limits based on user request: 100 attempts, 1 minute lock
    const maxAttempts = 100;
    const lockDurationMins = 1;
    
    // Fetch rate limit record
    let { data: rlRecord, error: rlError } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('identifier', identifier)
      .eq('action', action)
      .maybeSingle();
      
    const now = new Date();
    
    if (rlRecord) {
      // Check if currently locked
      if (rlRecord.locked_until && new Date(rlRecord.locked_until) > now) {
        const remainingMs = new Date(rlRecord.locked_until).getTime() - now.getTime();
        const remainingSecs = Math.ceil(remainingMs / 1000);
        return { 
          statusCode: 429, 
          body: JSON.stringify({ 
            allowed: false, 
            error: `Too many attempts. Please try again in ${remainingSecs} seconds.` 
          }) 
        };
      }
      
      // If lock has expired, reset attempts
      if (rlRecord.locked_until && new Date(rlRecord.locked_until) <= now) {
        if (increment) {
          await supabase
            .from('rate_limits')
            .update({ attempts: 1, locked_until: null, updated_at: now.toISOString() })
            .eq('id', rlRecord.id);
        } else {
          // Just reset but don't count an attempt yet
          await supabase
            .from('rate_limits')
            .update({ attempts: 0, locked_until: null, updated_at: now.toISOString() })
            .eq('id', rlRecord.id);
        }
          
        return { statusCode: 200, body: JSON.stringify({ allowed: true, attempts: increment ? 1 : 0 }) };
      }
      
      if (!increment) {
        return { statusCode: 200, body: JSON.stringify({ allowed: true, attempts: rlRecord.attempts }) };
      }

      // Increment attempts
      const newAttempts = rlRecord.attempts + 1;
      let updateData = { attempts: newAttempts, updated_at: now.toISOString() };
      
      // Lock if max attempts reached
      if (newAttempts >= maxAttempts) {
        const lockedUntil = new Date(now.getTime() + lockDurationMins * 60000);
        updateData.locked_until = lockedUntil.toISOString();
        
        await supabase
          .from('rate_limits')
          .update(updateData)
          .eq('id', rlRecord.id);
          
        return { 
          statusCode: 429, 
          body: JSON.stringify({ 
            allowed: false, 
            error: `Too many attempts. Please try again after 1 minute.` 
          }) 
        };
      } else {
        await supabase
          .from('rate_limits')
          .update(updateData)
          .eq('id', rlRecord.id);
          
        return { statusCode: 200, body: JSON.stringify({ allowed: true, attempts: newAttempts }) };
      }
    } else {
      // Create new record
      if (increment) {
        await supabase
          .from('rate_limits')
          .insert({
            identifier,
            action,
            attempts: 1,
            updated_at: now.toISOString()
          });
      }
        
      return { statusCode: 200, body: JSON.stringify({ allowed: true, attempts: increment ? 1 : 0 }) };
    }
  } catch (err) {
    console.error('[check-rate-limit] Error:', err);
    // Fail open if there's a DB issue, but log it
    return { statusCode: 200, body: JSON.stringify({ allowed: true, error: 'Database error, failing open' }) };
  }
};
