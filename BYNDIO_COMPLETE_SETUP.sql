-- ===========================================================================
-- BYNDIO Unified Production Schema (Full Setup)
-- Version: 2.0 (Complete Fresh Start)
-- Includes: Core, Revenue, KYC, Applications, Security, and RLS
-- ===========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. SECURITY & HELPERS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
END; $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. CORE TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- USERS
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('admin','buyer','seller','influencer','support')),
    avatar_url TEXT,
    phone_number TEXT,
    referral_code TEXT UNIQUE,
    referred_by UUID REFERENCES public.users(id),
    subscription_plan TEXT DEFAULT 'free',
    subscription_expires_at TIMESTAMPTZ,
    total_reward_points INTEGER DEFAULT 0,
    default_shipping_address JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL
);

-- SELLERS
CREATE TABLE IF NOT EXISTS public.sellers (
    id UUID REFERENCES public.users(id) PRIMARY KEY,
    business_name TEXT NOT NULL,
    gst_number TEXT,
    pan_number TEXT,
    business_state TEXT,
    business_address TEXT,
    bank_account_number TEXT,
    ifsc_code TEXT,
    category TEXT DEFAULT 'General',
    kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending','submitted','under_review','approved','rejected')),
    kyc_documents TEXT[] DEFAULT '{}',
    approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected')),
    gst_verified BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    subscription_plan TEXT DEFAULT 'free' CHECK (subscription_plan IN ('free','pro','enterprise')),
    support_phone TEXT,
    business_email TEXT,
    business_type TEXT DEFAULT 'Individual',
    total_leads INTEGER DEFAULT 0,
    remaining_leads INTEGER DEFAULT 0,
    performance_score DECIMAL(3,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL
);

-- PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    seller_id UUID REFERENCES public.users(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    mrp DECIMAL(10,2),
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    category TEXT NOT NULL,
    images TEXT[] NOT NULL DEFAULT '{}',
    specifications JSONB DEFAULT '{}',
    sku TEXT,
    gst_rate DECIMAL(5,2) DEFAULT 18.00,
    hsn_code TEXT,
    is_active BOOLEAN DEFAULT true,
    approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected')),
    is_sponsored BOOLEAN DEFAULT false,
    sponsored_until TIMESTAMPTZ,
    is_creator_pick BOOLEAN DEFAULT false,
    creator_name TEXT,
    avg_rating DECIMAL(3,2) DEFAULT 4.5,
    review_count INTEGER DEFAULT 0,
    commission_pct INTEGER DEFAULT 10,
    seller_state TEXT,
    seller_has_gst BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL
);

-- ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    buyer_id UUID REFERENCES public.users(id) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','shipped','delivered','cancelled','payment_timeout')),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','refunded')),
    payment_method TEXT NOT NULL,
    payment_id TEXT,
    razorpay_order_id TEXT,
    shipping_address JSONB NOT NULL DEFAULT '{}',
    affiliate_code TEXT,
    coupon_code TEXT,
    platform_fee DECIMAL(10,2) DEFAULT 0,
    shipping_fee DECIMAL(10,2) DEFAULT 0,
    refund_id TEXT,
    refund_amount NUMERIC,
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL
);

-- ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    seller_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10,2) NOT NULL,
    creator_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    creator_share DECIMAL(10,2) DEFAULT 0,
    affiliate_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    affiliate_share DECIMAL(10,2) DEFAULT 0,
    platform_commission DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL
);

-- WALLETS
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    balance DECIMAL(10,2) DEFAULT 0,
    pending_balance DECIMAL(10,2) DEFAULT 0,
    total_earned DECIMAL(10,2) DEFAULT 0,
    total_withdrawn DECIMAL(10,2) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL
);

-- WALLET TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('credit','debit')),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL
);

-- ADDRESSES
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    full_name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    line1 TEXT NOT NULL,
    line2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pin TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    label TEXT DEFAULT 'Home',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- REVIEWS
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT NOT NULL,
    images TEXT[] DEFAULT '{}',
    is_verified_purchase BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL,
    UNIQUE(product_id, user_id)
);

-- COUPONS
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL DEFAULT 'percent' CHECK (type IN ('percent','flat')),
    value NUMERIC NOT NULL,
    min_order NUMERIC DEFAULT 0,
    max_discount NUMERIC,
    max_uses INTEGER,
    uses INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    expiry TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- KYC SUBMISSIONS
CREATE TABLE IF NOT EXISTS public.kyc_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    dob DATE,
    pan_number TEXT,
    aadhaar_number TEXT,
    gst_number TEXT,
    bank_account TEXT,
    ifsc_code TEXT,
    bank_name TEXT,
    address TEXT,
    pincode TEXT,
    state TEXT,
    pan_doc_url TEXT,
    aadhaar_doc_url TEXT,
    gst_doc_url TEXT,
    selfie_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    rejection_reason TEXT,
    submitted_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL,
    reviewed_at TIMESTAMPTZ
);

