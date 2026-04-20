const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Purchase a premium seller badge
 * POST { badgeType, paymentId }
 * 
 * Badge types: verified, trusted, premium, brand_partner
 * Prices: verified=₹299/mo, trusted=₹599/mo, premium=₹999/mo, brand_partner=₹1999/mo
 */
const BADGE_PRICES = {
  verified: 299,
  trusted: 599,
  premium: 999,
  brand_partner: 1999,
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { badgeType, paymentId } = JSON.parse(event.body);

    if (!BADGE_PRICES[badgeType]) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid badge type' }) };
    }

    // Auth
    const authHeader = event.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (authError || !user) return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };

    // Verify user is a seller
    const { data: seller } = await supabase.from('sellers').select('id, kyc_status').eq('id', user.id).maybeSingle();
    if (!seller) return { statusCode: 403, body: JSON.stringify({ error: 'Only sellers can purchase badges' }) };
    if (seller.kyc_status !== 'approved') {
      return { statusCode: 403, body: JSON.stringify({ error: 'KYC must be approved before purchasing a badge' }) };
    }

    const price = BADGE_PRICES[badgeType];
    const isProduction = process.env.CONTEXT === 'production' || process.env.NODE_ENV === 'production';

    // Demo mode bypass
    const isDemoPayment = !isProduction && (!paymentId || paymentId?.startsWith('DEMO-'));
    if (!isDemoPayment && !paymentId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Payment required', price, requiresPayment: true }) };
    }

    const expiresAt = new Date(Date.now() + 30 * 24 * 3600000).toISOString();

    // Upsert badge (one per seller)
    const { data: badge, error: badgeErr } = await supabase
      .from('premium_badges')
      .upsert({
        seller_id: user.id,
        badge_type: badgeType,
        is_active: true,
        purchased_at: new Date().toISOString(),
        expires_at: expiresAt,
        amount_paid: price,
        payment_id: paymentId || 'DEMO-' + Date.now(),
      }, { onConflict: 'seller_id' })
      .select()
      .single();

    if (badgeErr) throw badgeErr;

    // Update seller verified status
    await supabase.from('sellers').update({ is_verified: true }).eq('id', user.id);

    // Log revenue
    await supabase.from('platform_revenue').insert({
      source: 'premium_badge',
      amount: price,
      user_id: user.id,
      reference_id: badge.id,
      description: `${badgeType} badge purchase`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        badge: {
          id: badge.id,
          type: badgeType,
          expiresAt,
          price,
        },
      }),
    };
  } catch (err) {
    console.error('[purchase-badge]', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
