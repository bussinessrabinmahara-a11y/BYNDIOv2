-- ===========================================================================
-- BYNDIO Subscription System Update
-- Adds the missing 'subscriptions' table and improves existing schemas
-- ===========================================================================

-- 1. Create Subscriptions table for tracking active user plans
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    plan_name TEXT NOT NULL,
    plan_role TEXT NOT NULL CHECK (plan_role IN ('seller', 'influencer')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_method TEXT,
    payment_id TEXT,
    started_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL,
    UNIQUE(user_id)
);

-- 2. Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can do everything" ON public.subscriptions;
CREATE POLICY "Service role can do everything" ON public.subscriptions FOR ALL USING (true);

-- 4. Update users table with plan info if not exists (already exists in PRODUCTION_DATABASE.sql)
-- But let's ensure the columns are there
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='subscription_plan') THEN
        ALTER TABLE public.users ADD COLUMN subscription_plan TEXT DEFAULT 'free';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='subscription_expires_at') THEN
        ALTER TABLE public.users ADD COLUMN subscription_expires_at TIMESTAMPTZ;
    END IF;
END $$;

-- 5. Add platform revenue tracking for subscriptions
-- (Already exists in REVENUE_MODEL_SCHEMA.sql, but ensuring here)
CREATE TABLE IF NOT EXISTS public.platform_revenue (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    source TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    user_id UUID REFERENCES public.users(id),
    reference_id TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL
);

-- 6. Trigger to sync subscription from 'subscriptions' table to 'users' table
CREATE OR REPLACE FUNCTION public.sync_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.users 
    SET 
        subscription_plan = LOWER(NEW.plan_name),
        subscription_expires_at = NEW.expires_at,
        role = CASE 
            WHEN role = 'admin' THEN 'admin' 
            ELSE NEW.plan_role 
        END
    WHERE id = NEW.user_id;
    
    -- If it's a seller plan, also sync to sellers table
    IF NEW.plan_role = 'seller' THEN
        INSERT INTO public.sellers (id, business_name, subscription_plan)
        VALUES (NEW.user_id, 'New Store', LOWER(NEW.plan_name))
        ON CONFLICT (id) DO UPDATE SET subscription_plan = LOWER(NEW.plan_name);
    END IF;

    -- Record revenue
    INSERT INTO public.platform_revenue (source, amount, user_id, reference_id, description)
    VALUES ('subscription', NEW.amount, NEW.user_id, NEW.payment_id, 'Subscription: ' || NEW.plan_name);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_subscription_updated ON public.subscriptions;
CREATE TRIGGER on_subscription_updated
AFTER INSERT OR UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.sync_user_subscription();
