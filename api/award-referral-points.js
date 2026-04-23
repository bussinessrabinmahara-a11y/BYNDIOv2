import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);


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
    const { action, userId, amount, newUserId, referralCode } = body;

    const authHeader = event.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) };
    }

    // PATH A: Claim Reward (Withdrawal/Transfer)
    if (action === 'claim_reward') {
      if (!amount || amount <= 0) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid amount' }) };
      }
      
      // Check current balance
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();
        
      if (!wallet || wallet.balance < amount) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Insufficient balance' }) };
      }

      // Record transaction and update balance
      // We use the credit_wallet RPC but with a negative amount for debiting if it supports it, 
      // or we should have a specific RPC for claims.
      // Assuming credit_wallet handles p_amount (can be negative)
      const { error: claimErr } = await supabase.rpc('credit_wallet', {
        p_user_id: user.id,
        p_amount: -amount,
        p_reason: 'reward_claim'
      });

      if (claimErr) throw claimErr;

      return { statusCode: 200, body: JSON.stringify({ success: true, message: 'Reward claimed successfully' }) };
    }

    // PATH B: Award Referral Points (New Signup)
    const refCode = referralCode || body.referralCode;
    const targetUserId = newUserId || body.newUserId;

    if (!targetUserId || !refCode) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields for referral award' }) };
    }

    // Find the referrer by code
    const { data: referral } = await supabase
      .from('referrals')
      .select('user_id')
      .eq('code', refCode.toUpperCase())
      .single();

    if (!referral) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid referral code' }) };
    }

    if (referral.user_id === targetUserId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Self-referral not allowed' }) };
    }

    // Award bonus to referrer
    await supabase.rpc('credit_wallet', {
      p_user_id: referral.user_id,
      p_amount: 50,
      p_reason: 'referral_bonus'
    });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error('[award-referral-points]', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
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
