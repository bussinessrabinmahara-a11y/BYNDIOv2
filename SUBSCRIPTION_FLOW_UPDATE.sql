
-- ===========================================================================
-- BYNDIO Subscription Flow Improvements
-- Adds support for manual payment verification and dedicated checkout flow
-- ===========================================================================

-- 1. Create subscription_requests table for pending manual payments
CREATE TABLE IF NOT EXISTS public.subscription_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    plan_name TEXT NOT NULL,
    plan_role TEXT NOT NULL CHECK (plan_role IN ('seller', 'influencer')),
    amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT NOT NULL, -- 'razorpay', 'upi_manual', 'bank_transfer'
    payment_proof_url TEXT, -- Screenshot URL for manual payments
    transaction_id TEXT, -- User-entered transaction ID for manual payments
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.subscription_requests ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "Users can view own requests" ON public.subscription_requests;
CREATE POLICY "Users can view own requests" ON public.subscription_requests FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own requests" ON public.subscription_requests;
CREATE POLICY "Users can create own requests" ON public.subscription_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all requests" ON public.subscription_requests;
CREATE POLICY "Admins can view all requests" ON public.subscription_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admins can update all requests" ON public.subscription_requests;
CREATE POLICY "Admins can update all requests" ON public.subscription_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- 4. Function to approve subscription request
CREATE OR REPLACE FUNCTION public.approve_subscription_request(request_id UUID, admin_id UUID, notes TEXT)
RETURNS VOID AS $$
DECLARE
    req RECORD;
BEGIN
    -- Get request data
    SELECT * INTO req FROM public.subscription_requests WHERE id = request_id;
    
    IF req.id IS NULL THEN
        RAISE EXCEPTION 'Request not found';
    END IF;
    
    IF req.status != 'pending' THEN
        RAISE EXCEPTION 'Request is already processed';
    END IF;

    -- Update request status
    UPDATE public.subscription_requests 
    SET status = 'approved', admin_notes = notes, updated_at = now()
    WHERE id = request_id;

    -- Create/Update active subscription
    INSERT INTO public.subscriptions (user_id, plan_name, plan_role, status, price, amount, payment_method, payment_id)
    VALUES (req.user_id, req.plan_name, req.plan_role, 'active', req.amount, req.amount, req.payment_method, req.transaction_id)
    ON CONFLICT (user_id) DO UPDATE SET
        plan_name = EXCLUDED.plan_name,
        plan_role = EXCLUDED.plan_role,
        status = 'active',
        price = EXCLUDED.price,
        amount = EXCLUDED.amount,
        payment_method = EXCLUDED.payment_method,
        payment_id = EXCLUDED.payment_id,
        started_at = now();

    -- (The sync_user_subscription trigger on 'subscriptions' table will handle the rest: 
    -- updating user role, plan, and recording revenue)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
