-- ============================================================
-- BYNDIO — Complete Production Database Schema v3
-- Run this ONCE in Supabase SQL Editor (Project → SQL Editor)
-- Safe for both fresh installs and existing databases
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- USERS
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('admin','buyer','seller','influencer')),
    avatar_url TEXT,
    phone_number TEXT,
    referral_code TEXT UNIQUE,
    referred_by UUID REFERENCES public.users(id),
    subscription_plan TEXT DEFAULT 'free',
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    total_reward_points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc',now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc',now()) NOT NULL
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;

-- SELLERS
CREATE TABLE IF NOT EXISTS public.sellers (
    id UUID REFERENCES public.users(id) PRIMARY KEY,
    business_name TEXT NOT NULL,
    gst_number TEXT,
    pan_number TEXT,
    business_address TEXT,
    bank_account_number TEXT,
    ifsc_code TEXT,
    category TEXT DEFAULT 'General',
    kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending','submitted','approved','rejected')),
    gst_verified BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    subscription_plan TEXT DEFAULT 'free' CHECK (subscription_plan IN ('free','pro','enterprise')),
    support_phone TEXT,
    business_email TEXT,
    business_type TEXT DEFAULT 'Individual',
    total_leads INTEGER DEFAULT 0,
    remaining_leads INTEGER DEFAULT 0,
    performance_score DECIMAL(3,2) DEFAULT 0,
    response_time_avg INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc',now()) NOT NULL
);

-- Ensure extra columns exist on sellers (for existing databases)
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS support_phone TEXT;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS business_email TEXT;

-- Forcibly update existing constraint if table was already created earlier
ALTER TABLE public.sellers DROP CONSTRAINT IF EXISTS sellers_kyc_status_check;
ALTER TABLE public.sellers ADD CONSTRAINT sellers_kyc_status_check CHECK (kyc_status IN ('pending','submitted','approved','rejected'));

-- INFLUENCERS
CREATE TABLE IF NOT EXISTS public.influencers (
    id UUID REFERENCES public.users(id) PRIMARY KEY,
    social_media_links JSONB DEFAULT '{}',
    total_followers INTEGER DEFAULT 0,
    commission_rate DECIMAL(5,2) DEFAULT 10.00,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc',now()) NOT NULL
);

ALTER TABLE public.influencers ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 10.00;

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
    is_sponsored BOOLEAN DEFAULT false,
    sponsored_until TIMESTAMP WITH TIME ZONE,
    is_creator_pick BOOLEAN DEFAULT false,
    creator_name TEXT,
    is_dropship BOOLEAN DEFAULT false,
    dropship_supplier_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL,
    avg_rating DECIMAL(3,2) DEFAULT 4.5,
    review_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc',now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc',now()) NOT NULL
);

-- Ensure extra columns exist on products (for existing databases)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_dropship BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS dropship_supplier_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL;

-- ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    buyer_id UUID REFERENCES public.users(id) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','shipped','delivered','cancelled')),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','refunded')),
    payment_method TEXT NOT NULL,
    payment_id TEXT,
    shipping_address JSONB NOT NULL DEFAULT '{}',
    affiliate_code TEXT,
    affiliate_commission DECIMAL(10,2) DEFAULT 0,
    platform_fee DECIMAL(10,2) DEFAULT 10,
    shipping_fee DECIMAL(10,2) DEFAULT 0,
    cod_fee DECIMAL(10,2) DEFAULT 0,
    cancelled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    cancelled_by UUID REFERENCES public.users(id),
    shiprocket_order_id TEXT,
    shiprocket_shipment_id TEXT,
    tracking_awb TEXT,
    courier_name TEXT,
    tracking_url TEXT,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    refund_id TEXT,
    refunded_at TIMESTAMPTZ,
    refund_amount NUMERIC,
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc',now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc',now()) NOT NULL
);

-- Ensure idempotency_key exists
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;

-- Ensure extra columns exist on orders (for existing databases)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.users(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shiprocket_order_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shiprocket_shipment_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_awb TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_url TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refund_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refund_amount NUMERIC;

-- ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) NOT NULL,
    seller_id UUID REFERENCES public.users(id),
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc',now()) NOT NULL
);

-- Ensure seller_id exists on order_items (for existing databases)
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.users(id);

-- REVIEWS
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) NOT NULL,
    user_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT NOT NULL,
    images TEXT[] DEFAULT '{}',
    verified_purchase BOOLEAN DEFAULT false,
    is_verified_purchase BOOLEAN DEFAULT false,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc',now()) NOT NULL,
    UNIQUE(product_id, user_id)
);

-- Ensure is_verified_purchase exists on reviews (for existing databases)
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS is_verified_purchase BOOLEAN DEFAULT false;

-- MESSAGES
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id UUID REFERENCES public.users(id) NOT NULL,
    receiver_id UUID REFERENCES public.users(id) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc',now()) NOT NULL
);

-- SITE SETTINGS (single row)
CREATE TABLE IF NOT EXISTS public.site_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    hero_title TEXT DEFAULT 'Shop Smarter. Earn More. Sell Free.',
    hero_subtitle TEXT DEFAULT 'India''s first zero-commission marketplace with built-in influencer monetization',
    footer_about TEXT DEFAULT 'BYNDIO is India''s most creator-friendly marketplace.',
    contact_email TEXT DEFAULT 'support@byndio.in',
    contact_phone TEXT DEFAULT '1800-BYNDIO',
    contact_address TEXT DEFAULT 'Mumbai, Maharashtra, India',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc',now()) NOT NULL,
    CONSTRAINT site_settings_single_row CHECK (id = 1)
);
INSERT INTO public.site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- AFFILIATE LINKS
CREATE TABLE IF NOT EXISTS public.affiliate_links (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    link_code TEXT UNIQUE NOT NULL,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    total_earnings DECIMAL(10,2) DEFAULT 0,
    commission_rate DECIMAL(5,2) DEFAULT 10.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc',now()) NOT NULL,
    UNIQUE(user_id, product_id)
);

-- SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) NOT NULL,
    plan_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    plan_name TEXT,
    plan_role TEXT,
    price NUMERIC DEFAULT 0,
    payment_id TEXT,
    started_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc',now()) NOT NULL
);

ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS plan_name TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS plan_role TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- FLASH SALES
CREATE TABLE IF NOT EXISTS public.flash_sales (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    discount_pct INTEGER NOT NULL CHECK (discount_pct BETWEEN 1 AND 95),
    original_price DECIMAL(10,2) NOT NULL,
    sale_price DECIMAL(10,2) NOT NULL,
    max_quantity INTEGER NOT NULL DEFAULT 100,
    sold_quantity INTEGER DEFAULT 0,
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc',now()) NOT NULL
);

-- REWARD POINTS
CREATE TABLE IF NOT EXISTS public.reward_points (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    action TEXT NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc',now()) NOT NULL
);

