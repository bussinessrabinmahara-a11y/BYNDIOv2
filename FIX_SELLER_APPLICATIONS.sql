-- Fix for missing columns in seller_applications table
DO $$ 
BEGIN 
    -- Add business_state if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='seller_applications' AND column_name='business_state') THEN
        ALTER TABLE public.seller_applications ADD COLUMN business_state TEXT;
    END IF;

    -- Add state if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='seller_applications' AND column_name='state') THEN
        ALTER TABLE public.seller_applications ADD COLUMN state TEXT;
    END IF;

    -- Add aadhaar_number if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='seller_applications' AND column_name='aadhaar_number') THEN
        ALTER TABLE public.seller_applications ADD COLUMN aadhaar_number TEXT;
    END IF;

    -- Add role if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='seller_applications' AND column_name='role') THEN
        ALTER TABLE public.seller_applications ADD COLUMN role TEXT DEFAULT 'seller';
    END IF;
END $$;

-- Enable RLS if not already enabled
ALTER TABLE public.seller_applications ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to ensure they are correct
DROP POLICY IF EXISTS "Anyone can apply" ON public.seller_applications;
DROP POLICY IF EXISTS "Admin can view all applications" ON public.seller_applications;

CREATE POLICY "Anyone can apply" ON public.seller_applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can view all applications" ON public.seller_applications FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
