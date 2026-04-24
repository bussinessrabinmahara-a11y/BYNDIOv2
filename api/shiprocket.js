// ================================================================
// SHIPROCKET SHIPPING INTEGRATION
// Handles: login/token refresh, create shipment, generate AWB,
//          request pickup, track shipment, cancel shipment
// Sign up free at: https://app.shiprocket.in/register
// ================================================================

import https from 'https';
import { createClient } from '@supabase/supabase-js';

const SR_EMAIL    = process.env.SHIPROCKET_EMAIL;
const SR_PASSWORD = process.env.SHIPROCKET_PASSWORD;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
let   SR_TOKEN    = null;
let   SR_TOKEN_EXP = 0;

async function httpRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function getToken() {
  if (SR_TOKEN && Date.now() < SR_TOKEN_EXP) return SR_TOKEN;
  if (!SR_EMAIL || !SR_PASSWORD) throw new Error('Shiprocket credentials not configured');

  const body = JSON.stringify({ email: SR_EMAIL, password: SR_PASSWORD });
  const res  = await httpRequest({
    hostname: 'apiv2.shiprocket.in',
    path: '/v1/external/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
  }, body);

  if (!res.body.token) throw new Error('Shiprocket login failed: ' + JSON.stringify(res.body));
  SR_TOKEN     = res.body.token;
  SR_TOKEN_EXP = Date.now() + 9 * 24 * 60 * 60 * 1000; // 9 days
  return SR_TOKEN;
}

async function srRequest(method, path, body) {
  const token      = await getToken();
  const bodyStr    = body ? JSON.stringify(body) : null;
  const headers    = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr);

  const res = await httpRequest({
    hostname: 'apiv2.shiprocket.in',
    path: '/v1/external' + path,
    method,
    headers,
  }, bodyStr);
  return res;
}

// Verify user authentication via Supabase JWT
async function verifyAuth(event) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    return { error: 'Server configuration error', statusCode: 500 };
  }
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Authentication required', statusCode: 401 };
  }
  const token = authHeader.replace('Bearer ', '');
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return { error: 'Invalid or expired token', statusCode: 401 };
    // Fetch user role
    const { data: userData } = await supabase.from('users').select('role').eq('id', data.user.id).single();
    return { user: { ...data.user, role: userData?.role || 'buyer' } };
  } catch {
    return { error: 'Authentication failed', statusCode: 401 };
  }
}

// Actions that require seller or admin role
const SELLER_ACTIONS = ['create_shipment', 'cancel_shipment', 'generate_awb', 'request_pickup', 'generate_label'];
// Actions any authenticated user can do
const PUBLIC_ACTIONS = ['track', 'track_order', 'check_serviceability'];

const handlers = {
  // Create a shipment order in Shiprocket
  create_shipment: async (data) => {
    const { order } = data;
    const payload = {
      order_id:          order.id.slice(0, 20),
      order_date:        new Date(order.created_at).toISOString().split('T')[0],
      pickup_location:   'Primary',
      channel_id:        '',
      comment:           'BYNDIO Order',
      billing_customer_name:    order.shipping_address.fullName,
      billing_last_name:        '',
      billing_address:          order.shipping_address.line1,
      billing_city:             order.shipping_address.city,
      billing_pincode:          order.shipping_address.pin,
      billing_state:            order.shipping_address.state,
      billing_country:          'India',
      billing_email:            order.buyer_email || 'buyer@byndio.in',
      billing_phone:            order.shipping_address.mobile,
      shipping_is_billing:      true,
      order_items: (order.order_items || []).map(item => ({
        name:         item.products?.name || 'Product',
        sku:          item.product_id?.slice(0, 20) || 'SKU001',
        units:        item.quantity,
        selling_price: item.price,
        discount:     '',
        tax:          '',
        hsn:          item.hsn || '',
      })),
      payment_method:   order.payment_method === 'cod' ? 'COD' : 'Prepaid',
      shipping_charges: order.shipping_fee || 0,
      giftwrap_charges: 0,
      transaction_charges: 0,
      total_discount:   0,
      sub_total:        order.total_amount,
      length:           10,
      breadth:          10,
      height:           10,
      weight:           0.5,
    };
    return srRequest('POST', '/orders/create/adhoc', payload);
  },

  // Generate AWB (Air Waybill / tracking number) for a shipment
  generate_awb: async ({ shipment_id, courier_id }) => {
    return srRequest('POST', '/courier/assign/awb', { shipment_id, courier_id: courier_id || '' });
  },

  // Request pickup from seller's address
  request_pickup: async ({ shipment_id }) => {
    return srRequest('POST', '/courier/generate/pickup', { shipment_id: [shipment_id] });
  },

  // Generate shipping label PDF
  generate_label: async ({ shipment_id }) => {
    return srRequest('POST', '/courier/generate/label', { shipment_id: [shipment_id] });
  },

  // Track a shipment
  track: async ({ awb }) => {
    return srRequest('GET', `/courier/track/awb/${awb}`, null);
  },

  // Track by order ID
  track_order: async ({ order_id }) => {
    return srRequest('GET', `/orders/show/${order_id}`, null);
  },

  // Cancel a shipment
  cancel_shipment: async ({ awb }) => {
    return srRequest('POST', '/orders/cancel', { awbs: [awb] });
  },

  // Get available couriers for a pincode
  check_serviceability: async ({ pickup_pin, delivery_pin, weight, cod }) => {
    const params = new URLSearchParams({
      pickup_postcode:   pickup_pin,
      delivery_postcode: delivery_pin,
      weight:            weight || '0.5',
      cod:               cod ? '1' : '0',
    });
    return srRequest('GET', `/courier/serviceability?${params}`, null);
  },
};


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
      
  const origin = event.headers['origin'] || event.headers['Origin'] || '';
  const allowedOrigins = ['https://byndio.in', 'https://www.byndio.in'];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : (origin && origin.endsWith('.vercel.app')) ? origin : (process.env.NODE_ENV !== 'production' ? (origin || '*') : 'https://byndio.in');
  const hdrs = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: hdrs, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: hdrs, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    // Verify authentication
    const authResult = await verifyAuth(event);
    if (authResult.error) {
      return { statusCode: authResult.statusCode, headers: hdrs, body: JSON.stringify({ error: authResult.error }) };
    }

    const { action, ...data } = JSON.parse(event.body || '{}');
    if (!action || !handlers[action]) {
      return { statusCode: 400, headers: hdrs, body: JSON.stringify({ error: `Unknown action: ${action}` }) };
    }

    // Check role-based access
    const userRole = authResult.user.role;
    if (SELLER_ACTIONS.includes(action) && !['seller', 'admin'].includes(userRole)) {
      return { statusCode: 403, headers: hdrs, body: JSON.stringify({ error: 'Seller or admin access required' }) };
    }

    const result = await handlers[action](data);
    return { statusCode: result.status || 200, headers: hdrs, body: JSON.stringify(result.body) };
  } catch (err) {
    console.error('[shiprocket]', err);
    return { statusCode: 500, headers: hdrs, body: JSON.stringify({ error: 'Internal server error' }) };
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
