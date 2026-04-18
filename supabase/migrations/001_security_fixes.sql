-- BLOCK 1 — Role Escalation Prevention (C-04)
DROP POLICY IF EXISTS users_own_update ON users;

CREATE POLICY users_own_update ON users
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (role = (SELECT role FROM users WHERE id = auth.uid()));

CREATE OR REPLACE FUNCTION prevent_role_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.role != OLD.role AND NOT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Role change not permitted';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS enforce_role_immutable ON users;
CREATE TRIGGER enforce_role_immutable
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION prevent_role_change();

-- BLOCK 2 — Stock Validation with Row Locking (C-08)
CREATE OR REPLACE FUNCTION deduct_stock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_stock INT;
BEGIN
  SELECT stock_quantity INTO v_stock
  FROM products WHERE id = NEW.product_id FOR UPDATE;
  IF v_stock < NEW.quantity THEN
    RAISE EXCEPTION 'Insufficient stock for product %', NEW.product_id;
  END IF;
  UPDATE products
  SET stock_quantity = stock_quantity - NEW.quantity
  WHERE id = NEW.product_id;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trigger_deduct_stock ON order_items;
CREATE TRIGGER trigger_deduct_stock
BEFORE INSERT ON order_items
FOR EACH ROW EXECUTE FUNCTION deduct_stock();

CREATE OR REPLACE FUNCTION check_stock(items JSONB)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  item JSONB;
  out_of_stock JSONB := '[]';
  v_stock INT;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(items) LOOP
    SELECT stock_quantity INTO v_stock
    FROM products WHERE id = (item->>'product_id')::UUID;
    IF v_stock < (item->>'quantity')::INT THEN
      out_of_stock := out_of_stock || item;
    END IF;
  END LOOP;
  RETURN out_of_stock;
END; $$;

-- BLOCK 3 — Wallet Security (C-03)
CREATE OR REPLACE FUNCTION credit_wallet(
  p_user_id UUID,
  p_amount NUMERIC,
  p_reason TEXT
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  UPDATE wallets
  SET balance = balance + p_amount
  WHERE user_id = p_user_id;
  INSERT INTO wallet_transactions(user_id, amount, reason, created_at)
  VALUES(p_user_id, p_amount, p_reason, now());
END; $$;

REVOKE ALL ON FUNCTION credit_wallet FROM PUBLIC;
GRANT EXECUTE ON FUNCTION credit_wallet TO service_role;

-- BLOCK 4 — Seller Order Update Protection (C-11)
DROP POLICY IF EXISTS seller_update_own_orders ON orders;

CREATE POLICY seller_update_own_orders ON orders
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM order_items
    WHERE order_items.order_id = orders.id
    AND order_items.seller_id = auth.uid()
  )
);

-- BLOCK 5 — Rate Limiting Table (C-07, C-09)
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL,
  action TEXT NOT NULL,
  attempts INT DEFAULT 0,
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(identifier, action)
);

CREATE INDEX IF NOT EXISTS rate_limits_identifier_action
ON rate_limits(identifier, action);

-- BLOCK 6 — Seller Approval (M-11)
ALTER TABLE seller_profiles
ADD COLUMN IF NOT EXISTS approval_status TEXT
DEFAULT 'pending'
CHECK (approval_status IN ('pending', 'approved', 'rejected'));

DROP POLICY IF EXISTS sellers_insert_products ON products;
CREATE POLICY sellers_insert_products ON products
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM seller_profiles
    WHERE seller_profiles.user_id = auth.uid()
    AND seller_profiles.approval_status = 'approved'
  )
);

-- BLOCK 7 — Product Approval (H-09)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS approval_status TEXT
DEFAULT 'pending'
CHECK (approval_status IN ('pending', 'approved', 'rejected'));

UPDATE products SET approval_status = 'approved' WHERE is_active = true;

-- BLOCK 8 — Referral Click Tracking (M-18)
CREATE OR REPLACE FUNCTION increment_referral_clicks(p_referral_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE referrals
  SET clicks = clicks + 1
  WHERE id = p_referral_id;
END; $$;

-- BLOCK 9 — Delivery Dates from Shipping Methods (H-13 TODO)
ALTER TABLE shipping_methods
ADD COLUMN IF NOT EXISTS min_days INT DEFAULT 3,
ADD COLUMN IF NOT EXISTS max_days INT DEFAULT 7;
