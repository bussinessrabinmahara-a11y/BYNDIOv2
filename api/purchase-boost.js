import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Purchase a product boost / ad
 * POST { boostPackageId, productId }
 * 
 * Flow:
 * 1. Verify seller owns the product
 * 2. Check seller subscription allows boosting
 * 3. Create boost record
 * 4. Deduct from free boosts or charge via Razorpay
 * 5. Log platform revenue
 */

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
      
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { boostPackageId, productId, paymentId } = JSON.parse(event.body);

    // Auth
    const authHeader = event.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (authError || !user) return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };

    // 1. Get boost package
    const { data: pkg, error: pkgErr } = await supabase
      .from('boost_packages')
      .select('*')
      .eq('id', boostPackageId)
      .single();
    
    if (pkgErr || !pkg) return { statusCode: 404, body: JSON.stringify({ error: 'Boost package not found' }) };
    if (!pkg.is_active) return { statusCode: 400, body: JSON.stringify({ error: 'This boost package is no longer available' }) };

    // 2. Verify seller owns the product
    const { data: product, error: prodErr } = await supabase
      .from('products')
      .select('id, seller_id, name')
      .eq('id', productId)
      .single();

    if (prodErr || !product) return { statusCode: 404, body: JSON.stringify({ error: 'Product not found' }) };
    if (product.seller_id !== user.id) return { statusCode: 403, body: JSON.stringify({ error: 'You can only boost your own products' }) };

    // 3. Check for existing active boost of same type on this product
    const { data: existingBoost } = await supabase
      .from('product_boosts')
      .select('id')
      .eq('product_id', productId)
      .eq('type', pkg.type)
      .eq('status', 'active')
      .gte('ends_at', new Date().toISOString())
      .maybeSingle();

    if (existingBoost) {
      return { statusCode: 400, body: JSON.stringify({ error: 'This product already has an active boost of this type' }) };
    }

    // 4. Check if seller has free boosts from subscription
    let usedFreeBost = false;
    const { data: sellerSub } = await supabase
      .from('subscription_plans')
      .select('free_boosts_monthly')
      .eq('id', (await supabase.from('users').select('subscription_plan').eq('id', user.id).single()).data?.subscription_plan || 'free')
      .single();

    if (sellerSub?.free_boosts_monthly > 0) {
      // Count boosts used this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { count: boostsUsed } = await supabase
        .from('product_boosts')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', user.id)
        .gte('created_at', startOfMonth.toISOString());

      if ((boostsUsed || 0) < sellerSub.free_boosts_monthly) {
        usedFreeBost = true;
      }
    }

    const amountPaid = usedFreeBost ? 0 : pkg.price;

    // 5. If paid boost, verify payment (simplified — in production use Razorpay verify)
    const isProduction = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'production';
    if (amountPaid > 0 && !paymentId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Payment required for this boost', price: pkg.price, requiresPayment: true }) };
    }

    // 6. Create the boost
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + pkg.duration_hours * 3600000);

    const { data: boost, error: boostErr } = await supabase
      .from('product_boosts')
      .insert({
        seller_id: user.id,
        product_id: productId,
        boost_package_id: boostPackageId,
        type: pkg.type,
        status: 'active',
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        amount_paid: amountPaid,
        payment_id: paymentId || (usedFreeBost ? 'FREE_BOOST' : null),
      })
      .select()
      .single();

    if (boostErr) throw boostErr;

    // 7. Update product sponsored status
    await supabase.from('products').update({
      is_sponsored: true,
      sponsored_until: endsAt.toISOString(),
    }).eq('id', productId);

    // 8. Log platform revenue (only if paid)
    if (amountPaid > 0) {
      await supabase.from('platform_revenue').insert({
        source: pkg.type,
        amount: amountPaid,
        user_id: user.id,
        reference_id: boost.id,
        description: `${pkg.name} for product: ${product.name}`,
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        boost: {
          id: boost.id,
          type: pkg.type,
          endsAt: endsAt.toISOString(),
          amountPaid,
          usedFreeBoost: usedFreeBost,
        },
      }),
    };
  } catch (err) {
    console.error('[purchase-boost]', err);
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
