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

-- RATE LIMITS
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), identifier TEXT NOT NULL, action TEXT NOT NULL,
    attempts INTEGER DEFAULT 0, last_attempt TIMESTAMPTZ DEFAULT timezone('utc', now()),
    locked_until TIMESTAMPTZ, UNIQUE(identifier, action));

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
-- BYNDIO Part 2: Functions, Triggers, RLS, Indexes, Seed
-- Run AFTER supabase_schema.sql

-- FUNCTIONS
CREATE OR REPLACE FUNCTION update_modified_column() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role) VALUES (
    NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'buyer'));
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.create_user_wallet() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.wallets (user_id, balance, pending_balance, total_earned, total_withdrawn)
  VALUES (NEW.id, 0, 0, 0, 0) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.generate_referral_code() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := UPPER(SUBSTRING(MD5(NEW.id::TEXT || EXTRACT(EPOCH FROM now())::TEXT) FROM 1 FOR 8));
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.prevent_role_change() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role AND (current_setting('role', true) <> 'service_role') THEN
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin') THEN
      NEW.role := OLD.role;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.deduct_stock_on_order() RETURNS TRIGGER LANGUAGE plpgsql AS $body$
BEGIN
  UPDATE public.products SET stock_quantity = stock_quantity - NEW.quantity
  WHERE id = NEW.product_id AND stock_quantity >= NEW.quantity;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient stock for product ID %', NEW.product_id; END IF;
  RETURN NEW;
END;
$body$;

CREATE OR REPLACE FUNCTION public.award_points_on_delivery() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $body$
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    INSERT INTO public.reward_points (user_id, points, action, order_id)
    VALUES (NEW.buyer_id, GREATEST(1, FLOOR(NEW.total_amount / 100)::INTEGER), 'Order delivery reward', NEW.id) ON CONFLICT DO NOTHING;
    UPDATE public.users SET total_reward_points = COALESCE(total_reward_points, 0) + GREATEST(1, FLOOR(NEW.total_amount / 100)::INTEGER) WHERE id = NEW.buyer_id;
  END IF;
  RETURN NEW;
END;
$body$;

CREATE OR REPLACE FUNCTION public.enforce_cod_limit() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.payment_method = 'cod' AND NEW.total_amount > 5000 THEN RAISE EXCEPTION 'COD limited to 5000'; END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.validate_order_quantities() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.quantity > 10 THEN RAISE EXCEPTION 'Maximum 10 units per item'; END IF;
  IF NEW.quantity < 1 THEN RAISE EXCEPTION 'Quantity must be at least 1'; END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_order_status_change() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, type, title, message, action_url) VALUES (
      NEW.buyer_id, 'order', 'Order Update: ' || UPPER(NEW.status),
      'Your order #' || LEFT(NEW.id::TEXT, 8) || ' is now ' || NEW.status || '.', '/my-orders');
  END IF;
  RETURN NEW;
END; $$;

-- TRIGGERS
DROP TRIGGER IF EXISTS upd_users ON public.users;
CREATE TRIGGER upd_users BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
DROP TRIGGER IF EXISTS on_user_created_wallet ON public.users;
CREATE TRIGGER on_user_created_wallet AFTER INSERT ON public.users FOR EACH ROW EXECUTE PROCEDURE public.create_user_wallet();
DROP TRIGGER IF EXISTS set_referral_code ON public.users;
CREATE TRIGGER set_referral_code BEFORE INSERT ON public.users FOR EACH ROW EXECUTE PROCEDURE public.generate_referral_code();
DROP TRIGGER IF EXISTS tr_prevent_role_change ON public.users;
CREATE TRIGGER tr_prevent_role_change BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE PROCEDURE public.prevent_role_change();
DROP TRIGGER IF EXISTS trigger_deduct_stock ON public.order_items;
CREATE TRIGGER trigger_deduct_stock BEFORE INSERT ON public.order_items FOR EACH ROW EXECUTE PROCEDURE public.deduct_stock_on_order();
DROP TRIGGER IF EXISTS trg_validate_order_qty ON public.order_items;
CREATE TRIGGER trg_validate_order_qty BEFORE INSERT ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.validate_order_quantities();
DROP TRIGGER IF EXISTS trg_award_points_on_delivery ON public.orders;
CREATE TRIGGER trg_award_points_on_delivery AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.award_points_on_delivery();
DROP TRIGGER IF EXISTS trg_cod_limit ON public.orders;
CREATE TRIGGER trg_cod_limit BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.enforce_cod_limit();
DROP TRIGGER IF EXISTS trg_notify_order_status ON public.orders;
CREATE TRIGGER trg_notify_order_status AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.notify_order_status_change();

