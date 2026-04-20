-- ===========================================================================
-- BYNDIO B2C Revenue Model Schema Extension
-- Adds: Product Boosts, Subscription Tiers, Premium Badges, Featured Stores,
--        Protection Plans, Express Shipping, Revenue Tracking
-- ===========================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. SUBSCRIPTION PLANS (Enhanced 4-tier model)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_yearly DECIMAL(10,2),
    max_products INTEGER NOT NULL DEFAULT 5,
    max_images_per_product INTEGER DEFAULT 3,
    can_use_analytics BOOLEAN DEFAULT false,
    can_use_ai_tools BOOLEAN DEFAULT false,
    can_boost_products BOOLEAN DEFAULT false,
    free_boosts_monthly INTEGER DEFAULT 0,
    commission_rate DECIMAL(5,2) DEFAULT 0,
    priority_support BOOLEAN DEFAULT false,
    custom_store_page BOOLEAN DEFAULT false,
    features JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL
);

-- Seed the 4-tier subscription model
INSERT INTO public.subscription_plans (id, name, price_monthly, price_yearly, max_products, max_images_per_product, can_use_analytics, can_use_ai_tools, can_boost_products, free_boosts_monthly, commission_rate, priority_support, custom_store_page, features)
VALUES
  ('free', 'Free', 0, 0, 5, 3, false, false, false, 0, 0, false, false,
    '["List up to 5 products", "Basic dashboard", "Standard support", "COD + Online payments"]'::JSONB),
  ('basic', 'Basic', 499, 4999, 25, 5, true, false, false, 0, 0, false, false,
    '["List up to 25 products", "Basic analytics", "Email support", "Bulk upload CSV", "Coupon creation"]'::JSONB),
  ('pro', 'Pro', 1499, 14999, 100, 10, true, true, true, 3, 0, true, false,
    '["List up to 100 products", "Advanced analytics", "AI product descriptions", "3 free boosts/month", "Priority support", "GST invoicing"]'::JSONB),
  ('brand', 'Brand', 2999, 29999, -1, 20, true, true, true, 10, 0, true, true,
    '["Unlimited products", "Full analytics suite", "AI tools + Video creator", "10 free boosts/month", "Dedicated account manager", "Custom store page", "Featured placement"]'::JSONB)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. PRODUCT BOOSTS / ADS SYSTEM
-- ═══════════════════════════════════════════════════════════════════════════

-- Boost packages that sellers can purchase
CREATE TABLE IF NOT EXISTS public.boost_packages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('feed_boost', 'product_boost', 'search_ad', 'category_boost')),
    duration_hours INTEGER NOT NULL DEFAULT 24,
    price DECIMAL(10,2) NOT NULL,
    impressions_guaranteed INTEGER,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL
);

-- Seed boost packages
INSERT INTO public.boost_packages (name, type, duration_hours, price, impressions_guaranteed, description)
VALUES
  ('Feed Spotlight — 24h', 'feed_boost', 24, 99, 500, 'Your product appears in reels/feed with priority for 24 hours'),
  ('Feed Spotlight — 7 Days', 'feed_boost', 168, 499, 5000, 'Your product appears in reels/feed with priority for 7 days'),
  ('Top Placement — 24h', 'product_boost', 24, 149, 1000, 'Product appears at the top of category listings for 24 hours'),
  ('Top Placement — 7 Days', 'product_boost', 168, 799, 10000, 'Product appears at the top of category listings for 7 days'),
  ('Search Sponsored — 24h', 'search_ad', 24, 199, 2000, 'Product shows as "Sponsored" in search results for 24 hours'),
  ('Search Sponsored — 7 Days', 'search_ad', 168, 999, 15000, 'Product shows as "Sponsored" in search results for 7 days'),
  ('Category Banner — 24h', 'category_boost', 24, 299, 3000, 'Highlighted banner in category page for 24 hours'),
  ('Category Banner — 7 Days', 'category_boost', 168, 1499, 25000, 'Highlighted banner in category page for 7 days')
ON CONFLICT DO NOTHING;

-- Active boosts purchased by sellers
CREATE TABLE IF NOT EXISTS public.product_boosts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    seller_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    boost_package_id UUID REFERENCES public.boost_packages(id),
    type TEXT NOT NULL CHECK (type IN ('feed_boost', 'product_boost', 'search_ad', 'category_boost')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired', 'cancelled')),
    starts_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    payment_id TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. PREMIUM SELLER BADGE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.premium_badges (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    seller_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    badge_type TEXT NOT NULL DEFAULT 'verified' CHECK (badge_type IN ('verified', 'trusted', 'premium', 'brand_partner')),
    is_active BOOLEAN DEFAULT true,
    purchased_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL,
    expires_at TIMESTAMPTZ,
    amount_paid DECIMAL(10,2) DEFAULT 0,
    payment_id TEXT
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. FEATURED STORES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.featured_stores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    seller_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT,
    description TEXT,
    banner_url TEXT,
    position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    starts_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL,
    ends_at TIMESTAMPTZ,
    amount_paid DECIMAL(10,2) DEFAULT 0,
    payment_id TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. PROTECTION PLANS (Returns Insurance)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.protection_plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('per_order', 'monthly')),
    price DECIMAL(10,2) NOT NULL,
    coverage_pct DECIMAL(5,2) DEFAULT 100,
    max_claims INTEGER,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL
);

