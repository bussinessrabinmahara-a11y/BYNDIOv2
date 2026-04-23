import { createClient } from '@supabase/supabase-js';


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
      
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server not configured' }) };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const params = event.queryStringParameters || {};
  const { q, category, page = '1', limit = '24', sort = 'pop' } = params;

  try {
    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('is_active', true);

    // Search: multi-word uses AND between words, OR between fields per word
    if (q) {
      const searchTerm = q.trim();
      const words = searchTerm.split(/\s+/).filter(w => w.length > 1);
      if (words.length > 1) {
        words.forEach(w => {
          query = query.or(`name.ilike.%${w}%,brand.ilike.%${w}%,category.ilike.%${w}%,description.ilike.%${w}%`);
        });
      } else {
        query = query.or(`name.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }
    }

    // Category filter (case-insensitive partial match)
    if (category) {
      query = query.ilike('category', `%${category}%`);
    }

    // Sorting
    if (sort === 'lh') query = query.order('price', { ascending: true });
    else if (sort === 'hl') query = query.order('price', { ascending: false });
    else if (sort === 'rating') query = query.order('avg_rating', { ascending: false });
    else if (sort === 'new') query = query.order('created_at', { ascending: false });
    else query = query.order('avg_rating', { ascending: false });

    // Pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 24, 100);
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ products: data || [], total: count || 0, page: pageNum })
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
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