-- WALLETS
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) UNIQUE NOT NULL,
    balance DECIMAL(10,2) DEFAULT 0,
    total_earned DECIMAL(10,2) DEFAULT 0,
    total_withdrawn DECIMAL(10,2) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc',now()) NOT NULL
);

-- RETURN REQUESTS
CREATE TABLE IF NOT EXISTS public.return_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) NOT NULL,
    order_item_id UUID REFERENCES public.order_items(id) NOT NULL,
    user_id UUID REFERENCES public.users(id) NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','picked_up','refunded')),
    refund_amount DECIMAL(10,2),
    notes TEXT,
    refund_id TEXT,
    refund_status TEXT DEFAULT 'pending' CHECK (refund_status IN ('pending','processing','completed','failed')),
    refund_at TIMESTAMPTZ,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc',now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc',now()) NOT NULL
);

ALTER TABLE public.return_requests ADD COLUMN IF NOT EXISTS refund_id TEXT;
ALTER TABLE public.return_requests ADD COLUMN IF NOT EXISTS refund_status TEXT DEFAULT 'pending' CHECK (refund_status IN ('pending','processing','completed','failed'));
ALTER TABLE public.return_requests ADD COLUMN IF NOT EXISTS refund_at TIMESTAMPTZ;

-- PRODUCT Q&A
CREATE TABLE IF NOT EXISTS public.product_qa (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) NOT NULL,
    question TEXT NOT NULL,
    answer TEXT,
    answered_by UUID REFERENCES public.users(id),
    answered_at TIMESTAMP WITH TIME ZONE,
    is_approved BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc',now()) NOT NULL
);

-- RECENTLY VIEWED
CREATE TABLE IF NOT EXISTS public.recently_viewed (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc',now()) NOT NULL,
    UNIQUE(user_id, product_id)
);

-- B2B LEADS
CREATE TABLE IF NOT EXISTS public.b2b_leads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    buyer_id UUID REFERENCES public.users(id),
    buyer_name TEXT NOT NULL,
    buyer_phone TEXT NOT NULL,
    buyer_email TEXT,
    company_name TEXT,
    gst_number TEXT,
    product_category TEXT NOT NULL,
    product_description TEXT NOT NULL,
    quantity TEXT NOT NULL,
    budget TEXT,
    delivery_location TEXT NOT NULL,
    delivery_timeline TEXT,
    is_otp_verified BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'open' CHECK (status IN ('open','matched','closed','expired')),
    lead_fee_paid BOOLEAN DEFAULT false,
    lead_fee_amount NUMERIC DEFAULT 10,
    is_locked BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc',now()) NOT NULL
);

-- B2B LEAD ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.b2b_lead_assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lead_id UUID REFERENCES public.b2b_leads(id) ON DELETE CASCADE NOT NULL,
    supplier_id UUID REFERENCES public.users(id) NOT NULL,
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent','viewed','responded','closed')),
    response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc',now()) NOT NULL
);

-- KYC SUBMISSIONS
CREATE TABLE IF NOT EXISTS public.kyc_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    full_name TEXT,
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
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','under_review','approved','rejected')),
    pan_doc_url TEXT,
    aadhaar_doc_url TEXT,
    gst_doc_url TEXT,
    selfie_url TEXT,
    submitted_at TIMESTAMPTZ DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    UNIQUE(user_id)
);

ALTER TABLE public.kyc_submissions ADD COLUMN IF NOT EXISTS pan_doc_url TEXT;
ALTER TABLE public.kyc_submissions ADD COLUMN IF NOT EXISTS aadhaar_doc_url TEXT;
ALTER TABLE public.kyc_submissions ADD COLUMN IF NOT EXISTS gst_doc_url TEXT;
ALTER TABLE public.kyc_submissions ADD COLUMN IF NOT EXISTS selfie_url TEXT;

-- SELLER APPLICATIONS
CREATE TABLE IF NOT EXISTS public.seller_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT, email TEXT, phone TEXT,
    business_name TEXT, category TEXT, monthly_revenue TEXT,
    has_gst BOOLEAN DEFAULT false,
    gst_number TEXT,
    pan_number TEXT,
    aadhaar_number TEXT,
    bank_account TEXT,
    ifsc_code TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure missing columns exist in existing databases
ALTER TABLE public.seller_applications ADD COLUMN IF NOT EXISTS has_gst BOOLEAN DEFAULT false;
ALTER TABLE public.seller_applications ADD COLUMN IF NOT EXISTS gst_number TEXT;

-- INFLUENCER APPLICATIONS
CREATE TABLE IF NOT EXISTS public.influencer_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT, email TEXT, phone TEXT,
    instagram_handle TEXT, youtube_channel TEXT,
    followers_count TEXT, category TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- AFFILIATE APPLICATIONS
CREATE TABLE IF NOT EXISTS public.affiliate_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT, email TEXT, phone TEXT,
    website TEXT, category TEXT, audience_size TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- CAMPAIGN APPLICATIONS
CREATE TABLE IF NOT EXISTS public.campaign_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id TEXT, campaign_title TEXT, brand TEXT,
    message TEXT, status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- WISHLISTS
CREATE TABLE IF NOT EXISTS public.wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, product_id)
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'system',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    action_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- SELLER PAYOUTS
CREATE TABLE IF NOT EXISTS public.seller_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','failed')),
    payment_ref TEXT,
    period_start DATE,
    period_end DATE,
    items_count INTEGER DEFAULT 0,
    tds_amount NUMERIC DEFAULT 0,
    net_amount NUMERIC DEFAULT 0,
    tds_rate NUMERIC DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    paid_at TIMESTAMPTZ
);

ALTER TABLE public.seller_payouts ADD COLUMN IF NOT EXISTS tds_amount NUMERIC DEFAULT 0;
ALTER TABLE public.seller_payouts ADD COLUMN IF NOT EXISTS net_amount NUMERIC DEFAULT 0;
ALTER TABLE public.seller_payouts ADD COLUMN IF NOT EXISTS tds_rate NUMERIC DEFAULT 1;

-- COUPONS
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL DEFAULT 'percent' CHECK (type IN ('percent','flat')),
    value NUMERIC NOT NULL,
    min_order NUMERIC DEFAULT 0,
    max_uses INTEGER,
    uses INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    expiry TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS uses INTEGER DEFAULT 0;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- COUPON USES
CREATE TABLE IF NOT EXISTS public.coupon_uses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    order_id UUID,
    used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (coupon_id, user_id)
);

-- WITHDRAWAL REQUESTS
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','rejected')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WEBHOOK EVENTS
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ADMIN HELPER FUNCTIONS (Must be defined before policies!)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER AS $$ SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1; $$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$ SELECT (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1) = 'admin'; $$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flash_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_qa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recently_viewed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_lead_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- USERS policies
DROP POLICY IF EXISTS "users_own_select" ON public.users;
CREATE POLICY "users_own_select"   ON public.users FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "users_own_insert" ON public.users;
CREATE POLICY "users_own_insert"   ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "users_own_update" ON public.users;
CREATE POLICY "users_own_update"   ON public.users FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "users_admin_select" ON public.users;
CREATE POLICY "users_admin_select" ON public.users FOR SELECT USING (public.is_admin());

