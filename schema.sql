-- ===========================================================================
-- BYNDIO Unified Production Schema (Consolidated v3.0)
-- Last Updated: 2026-04-23
-- ===========================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. SECURITY, EXTENSIONS & HELPERS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Admin Helper Function
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
    email TEXT,
    phone TEXT,
    gst_number TEXT,
    pan_number TEXT,
    aadhaar_number TEXT,
    business_state TEXT,
    business_address TEXT,
    pickup_address TEXT,
    pickup_city TEXT,
    pickup_state TEXT,
    pickup_pincode TEXT,
    shipping_preference TEXT DEFAULT 'BYNDIO Shipping',
    affiliate_enabled BOOLEAN DEFAULT true,
    bank_account_number TEXT,
    ifsc_code TEXT,
    category TEXT DEFAULT 'General',
    kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending','submitted','under_review','approved','rejected')),
    kyc_documents TEXT[] DEFAULT '{}',
    approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected')),
    gst_verified BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    subscription_plan TEXT DEFAULT 'free',
    support_phone TEXT,
    business_email TEXT,
    business_type TEXT DEFAULT 'Individual',
    total_leads INTEGER DEFAULT 0,
    remaining_leads INTEGER DEFAULT 0,
    performance_score DECIMAL(3,2) DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    featured_until TIMESTAMPTZ,
    join_as TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL
);

-- INFLUENCERS
CREATE TABLE IF NOT EXISTS public.influencers (
    id UUID REFERENCES public.users(id) PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT,
    instagram_handle TEXT,
    youtube_channel TEXT,
    followers_count TEXT,
    category TEXT,
    is_featured BOOLEAN DEFAULT false,
    featured_until TIMESTAMPTZ,
    visibility_boost BOOLEAN DEFAULT true,
    storefront_fee_paid BOOLEAN DEFAULT true,
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
    reason TEXT,
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

-- SELLER APPLICATIONS
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
    join_as TEXT,
    pickup_address TEXT,
    pickup_city TEXT,
    pickup_state TEXT,
    pickup_pincode TEXT,
    shipping_preference TEXT DEFAULT 'BYNDIO Shipping',
    affiliate_enabled BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL
);

-- INFLUENCER APPLICATIONS
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

-- AFFILIATE APPLICATIONS
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

-- SUBSCRIPTIONS (Active)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    plan_name TEXT NOT NULL,
    plan_role TEXT NOT NULL CHECK (plan_role IN ('seller', 'influencer')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_method TEXT,
    payment_id TEXT,
    started_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL,
    UNIQUE(user_id)
);

-- SITE SETTINGS
CREATE TABLE IF NOT EXISTS public.site_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    hero_title TEXT DEFAULT 'Shop Beyond Ordinary',
    hero_subtitle TEXT DEFAULT 'India''s 0% commission marketplace for creators and brands.',
    footer_about TEXT DEFAULT 'India''s 0% commission social commerce ecosystem.',
    contact_email TEXT DEFAULT 'support@byndio.in',
    contact_phone TEXT DEFAULT '1800-BYNDIO',
    contact_address TEXT DEFAULT 'Mumbai, Maharashtra, India',
    whatsapp_number TEXT,
    twitter_url TEXT,
    instagram_url TEXT,
    facebook_url TEXT,
    youtube_url TEXT,
    platform_fee NUMERIC DEFAULT 0,
    standard_shipping_fee NUMERIC DEFAULT 40,
    free_shipping_threshold NUMERIC DEFAULT 999,
    influencer_phase INTEGER DEFAULT 1,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- INFLUENCER REVENUE TIERS
CREATE TABLE IF NOT EXISTS public.influencer_revenue_tiers (
    phase INTEGER PRIMARY KEY,
    platform_commission_pct DECIMAL(5,2) DEFAULT 0,
    influencer_share_pct DECIMAL(5,2) DEFAULT 20,
    brand_collab_fee_pct DECIMAL(5,2) DEFAULT 5,
    min_influencers INTEGER,
    has_subscriptions BOOLEAN DEFAULT false,
    has_paid_badges BOOLEAN DEFAULT false,
    has_featured_fee BOOLEAN DEFAULT false
);

