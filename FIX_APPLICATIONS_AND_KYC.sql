-- ===========================================================================
-- BYNDIO APPLICATIONS & KYC SCHEMA FIX (IDEMPOTENT VERSION)
-- Fixes missing user_id columns and RLS policies
-- ===========================================================================

-- 0. ENSURE ADMIN HELPER FUNCTION
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END; $$;

-- 1. FIX SELLER APPLICATIONS
ALTER TABLE public.seller_applications ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_seller_apps_user_id ON public.seller_applications(user_id);

-- 2. FIX INFLUENCER APPLICATIONS
CREATE TABLE IF NOT EXISTS public.influencer_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    instagram_handle TEXT,
    youtube_channel TEXT,
    followers_count TEXT,
    category TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_influencer_apps_user_id ON public.influencer_applications(user_id);

-- 3. FIX AFFILIATE APPLICATIONS
CREATE TABLE IF NOT EXISTS public.affiliate_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    website TEXT,
    category TEXT,
    audience_size TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_affiliate_apps_user_id ON public.affiliate_applications(user_id);

-- 4. ENABLE RLS
ALTER TABLE public.seller_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES FOR APPLICATIONS

-- SELLER APPS
DROP POLICY IF EXISTS "Anyone can apply for seller" ON public.seller_applications;
CREATE POLICY "Anyone can apply for seller" ON public.seller_applications FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admin can view seller apps" ON public.seller_applications;
CREATE POLICY "Admin can view seller apps" ON public.seller_applications FOR SELECT USING (public.is_admin());

-- INFLUENCER APPS
DROP POLICY IF EXISTS "Anyone can apply for influencer" ON public.influencer_applications;
CREATE POLICY "Anyone can apply for influencer" ON public.influencer_applications FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admin can view influencer apps" ON public.influencer_applications;
CREATE POLICY "Admin can view influencer apps" ON public.influencer_applications FOR SELECT USING (public.is_admin());

-- AFFILIATE APPS
DROP POLICY IF EXISTS "Anyone can apply for affiliate" ON public.affiliate_applications;
CREATE POLICY "Anyone can apply for affiliate" ON public.affiliate_applications FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admin can view affiliate apps" ON public.affiliate_applications;
CREATE POLICY "Admin can view affiliate apps" ON public.affiliate_applications FOR SELECT USING (public.is_admin());

-- 6. RLS POLICIES FOR KYC
DROP POLICY IF EXISTS "Users can view own kyc" ON public.kyc_submissions;
CREATE POLICY "Users can view own kyc" ON public.kyc_submissions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own kyc" ON public.kyc_submissions;
CREATE POLICY "Users can insert own kyc" ON public.kyc_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own kyc" ON public.kyc_submissions;
CREATE POLICY "Users can update own kyc" ON public.kyc_submissions FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admin can view all kyc" ON public.kyc_submissions;
CREATE POLICY "Admin can view all kyc" ON public.kyc_submissions FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "Admin can update all kyc" ON public.kyc_submissions;
CREATE POLICY "Admin can update all kyc" ON public.kyc_submissions FOR UPDATE USING (public.is_admin());

-- 7. ENSURE ADMIN ROLE CAN VIEW USERS
DROP POLICY IF EXISTS "Public users are viewable by everyone" ON public.users;
CREATE POLICY "Public users are viewable by everyone" ON public.users FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
CREATE POLICY "Admins can manage all users" ON public.users FOR ALL USING (public.is_admin());