-- SELLERS policies
DROP POLICY IF EXISTS "sellers_own" ON public.sellers;
CREATE POLICY "sellers_own"    ON public.sellers FOR ALL USING (auth.uid() = id);
DROP POLICY IF EXISTS "sellers_admin_all" ON public.sellers;
CREATE POLICY "sellers_admin_all" ON public.sellers FOR ALL USING (public.is_admin());

-- Safe public view without financial columns
CREATE OR REPLACE VIEW public.sellers_public_view AS
SELECT id, business_name, category, kyc_status, gst_verified, is_verified, subscription_plan, created_at
FROM public.sellers;

-- INFLUENCERS policies
DROP POLICY IF EXISTS "influencers_own" ON public.influencers;
CREATE POLICY "influencers_own" ON public.influencers FOR ALL USING (auth.uid() = id);

-- PRODUCTS policies
DROP POLICY IF EXISTS "products_public" ON public.products;
CREATE POLICY "products_public"   ON public.products FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "products_own" ON public.products;
CREATE POLICY "products_own"      ON public.products FOR ALL   USING (auth.uid() = seller_id);
DROP POLICY IF EXISTS "products_admin" ON public.products;
CREATE POLICY "products_admin"    ON public.products FOR ALL   USING (public.is_admin());

-- ORDERS policies
DROP POLICY IF EXISTS "orders_buyer" ON public.orders;
CREATE POLICY "orders_buyer"       ON public.orders FOR SELECT USING (auth.uid() = buyer_id);
DROP POLICY IF EXISTS "orders_buyer_ins" ON public.orders;
CREATE POLICY "orders_buyer_ins"   ON public.orders FOR INSERT WITH CHECK (auth.uid() = buyer_id);
DROP POLICY IF EXISTS "orders_buyer_cancel" ON public.orders;
CREATE POLICY "orders_buyer_cancel" ON public.orders FOR UPDATE USING (auth.uid() = buyer_id AND status = 'pending') WITH CHECK (status = 'cancelled');
DROP POLICY IF EXISTS "orders_seller_sel" ON public.orders;
CREATE POLICY "orders_seller_sel"  ON public.orders FOR SELECT USING (EXISTS (SELECT 1 FROM public.order_items WHERE order_id = id AND seller_id = auth.uid()));
DROP POLICY IF EXISTS "orders_admin" ON public.orders;
CREATE POLICY "orders_admin"       ON public.orders FOR ALL    USING (public.is_admin());

-- ORDER ITEMS policies
DROP POLICY IF EXISTS "oi_buyer" ON public.order_items;
CREATE POLICY "oi_buyer"  ON public.order_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND buyer_id = auth.uid()));
DROP POLICY IF EXISTS "oi_seller" ON public.order_items;
CREATE POLICY "oi_seller" ON public.order_items FOR SELECT USING (auth.uid() = seller_id);
DROP POLICY IF EXISTS "oi_insert" ON public.order_items;
CREATE POLICY "oi_insert" ON public.order_items FOR INSERT  WITH CHECK (EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND buyer_id = auth.uid()));

-- REVIEWS policies
DROP POLICY IF EXISTS "reviews_public" ON public.reviews;
CREATE POLICY "reviews_public"     ON public.reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "reviews_own_ins" ON public.reviews;
CREATE POLICY "reviews_own_ins"    ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "reviews_own_upd" ON public.reviews;
CREATE POLICY "reviews_own_upd"    ON public.reviews FOR UPDATE USING (auth.uid() = user_id);

-- MESSAGES policies
DROP POLICY IF EXISTS "msg_own" ON public.messages;
CREATE POLICY "msg_own"  ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
DROP POLICY IF EXISTS "msg_send" ON public.messages;
CREATE POLICY "msg_send" ON public.messages FOR INSERT  WITH CHECK (auth.uid() = sender_id);

-- SITE SETTINGS policies
DROP POLICY IF EXISTS "ss_public" ON public.site_settings;
CREATE POLICY "ss_public" ON public.site_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "ss_admin" ON public.site_settings;
CREATE POLICY "ss_admin"  ON public.site_settings FOR ALL    USING (public.is_admin());

-- AFFILIATE LINKS policies
DROP POLICY IF EXISTS "aff_own" ON public.affiliate_links;
CREATE POLICY "aff_own"    ON public.affiliate_links FOR ALL    USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "aff_public" ON public.affiliate_links;
CREATE POLICY "aff_public" ON public.affiliate_links FOR SELECT USING (is_active = true);

-- SUBSCRIPTIONS policies
DROP POLICY IF EXISTS "sub_own" ON public.subscriptions;
CREATE POLICY "sub_own"   ON public.subscriptions FOR ALL USING (auth.uid() = user_id);

-- FLASH SALES policies
DROP POLICY IF EXISTS "fs_public" ON public.flash_sales;
CREATE POLICY "fs_public" ON public.flash_sales FOR SELECT USING (true);
DROP POLICY IF EXISTS "fs_admin" ON public.flash_sales;
CREATE POLICY "fs_admin"  ON public.flash_sales FOR ALL    USING (public.is_admin());

-- REWARD POINTS policies
DROP POLICY IF EXISTS "rp_own" ON public.reward_points;
CREATE POLICY "rp_own"    ON public.reward_points FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "rp_insert_own" ON public.reward_points;
CREATE POLICY "rp_insert_own" ON public.reward_points FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- WALLETS policies
DROP POLICY IF EXISTS "wallet_sel" ON public.wallets;
CREATE POLICY "wallet_sel" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "wallet_ins" ON public.wallets;
CREATE POLICY "wallet_ins" ON public.wallets FOR INSERT  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "wallet_upd_own" ON public.wallets;
CREATE POLICY "wallet_upd_own" ON public.wallets FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());

-- RETURN REQUESTS policies
DROP POLICY IF EXISTS "ret_own" ON public.return_requests;
CREATE POLICY "ret_own"   ON public.return_requests FOR ALL    USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "ret_admin_all" ON public.return_requests;
CREATE POLICY "ret_admin_all" ON public.return_requests FOR ALL USING (public.is_admin());

-- PRODUCT Q&A policies
DROP POLICY IF EXISTS "qa_public" ON public.product_qa;
CREATE POLICY "qa_public" ON public.product_qa FOR SELECT USING (is_approved = true);
DROP POLICY IF EXISTS "qa_ins" ON public.product_qa;
CREATE POLICY "qa_ins"    ON public.product_qa FOR INSERT  WITH CHECK (auth.uid() = user_id);