-- BRAND COLLABORATIONS
CREATE TABLE IF NOT EXISTS public.brand_collaborations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    brand_id UUID REFERENCES public.users(id) NOT NULL,
    influencer_id UUID REFERENCES public.users(id) NOT NULL,
    campaign_name TEXT NOT NULL,
    contract_amount DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
    payment_status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL
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

-- CART ITEMS
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

-- SUBSCRIPTION PLANS
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

-- BOOST PACKAGES
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

-- PRODUCT BOOSTS
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

-- PLATFORM REVENUE
CREATE TABLE IF NOT EXISTS public.platform_revenue (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    source TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    user_id UUID REFERENCES public.users(id),
    reference_id TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL
);

-- RATE LIMITS
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    identifier TEXT NOT NULL,
    action TEXT NOT NULL,
    attempts INT DEFAULT 0,
    locked_until TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(identifier, action)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. FUNCTIONS & TRIGGERS
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

-- Wallet Credit RPC
CREATE OR REPLACE FUNCTION credit_wallet(p_user_id UUID, p_amount NUMERIC, p_reason TEXT) 
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ 
BEGIN 
  UPDATE public.wallets SET balance = balance + p_amount WHERE user_id = p_user_id; 
  INSERT INTO public.wallet_transactions(user_id, amount, reason, type) 
  VALUES(p_user_id, p_amount, p_reason, 'credit'); 
END; $$;

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

-- Application Approval Handler (Seller / Influencer)
CREATE OR REPLACE FUNCTION public.handle_application_approval()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        -- Update user role
        UPDATE public.users 
        SET role = COALESCE(NEW.role, 'seller')
        WHERE id = NEW.user_id;
        
        IF NEW.role = 'seller' THEN
            INSERT INTO public.sellers (
                id, business_name, email, phone, business_state, category,
                gst_number, pan_number, aadhaar_number, bank_account_number, ifsc_code,
                kyc_documents, kyc_status, is_verified, join_as,
                pickup_address, pickup_city, pickup_state, pickup_pincode,
                shipping_preference, affiliate_enabled
            )
            VALUES (
                NEW.user_id, NEW.business_name, NEW.email, NEW.phone, NEW.business_state, NEW.category,
                NEW.gst_number, NEW.pan_number, NEW.aadhaar_number, NEW.bank_account, NEW.ifsc_code,
                NEW.kyc_documents, 'approved', true, NEW.join_as,
                NEW.pickup_address, NEW.pickup_city, NEW.pickup_state, NEW.pickup_pincode,
                NEW.shipping_preference, COALESCE(NEW.affiliate_enabled, true)
            )
            ON CONFLICT (id) DO UPDATE SET
                business_name = EXCLUDED.business_name,
                email = EXCLUDED.email,
                phone = EXCLUDED.phone,
                business_state = EXCLUDED.business_state,
                category = EXCLUDED.category,
                gst_number = EXCLUDED.gst_number,
                pan_number = EXCLUDED.pan_number,
                aadhaar_number = EXCLUDED.aadhaar_number,
                bank_account_number = EXCLUDED.bank_account_number,
                ifsc_code = EXCLUDED.ifsc_code,
                kyc_documents = EXCLUDED.kyc_documents,
                kyc_status = 'approved',
                is_verified = true,
                join_as = EXCLUDED.join_as,
                pickup_address = EXCLUDED.pickup_address,
                pickup_city = EXCLUDED.pickup_city,
                pickup_state = EXCLUDED.pickup_state,
                pickup_pincode = EXCLUDED.pickup_pincode,
                shipping_preference = EXCLUDED.shipping_preference,
                affiliate_enabled = EXCLUDED.affiliate_enabled;
                
        ELSIF NEW.role = 'influencer' THEN
            INSERT INTO public.influencers (id, full_name, email)
            VALUES (NEW.user_id, NEW.full_name, NEW.email)
            ON CONFLICT (id) DO NOTHING;
        END IF;
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_application_approved ON public.seller_applications;
CREATE TRIGGER on_application_approved AFTER UPDATE ON public.seller_applications FOR EACH ROW EXECUTE FUNCTION public.handle_application_approval();

