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


-- SEED DATA
INSERT INTO public.shipping_methods (name, description, base_cost, cost, min_days, max_days)
VALUES ('Standard Delivery', 'Economical surface shipping', 40, 40, 5, 10) ON CONFLICT (id) DO NOTHING;

-- DONE
