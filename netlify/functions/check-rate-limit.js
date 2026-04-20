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

    // Set limits based on action
    const maxAttempts = action === 'login' ? 5 : 3;
    const lockDurationMins = action === 'login' ? 15 : 10;
    
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
        return { 
          statusCode: 429, 
          body: JSON.stringify({ 
            allowed: false, 
            error: `Too many attempts. Please try again after ${Math.ceil((new Date(rlRecord.locked_until).getTime() - now.getTime()) / 60000)} minutes.` 
          }) 
        };
      }
      
      // If lock has expired, reset attempts
      if (rlRecord.locked_until && new Date(rlRecord.locked_until) <= now) {
        await supabase
          .from('rate_limits')
          .update({ attempts: 1, locked_until: null, updated_at: now.toISOString() })
          .eq('id', rlRecord.id);
          
        return { statusCode: 200, body: JSON.stringify({ allowed: true }) };
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
            error: `Too many attempts. Please try again after ${lockDurationMins} minutes.` 
          }) 
        };
      } else {
        await supabase
          .from('rate_limits')
          .update(updateData)
          .eq('id', rlRecord.id);
          
        return { statusCode: 200, body: JSON.stringify({ allowed: true }) };
      }
    } else {
      // Create new record
      await supabase
        .from('rate_limits')
        .insert({
          identifier,
          action,
          attempts: 1,
          updated_at: now.toISOString()
        });
        
      return { statusCode: 200, body: JSON.stringify({ allowed: true }) };
    }
  } catch (err) {
    console.error('[check-rate-limit] Error:', err);
    // Fail open if there's a DB issue, but log it
    return { statusCode: 200, body: JSON.stringify({ allowed: true, error: 'Database error, failing open' }) };
  }
};