-- Subscription Sync Handler
CREATE OR REPLACE FUNCTION public.sync_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.users 
    SET 
        subscription_plan = LOWER(NEW.plan_name),
        subscription_expires_at = NEW.expires_at,
        role = CASE WHEN role = 'admin' THEN 'admin' ELSE NEW.plan_role END
    WHERE id = NEW.user_id;
    
    IF NEW.plan_role = 'seller' THEN
        INSERT INTO public.sellers (id, business_name, subscription_plan)
        VALUES (NEW.user_id, 'New Store', LOWER(NEW.plan_name))
        ON CONFLICT (id) DO UPDATE SET subscription_plan = LOWER(NEW.plan_name);
    END IF;

    INSERT INTO public.platform_revenue (source, amount, user_id, reference_id, description)
    VALUES ('subscription', NEW.amount, NEW.user_id, NEW.payment_id, 'Subscription: ' || NEW.plan_name);

    RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_subscription_updated ON public.subscriptions;
CREATE TRIGGER on_subscription_updated AFTER INSERT OR UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.sync_user_subscription();

-- Influencer Commission Calculator
CREATE OR REPLACE FUNCTION public.calculate_influencer_payouts()
RETURNS TRIGGER AS $$
DECLARE
    curr_phase INTEGER;
    tier RECORD;
    v_platform_fee DECIMAL(10,2);
    v_influencer_payout DECIMAL(10,2);
BEGIN
    SELECT influencer_phase INTO curr_phase FROM public.site_settings WHERE id = 1;
    SELECT * INTO tier FROM public.influencer_revenue_tiers WHERE phase = curr_phase;
    
    IF NEW.creator_id IS NOT NULL THEN
        v_platform_fee := (NEW.price * NEW.quantity) * (tier.platform_commission_pct / 100);
        v_influencer_payout := (NEW.price * NEW.quantity) * (tier.influencer_share_pct / 100);
        NEW.platform_commission := v_platform_fee;
        NEW.creator_share := v_influencer_payout;
        
        INSERT INTO public.platform_revenue (source, amount, user_id, reference_id, description)
        VALUES ('affiliate_cut', v_platform_fee, NEW.creator_id, NEW.id::text, 'Influencer commission cut - Phase ' || curr_phase);
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_calculate_influencer_payouts ON public.order_items;
CREATE TRIGGER trg_calculate_influencer_payouts BEFORE INSERT ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.calculate_influencer_payouts();

-- Role Immutable Protection
CREATE OR REPLACE FUNCTION prevent_role_change() RETURNS TRIGGER LANGUAGE plpgsql AS $$ 
BEGIN 
  IF NEW.role != OLD.role AND NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin') THEN 
    RAISE EXCEPTION 'Role change not permitted'; 
  END IF; 
  RETURN NEW; 
END; $$;

DROP TRIGGER IF EXISTS enforce_role_immutable ON public.users;
CREATE TRIGGER enforce_role_immutable BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION prevent_role_change();

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_revenue_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_collaborations ENABLE ROW LEVEL SECURITY;

-- USERS
CREATE POLICY "Public View Users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users Update Own" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin Manage All Users" ON public.users FOR ALL USING (public.is_admin());

-- PRODUCTS
CREATE POLICY "Public View Products" ON public.products FOR SELECT USING (is_active = true AND approval_status = 'approved');
CREATE POLICY "Sellers Manage Own Products" ON public.products FOR ALL USING (auth.uid() = seller_id);
CREATE POLICY "Admin Manage All Products" ON public.products FOR ALL USING (public.is_admin());

-- SELLERS
CREATE POLICY "Sellers View Own" ON public.sellers FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Sellers Update Own" ON public.sellers FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin Manage Sellers" ON public.sellers FOR ALL USING (public.is_admin());