-- RPC FUNCTIONS
CREATE OR REPLACE FUNCTION public.credit_wallet(p_user_id UUID, p_amount DECIMAL, p_description TEXT DEFAULT 'Credit')
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  UPDATE public.wallets SET balance = balance + p_amount, total_earned = COALESCE(total_earned,0) + p_amount WHERE user_id = p_user_id;
  IF NOT FOUND THEN INSERT INTO public.wallets (user_id, balance, total_earned, total_withdrawn) VALUES (p_user_id, p_amount, p_amount, 0); END IF;
  INSERT INTO public.wallet_transactions (user_id, type, amount, description) VALUES (p_user_id, 'credit', p_amount, p_description);
END; $$;
REVOKE ALL ON FUNCTION public.credit_wallet FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_wallet TO service_role;

CREATE OR REPLACE FUNCTION public.validate_order_total(p_cart JSONB, p_claimed_total DECIMAL)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $body$
BEGIN
  RETURN ABS(
    (SELECT COALESCE(SUM(p.price * x.qty), 0)
     FROM jsonb_to_recordset(p_cart) AS x(id UUID, qty INTEGER)
     JOIN public.products p ON p.id = x.id AND p.is_active = true)
    - p_claimed_total
  ) <= GREATEST(p_claimed_total * 0.01, 1);
END;
$body$;

CREATE OR REPLACE FUNCTION public.check_stock(items JSONB)
RETURNS TABLE(product_id UUID, available INTEGER, requested INTEGER) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY SELECT p.id, p.stock_quantity, (i->>'qty')::INTEGER
  FROM jsonb_array_elements(items) AS i JOIN public.products p ON p.id = (i->>'id')::UUID
  WHERE p.stock_quantity < (i->>'qty')::INTEGER;
END; $$;

CREATE OR REPLACE FUNCTION public.validate_coupon(p_code TEXT, p_cart_total NUMERIC DEFAULT 0)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $body$
BEGIN
  RETURN (
    SELECT CASE
      WHEN c.id IS NULL THEN jsonb_build_object('valid', false, 'error', 'Invalid coupon')
      WHEN c.expiry IS NOT NULL AND c.expiry < now() THEN jsonb_build_object('valid', false, 'error', 'Expired')
      WHEN c.max_uses IS NOT NULL AND c.uses >= c.max_uses THEN jsonb_build_object('valid', false, 'error', 'Limit reached')
      WHEN p_cart_total < c.min_order THEN jsonb_build_object('valid', false, 'error', 'Min order not met')
      ELSE jsonb_build_object('valid', true, 'discount',
        CASE WHEN c.type = 'percent' THEN LEAST((p_cart_total * c.value) / 100, COALESCE(c.max_discount, (p_cart_total * c.value) / 100))
        ELSE c.value END,
        'code', c.code, 'coupon_id', c.id)
    END
    FROM public.coupons c WHERE c.code = upper(p_code) AND c.is_active = true
  );
END;
$body$;

