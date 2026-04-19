-- BYNDIO Complete Schema — Run this single file on a fresh Supabase project
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper function needed by RLS policies
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN RETURN EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'); END; $$;

-- USERS
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY, email TEXT UNIQUE NOT NULL, full_name TEXT,
    role TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('admin','buyer','seller','influencer','support')),
    avatar_url TEXT, phone_number TEXT, referral_code TEXT UNIQUE,
    referred_by UUID REFERENCES public.users(id), subscription_plan TEXT DEFAULT 'free',
    subscription_expires_at TIMESTAMPTZ, total_reward_points INTEGER DEFAULT 0,
    default_shipping_address JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL);

-- SELLERS
CREATE TABLE IF NOT EXISTS public.sellers (
    id UUID REFERENCES public.users(id) PRIMARY KEY, business_name TEXT NOT NULL,
    gst_number TEXT, pan_number TEXT, business_address TEXT, bank_account_number TEXT, ifsc_code TEXT,
    category TEXT DEFAULT 'General',
    kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending','submitted','under_review','approved','rejected')),
    approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected')),
    gst_verified BOOLEAN DEFAULT false, is_verified BOOLEAN DEFAULT false,
    subscription_plan TEXT DEFAULT 'free' CHECK (subscription_plan IN ('free','pro','enterprise')),
    support_phone TEXT, business_email TEXT, business_type TEXT DEFAULT 'Individual',
    total_leads INTEGER DEFAULT 0, remaining_leads INTEGER DEFAULT 0,
    performance_score DECIMAL(3,2) DEFAULT 0, response_time_avg INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0, created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL);

-- PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY, seller_id UUID REFERENCES public.users(id) NOT NULL,
    name TEXT NOT NULL, description TEXT, price DECIMAL(10,2) NOT NULL, mrp DECIMAL(10,2),
    stock_quantity INTEGER NOT NULL DEFAULT 0, category TEXT NOT NULL, images TEXT[] NOT NULL DEFAULT '{}',
    specifications JSONB DEFAULT '{}', sku TEXT, gst_rate DECIMAL(5,2) DEFAULT 18.00, hsn_code TEXT,
    is_active BOOLEAN DEFAULT true,
    approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected')),
    is_sponsored BOOLEAN DEFAULT false, sponsored_until TIMESTAMPTZ,
    is_creator_pick BOOLEAN DEFAULT false, creator_name TEXT, is_dropship BOOLEAN DEFAULT false,
    dropship_supplier_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL,
    avg_rating DECIMAL(3,2) DEFAULT 4.5, review_count INTEGER DEFAULT 0,
    commission_pct INTEGER DEFAULT 10, promo_video_url TEXT, slug TEXT, meta_title TEXT, meta_description TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL);

-- ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY, buyer_id UUID REFERENCES public.users(id) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','shipped','delivered','cancelled','payment_timeout')),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','refunded')),
    payment_method TEXT NOT NULL, payment_id TEXT, razorpay_order_id TEXT,
    shipping_address JSONB NOT NULL DEFAULT '{}', affiliate_code TEXT, coupon_code TEXT,
    affiliate_commission DECIMAL(10,2) DEFAULT 0, platform_fee DECIMAL(10,2) DEFAULT 0,
    shipping_fee DECIMAL(10,2) DEFAULT 0, cod_fee DECIMAL(10,2) DEFAULT 0,
    cancelled_at TIMESTAMPTZ, cancel_reason TEXT, cancelled_by UUID REFERENCES public.users(id),
    shiprocket_order_id TEXT, shiprocket_shipment_id TEXT, tracking_awb TEXT, courier_name TEXT,
    tracking_url TEXT, shipped_at TIMESTAMPTZ, delivered_at TIMESTAMPTZ,
    refund_id TEXT, refunded_at TIMESTAMPTZ, refund_amount NUMERIC, idempotency_key TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL);

-- ORDER ITEMS (was missing - caused the main error)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    seller_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1, price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL);
CREATE INDEX IF NOT EXISTS idx_oi_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_oi_seller ON public.order_items(seller_id);

