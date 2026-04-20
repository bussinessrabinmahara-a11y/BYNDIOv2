-- C-03: Wallet Credit RPC
CREATE OR REPLACE FUNCTION credit_wallet(p_user_id UUID, p_amount NUMERIC, p_reason TEXT) 
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$ 
BEGIN 
  UPDATE wallets SET balance = balance + p_amount WHERE user_id = p_user_id; 
  INSERT INTO wallet_transactions(user_id, amount, reason) VALUES(p_user_id, p_amount, p_reason); 
END; 
$$;

-- C-04: Prevent Role Escalation
DROP POLICY IF EXISTS users_own_update ON users;

CREATE POLICY users_own_update ON users 
FOR UPDATE 
USING (auth.uid() = id) 
WITH CHECK (role = (SELECT role FROM users WHERE id = auth.uid()));

CREATE OR REPLACE FUNCTION prevent_role_change() 
RETURNS TRIGGER 
LANGUAGE plpgsql 
AS $$ 
BEGIN 
  IF NEW.role != OLD.role AND NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') THEN 
    RAISE EXCEPTION 'Role change not permitted'; 
  END IF; 
  RETURN NEW; 
END; 
$$;

DROP TRIGGER IF EXISTS enforce_role_immutable ON users;
CREATE TRIGGER enforce_role_immutable 
BEFORE UPDATE ON users 
FOR EACH ROW 
EXECUTE FUNCTION prevent_role_change();

-- C-08: Stock Validation with FOR UPDATE
CREATE OR REPLACE FUNCTION deduct_stock() 
RETURNS TRIGGER 
LANGUAGE plpgsql 
AS $$
DECLARE v_stock INT;
BEGIN
  SELECT stock_quantity INTO v_stock FROM products WHERE id = NEW.product_id FOR UPDATE;
  IF v_stock < NEW.quantity THEN
    RAISE EXCEPTION 'Insufficient stock for product %', NEW.product_id;
  END IF;
  UPDATE products SET stock_quantity = stock_quantity - NEW.quantity WHERE id = NEW.product_id;
  RETURN NEW;
END; 
$$;

-- C-11: Seller Update Orders Policy
DROP POLICY IF EXISTS seller_update_own_orders ON orders;
CREATE POLICY seller_update_own_orders ON orders 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM order_items 
    WHERE order_items.order_id = orders.id 
    AND order_items.seller_id = auth.uid()
  )
);

-- M-19: Support Role Policies
DROP POLICY IF EXISTS support_view_users ON users;
CREATE POLICY support_view_users ON users 
FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'support'))
);

DROP POLICY IF EXISTS support_view_orders ON orders;
CREATE POLICY support_view_orders ON orders 
FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'support'))
);

-- C-07: Rate Limits Table
CREATE TABLE IF NOT EXISTS rate_limits (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, identifier TEXT NOT NULL, action TEXT NOT NULL, attempts INT DEFAULT 0, locked_until TIMESTAMPTZ, updated_at TIMESTAMPTZ DEFAULT now(), UNIQUE(identifier, action));