-- RECENTLY VIEWED policies
DROP POLICY IF EXISTS "rv_own" ON public.recently_viewed;
CREATE POLICY "rv_own" ON public.recently_viewed FOR ALL USING (auth.uid() = user_id);

-- B2B LEADS policies
DROP POLICY IF EXISTS "b2b_ins" ON public.b2b_leads;
CREATE POLICY "b2b_ins"   ON public.b2b_leads FOR INSERT  WITH CHECK (true);
DROP POLICY IF EXISTS "b2b_sel" ON public.b2b_leads;
CREATE POLICY "b2b_sel"   ON public.b2b_leads FOR SELECT  USING (auth.uid() = buyer_id OR (public.is_admin() OR public.get_user_role() = 'seller'));

-- B2B LEAD ASSIGNMENTS policies
DROP POLICY IF EXISTS "b2ba_own" ON public.b2b_lead_assignments;
CREATE POLICY "b2ba_own"  ON public.b2b_lead_assignments FOR ALL    USING (auth.uid() = supplier_id);
DROP POLICY IF EXISTS "b2ba_adm" ON public.b2b_lead_assignments;
CREATE POLICY "b2ba_adm"  ON public.b2b_lead_assignments FOR SELECT USING (public.is_admin());

-- KYC policies
DROP POLICY IF EXISTS "kyc_own" ON public.kyc_submissions;
CREATE POLICY "kyc_own" ON public.kyc_submissions FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "kyc_admin" ON public.kyc_submissions;
CREATE POLICY "kyc_admin" ON public.kyc_submissions FOR ALL USING (public.is_admin());

-- SELLER APPLICATIONS policies
DROP POLICY IF EXISTS "sa_insert" ON public.seller_applications;
CREATE POLICY "sa_insert" ON public.seller_applications FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "sa_admin" ON public.seller_applications;
CREATE POLICY "sa_admin" ON public.seller_applications FOR SELECT USING (public.is_admin());

-- INFLUENCER APPLICATIONS policies
DROP POLICY IF EXISTS "ia_insert" ON public.influencer_applications;
CREATE POLICY "ia_insert" ON public.influencer_applications FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "ia_admin" ON public.influencer_applications;
CREATE POLICY "ia_admin" ON public.influencer_applications FOR SELECT USING (public.is_admin());

-- AFFILIATE APPLICATIONS policies
DROP POLICY IF EXISTS "afa_insert" ON public.affiliate_applications;
CREATE POLICY "afa_insert" ON public.affiliate_applications FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "afa_admin" ON public.affiliate_applications;
CREATE POLICY "afa_admin" ON public.affiliate_applications FOR SELECT USING (public.is_admin());

-- CAMPAIGN APPLICATIONS policies
DROP POLICY IF EXISTS "ca_insert" ON public.campaign_applications;
CREATE POLICY "ca_insert" ON public.campaign_applications FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "ca_admin" ON public.campaign_applications;
CREATE POLICY "ca_admin" ON public.campaign_applications FOR SELECT USING (public.is_admin());

-- WISHLISTS policies
DROP POLICY IF EXISTS "wl_own" ON public.wishlists;
CREATE POLICY "wl_own" ON public.wishlists FOR ALL USING (auth.uid() = user_id);

-- NOTIFICATIONS policies
DROP POLICY IF EXISTS "notif_own" ON public.notifications;
CREATE POLICY "notif_own"   ON public.notifications FOR ALL   USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notif_insert_admin_only" ON public.notifications;
CREATE POLICY "notif_insert_admin_only" ON public.notifications FOR INSERT WITH CHECK (public.is_admin());

-- SELLER PAYOUTS policies
DROP POLICY IF EXISTS "payout_own" ON public.seller_payouts;
CREATE POLICY "payout_own"   ON public.seller_payouts FOR SELECT USING (auth.uid() = seller_id);
DROP POLICY IF EXISTS "payout_admin" ON public.seller_payouts;
CREATE POLICY "payout_admin" ON public.seller_payouts FOR ALL USING (public.is_admin());

-- COUPONS policies
DROP POLICY IF EXISTS "coupons_admin" ON public.coupons;
CREATE POLICY "coupons_admin" ON public.coupons FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "coupons_read" ON public.coupons;
CREATE POLICY "coupons_read" ON public.coupons FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "coupons_own_insert" ON public.coupons;
CREATE POLICY "coupons_own_insert" ON public.coupons FOR INSERT WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "coupons_own_update" ON public.coupons;
CREATE POLICY "coupons_own_update" ON public.coupons FOR UPDATE USING (auth.uid() = created_by);
DROP POLICY IF EXISTS "coupons_own_select_all" ON public.coupons;
CREATE POLICY "coupons_own_select_all" ON public.coupons FOR SELECT USING (is_active = true OR auth.uid() = created_by OR public.is_admin());

-- COUPON USES policies
DROP POLICY IF EXISTS "coupon_uses_own" ON public.coupon_uses;
CREATE POLICY "coupon_uses_own" ON public.coupon_uses FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "coupon_uses_admin" ON public.coupon_uses;
CREATE POLICY "coupon_uses_admin" ON public.coupon_uses FOR ALL USING (public.is_admin());

-- WITHDRAWAL REQUESTS policies
DROP POLICY IF EXISTS "withdrawal_own_insert" ON public.withdrawal_requests;
CREATE POLICY "withdrawal_own_insert" ON public.withdrawal_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "withdrawal_own_select" ON public.withdrawal_requests;
CREATE POLICY "withdrawal_own_select" ON public.withdrawal_requests FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "withdrawal_admin_all" ON public.withdrawal_requests;
CREATE POLICY "withdrawal_admin_all" ON public.withdrawal_requests FOR ALL USING (public.is_admin());

-- ============================================================
-- FUNCTIONS + TRIGGERS
-- ============================================================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS "upd_users" ON public.users;
CREATE TRIGGER upd_users    BEFORE UPDATE ON public.users    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
DROP TRIGGER IF EXISTS "upd_products" ON public.products;
CREATE TRIGGER upd_products BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
DROP TRIGGER IF EXISTS "upd_orders" ON public.orders;
CREATE TRIGGER upd_orders   BEFORE UPDATE ON public.orders   FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
DROP TRIGGER IF EXISTS "upd_returns" ON public.return_requests;
CREATE TRIGGER upd_returns  BEFORE UPDATE ON public.return_requests FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- Generate referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.referral_code := UPPER(SUBSTRING(MD5(NEW.id::TEXT || EXTRACT(EPOCH FROM now())::TEXT) FROM 1 FOR 8));
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS "set_referral_code" ON public.users;
CREATE TRIGGER set_referral_code BEFORE INSERT ON public.users FOR EACH ROW EXECUTE PROCEDURE generate_referral_code();

