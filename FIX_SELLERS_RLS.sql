-- FIX: Add missing RLS policies for sellers table to ensure Admin can see submissions
-- and Sellers can update their own records.

-- 1. Ensure RLS is enabled
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Sellers can view own record" ON public.sellers;
DROP POLICY IF EXISTS "Sellers can update own record" ON public.sellers;
DROP POLICY IF EXISTS "Admin can view all sellers" ON public.sellers;
DROP POLICY IF EXISTS "Admin can update all sellers" ON public.sellers;

-- 3. Create policies for Sellers
CREATE POLICY "Sellers can view own record" ON public.sellers 
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Sellers can update own record" ON public.sellers 
FOR UPDATE USING (auth.uid() = id);

-- 4. Create policies for Admins
CREATE POLICY "Admin can view all sellers" ON public.sellers 
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin can update all sellers" ON public.sellers 
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- 5. Policy for joined selects (allow reading users table for Admin)
-- This might already exist but let's ensure it.
DROP POLICY IF EXISTS "Admin can view all users" ON public.users;
CREATE POLICY "Admin can view all users" ON public.users 
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- 6. Reload schema cache
NOTIFY pgrst, 'reload schema';
