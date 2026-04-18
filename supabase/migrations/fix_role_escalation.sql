-- C-04 | Admin Role Escalation -- Supabase SQL
-- Drop policy users_own_update
DROP POLICY IF EXISTS users_own_update ON public.users;

-- New policy: Users can update own profile EXCEPT role
-- We enforce this by using a policy that only allows updates to identity columns
-- and then using a trigger to catch any attempts to bypass via direct SQL
CREATE POLICY users_own_update ON public.users 
FOR UPDATE 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- Add trigger to prevent role change from client
CREATE OR REPLACE FUNCTION prevent_role_change() 
RETURNS TRIGGER AS $$
BEGIN
  -- If the role is being changed and it's not the service_role (Admin API)
  -- then revert the role to the old value.
  IF OLD.role IS DISTINCT FROM NEW.role AND (current_setting('role') <> 'service_role') THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_prevent_role_change ON public.users;
CREATE TRIGGER tr_prevent_role_change 
BEFORE UPDATE ON public.users 
FOR EACH ROW 
EXECUTE FUNCTION prevent_role_change();