-- Prevent role escalation
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1) != 'admin' THEN
      RAISE EXCEPTION 'Only admins can change user roles';
    END IF;
  END IF;
  IF NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan THEN
    IF (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1) != 'admin' THEN
      IF NEW.subscription_plan != 'free' THEN
        RAISE EXCEPTION 'Only admins can change subscription plans';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS "trg_prevent_role_escalation" ON public.users;
CREATE TRIGGER trg_prevent_role_escalation BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE PROCEDURE public.prevent_role_escalation();

-- Auto-create wallet for new users
CREATE OR REPLACE FUNCTION create_user_wallet()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.wallets (user_id, balance, total_earned, total_withdrawn)
  VALUES (NEW.id, 0, 0, 0) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS "on_user_created_wallet" ON public.users;
CREATE TRIGGER on_user_created_wallet AFTER INSERT ON public.users FOR EACH ROW EXECUTE PROCEDURE create_user_wallet();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'buyer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile after auth.users insert
-- Note: Run this as a separate command if it fails due to schema permissions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Update product avg_rating after review changes
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_pid UUID;
BEGIN
  v_pid := COALESCE(NEW.product_id, OLD.product_id);
  UPDATE public.products SET
    avg_rating   = (SELECT ROUND(AVG(rating)::NUMERIC, 2) FROM public.reviews WHERE product_id = v_pid),
    review_count = (SELECT COUNT(*)                       FROM public.reviews WHERE product_id = v_pid)
  WHERE id = v_pid;
  RETURN COALESCE(NEW, OLD);
END; $$;
DROP TRIGGER IF EXISTS "update_rating_trigger" ON public.reviews;
CREATE TRIGGER update_rating_trigger AFTER INSERT OR UPDATE OR DELETE ON public.reviews FOR EACH ROW EXECUTE PROCEDURE update_product_rating();

-- Verified purchase badge on reviews
CREATE OR REPLACE FUNCTION verify_purchase_on_review()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE o.buyer_id = NEW.user_id AND oi.product_id = NEW.product_id AND o.status = 'delivered'
  ) THEN
    NEW.is_verified_purchase := true;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS "review_purchase_verify" ON public.reviews;
CREATE TRIGGER review_purchase_verify BEFORE INSERT ON public.reviews FOR EACH ROW EXECUTE FUNCTION verify_purchase_on_review();

-- Reward points helpers
CREATE OR REPLACE FUNCTION increment_reward_points(p_user_id UUID, p_points INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.users SET total_reward_points = COALESCE(total_reward_points, 0) + p_points WHERE id = p_user_id;
END; $$;

CREATE OR REPLACE FUNCTION award_points_on_delivery()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_points INTEGER;
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    v_points := GREATEST(1, FLOOR(NEW.total_amount / 10)::INTEGER);
    INSERT INTO public.reward_points (user_id, points, action, order_id)
      VALUES (NEW.buyer_id, v_points, 'purchase', NEW.id);
    PERFORM increment_reward_points(NEW.buyer_id, v_points);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS "order_delivery_points" ON public.orders;
CREATE TRIGGER order_delivery_points AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE PROCEDURE award_points_on_delivery();

-- Stock management
CREATE OR REPLACE FUNCTION decrement_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.products SET stock_quantity = GREATEST(0, stock_quantity - NEW.quantity) WHERE id = NEW.product_id;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS "order_item_stock_decrement" ON public.order_items;
CREATE TRIGGER order_item_stock_decrement AFTER INSERT ON public.order_items FOR EACH ROW EXECUTE FUNCTION decrement_stock_on_order();

CREATE OR REPLACE FUNCTION restore_stock_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE public.products p SET stock_quantity = stock_quantity + oi.quantity
    FROM public.order_items oi WHERE oi.order_id = NEW.id AND oi.product_id = p.id;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS "order_cancel_stock_restore" ON public.orders;
CREATE TRIGGER order_cancel_stock_restore AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION restore_stock_on_cancel();

CREATE OR REPLACE FUNCTION public.check_stock_before_order()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.products 
    WHERE id = NEW.product_id 
    AND stock_quantity < NEW.quantity
  ) THEN
    RAISE EXCEPTION 'Insufficient stock for product ID %', NEW.product_id;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS "order_item_stock_check" ON public.order_items;
CREATE TRIGGER order_item_stock_check BEFORE INSERT ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.check_stock_before_order();

-- Decrement stock RPC (client-side fallback)
CREATE OR REPLACE FUNCTION public.decrement_stock(p_product_id UUID, p_qty INTEGER)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  AND NOT EXISTS (
    SELECT 1 FROM public.order_items oi JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.product_id = p_product_id AND o.buyer_id = auth.uid() AND o.status = 'pending'
  ) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  UPDATE public.products SET stock_quantity = GREATEST(0, stock_quantity - p_qty) WHERE id = p_product_id;
END; $$;