CREATE OR REPLACE FUNCTION public.deduct_wallet_balance(p_user_id UUID, p_amount DECIMAL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (SELECT balance FROM public.wallets WHERE user_id = p_user_id) < p_amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
  UPDATE public.wallets SET balance = balance - p_amount, updated_at = NOW() WHERE user_id = p_user_id;
  INSERT INTO public.wallet_transactions (user_id, amount, description, type) VALUES (p_user_id, p_amount, 'lead_unlock_fee', 'debit');
END; $$;

CREATE OR REPLACE FUNCTION public.deduct_lead_credit(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (SELECT remaining_leads FROM public.sellers WHERE id = p_user_id) <= 0 THEN RAISE EXCEPTION 'No lead credits'; END IF;
  UPDATE public.sellers SET remaining_leads = remaining_leads - 1 WHERE id = p_user_id;
END; $$;

CREATE OR REPLACE FUNCTION public.increment_referral_clicks(p_user_id UUID, p_product_id UUID DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.affiliate_stats (user_id, product_id, clicks_count)
  VALUES (p_user_id, COALESCE(p_product_id, '00000000-0000-0000-0000-000000000000'::UUID), 1)
  ON CONFLICT (user_id, product_id) DO UPDATE SET clicks_count = affiliate_stats.clicks_count + 1;
END; $$;

CREATE OR REPLACE FUNCTION public.increment_affiliate_stats(p_user_id UUID, p_product_id UUID, p_type TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.affiliate_stats (user_id, product_id, clicks_count, views_count) VALUES (
    p_user_id, p_product_id, CASE WHEN p_type='click' THEN 1 ELSE 0 END, CASE WHEN p_type='view' THEN 1 ELSE 0 END)
  ON CONFLICT (user_id, product_id) DO UPDATE SET
    clicks_count = affiliate_stats.clicks_count + CASE WHEN p_type='click' THEN 1 ELSE 0 END,
    views_count = affiliate_stats.views_count + CASE WHEN p_type='view' THEN 1 ELSE 0 END,
    conversions_count = affiliate_stats.conversions_count + CASE WHEN p_type='conversion' THEN 1 ELSE 0 END;
END; $$;

CREATE OR REPLACE FUNCTION public.clean_expired_otps() RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $body$
BEGIN
  WITH deleted AS (DELETE FROM public.cod_otps WHERE expires_at < now() RETURNING id)
  SELECT count(*) FROM deleted;
  RETURN FOUND::INT;
END;
$body$;

CREATE OR REPLACE FUNCTION public.deduct_stock(p_id UUID, qty INTEGER) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $body$
BEGIN
  UPDATE public.products SET stock_quantity = stock_quantity - qty
  WHERE id = p_id AND stock_quantity >= qty;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient stock or product not found: %', p_id; END IF;
END;
$body$;

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_identifier TEXT, p_action TEXT) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $body$
BEGIN
  RETURN COALESCE(
    (SELECT jsonb_build_object('allowed', false, 'locked_until', locked_until)
     FROM public.rate_limits WHERE identifier = p_identifier AND action = p_action
     AND locked_until IS NOT NULL AND locked_until > now()),
    jsonb_build_object('allowed', true)
  );
END;
$body$;

CREATE OR REPLACE FUNCTION public.record_failed_attempt(p_identifier TEXT, p_action TEXT, p_max INTEGER, p_lock_mins INTEGER)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $body$
BEGIN
  INSERT INTO public.rate_limits (identifier, action, attempts, last_attempt) VALUES (p_identifier, p_action, 1, now())
  ON CONFLICT (identifier, action) DO UPDATE SET
    attempts = CASE WHEN rate_limits.last_attempt < now() - (p_lock_mins || ' minutes')::interval THEN 1 ELSE rate_limits.attempts + 1 END,
    last_attempt = now();
  IF (SELECT attempts FROM public.rate_limits WHERE identifier = p_identifier AND action = p_action) >= p_max THEN
    UPDATE public.rate_limits SET locked_until = now() + (p_lock_mins || ' minutes')::interval WHERE identifier = p_identifier AND action = p_action;
    RETURN jsonb_build_object('allowed', false, 'error', 'Too many attempts');
  END IF;
  RETURN jsonb_build_object('allowed', true, 'remaining', p_max - (SELECT attempts FROM public.rate_limits WHERE identifier = p_identifier AND action = p_action));
END;
$body$;

CREATE OR REPLACE FUNCTION public.reset_rate_limit(p_identifier TEXT, p_action TEXT) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN DELETE FROM public.rate_limits WHERE identifier = p_identifier AND action = p_action; END; $$;

CREATE OR REPLACE FUNCTION public.validate_referral(p_referral_code TEXT, p_new_user_id UUID) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $body$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users WHERE referral_code = p_referral_code AND id != p_new_user_id
  );
END;
$body$;

-- ROW LEVEL SECURITY
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_supplier_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cod_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "users_own_read" ON public.users; CREATE POLICY "users_own_read" ON public.users FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "users_own_update" ON public.users; CREATE POLICY "users_own_update" ON public.users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "users_admin" ON public.users; CREATE POLICY "users_admin" ON public.users FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "products_public_view" ON public.products; CREATE POLICY "products_public_view" ON public.products FOR SELECT USING (is_active = true AND approval_status = 'approved');
DROP POLICY IF EXISTS "prod_insert" ON public.products; CREATE POLICY "prod_insert" ON public.products FOR INSERT WITH CHECK (auth.uid() = seller_id AND (EXISTS (SELECT 1 FROM public.sellers WHERE id = auth.uid() AND kyc_status = 'approved') OR public.is_admin()));
DROP POLICY IF EXISTS "products_admin" ON public.products; CREATE POLICY "products_admin" ON public.products FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "orders_own_read" ON public.orders; CREATE POLICY "orders_own_read" ON public.orders FOR SELECT USING (auth.uid() = buyer_id);
DROP POLICY IF EXISTS "orders_own_insert" ON public.orders; CREATE POLICY "orders_own_insert" ON public.orders FOR INSERT WITH CHECK (auth.uid() = buyer_id);
DROP POLICY IF EXISTS "seller_update_orders" ON public.orders; CREATE POLICY "seller_update_orders" ON public.orders FOR UPDATE USING (EXISTS (SELECT 1 FROM public.order_items WHERE order_id = orders.id AND seller_id = auth.uid()));
DROP POLICY IF EXISTS "orders_admin" ON public.orders; CREATE POLICY "orders_admin" ON public.orders FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "oi_own_read" ON public.order_items; CREATE POLICY "oi_own_read" ON public.order_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders WHERE id = order_items.order_id AND buyer_id = auth.uid()) OR seller_id = auth.uid());
DROP POLICY IF EXISTS "oi_insert" ON public.order_items; CREATE POLICY "oi_insert" ON public.order_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.orders WHERE id = order_items.order_id AND buyer_id = auth.uid()));
DROP POLICY IF EXISTS "oi_admin" ON public.order_items; CREATE POLICY "oi_admin" ON public.order_items FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "wallet_read_own" ON public.wallets; CREATE POLICY "wallet_read_own" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "wallet_admin" ON public.wallets; CREATE POLICY "wallet_admin" ON public.wallets FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "wt_read_own" ON public.wallet_transactions; CREATE POLICY "wt_read_own" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "wt_admin" ON public.wallet_transactions; CREATE POLICY "wt_admin" ON public.wallet_transactions FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "addresses_own" ON public.addresses; CREATE POLICY "addresses_own" ON public.addresses FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "rp_own" ON public.reward_points; CREATE POLICY "rp_own" ON public.reward_points FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "rp_admin" ON public.reward_points; CREATE POLICY "rp_admin" ON public.reward_points FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "notif_read" ON public.notifications; CREATE POLICY "notif_read" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notif_ins" ON public.notifications; CREATE POLICY "notif_ins" ON public.notifications FOR INSERT WITH CHECK (public.is_admin() OR auth.uid() = user_id);
DROP POLICY IF EXISTS "notif_upd" ON public.notifications; CREATE POLICY "notif_upd" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "ship_view" ON public.shipping_methods; CREATE POLICY "ship_view" ON public.shipping_methods FOR SELECT USING (true);
DROP POLICY IF EXISTS "ship_admin" ON public.shipping_methods; CREATE POLICY "ship_admin" ON public.shipping_methods FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "rl_all" ON public.rate_limits; CREATE POLICY "rl_all" ON public.rate_limits FOR ALL USING (true);
DROP POLICY IF EXISTS "audit_admin" ON public.audit_logs; CREATE POLICY "audit_admin" ON public.audit_logs FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "audit_own" ON public.audit_logs; CREATE POLICY "audit_own" ON public.audit_logs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "as_own" ON public.affiliate_stats; CREATE POLICY "as_own" ON public.affiliate_stats FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "as_admin" ON public.affiliate_stats; CREATE POLICY "as_admin" ON public.affiliate_stats FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "rc_ins" ON public.referral_clicks; CREATE POLICY "rc_ins" ON public.referral_clicks FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "rc_read" ON public.referral_clicks; CREATE POLICY "rc_read" ON public.referral_clicks FOR SELECT USING (public.is_admin() OR auth.uid() = referrer_id);
DROP POLICY IF EXISTS "rv_ins" ON public.referral_views; CREATE POLICY "rv_ins" ON public.referral_views FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "rv_read" ON public.referral_views; CREATE POLICY "rv_read" ON public.referral_views FOR SELECT USING (public.is_admin() OR auth.uid() = referrer_id);
DROP POLICY IF EXISTS "ra_own" ON public.referral_analytics; CREATE POLICY "ra_own" ON public.referral_analytics FOR SELECT USING (auth.uid() = seller_id);
DROP POLICY IF EXISTS "ra_ins" ON public.referral_analytics; CREATE POLICY "ra_ins" ON public.referral_analytics FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "b2b_ins" ON public.b2b_supplier_applications; CREATE POLICY "b2b_ins" ON public.b2b_supplier_applications FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "b2b_admin" ON public.b2b_supplier_applications; CREATE POLICY "b2b_admin" ON public.b2b_supplier_applications FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "otp_all" ON public.otp_verifications; CREATE POLICY "otp_all" ON public.otp_verifications FOR ALL USING (true);
DROP POLICY IF EXISTS "coup_read" ON public.coupons; CREATE POLICY "coup_read" ON public.coupons FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "coup_admin" ON public.coupons; CREATE POLICY "coup_admin" ON public.coupons FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "wl_own" ON public.wishlists; CREATE POLICY "wl_own" ON public.wishlists FOR ALL USING (auth.uid() = user_id);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_products_search ON public.products USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_rl_id ON public.rate_limits(identifier, action);

-- SEED DATA
INSERT INTO public.shipping_methods (name, description, base_cost, cost, min_days, max_days)
VALUES ('Standard Delivery', 'Economical surface shipping', 40, 40, 5, 10) ON CONFLICT (id) DO NOTHING;

-- DONE
