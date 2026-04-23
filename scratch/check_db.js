
const { createClient } = require('@supabase/supabase-client');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { count, error } = await supabase.from('products').select('*', { count: 'exact', head: true });
  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  console.log('Product count:', count);
}

check();