-- Notification helper
CREATE OR REPLACE FUNCTION notify_user(p_user_id UUID, p_type TEXT, p_title TEXT, p_message TEXT, p_action_url TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.notifications(user_id, type, title, message, action_url)
  VALUES (p_user_id, p_type, p_title, p_message, p_action_url);
EXCEPTION WHEN OTHERS THEN NULL;
END; $$;

-- Notify on order status change
CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status <> OLD.status THEN
    PERFORM notify_user(NEW.buyer_id, 'order',
      CASE NEW.status WHEN 'processing' THEN 'Order Confirmed' WHEN 'shipped' THEN 'Order Shipped!' WHEN 'delivered' THEN 'Order Delivered!' WHEN 'cancelled' THEN 'Order Cancelled' ELSE 'Order Update' END,
      CASE NEW.status WHEN 'processing' THEN 'Your order is being processed.' WHEN 'shipped' THEN 'Your order is on its way.' WHEN 'delivered' THEN 'Your order has been delivered. Enjoy!' WHEN 'cancelled' THEN 'Your order has been cancelled. Refund will be processed shortly.' ELSE 'Your order status has been updated.' END,
      '/my-orders');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS "trg_notify_order_status" ON public.orders;
CREATE TRIGGER trg_notify_order_status AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE PROCEDURE notify_order_status_change();

-- Notify on order placed
CREATE OR REPLACE FUNCTION notify_order_placed()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  PERFORM notify_user(NEW.buyer_id, 'order', 'Order Placed Successfully!', 'Your order has been placed. We will confirm it shortly.', '/my-orders');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS "trg_notify_order_placed" ON public.orders;
CREATE TRIGGER trg_notify_order_placed AFTER INSERT ON public.orders FOR EACH ROW EXECUTE PROCEDURE notify_order_placed();

-- Notify seller on new order
CREATE OR REPLACE FUNCTION notify_seller_new_order()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.seller_id IS NOT NULL THEN
    PERFORM notify_user(NEW.seller_id, 'payment', 'New Order Received!', 'You have a new order. Ship it promptly to maintain your rating.', '/seller-dashboard');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS "trg_notify_seller_order" ON public.order_items;
CREATE TRIGGER trg_notify_seller_order AFTER INSERT ON public.order_items FOR EACH ROW EXECUTE PROCEDURE notify_seller_new_order();

-- Notify affiliate on commission
CREATE OR REPLACE FUNCTION notify_affiliate_commission()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.conversions > OLD.conversions THEN
    PERFORM notify_user(NEW.user_id, 'payment', 'Affiliate Commission Earned!', 'You earned from a new sale via your affiliate link!', '/rewards');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS "trg_notify_affiliate" ON public.affiliate_links;
CREATE TRIGGER trg_notify_affiliate AFTER UPDATE ON public.affiliate_links FOR EACH ROW EXECUTE PROCEDURE notify_affiliate_commission();

-- Notify on KYC status change
CREATE OR REPLACE FUNCTION notify_kyc_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status <> OLD.status THEN
    PERFORM notify_user(NEW.user_id, 'kyc',
      CASE NEW.status WHEN 'approved' THEN 'KYC Approved!' WHEN 'rejected' THEN 'KYC Rejected' ELSE 'KYC Under Review' END,
      CASE NEW.status WHEN 'approved' THEN 'Your KYC verification is complete.' WHEN 'rejected' THEN COALESCE(NEW.rejection_reason, 'Please resubmit with clearer documents.') ELSE 'Your KYC is under review.' END,
      '/kyc');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS "trg_notify_kyc" ON public.kyc_submissions;
CREATE TRIGGER trg_notify_kyc AFTER UPDATE ON public.kyc_submissions FOR EACH ROW EXECUTE PROCEDURE notify_kyc_status();

-- Notify on reward points
CREATE OR REPLACE FUNCTION notify_reward_points()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.points > 0 THEN
    PERFORM notify_user(NEW.user_id, 'referral', 'Reward Points Credited!', '+' || NEW.points::text || ' points added for: ' || REPLACE(NEW.action, '_', ' '), '/rewards');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS "trg_notify_points" ON public.reward_points;
CREATE TRIGGER trg_notify_points AFTER INSERT ON public.reward_points FOR EACH ROW EXECUTE PROCEDURE notify_reward_points();


-- Atomic coupon redemption
CREATE OR REPLACE FUNCTION public.redeem_coupon(p_code TEXT, p_user_id UUID, p_order_id UUID, p_subtotal DECIMAL)
RETURNS TABLE(discount DECIMAL, coupon_type TEXT, coupon_value DECIMAL)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_coupon RECORD; v_discount DECIMAL;
BEGIN
  SELECT * INTO v_coupon FROM public.coupons WHERE code = p_code AND is_active = true FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid or expired coupon'; END IF;
  IF v_coupon.expiry IS NOT NULL AND v_coupon.expiry < NOW() THEN RAISE EXCEPTION 'Coupon expired'; END IF;
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.uses >= v_coupon.max_uses THEN RAISE EXCEPTION 'Usage limit reached'; END IF;
  IF EXISTS (SELECT 1 FROM public.coupon_uses WHERE coupon_id = v_coupon.id AND user_id = p_user_id) THEN RAISE EXCEPTION 'Already used'; END IF;
  IF p_subtotal < COALESCE(v_coupon.min_order, 0) THEN RAISE EXCEPTION 'Min order not met'; END IF;
  v_discount := CASE WHEN v_coupon.type = 'flat' THEN v_coupon.value ELSE ROUND(p_subtotal * v_coupon.value / 100) END;
  UPDATE public.coupons SET uses = uses + 1 WHERE id = v_coupon.id;
  INSERT INTO public.coupon_uses (coupon_id, user_id, order_id) VALUES (v_coupon.id, p_user_id, p_order_id);
  RETURN QUERY SELECT v_discount, v_coupon.type::TEXT, v_coupon.value;
END; $$;


-- ============================================================
-- POPUPS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.popups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    discount_text TEXT,
    button_text TEXT,
    target_url TEXT,
    background_color TEXT,
    trigger_delay INTEGER DEFAULT 5000,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.popups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "popups_public" ON public.popups;
CREATE POLICY "popups_public" ON public.popups FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "popups_admin" ON public.popups;
CREATE POLICY "popups_admin" ON public.popups FOR ALL USING (public.is_admin());

-- ============================================================
-- VIEWS
-- ============================================================

-- Affiliate leaderboard
CREATE OR REPLACE VIEW public.affiliate_leaderboard AS
SELECT
  u.id, u.full_name, u.role,
  COALESCE(SUM(al.total_earnings), 0)::NUMERIC  AS total_earned,
  COALESCE(SUM(al.clicks), 0)::INTEGER           AS total_clicks,
  COALESCE(SUM(al.conversions), 0)::INTEGER      AS total_sales,
  COALESCE(COUNT(al.id), 0)::INTEGER             AS link_count,
  RANK() OVER (ORDER BY COALESCE(SUM(al.total_earnings), 0) DESC) AS rank
FROM public.users u
LEFT JOIN public.affiliate_links al ON al.user_id = u.id AND al.is_active = true
WHERE u.role IN ('influencer','seller')
GROUP BY u.id, u.full_name, u.role
ORDER BY total_earned DESC;

-- Seller earnings view (uses product seller_id, not order_items.seller_id)
CREATE OR REPLACE VIEW public.seller_earnings AS
SELECT
  p.seller_id,
  COUNT(DISTINCT o.id)       AS total_orders,
  SUM(oi.price * oi.quantity) AS gross_revenue,
  SUM(oi.price * oi.quantity) AS net_revenue,
  MAX(o.created_at)          AS last_sale_at
FROM public.order_items oi
JOIN public.orders o ON o.id = oi.order_id
JOIN public.products p ON p.id = oi.product_id
WHERE o.status NOT IN ('cancelled') AND o.payment_status = 'paid'
GROUP BY p.seller_id;

-- ============================================================
-- PERFORMANCE INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_products_cat    ON public.products(category) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_seller ON public.products(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer    ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status   ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_oi_order        ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_oi_seller       ON public.order_items(seller_id);
CREATE INDEX IF NOT EXISTS idx_oi_product      ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_prod    ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_aff_user        ON public.affiliate_links(user_id);
CREATE INDEX IF NOT EXISTS idx_aff_code        ON public.affiliate_links(link_code);
CREATE INDEX IF NOT EXISTS idx_msg_sender      ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_msg_receiver    ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_flash_active    ON public.flash_sales(ends_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_rp_user         ON public.reward_points(user_id);
CREATE INDEX IF NOT EXISTS idx_b2b_status      ON public.b2b_leads(status);
CREATE INDEX IF NOT EXISTS idx_rv_user         ON public.recently_viewed(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_user      ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallets_user    ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_user  ON public.wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code    ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_webhook_eventid ON public.webhook_events(event_id);

-- ============================================================
-- STORAGE BUCKETS (run in Supabase Dashboard > Storage > New Bucket)
-- ============================================================
-- 1. "kyc-documents"  — PRIVATE  | 5MB max  | image/jpeg, image/png, image/webp, application/pdf
-- 2. "product-images" — PUBLIC   | 10MB max | image/jpeg, image/png, image/webp
-- ============================================================

-- Admin seed (run manually with your email):
-- UPDATE public.users SET role = 'admin' WHERE email = 'your@email.com';

-- ============================================================
-- RATE LIMITING (run this in Supabase SQL Editor)
-- ============================================================

-- Create rate limiting table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, action, window_start)
);

-- Rate limiting function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_action TEXT,
  p_max_attempts INTEGER DEFAULT 5,
  p_window_seconds INTEGER DEFAULT 60
)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE v_count INTEGER;
BEGIN
  -- Clean old entries
  DELETE FROM public.rate_limits 
  WHERE window_start < now() - (p_window_seconds || ' seconds')::INTERVAL;
  
  -- Check current count
  SELECT COALESCE(SUM(count), 0) INTO v_count FROM public.rate_limits
  WHERE user_id = p_user_id AND action = p_action
  AND window_start > now() - (p_window_seconds || ' seconds')::INTERVAL;
  
  IF v_count >= p_max_attempts THEN
    RETURN FALSE;
  END IF;
  
  -- Increment counter
  INSERT INTO public.rate_limits (user_id, action, count, window_start)
  VALUES (p_user_id, p_action, 1, now())
  ON CONFLICT (user_id, action, window_start) 
  DO UPDATE SET count = rate_limits.count + 1;
  
  RETURN TRUE;
END; $$;

-- Create index for rate limit queries
CREATE INDEX IF NOT EXISTS idx_rl_user_action ON public.rate_limits(user_id, action, window_start);

-- ============================================================
-- AUDIT LOGGING
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Function to log actions
CREATE OR REPLACE FUNCTION public.log_audit(
  p_user_id UUID,
  p_action TEXT,
  p_table_name TEXT DEFAULT NULL,
  p_record_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent)
  VALUES (p_user_id, p_action, p_table_name, p_record_id, p_old_values, p_new_values, p_ip_address, p_user_agent);
END; $$;

-- Index for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.audit_logs(action, created_at DESC);

-- ============================================================
-- WALLET SECURITY FUNCTIONS
-- ============================================================

-- Atomic wallet balance deduction
DROP FUNCTION IF EXISTS public.deduct_wallet_balance(uuid, numeric);
CREATE OR REPLACE FUNCTION public.deduct_wallet_balance(
  p_user_id UUID,
  p_amount DECIMAL
)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE v_current_balance DECIMAL;
BEGIN
  -- Lock the wallet row for update
  SELECT balance INTO v_current_balance FROM public.wallets
  WHERE user_id = p_user_id FOR UPDATE;
  
  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RETURN FALSE;
  END IF;
  
  UPDATE public.wallets 
  SET balance = balance - p_amount,
      total_withdrawn = COALESCE(total_withdrawn, 0) + p_amount
  WHERE user_id = p_user_id;
  
  RETURN TRUE;
END; $$;

-- Verify order belongs to user
CREATE OR REPLACE FUNCTION public.verify_order_ownership(
  p_order_id UUID,
  p_user_id UUID,
  p_role TEXT DEFAULT 'buyer'
)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE v_order RECORD;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  
  IF p_role = 'admin' THEN
    RETURN TRUE;
  ELSIF p_role = 'buyer' THEN
    RETURN v_order.buyer_id = p_user_id;
  ELSIF p_role IN ('seller', 'influencer') THEN
    RETURN EXISTS (
      SELECT 1 FROM public.order_items oi 
      WHERE oi.order_id = p_order_id AND oi.seller_id = p_user_id
    );
  END IF;
  
  RETURN FALSE;
END; $$;

-- ============================================================
-- SHORT VIDEOS (REELS)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.short_videos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    creator_id UUID REFERENCES public.users(id) NOT NULL,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    description TEXT,
    tagged_products UUID[] DEFAULT '{}',
    likes_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc',now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.short_video_likes (
    video_id UUID REFERENCES public.short_videos(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc',now()) NOT NULL,
    PRIMARY KEY (video_id, user_id)
);

ALTER TABLE public.short_videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sv_public" ON public.short_videos;
CREATE POLICY "sv_public" ON public.short_videos FOR SELECT USING (true);
DROP POLICY IF EXISTS "sv_own" ON public.short_videos;
CREATE POLICY "sv_own"    ON public.short_videos FOR ALL    USING (auth.uid() = creator_id);

-- ============================================================
-- B2B LEAD UNLOCKS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.b2b_lead_unlocks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lead_id UUID REFERENCES public.b2b_leads(id) ON DELETE CASCADE NOT NULL,
    supplier_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc',now()) NOT NULL,
    fee_paid DECIMAL NOT NULL DEFAULT 0,
    UNIQUE(lead_id, supplier_id)
);

