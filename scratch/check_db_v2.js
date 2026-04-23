
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const getVar = (name) => {
  const match = env.match(new RegExp(`^${name}=(.*)$`, 'm'));
  return match ? match[1].trim() : null;
};

const url = getVar('SUPABASE_URL');
const key = getVar('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(url, key);

async function check() {
  const { count, error } = await supabase.from('products').select('*', { count: 'exact', head: true });
  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  console.log('Product count:', count);
  
  const { data: sellers } = await supabase.from('sellers').select('id', { count: 'exact', head: true });
  console.log('Seller count:', sellers?.length || 0);
}

check();
