const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  
  try {
    const plans = {
      // Seller Plans
      'Free': 0,
      'Starter': 499,
      'Pro': 1999,
      'Premium': 4999,
      // Influencer Plans
      'Basic': 0,
      'Influencer Pro': 999
    };
    
    const { 
      paymentId, 
      paymentSignature, 
      orderId, 
      planName, 
      amountMonthly, 
      planRole, // 'seller' or 'influencer'
      commissionRate 
    } = JSON.parse(event.body);
    
    const authHeader = event.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return { statusCode: 401, body: 'Unauthorized' };
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (authError || !user) return { statusCode: 401, body: 'Unauthorized' };

    // 1. Verify Payment
    let isVerified = false;
    const isProduction = process.env.CONTEXT === 'production' || process.env.NODE_ENV === 'production';
    
    // Demo/dev bypass — ONLY when explicitly NOT in production AND payment has demo prefix
    if (!isProduction && (paymentId?.startsWith('DEMO-') || paymentId?.startsWith('TEST-'))) {
      isVerified = true;
    } else {
      // Production Razorpay verification
      const secret = process.env.RAZORPAY_KEY_SECRET;
      const keyId = process.env.RAZORPAY_KEY_ID;
      
      if (!secret || !keyId) throw new Error('Razorpay keys not configured');

      if (orderId && paymentSignature) {
        // Standard Signature Verification
        const body = orderId + '|' + paymentId;
        const expectedSig = crypto.createHmac('sha256', secret).update(body).digest('hex');
        
        try {
          isVerified = crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(paymentSignature));
        } catch {
          isVerified = false;
        }
      } else {
        // Fetch from API to verify if no signature/order ID was provided
        const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
          headers: {
            'Authorization': `Basic ${Buffer.from(keyId + ':' + secret).toString('base64')}`
          }
        });
        if (res.ok) {
          const paymentData = await res.json();
          if ((paymentData.status === 'captured' || paymentData.status === 'authorized') && 
              paymentData.amount >= amountMonthly * 100) {
            isVerified = true;
          }
        }
      }
    }

    if (!isVerified) return { statusCode: 400, body: JSON.stringify({ error: 'Payment verification failed' }) };

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 3600000).toISOString();

    // S-06: Downgrade protection — prevent accidental plan downgrades
    const planHierarchy = { free: 0, starter: 1, pro: 2, 'seller pro': 2, premium: 3, enterprise: 3 };
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('plan_name, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    
    if (existingSub) {
      const currentLevel = planHierarchy[existingSub.plan_name?.toLowerCase()] ?? 0;
      const newLevel = planHierarchy[planName.toLowerCase()] ?? 0;
      if (newLevel < currentLevel) {
        return { statusCode: 400, body: JSON.stringify({ 
          error: `Cannot downgrade from ${existingSub.plan_name} to ${planName}. Please contact support for plan changes.` 
        })};
      }
    }
    
    // 2. Insert/Update Subscription securely as admin
    const { error: subError } = await supabase.from('subscriptions').upsert({
      user_id: user.id,
      plan_name: planName,
      plan_role: planRole || 'seller',
      status: 'active',
      price: amountMonthly,
      amount: amountMonthly,
      started_at: now.toISOString(),
      expires_at: expiresAt,
      payment_method: paymentId.startsWith('DEMO-') ? 'demo' : 'razorpay',
      payment_id: paymentId,
    }, { onConflict: 'user_id' });

    if (subError) throw subError;

    // 3. Update User Role & Subscription Plan
    const { data: currentUser } = await supabase.from('users').select('role').eq('id', user.id).single();
    
    // Determine new role (don't downgrade admins)
    let newRole = currentUser?.role === 'admin' ? 'admin' : (planRole || 'seller');
    
    const { error: userUpdateError } = await supabase.from('users').update({
      subscription_plan: planName.toLowerCase(),
      subscription_expires_at: expiresAt,
      role: newRole
    }).eq('id', user.id);

    if (userUpdateError) throw userUpdateError;

    // 4. If influencer plan, update commission rate in influencers table
    if (planRole === 'influencer' && commissionRate) {
      const { error: inflError } = await supabase.from('influencers').upsert({
        id: user.id,
        commission_rate: commissionRate,
      }, { onConflict: 'id' });
      
      if (inflError) throw inflError;
    }
    
    // 5. If seller plan, update seller table if needed
    if (planRole === 'seller') {
      const planLower = planName.toLowerCase();
      const sellerPlan = planLower === 'premium' ? 'premium' :
                         planLower === 'pro' ? 'pro' :
                         planLower === 'starter' ? 'starter' : 'free';
      await supabase.from('sellers').upsert({
        id: user.id,
        subscription_plan: sellerPlan
      }, { onConflict: 'id' });
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, planName, expiresAt, role: newRole }) };
  } catch (err) {
    console.error('[verify-subscription]', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

