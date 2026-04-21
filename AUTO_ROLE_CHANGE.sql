-- 1. Add user_id column to seller_applications to link it to the users table
ALTER TABLE public.seller_applications ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

-- 2. Create the function that will automatically change the user role upon approval
CREATE OR REPLACE FUNCTION public.handle_application_approval()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if status is changing to 'approved'
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        -- Update the user's role based on the role requested in the application
        -- We handle 'seller' and 'influencer' specifically
        UPDATE public.users 
        SET role = COALESCE(NEW.role, 'seller') -- Default to seller if role is null
        WHERE id = NEW.user_id;
        
        -- Also ensure the specific table entry exists (sellers or influencers)
        IF NEW.role = 'seller' THEN
            INSERT INTO public.sellers (id, business_name, email, phone)
            VALUES (NEW.user_id, NEW.business_name, NEW.email, NEW.phone)
            ON CONFLICT (id) DO NOTHING;
        ELSIF NEW.role = 'influencer' THEN
            INSERT INTO public.influencers (id, full_name, email)
            VALUES (NEW.user_id, NEW.full_name, NEW.email)
            ON CONFLICT (id) DO NOTHING;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger
DROP TRIGGER IF EXISTS on_application_approved ON public.seller_applications;
CREATE TRIGGER on_application_approved
AFTER UPDATE ON public.seller_applications
FOR EACH ROW
EXECUTE FUNCTION public.handle_application_approval();

-- 4. Notify to reload schema
NOTIFY pgrst, 'reload schema';
