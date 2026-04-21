-- FIX: Add missing RLS policies for products table
-- This ensures sellers can view and manage their own products,
-- and buyers can view active, approved products.

-- 1. Ensure RLS is enabled
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
DROP POLICY IF EXISTS "Sellers can manage own products" ON public.products;
DROP POLICY IF EXISTS "Admin can manage all products" ON public.products;

-- 3. Policy: Public can view active and approved products
CREATE POLICY "Anyone can view active products" ON public.products
FOR SELECT USING (is_active = true AND approval_status = 'approved');

-- 4. Policy: Sellers can do EVERYTHING with their own products
-- This includes viewing even if inactive/pending
CREATE POLICY "Sellers can manage own products" ON public.products
FOR ALL USING (auth.uid() = seller_id);

-- 5. Policy: Admins can do EVERYTHING
CREATE POLICY "Admin can manage all products" ON public.products
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- 6. Reload schema cache
NOTIFY pgrst, 'reload schema';