-- INFLUENCERS
CREATE TABLE IF NOT EXISTS public.influencers (
    id UUID REFERENCES public.users(id) PRIMARY KEY, social_media_links JSONB DEFAULT '{}',
    total_followers INTEGER DEFAULT 0, commission_rate DECIMAL(5,2) DEFAULT 10.00,
    is_verified BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL);

-- MESSAGES
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id UUID REFERENCES public.users(id) NOT NULL, receiver_id UUID REFERENCES public.users(id) NOT NULL,
    content TEXT NOT NULL, is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL);

-- SITE SETTINGS
CREATE TABLE IF NOT EXISTS public.site_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    hero_title TEXT DEFAULT 'Shop Smarter. Earn More. Sell Free.',
    hero_subtitle TEXT DEFAULT 'India''s first zero-commission marketplace',
    footer_about TEXT DEFAULT 'BYNDIO is India''s most creator-friendly marketplace.',
    contact_email TEXT DEFAULT 'support@byndio.in',
    updated_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL,
    CONSTRAINT site_settings_single_row CHECK (id = 1));
INSERT INTO public.site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- AFFILIATE LINKS
CREATE TABLE IF NOT EXISTS public.affiliate_links (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY, user_id UUID REFERENCES public.users(id) NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE, link_code TEXT UNIQUE NOT NULL,
    clicks INTEGER DEFAULT 0, conversions INTEGER DEFAULT 0, total_earnings DECIMAL(10,2) DEFAULT 0,
    commission_rate DECIMAL(5,2) DEFAULT 8.00, is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL);

-- SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY, user_id UUID REFERENCES public.users(id) NOT NULL,
    plan_type TEXT NOT NULL, plan_name TEXT, plan_role TEXT DEFAULT 'seller',
    status TEXT NOT NULL DEFAULT 'active', price NUMERIC DEFAULT 0, payment_id TEXT,
    payment_method TEXT, amount NUMERIC, started_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL);

-- FLASH SALES
CREATE TABLE IF NOT EXISTS public.flash_sales (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    discount_pct INTEGER NOT NULL CHECK (discount_pct BETWEEN 1 AND 95),
    starts_at TIMESTAMPTZ NOT NULL, ends_at TIMESTAMPTZ NOT NULL, is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL);

-- RETURN REQUESTS
CREATE TABLE IF NOT EXISTS public.return_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY, order_id UUID REFERENCES public.orders(id) NOT NULL,
    user_id UUID REFERENCES public.users(id) NOT NULL, reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', refund_amount DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL);

-- B2B LEADS
CREATE TABLE IF NOT EXISTS public.b2b_leads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY, buyer_id UUID REFERENCES public.users(id),
    buyer_name TEXT NOT NULL, product_category TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open','matched','closed','expired')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL);

-- KYC SUBMISSIONS
CREATE TABLE IF NOT EXISTS public.kyc_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    full_name TEXT, pan_number TEXT, aadhaar_number TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','under_review','approved','rejected')),
    submitted_at TIMESTAMPTZ DEFAULT now());

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'system', title TEXT NOT NULL, message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false, action_url TEXT, created_at TIMESTAMPTZ DEFAULT now());

-- AFFILIATE STATS
CREATE TABLE IF NOT EXISTS public.affiliate_stats (
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    clicks_count INTEGER DEFAULT 0, views_count INTEGER DEFAULT 0, conversions_count INTEGER DEFAULT 0,
    total_sales_value DECIMAL DEFAULT 0, updated_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL,
    PRIMARY KEY(user_id, product_id));

-- WALLETS
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    balance DECIMAL(10,2) DEFAULT 0, pending_balance DECIMAL(10,2) DEFAULT 0,
    total_earned DECIMAL(10,2) DEFAULT 0, total_withdrawn DECIMAL(10,2) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL);

-- WALLET TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('credit','debit')), amount DECIMAL(10,2) NOT NULL,
    description TEXT, created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL);