ALTER TABLE public.b2b_lead_unlocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "unlock_own" ON public.b2b_lead_unlocks;
CREATE POLICY "unlock_own" ON public.b2b_lead_unlocks FOR SELECT USING (auth.uid() = supplier_id);
DROP POLICY IF EXISTS "unlock_admin" ON public.b2b_lead_unlocks;
CREATE POLICY "unlock_admin" ON public.b2b_lead_unlocks FOR ALL USING (public.is_admin());

-- ============================================================
-- WALLET OPERATIONS
-- ============================================================

-- Function to safely deduct wallet balance
DROP FUNCTION IF EXISTS public.deduct_wallet_balance(uuid, numeric);
CREATE OR REPLACE FUNCTION public.deduct_wallet_balance(p_user_id UUID, p_amount DECIMAL)
RETURNS VOID AS $$
BEGIN
    UPDATE public.wallets 
    SET balance = balance - p_amount 
    WHERE user_id = p_user_id AND balance >= p_amount;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Insufficient balance or wallet not found';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to release B2B Escrow funds to supplier wallet
CREATE OR REPLACE FUNCTION public.release_escrow(p_escrow_id UUID, p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_escrow RECORD;
BEGIN
    -- 1. Check if escrow exists and belongs to the buyer
    SELECT * INTO v_escrow FROM public.b2b_escrow WHERE id = p_escrow_id AND buyer_id = p_user_id AND status = 'held';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Escrow record not found or already released';
    END IF;
    
    -- 2. Update escrow status
    UPDATE public.b2b_escrow SET status = 'released', released_at = now() WHERE id = p_escrow_id;
    
    -- 3. Credit supplier wallet
    UPDATE public.wallets 
    SET balance = balance + v_escrow.escrow_amount, 
        total_earned = total_earned + v_escrow.escrow_amount 
    WHERE user_id = v_escrow.supplier_id;
    
    -- 4. Notify supplier
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (v_escrow.supplier_id, 'payment', 'Escrow Funds Released!', 'Buyer has released ₹' || v_escrow.escrow_amount || ' to your wallet for the bulk order.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- B2B ESCROW & QUOTES (PHASE 4)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.b2b_quotes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lead_id UUID REFERENCES public.b2b_leads(id) ON DELETE CASCADE NOT NULL,
    supplier_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    unit_price DECIMAL NOT NULL,
    total_amount DECIMAL NOT NULL,
    estimated_days INTEGER NOT NULL,
    samples_available BOOLEAN DEFAULT false,
    terms TEXT,
    status TEXT DEFAULT 'pending', -- pending, accepted, rejected, paid
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc',now()) NOT NULL
);

ALTER TABLE public.b2b_quotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quote_public_buyer" ON public.b2b_quotes;
CREATE POLICY "quote_public_buyer" ON public.b2b_quotes FOR SELECT USING (EXISTS (SELECT 1 FROM public.b2b_leads WHERE id = lead_id AND buyer_id = auth.uid()));
DROP POLICY IF EXISTS "quote_own_supplier" ON public.b2b_quotes;
CREATE POLICY "quote_own_supplier" ON public.b2b_quotes FOR ALL USING (auth.uid() = supplier_id);

CREATE TABLE IF NOT EXISTS public.b2b_escrow (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    quote_id UUID REFERENCES public.b2b_quotes(id) ON DELETE CASCADE NOT NULL,
    buyer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    supplier_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    escrow_amount DECIMAL NOT NULL,
    status TEXT DEFAULT 'held', -- held, released, refunded
    release_code TEXT, -- OTP for buyer to release funds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc',now()) NOT NULL,
    released_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.b2b_escrow ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "escrow_buyer" ON public.b2b_escrow;
CREATE POLICY "escrow_buyer" ON public.b2b_escrow FOR SELECT USING (auth.uid() = buyer_id);
DROP POLICY IF EXISTS "escrow_supplier" ON public.b2b_escrow;
CREATE POLICY "escrow_supplier" ON public.b2b_escrow FOR SELECT USING (auth.uid() = supplier_id);

-- ============================================================
-- B2B RATINGS & TRUST
-- ============================================================

CREATE TABLE IF NOT EXISTS public.b2b_supplier_ratings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    supplier_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    buyer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    quote_id UUID REFERENCES public.b2b_quotes(id) ON DELETE CASCADE NOT NULL,
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    timeline_rating INTEGER CHECK (timeline_rating >= 1 AND timeline_rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc',now()) NOT NULL,
    UNIQUE(quote_id)
);

ALTER TABLE public.b2b_supplier_ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rating_public_view" ON public.b2b_supplier_ratings;
CREATE POLICY "rating_public_view" ON public.b2b_supplier_ratings FOR SELECT USING (true);
DROP POLICY IF EXISTS "rating_own_buyer" ON public.b2b_supplier_ratings;
CREATE POLICY "rating_own_buyer" ON public.b2b_supplier_ratings FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- ============================================================
-- LOGISTICS & SHIPPING (PHASE 4)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.shipping_methods (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    base_cost DECIMAL DEFAULT 0,
    cost_per_kg DECIMAL DEFAULT 0,
    est_days_min INTEGER DEFAULT 3,
    est_days_max INTEGER DEFAULT 7,
    is_active BOOLEAN DEFAULT true
);

INSERT INTO public.shipping_methods (name, description, base_cost, cost_per_kg, est_days_min, est_days_max) VALUES
('Standard Delivery', 'Economical shipping via surface mail', 40, 10, 5, 10),
('Express Shipping', 'Faster delivery via air courier', 120, 25, 2, 4),
('Ultra-Fast (Select Cities)', 'Same day or next day delivery', 250, 50, 1, 2);

-- WALLET TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) NOT NULL,
    type TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc',now()) NOT NULL
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wallet_trans_owner" ON public.wallet_transactions;
CREATE POLICY "wallet_trans_owner" ON public.wallet_transactions FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- ADDITIONAL TABLES & COLUMNS (PHASE 5: PRODUCTION STABILIZATION)
-- Only NEW tables and ALTER TABLE for missing columns on existing tables.
-- Duplicate CREATE TABLE IF NOT EXISTS are removed to avoid schema conflicts.
-- ============================================================

-- Add missing columns to existing tables
ALTER TABLE public.affiliate_applications ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.influencers ADD COLUMN IF NOT EXISTS niche TEXT[];
ALTER TABLE public.influencers ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.influencers ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';

-- REFERRALS & TREE (NEW)
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    referrer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    referred_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    reward_points INTEGER DEFAULT 50,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc',now()) NOT NULL,
    UNIQUE(referred_id)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "referral_owner" ON public.referrals;
CREATE POLICY "referral_owner" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- INFLUENCER CAMPAIGNS / GIGS (NEW)
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    seller_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    category TEXT,
    budget TEXT,
    commission_pct INTEGER DEFAULT 10,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc',now()) NOT NULL
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "campaign_public_view" ON public.campaigns;
CREATE POLICY "campaign_public_view" ON public.campaigns FOR SELECT USING (true);
DROP POLICY IF EXISTS "campaign_seller" ON public.campaigns;
CREATE POLICY "campaign_seller" ON public.campaigns FOR ALL USING (auth.uid() = seller_id);

-- REFERRAL TRACKING — CLICKS (NEW)
CREATE TABLE IF NOT EXISTS public.referral_clicks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    video_id UUID REFERENCES public.short_videos(id) ON DELETE CASCADE,
    referrer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    visitor_id TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc',now()) NOT NULL
);

