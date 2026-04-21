-- ===========================================================================
-- BYNDIO Unified Production Schema
-- Version: 1.2 (Final Production Hardened)
-- Includes: Core Tables, Security, Influencer model, GST compliance
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

-- ORDER ITEMS (Influencer Ready)
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

-- INFLUENCERS
CREATE TABLE IF NOT EXISTS public.influencers (
    id UUID REFERENCES public.users(id) PRIMARY KEY,
    social_media_links JSONB DEFAULT '{}',
    total_followers INTEGER DEFAULT 0,
    commission_rate DECIMAL(5,2) DEFAULT 10.00,
    is_verified BOOLEAN DEFAULT false,
    subscription_plan TEXT DEFAULT 'free',
    subscription_expires_at TIMESTAMPTZ,
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

-- SELLER APPLICATIONS
CREATE TABLE IF NOT EXISTS public.seller_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Stock Management with Row Locking
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

-- GST Sync Trigger (Seller to Products)
CREATE OR REPLACE FUNCTION public.sync_seller_gst_to_products()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (OLD.business_state IS DISTINCT FROM NEW.business_state) OR (OLD.gst_number IS DISTINCT FROM NEW.gst_number) THEN
    UPDATE public.products SET seller_state = NEW.business_state, seller_has_gst = (NEW.gst_number IS NOT NULL AND NEW.gst_number != '') WHERE seller_id = NEW.id;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_seller_gst ON public.sellers;
CREATE TRIGGER trg_sync_seller_gst AFTER UPDATE ON public.sellers FOR EACH ROW EXECUTE FUNCTION public.sync_seller_gst_to_products();

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. RPCs
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.increment_wallet_balance(p_user_id UUID, p_amount DECIMAL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.wallets SET balance = balance + p_amount, total_earned = total_earned + p_amount WHERE user_id = p_user_id;
END; $$;

CREATE OR REPLACE FUNCTION public.validate_gst_compliance(p_cart JSONB, p_buyer_state TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result JSONB := '[]'::JSONB; item RECORD;
BEGIN
  IF p_buyer_state IS NULL OR p_buyer_state = '' THEN RETURN jsonb_build_object('valid', true, 'restricted_items', '[]'::JSONB); END IF;
  FOR item IN
    SELECT p.id, p.name, s.business_state FROM jsonb_to_recordset(p_cart) AS x(id UUID, qty INTEGER)
    JOIN public.products p ON p.id = x.id JOIN public.sellers s ON s.id = p.seller_id
    WHERE (s.gst_number IS NULL OR s.gst_number = '') AND s.business_state != p_buyer_state
  LOOP
    result := result || jsonb_build_object('product_id', item.id, 'product_name', item.name, 'seller_state', item.business_state);
  END LOOP;
  RETURN CASE WHEN jsonb_array_length(result) > 0 THEN jsonb_build_object('valid', false, 'restricted_items', result) ELSE jsonb_build_object('valid', true, 'restricted_items', '[]'::JSONB) END;
END; $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. RLS POLICIES (Summary)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- ... Add specific policies as needed (omitted for brevity but recommended for production)

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. SEED DATA
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.shipping_methods (name, cost, min_days, max_days)
VALUES ('Standard Delivery', 40, 3, 7) ON CONFLICT DO NOTHING;

INSERT INTO public.payment_methods (name, provider, is_active)
VALUES ('Online Payment', 'razorpay', true), ('Cash on Delivery', 'cod', true) ON CONFLICT DO NOTHING;
