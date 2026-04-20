const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { rewardPoints } = JSON.parse(event.body);
    if (!rewardPoints || rewardPoints < 100) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Minimum 100 points needed to redeem' }) };
    }

    const authHeader = event.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return { statusCode: 401, body: 'Unauthorized' };
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (authError || !user) return { statusCode: 401, body: 'Unauthorized' };

    // 1. Verify user actually has these points
    const { data: pointsData } = await supabase
      .from('reward_points')
      .select('points')
      .eq('user_id', user.id);
      
    const totalPoints = pointsData?.reduce((s, p) => s + p.points, 0) || 0;
    
    if (totalPoints < rewardPoints) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Insufficient reward points' }) };
    }

    const cashback = Math.floor(rewardPoints * 0.1);

    // 2. Deduct points (insert negative value)
    const { error: deductErr } = await supabase.from('reward_points').insert({
      user_id: user.id,
      points: -rewardPoints,
      action: 'redeemed_for_cashback',
    });
    
    if (deductErr) throw deductErr;

    // 3. Credit wallet using RPC
    const { error: walletErr } = await supabase.rpc('credit_wallet', {
      p_user_id: user.id,
      p_amount: cashback,
      p_description: 'Reward Points Redemption'
    });
    
    if (walletErr) throw walletErr;

    return { statusCode: 200, body: JSON.stringify({ success: true, cashback }) };
  } catch (err) {
    console.error('[redeem-points]', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
