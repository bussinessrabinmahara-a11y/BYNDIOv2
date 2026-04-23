
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

const PRODUCTS = [
  {
    name: "Premium Cotton Oversized T-Shirt",
    description: "Brand: UrbanStyle. 100% Cotton, Oversized Fit, Unisex.",
    category: "Fashion",
    price: 799,
    mrp: 1499,
    images: ["https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=800"],
    stock_quantity: 100,
    is_active: true,
    avg_rating: 4.8,
    review_count: 1240
  },
  {
    name: "Wireless Noise Cancelling Headphones",
    description: "Brand: SonicWave. 40 Hours Battery, 40mm Drivers, Bluetooth 5.2.",
    category: "Electronics",
    price: 4999,
    mrp: 8999,
    images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800"],
    stock_quantity: 50,
    is_active: true,
    avg_rating: 4.9,
    review_count: 856
  },
  {
    name: "Hydrating Facial Serum with Vitamin C",
    description: "Brand: GlowSkin. All skin types, 30ml, Vitamin C.",
    category: "Beauty",
    price: 599,
    mrp: 999,
    images: ["https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800"],
    stock_quantity: 200,
    is_active: true,
    avg_rating: 4.7,
    review_count: 2100
  }
  // Add more as needed...
];

async function seed() {
  console.log('Seeding database...');

  // 1. Ensure we have at least one user to be a seller
  const { data: users } = await supabase.from('users').select('id').limit(1);
  if (!users || users.length === 0) {
    console.error('No users found in database. Please register a user first.');
    return;
  }
  const sellerId = users[0].id;

  // 2. Insert Products
  const productsToInsert = PRODUCTS.map(p => ({
    ...p,
    seller_id: sellerId
  }));

  const { error: pError } = await supabase.from('products').insert(productsToInsert);
  if (pError) console.error('Error inserting products:', pError);
  else console.log('Products seeded successfully.');

  // 3. Insert Coupons
  const coupons = [
    { code: 'FIRST50', type: 'percent', value: 50, is_active: true },
    { code: 'BYNDIO20', type: 'percent', value: 20, is_active: true },
    { code: 'FREE100', type: 'flat', value: 100, is_active: true }
  ];
  const { error: cError } = await supabase.from('coupons').insert(coupons);
  if (cError) console.error('Error inserting coupons:', cError);
  else console.log('Coupons seeded successfully.');

  console.log('Seeding complete.');
}

seed();