-- ADDRESSES
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    full_name TEXT NOT NULL, mobile TEXT NOT NULL, line1 TEXT NOT NULL, line2 TEXT,
    city TEXT NOT NULL, state TEXT NOT NULL, pin TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false, label TEXT DEFAULT 'Home',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_addresses_user ON public.addresses(user_id);

-- REVIEWS
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) NOT NULL, user_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5), comment TEXT NOT NULL,
    images TEXT[] DEFAULT '{}', is_verified_purchase BOOLEAN DEFAULT false,
    helpful_count INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL,
    UNIQUE(product_id, user_id));

-- COUPONS
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL DEFAULT 'percent' CHECK (type IN ('percent','flat')),
    value NUMERIC NOT NULL, min_order NUMERIC DEFAULT 0, max_discount NUMERIC,
    max_uses INTEGER, uses INTEGER DEFAULT 0, is_active BOOLEAN DEFAULT true,
    expiry TIMESTAMPTZ, created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now());


-- SHIPPING METHODS
CREATE TABLE IF NOT EXISTS public.shipping_methods (
    id SERIAL PRIMARY KEY, name TEXT NOT NULL, description TEXT,
    base_cost DECIMAL DEFAULT 0, cost DECIMAL DEFAULT 0, cost_per_kg DECIMAL DEFAULT 0,
    min_days INTEGER DEFAULT 3, max_days INTEGER DEFAULT 7, is_active BOOLEAN DEFAULT true);

-- COD OTPs
CREATE TABLE IF NOT EXISTS public.cod_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), phone TEXT NOT NULL, otp_code TEXT NOT NULL,
    verified BOOLEAN DEFAULT false, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_cod_otps_phone ON public.cod_otps(phone, verified, expires_at);

-- REWARD POINTS
CREATE TABLE IF NOT EXISTS public.reward_points (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    points INTEGER NOT NULL DEFAULT 0, action TEXT NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL);

-- WISHLISTS
CREATE TABLE IF NOT EXISTS public.wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    product_id TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(user_id, product_id));

-- CAMPAIGNS
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), brand TEXT, title TEXT NOT NULL,
    description TEXT, category TEXT, commission TEXT, budget TEXT, deadline TIMESTAMPTZ,
    followers_required TEXT, platforms TEXT[], status TEXT DEFAULT 'open', applicants INTEGER DEFAULT 0,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());

-- CAMPAIGN APPLICATIONS
CREATE TABLE IF NOT EXISTS public.campaign_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), campaign_id TEXT NOT NULL,
    campaign_title TEXT, brand TEXT, user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT, status TEXT DEFAULT 'pending', created_at TIMESTAMPTZ NOT NULL DEFAULT now());

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, details JSONB DEFAULT '{}', ip_address TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now());

-- REFERRAL CLICKS
CREATE TABLE IF NOT EXISTS public.referral_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    video_id TEXT, referrer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    visitor_id TEXT, metadata JSONB DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT now());

-- REFERRAL VIEWS
CREATE TABLE IF NOT EXISTS public.referral_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    video_id TEXT, referrer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    visitor_id TEXT, metadata JSONB DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT now());

-- REFERRAL ANALYTICS
CREATE TABLE IF NOT EXISTS public.referral_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    referrer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    click_type TEXT DEFAULT 'ad_click', metadata JSONB DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT now());

-- B2B SUPPLIER APPLICATIONS
CREATE TABLE IF NOT EXISTS public.b2b_supplier_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), business_name TEXT NOT NULL,
    contact_person TEXT NOT NULL, mobile TEXT NOT NULL, gst_number TEXT, email TEXT,
    location TEXT, category TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());

-- OTP VERIFICATIONS
CREATE TABLE IF NOT EXISTS public.otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), phone TEXT NOT NULL, otp TEXT NOT NULL,
    used BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT timezone('utc',now()));

-- WEBHOOK EVENTS
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), event_id TEXT UNIQUE NOT NULL,
    event_type TEXT, payload JSONB DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT now());
