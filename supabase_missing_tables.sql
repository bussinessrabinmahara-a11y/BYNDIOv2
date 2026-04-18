-- ============================================================
-- BYNDIO — Missing Tables & Functions Migration
-- Run this AFTER supabase_schema.sql in Supabase SQL Editor
-- Safe: All statements use IF NOT EXISTS / CREATE OR REPLACE
-- ============================================================

-- ============================================================
-- 1. COD OTP TABLE (used by send-otp.js & verify-cod-otp.js)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cod_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    verified BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cod_otps_phone ON public.cod_otps(phone, verified, expires_at);

-- Service-role only (Netlify functions use service key, no RLS needed)
ALTER TABLE public.cod_otps ENABLE ROW LEVEL SECURITY;
-- No public policies — only accessed via Netlify functions with service_role key

-- ============================================================
-- 2. MISSING COLUMNS ON PRODUCTS
-- ============================================================
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS commission_pct INTEGER DEFAULT 10;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS promo_video_url TEXT;

-- ============================================================
-- 3. SAVED ADDRESSES (used by Checkout.tsx)
-- ============================================================
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

CREATE INDEX IF NOT EXISTS idx_addresses_user ON public.addresses(user_id);

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "addresses_own" ON public.addresses;
CREATE POLICY "addresses_own" ON public.addresses FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- 4. B2B SUPPLIER APPLICATIONS (used by B2B.tsx supplier form)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.b2b_supplier_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    mobile TEXT NOT NULL,
    gst_number TEXT,
    email TEXT,
    location TEXT,
    category TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.b2b_supplier_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "b2bsa_insert" ON public.b2b_supplier_applications;
CREATE POLICY "b2bsa_insert" ON public.b2b_supplier_applications FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "b2bsa_admin" ON public.b2b_supplier_applications;
CREATE POLICY "b2bsa_admin" ON public.b2b_supplier_applications FOR ALL USING (public.is_admin());

-- ============================================================
-- 5. REFERRAL ANALYTICS (used by Dashboard.tsx for ad clicks)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.referral_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    referrer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    click_type TEXT DEFAULT 'ad_click',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ref_analytics_seller ON public.referral_analytics(seller_id);

ALTER TABLE public.referral_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ra_own" ON public.referral_analytics;
CREATE POLICY "ra_own" ON public.referral_analytics FOR SELECT USING (auth.uid() = seller_id);
DROP POLICY IF EXISTS "ra_insert" ON public.referral_analytics;
CREATE POLICY "ra_insert" ON public.referral_analytics FOR INSERT WITH CHECK (true);

-- ============================================================
-- 6. MISSING COLUMNS ON WALLETS (pending_balance)
-- ============================================================
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS pending_balance DECIMAL(10,2) DEFAULT 0;

-- ============================================================
-- 7. MISSING COLUMNS ON ORDERS (razorpay_order_id, coupon_code)
-- ============================================================
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;

-- ============================================================
-- 8. MISSING COLUMN ON SHIPPING METHODS (cost alias)
-- ============================================================
-- The Checkout.tsx uses `cost` but schema has `base_cost`
-- Add `cost` column that mirrors base_cost for compatibility
ALTER TABLE public.shipping_methods ADD COLUMN IF NOT EXISTS cost DECIMAL DEFAULT 0;
UPDATE public.shipping_methods SET cost = base_cost WHERE cost = 0 OR cost IS NULL;

-- ============================================================
-- 9. RPC: validate_order_total (used by store.ts C-02)
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_order_total(
    p_cart JSONB,
    p_claimed_total DECIMAL
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_actual_total DECIMAL := 0;
    v_item RECORD;
    v_price DECIMAL;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_cart) AS x(id UUID, qty INTEGER)
    LOOP
        SELECT price INTO v_price FROM public.products
        WHERE id = v_item.id AND is_active = true;
        
        IF v_price IS NULL THEN
            RETURN FALSE; -- Product not found or inactive
        END IF;
        
        v_actual_total := v_actual_total + (v_price * v_item.qty);
    END LOOP;
    
    -- Allow 1% tolerance for rounding
    RETURN ABS(v_actual_total - p_claimed_total) <= GREATEST(v_actual_total * 0.01, 1);
END;
$$;

-- ============================================================
-- 10. RPC: check_stock (used by store.ts C-08)
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_stock(items JSONB)
RETURNS TABLE(product_id UUID, available INTEGER, requested INTEGER) 
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id AS product_id,
        p.stock_quantity AS available,
        (i->>'qty')::INTEGER AS requested
    FROM jsonb_array_elements(items) AS i
    JOIN public.products p ON p.id = (i->>'id')::UUID
    WHERE p.stock_quantity < (i->>'qty')::INTEGER;