-- REFERRAL TRACKING — VIEWS (NEW)
CREATE TABLE IF NOT EXISTS public.referral_views (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    video_id UUID REFERENCES public.short_videos(id) ON DELETE CASCADE,
    referrer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    visitor_id TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc',now()) NOT NULL
);

-- AFFILIATE STATS AGGREGATE (NEW)
CREATE TABLE IF NOT EXISTS public.affiliate_stats (
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    clicks_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    conversions_count INTEGER DEFAULT 0,
    total_sales_value DECIMAL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc',now()) NOT NULL,
    PRIMARY KEY(user_id, product_id)
);

-- RPC: Increment Affiliate Stats
CREATE OR REPLACE FUNCTION public.increment_affiliate_stats(p_user_id UUID, p_product_id UUID, p_type TEXT)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.affiliate_stats (user_id, product_id, clicks_count, views_count)
    VALUES (p_user_id, p_product_id,
        CASE WHEN p_type = 'click' THEN 1 ELSE 0 END,
        CASE WHEN p_type = 'view' THEN 1 ELSE 0 END
    )
    ON CONFLICT (user_id, product_id) DO UPDATE SET
        clicks_count = affiliate_stats.clicks_count + (CASE WHEN p_type = 'click' THEN 1 ELSE 0 END),
        views_count = affiliate_stats.views_count + (CASE WHEN p_type = 'view' THEN 1 ELSE 0 END),
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

