-- C-03 | Secure Wallet Credit System
-- This function is SECURITY DEFINER and restricted to service_role only.

CREATE OR REPLACE FUNCTION public.credit_wallet(
  p_user_id UUID,
  p_amount NUMERIC,
  p_description TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Validate Amount
  IF p_amount = 0 THEN
    RAISE EXCEPTION 'Transaction amount cannot be zero';
  END IF;

  -- 2. Validate User Existence
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User % not found', p_user_id;
  END IF;

  -- 3. Perform Update
  UPDATE public.wallets 
  SET balance = balance + p_amount 
  WHERE user_id = p_user_id;

  -- 4. Log Transaction
  INSERT INTO public.wallet_transactions (user_id, amount, description)
  VALUES (p_user_id, p_amount, p_description);
END;
$$;

-- REVOKE access from public and authenticated roles to prevent client-side abuse
REVOKE ALL ON FUNCTION public.credit_wallet(UUID, NUMERIC, TEXT) FROM public;
REVOKE ALL ON FUNCTION public.credit_wallet(UUID, NUMERIC, TEXT) FROM authenticated;
REVOKE ALL ON FUNCTION public.credit_wallet(UUID, NUMERIC, TEXT) FROM anon;

-- GRANT access only to service_role (used by Netlify functions)
GRANT EXECUTE ON FUNCTION public.credit_wallet(UUID, NUMERIC, TEXT) TO service_role;
