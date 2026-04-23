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
    const authHeader = event.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) };
    }
    const { orderId, trackingAwb, awbCode, courierName } = JSON.parse(event.body);
    const finalAwb = trackingAwb || awbCode;
    
    if (!orderId || !finalAwb) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing orderId or trackingAwb' }) };
    }
    // Verify this seller owns items in this order
    const { data: orderItem } = await supabase
      .from('order_items')
      .select('id')
      .eq('order_id', orderId)
      .eq('seller_id', user.id)
      .limit(1)
      .single();
      
    if (!orderItem) {
      return { statusCode: 403, body: JSON.stringify({ error: 'You do not have permission to update this order' }) };
    }
    // Safe to update
    const trackingUrl = courierName === 'Shiprocket' || !courierName 
      ? `https://shiprocket.co/tracking/${finalAwb}`
      : null;

    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        tracking_awb: finalAwb, 
        courier_name: courierName || 'Shiprocket', 
        tracking_url: trackingUrl,
        status: 'shipped',
        shipped_at: new Date().toISOString()
      })
      .eq('id', orderId);
    if (updateError) throw updateError;
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
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