-- APPLICATIONS
CREATE POLICY "Anyone Can Apply" ON public.seller_applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users View Own Application" ON public.seller_applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin Manage Applications" ON public.seller_applications FOR ALL USING (public.is_admin());

-- ORDERS
CREATE POLICY "Buyers View Own Orders" ON public.orders FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "Sellers View Own Orders" ON public.orders FOR SELECT USING (EXISTS (SELECT 1 FROM public.order_items WHERE order_id = orders.id AND seller_id = auth.uid()));
CREATE POLICY "Admin Manage Orders" ON public.orders FOR ALL USING (public.is_admin());

-- SETTINGS
CREATE POLICY "Public View Settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admin Manage Settings" ON public.site_settings FOR ALL USING (public.is_admin());

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. SEED DATA
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.subscription_plans (id, name, price_monthly, price_yearly, max_products, max_images_per_product, can_use_analytics, can_use_ai_tools, can_boost_products, free_boosts_monthly, commission_rate, priority_support, custom_store_page, features)
VALUES
  ('free', 'Free', 0, 0, 5, 3, false, false, false, 0, 0, false, false, '["List up to 5 products", "Basic dashboard", "Standard support", "COD + Online payments"]'::JSONB),
  ('basic', 'Basic', 499, 4999, 25, 5, true, false, false, 0, 0, false, false, '["List up to 25 products", "Basic analytics", "Email support", "Bulk upload CSV", "Coupon creation"]'::JSONB),
  ('pro', 'Pro', 1499, 14999, 100, 10, true, true, true, 3, 0, true, false, '["List up to 100 products", "Advanced analytics", "AI product descriptions", "3 free boosts/month", "Priority support", "GST invoicing"]'::JSONB),
  ('brand', 'Brand', 2999, 29999, -1, 20, true, true, true, 10, 0, true, true, '["Unlimited products", "Full analytics suite", "AI tools + Video creator", "10 free boosts/month", "Dedicated account manager", "Custom store page", "Featured placement"]'::JSONB)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.influencer_revenue_tiers (phase, platform_commission_pct, influencer_share_pct, brand_collab_fee_pct, min_influencers, has_subscriptions, has_paid_badges, has_featured_fee)
VALUES
  (1, 1.00, 20.00, 7.50, 0, false, false, false),
  (2, 4.00, 15.00, 15.00, 1000, false, true, true),
  (3, 7.50, 10.00, 20.00, 10000, true, true, true)
ON CONFLICT (phase) DO NOTHING;

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

-- GST Compliance Validation Function
CREATE OR REPLACE FUNCTION public.validate_gst_compliance(
    p_cart JSONB,
    p_buyer_state TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $BODY
DECLARE
    item RECORD;
    v_seller RECORD;
    v_is_compliant BOOLEAN := TRUE;
    v_message TEXT := 'All items are compliant.';
BEGIN
    -- If buyer state is unknown, we cannot restrict
    IF p_buyer_state IS NULL OR p_buyer_state = '' THEN
        RETURN jsonb_build_object('is_compliant', TRUE, 'message', v_message);
    END IF;

    -- Iterate over cart items
    FOR item IN SELECT * FROM jsonb_to_recordset(p_cart) AS x(id TEXT, seller_id UUID) LOOP
        IF item.seller_id IS NOT NULL THEN
            SELECT * INTO v_seller FROM public.sellers WHERE id = item.seller_id;
            
            IF FOUND THEN
                -- If seller does NOT have GST and seller state is known
                IF (v_seller.gst_number IS NULL OR v_seller.gst_number = '') AND v_seller.business_state IS NOT NULL THEN
                    -- Check if buyer state matches seller state (case-insensitive)
                    IF lower(trim(v_seller.business_state)) != lower(trim(p_buyer_state)) THEN
                        v_is_compliant := FALSE;
                        v_message := 'Item ' || item.id || ' cannot be shipped to ' || p_buyer_state || ' because the seller is not GST registered and can only ship within ' || v_seller.business_state || '.';
                        EXIT; -- Stop checking on first violation
                    END IF;
                END IF;
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('is_compliant', v_is_compliant, 'message', v_message);
END;
$BODY;
