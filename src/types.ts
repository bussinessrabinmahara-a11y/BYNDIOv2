// Shared types — imported by both store.ts and data.ts
// This file must NOT import from store.ts or data.ts (that would recreate the cycle)

export interface Product {
  id: number | string;
  name: string;
  brand: string;
  cat: string;
  category?: string; // Alias for cat — used by DB products and Home.tsx filtering
  price: number;
  mrp: number;
  icon: string;
  rating: number;
  reviews: number;
  inf: boolean;
  stock_quantity?: number;
  creator?: string;
  specs: [string, string][];
  is_sponsored?: boolean;
  flash_sale?: { discount_pct: number; ends_at: string; sale_price: number } | null;
  // GST Compliance fields
  seller_id?: string;
  seller_state?: string | null;
  seller_has_gst?: boolean;
}

export interface CartItem extends Product {
  qty: number;
  affiliate_code?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'buyer' | 'seller' | 'influencer' | 'admin';
  subscription_plan?: string;
  reward_points?: number;
}

export interface SiteSettings {
  id: number;
  hero_title: string;
  hero_subtitle: string;
  footer_about: string;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
  platform_fee: number;
  standard_shipping_fee: number;
  free_shipping_threshold: number;
}

export interface Order {
  id: string;
  buyer_id: string;
  total_amount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  shipping_address: Record<string, string>;
  payment_method: string;
  created_at: string;
  updated_at?: string;
  tracking_awb?: string;
  tracking_url?: string;
  payment_id?: string;
  order_items?: {
    id: string;
    quantity: number;
    price: number;
    products: { name: string; images: string[] } | null;
  }[];
}

export interface AffiliateLink {
  id: string;
  user_id: string;
  product_id: string;
  link_code: string;
  clicks: number;
  conversions: number;
  total_earnings: number;
  commission_rate: number;
  is_active: boolean;
  created_at: string;
  product?: { name: string; icon?: string; price?: number };
}

export interface FlashSale {
  id: string;
  title: string;
  product_id: string;
  discount_pct: number;
  original_price: number;
  sale_price: number;
  max_quantity: number;
  sold_quantity: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  product?: { name: string; images: string[] };
}

export interface ShortVideo {
  id: string;
  creator_id: string;
  video_url: string;
  thumbnail_url?: string;
  description?: string;
  tagged_products?: string[];
  likes_count: number;
  views_count: number;
  created_at: string;
  creator_name?: string;
  is_liked?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// B2C REVENUE MODEL TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface SubscriptionPlan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly?: number;
  max_products: number;
  max_images_per_product: number;
  can_use_analytics: boolean;
  can_use_ai_tools: boolean;
  can_boost_products: boolean;
  free_boosts_monthly: number;
  commission_rate: number;
  priority_support: boolean;
  custom_store_page: boolean;
  features: string[];
  is_active: boolean;
}

export interface BoostPackage {
  id: string;
  name: string;
  type: 'feed_boost' | 'product_boost' | 'search_ad' | 'category_boost';
  duration_hours: number;
  price: number;
  impressions_guaranteed?: number;
  description?: string;
  is_active: boolean;
}

export interface ProductBoost {
  id: string;
  seller_id: string;
  product_id: string;
  boost_package_id?: string;
  type: 'feed_boost' | 'product_boost' | 'search_ad' | 'category_boost';
  status: 'active' | 'paused' | 'expired' | 'cancelled';
  starts_at: string;
  ends_at: string;
  amount_paid: number;
  impressions: number;
  clicks: number;
  payment_id?: string;
  product?: { name: string; images?: string[] };
}

export interface PremiumBadge {
  id: string;
  seller_id: string;
  badge_type: 'verified' | 'trusted' | 'premium' | 'brand_partner';
  is_active: boolean;
  purchased_at: string;
  expires_at?: string;
  amount_paid: number;
}

export interface FeaturedStore {
  id: string;
  seller_id: string;
  title?: string;
  description?: string;
  banner_url?: string;
  position: number;
  is_active: boolean;
  starts_at: string;
  ends_at?: string;
  amount_paid: number;
  seller?: { business_name: string; business_state?: string };
}

export interface ProtectionPlan {
  id: string;
  name: string;
  type: 'per_order' | 'monthly';
  price: number;
  coverage_pct: number;
  max_claims?: number;
  description?: string;
  is_active: boolean;
}

export interface SellerProtection {
  id: string;
  seller_id: string;
  plan_id: string;
  status: 'active' | 'expired' | 'cancelled';
  claims_used: number;
  starts_at: string;
  ends_at?: string;
  amount_paid: number;
  plan?: ProtectionPlan;
}

export interface PlatformRevenue {
  id: string;
  source: string;
  amount: number;
  user_id?: string;
  reference_id?: string;
  description?: string;
  created_at: string;
}