-- APPLICATIONS
CREATE TABLE IF NOT EXISTS public.seller_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    business_name TEXT,
    business_state TEXT,
    state TEXT,
    category TEXT,
    has_gst BOOLEAN,
    gst_number TEXT,
    pan_number TEXT,
    aadhaar_number TEXT,
    bank_account TEXT,
    ifsc_code TEXT,
    kyc_documents TEXT[] DEFAULT '{}',
    role TEXT DEFAULT 'seller',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.influencer_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    instagram_handle TEXT,
    youtube_channel TEXT,
    followers_count TEXT,
    category TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.affiliate_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    website TEXT,
    category TEXT,
    audience_size TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- SHIPPING METHODS
CREATE TABLE IF NOT EXISTS public.shipping_methods (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    cost DECIMAL DEFAULT 0,
    min_days INTEGER DEFAULT 3,
    max_days INTEGER DEFAULT 7,
    is_active BOOLEAN DEFAULT true
);

-- CART ITEMS (Server-side)
CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 10),
    affiliate_code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, product_id)
);

-- PAYMENT METHODS
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    icon TEXT,
    is_active BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. REVENUE MODEL & SUBSCRIPTIONS
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

-- Boost packages
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

-- Active boosts
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

-- Platform Revenue
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

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════

-- Handle New Auth User
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'buyer');
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Automatic Wallet Creation
CREATE OR REPLACE FUNCTION public.create_user_wallet()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.wallets (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_user_created_wallet ON public.users;
CREATE TRIGGER on_user_created_wallet AFTER INSERT ON public.users FOR EACH ROW EXECUTE PROCEDURE public.create_user_wallet();

-- Stock Management
CREATE OR REPLACE FUNCTION public.deduct_stock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_stock INT;
BEGIN
  SELECT stock_quantity INTO v_stock FROM public.products WHERE id = NEW.product_id FOR UPDATE;
  IF v_stock < NEW.quantity THEN RAISE EXCEPTION 'Insufficient stock'; END IF;
  UPDATE public.products SET stock_quantity = stock_quantity - NEW.quantity WHERE id = NEW.product_id;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trigger_deduct_stock ON public.order_items;
CREATE TRIGGER trigger_deduct_stock BEFORE INSERT ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.deduct_stock();

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. RLS POLICIES (Hardened)
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_applications ENABLE ROW LEVEL SECURITY;

-- USERS
CREATE POLICY "Public users are viewable by everyone" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can manage all users" ON public.users FOR ALL USING (public.is_admin());

-- PRODUCTS
CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT USING (is_active = true AND approval_status = 'approved');
CREATE POLICY "Sellers can manage own products" ON public.products FOR ALL USING (auth.uid() = seller_id);
CREATE POLICY "Admin can manage all products" ON public.products FOR ALL USING (public.is_admin());

-- SELLERS
CREATE POLICY "Sellers can view own record" ON public.sellers FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Sellers can update own record" ON public.sellers FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin can view all sellers" ON public.sellers FOR SELECT USING (public.is_admin());
CREATE POLICY "Admin can update all sellers" ON public.sellers FOR UPDATE USING (public.is_admin());

-- KYC
CREATE POLICY "Users can manage own kyc" ON public.kyc_submissions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admin can view all kyc" ON public.kyc_submissions FOR SELECT USING (public.is_admin());
CREATE POLICY "Admin can update all kyc" ON public.kyc_submissions FOR UPDATE USING (public.is_admin());

-- APPLICATIONS
CREATE POLICY "Anyone can apply for seller" ON public.seller_applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own application" ON public.seller_applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin can view all applications" ON public.seller_applications FOR SELECT USING (public.is_admin());

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. SEED DATA
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.subscription_plans (id, name, price_monthly, price_yearly, max_products, max_images_per_product, can_use_analytics, can_use_ai_tools, can_boost_products, free_boosts_monthly, commission_rate, priority_support, custom_store_page, features)
VALUES
  ('free', 'Free', 0, 0, 5, 3, false, false, false, 0, 0, false, false, '["List up to 5 products", "Basic dashboard", "Standard support", "COD + Online payments"]'::JSONB),
  ('basic', 'Basic', 499, 4999, 25, 5, true, false, false, 0, 0, false, false, '["List up to 25 products", "Basic analytics", "Email support", "Bulk upload CSV", "Coupon creation"]'::JSONB),
  ('pro', 'Pro', 1499, 14999, 100, 10, true, true, true, 3, 0, true, false, '["List up to 100 products", "Advanced analytics", "AI product descriptions", "3 free boosts/month", "Priority support", "GST invoicing"]'::JSONB),
  ('brand', 'Brand', 2999, 29999, -1, 20, true, true, true, 10, 0, true, true, '["Unlimited products", "Full analytics suite", "AI tools + Video creator", "10 free boosts/month", "Dedicated account manager", "Custom store page", "Featured placement"]'::JSONB)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.shipping_methods (name, cost, min_days, max_days)
VALUES 
  ('Standard Delivery', 40, 3, 7),
  ('Express Delivery', 79, 1, 3),
  ('Same-Day Delivery', 149, 0, 1)
ON CONFLICT DO NOTHING;

INSERT INTO public.payment_methods (name, provider, is_active)
VALUES 
  ('Online Payment', 'razorpay', true), 
  ('Cash on Delivery', 'cod', true) 
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