END;
$$;

-- ============================================================
-- 11. RPC: validate_coupon (used by Checkout.tsx)
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_coupon(
    p_code TEXT,
    p_subtotal DECIMAL DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    code TEXT,
    discount DECIMAL,
    coupon_type TEXT,
    min_order DECIMAL
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_coupon RECORD;
    v_discount DECIMAL;
BEGIN
    SELECT * INTO v_coupon FROM public.coupons c
    WHERE c.code = p_code AND c.is_active = true
    AND (c.expiry IS NULL OR c.expiry > now())
    AND (c.max_uses IS NULL OR c.uses < c.max_uses);
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired coupon code';
    END IF;
    
    IF p_subtotal < COALESCE(v_coupon.min_order, 0) THEN
        RAISE EXCEPTION 'Minimum order of ₹% required', v_coupon.min_order;
    END IF;
    
    v_discount := CASE 
        WHEN v_coupon.type = 'flat' THEN v_coupon.value
        ELSE ROUND(p_subtotal * v_coupon.value / 100, 2)
    END;
    
    RETURN QUERY SELECT v_coupon.id, v_coupon.code, v_discount, v_coupon.type::TEXT, v_coupon.min_order;
END;
$$;

-- ============================================================
-- 12. MISSING: campaigns.commission column (Dashboard reads it)
-- ============================================================
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS commission TEXT;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS applicants INTEGER DEFAULT 0;

-- ============================================================
-- 13. MISSING: rate_limits identifier+action (check-rate-limit.js uses these)
-- ============================================================
ALTER TABLE public.rate_limits ADD COLUMN IF NOT EXISTS identifier TEXT;
ALTER TABLE public.rate_limits ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;
ALTER TABLE public.rate_limits ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- Add unique constraint for upsert
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'rate_limits_identifier_action_key'
    ) THEN
        -- Only create if unique constraint doesn't exist
        BEGIN
            ALTER TABLE public.rate_limits ADD CONSTRAINT rate_limits_identifier_action_key UNIQUE (identifier, action);
        EXCEPTION WHEN duplicate_table THEN NULL;
        END;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_rl_identifier_action ON public.rate_limits(identifier, action);

-- ============================================================
-- 14. Wallet & B2B RPCs
-- ============================================================
CREATE OR REPLACE FUNCTION public.credit_wallet(p_user_id UUID, p_amount DECIMAL, p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.wallet_transactions (user_id, amount, reason, type)
    VALUES (p_user_id, p_amount, p_reason, CASE WHEN p_amount >= 0 THEN 'credit' ELSE 'debit' END);
    
    INSERT INTO public.wallets (user_id, balance)
    VALUES (p_user_id, p_amount)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        balance = wallets.balance + p_amount,
        updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.deduct_wallet_balance(p_user_id UUID, p_amount DECIMAL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF (SELECT balance FROM public.wallets WHERE user_id = p_user_id) < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    UPDATE public.wallets 
    SET balance = balance - p_amount, updated_at = NOW()
    WHERE user_id = p_user_id;

    INSERT INTO public.wallet_transactions (user_id, amount, reason, type)
    VALUES (p_user_id, p_amount, 'lead_unlock_fee', 'debit');
END;
$$;

CREATE OR REPLACE FUNCTION public.deduct_lead_credit(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF (SELECT remaining_leads FROM public.sellers WHERE id = p_user_id) <= 0 THEN
        RAISE EXCEPTION 'No lead credits remaining';
    END IF;

    UPDATE public.sellers 
    SET remaining_leads = remaining_leads - 1
    WHERE id = p_user_id;
END;
$$;

-- ============================================================
-- 15. Affiliate Stats
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_referral_clicks(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.affiliate_stats (user_id, clicks)
    VALUES (p_user_id, 1)
    ON CONFLICT (user_id) 
    DO UPDATE SET clicks = affiliate_stats.clicks + 1;
END;
$$;

-- ============================================================
-- 16. Cleanup Utilities
-- ============================================================
CREATE OR REPLACE FUNCTION public.clean_expired_otps()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE deleted_count INTEGER;
BEGIN
    DELETE FROM public.cod_otps WHERE expires_at < now();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- ============================================================
-- DONE
-- ============================================================
-- Run this SQL in Supabase SQL Editor after supabase_schema.sql
-- All statements are idempotent and safe to re-run
