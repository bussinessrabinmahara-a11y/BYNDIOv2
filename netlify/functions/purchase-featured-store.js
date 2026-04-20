const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Purchase a featured store placement
 * POST { title, description, bannerUrl, duration, paymentId }
 * 
 * Durations: 7d = ₹999, 30d = ₹2999, 90d = ₹7499
 */
const DURATION_PRICES = {
  7: 999,
  30: 2999,
  90: 7499,
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { title, description, bannerUrl, duration, paymentId } = JSON.parse(event.body);

    if (!DURATION_PRICES[duration]) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid duration. Choose 7, 30, or 90 days.' }) };
    }

    // Auth
    const authHeader = event.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (authError || !user) return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };

    // Verify user is a seller
    const { data: seller } = await supabase.from('sellers').select('id, business_name').eq('id', user.id).maybeSingle();
    if (!seller) return { statusCode: 403, body: JSON.stringify({ error: 'Only sellers can purchase featured store placement' }) };

    const price = DURATION_PRICES[duration];
    const isProduction = process.env.CONTEXT === 'production' || process.env.NODE_ENV === 'production';
    const isDemoPayment = !isProduction && (!paymentId || paymentId?.startsWith('DEMO-'));

    if (!isDemoPayment && !paymentId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Payment required', price, requiresPayment: true }) };
    }

    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + duration * 24 * 3600000);

    // Get next position
    const { count } = await supabase.from('featured_stores').select('id', { count: 'exact', head: true }).eq('is_active', true);

    const { data: store, error: storeErr } = await supabase
      .from('featured_stores')
      .insert({
        seller_id: user.id,
        title: title || `${seller.business_name}'s Store`,
        description: description || '',
        banner_url: bannerUrl || null,
        position: (count || 0) + 1,
        is_active: true,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        amount_paid: price,
        payment_id: paymentId || 'DEMO-' + Date.now(),
      })
      .select()
      .single();

    if (storeErr) throw storeErr;

    // Log revenue
    await supabase.from('platform_revenue').insert({
      source: 'featured_store',
      amount: price,
      user_id: user.id,
      reference_id: store.id,
      description: `Featured store placement for ${duration} days`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        featuredStore: {
          id: store.id,
          endsAt: endsAt.toISOString(),
          price,
          duration,
        },
      }),
    };
  } catch (err) {
    console.error('[purchase-featured-store]', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