-- Seed protection plans
INSERT INTO public.protection_plans (name, type, price, coverage_pct, max_claims, description)
VALUES
  ('Order Shield', 'per_order', 29, 100, 1, 'Full protection for this order — free returns, damage replacement'),
  ('Seller Guard Monthly', 'monthly', 199, 100, 10, 'Monthly plan — covers up to 10 return claims per month'),
  ('Seller Guard Pro', 'monthly', 499, 100, -1, 'Unlimited return protection for high-volume sellers')
ON CONFLICT DO NOTHING;

-- Seller protection subscriptions
CREATE TABLE IF NOT EXISTS public.seller_protections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    seller_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    plan_id UUID REFERENCES public.protection_plans(id),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    claims_used INTEGER DEFAULT 0,
    starts_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL,
    ends_at TIMESTAMPTZ,
    amount_paid DECIMAL(10,2) DEFAULT 0,
    payment_id TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. REVENUE TRACKING (Admin Dashboard)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.platform_revenue (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    source TEXT NOT NULL CHECK (source IN (
      'subscription', 'product_boost', 'search_ad', 'category_boost', 'feed_boost',
      'logistics_margin', 'platform_fee', 'instant_settlement',
      'premium_badge', 'featured_store', 'protection_plan',
      'affiliate_cut', 'saas_tools', 'other'
    )),
    amount DECIMAL(10,2) NOT NULL,
    user_id UUID REFERENCES public.users(id),
    reference_id TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL
);

-- Index for fast revenue reporting
CREATE INDEX IF NOT EXISTS idx_platform_revenue_source ON public.platform_revenue(source);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_created ON public.platform_revenue(created_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. EXPRESS SHIPPING TIERS
-- ═══════════════════════════════════════════════════════════════════════════

-- Add more shipping methods
INSERT INTO public.shipping_methods (name, description, cost, min_days, max_days, is_active)
VALUES
  ('Express Delivery', 'Faster delivery with priority handling', 79, 1, 3, true),
  ('Same-Day Delivery', 'Delivery within the same day (select cities)', 149, 0, 1, true)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. ENHANCED RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boost_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_boosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protection_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_protections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_revenue ENABLE ROW LEVEL SECURITY;

-- Public read for plans and packages
CREATE POLICY "Anyone can read subscription plans" ON public.subscription_plans FOR SELECT USING (true);
CREATE POLICY "Anyone can read boost packages" ON public.boost_packages FOR SELECT USING (true);
CREATE POLICY "Anyone can read protection plans" ON public.protection_plans FOR SELECT USING (true);

-- Sellers can read their own boosts/badges
CREATE POLICY "Sellers can read own boosts" ON public.product_boosts FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can read own badge" ON public.premium_badges FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can read own protections" ON public.seller_protections FOR SELECT USING (auth.uid() = seller_id);

-- Public read for featured stores (displayed on homepage)
CREATE POLICY "Anyone can read featured stores" ON public.featured_stores FOR SELECT USING (is_active = true);

-- Admin-only write for revenue
CREATE POLICY "Admin can read revenue" ON public.platform_revenue FOR SELECT USING (public.is_admin());
CREATE POLICY "Admin can insert revenue" ON public.platform_revenue FOR INSERT WITH CHECK (public.is_admin());

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. HELPER RPCs
-- ═══════════════════════════════════════════════════════════════════════════

-- Get active boosts for a product
CREATE OR REPLACE FUNCTION public.get_boosted_products(p_type TEXT DEFAULT NULL)
RETURNS SETOF UUID LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
    SELECT DISTINCT product_id FROM public.product_boosts
    WHERE status = 'active'
      AND starts_at <= now()
      AND ends_at >= now()
      AND (p_type IS NULL OR type = p_type);
END; $$;

-- Revenue summary for admin
CREATE OR REPLACE FUNCTION public.get_revenue_summary(p_days INTEGER DEFAULT 30)
RETURNS TABLE(source TEXT, total_amount DECIMAL, transaction_count BIGINT) LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
    SELECT pr.source, SUM(pr.amount) as total_amount, COUNT(*) as transaction_count
    FROM public.platform_revenue pr
    WHERE pr.created_at >= now() - (p_days || ' days')::INTERVAL
    GROUP BY pr.source
    ORDER BY total_amount DESC;
END; $$;

-- Check if seller has active premium badge
CREATE OR REPLACE FUNCTION public.has_premium_badge(p_seller_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.premium_badges
    WHERE seller_id = p_seller_id
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
  );
END; $$;
