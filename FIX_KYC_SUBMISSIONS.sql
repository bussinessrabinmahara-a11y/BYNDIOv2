-- Create the missing kyc_submissions table
CREATE TABLE IF NOT EXISTS public.kyc_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    dob DATE,
    pan_number TEXT,
    aadhaar_number TEXT,
    gst_number TEXT,
    bank_account TEXT,
    ifsc_code TEXT,
    bank_name TEXT,
    address TEXT,
    pincode TEXT,
    state TEXT,
    pan_doc_url TEXT,
    aadhaar_doc_url TEXT,
    gst_doc_url TEXT,
    selfie_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    rejection_reason TEXT,
    submitted_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL,
    reviewed_at TIMESTAMPTZ
);

-- Enable RLS for kyc_submissions
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist to make script idempotent
DROP POLICY IF EXISTS "Users can manage own kyc" ON public.kyc_submissions;
DROP POLICY IF EXISTS "Admin can view all kyc" ON public.kyc_submissions;
DROP POLICY IF EXISTS "Admin can update all kyc" ON public.kyc_submissions;

-- Create policies
CREATE POLICY "Users can manage own kyc" ON public.kyc_submissions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admin can view all kyc" ON public.kyc_submissions FOR SELECT USING (public.is_admin());
CREATE POLICY "Admin can update all kyc" ON public.kyc_submissions FOR UPDATE USING (public.is_admin());

-- Reload schema cache helper
NOTIFY pgrst, 'reload schema';
