-- ===========================================================================
-- BYNDIO AUTH RATE LIMITING SYSTEM
-- Run this in the Supabase SQL Editor
-- ===========================================================================

-- 1. Create table to track attempts
CREATE TABLE IF NOT EXISTS public.login_attempts (
    email TEXT PRIMARY KEY,
    attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_attempt TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Security First)
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage everything
CREATE POLICY "Service role full access" ON public.login_attempts 
FOR ALL TO service_role USING (true);

-- Allow public to only check status (via functions)
-- Note: Functions below are SECURITY DEFINER to bypass RLS safely

-- 2. Function to record a failed attempt and return the new status
CREATE OR REPLACE FUNCTION public.record_login_attempt(p_email TEXT)
RETURNS JSONB AS $$
DECLARE
    v_attempts INTEGER;
    v_locked_until TIMESTAMPTZ;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    INSERT INTO public.login_attempts (email, attempts, last_attempt)
    VALUES (p_email, 1, v_now)
    ON CONFLICT (email) DO UPDATE
    SET 
        attempts = login_attempts.attempts + 1,
        last_attempt = v_now
    RETURNING attempts INTO v_attempts;

    IF v_attempts >= 5 THEN
        v_locked_until := v_now + INTERVAL '1 minute';
        UPDATE public.login_attempts 
        SET locked_until = v_locked_until 
        WHERE email = p_email;
    END IF;

    RETURN jsonb_build_object(
        'attempts', v_attempts,
        'locked_until', v_locked_until
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to reset attempts on successful login
CREATE OR REPLACE FUNCTION public.reset_login_attempts(p_email TEXT)
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.login_attempts WHERE email = p_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to check if an email is currently locked
CREATE OR REPLACE FUNCTION public.check_login_status(p_email TEXT)
RETURNS JSONB AS $$
DECLARE
    v_attempts INTEGER;
    v_locked_until TIMESTAMPTZ;
BEGIN
    SELECT attempts, locked_until INTO v_attempts, v_locked_until
    FROM public.login_attempts
    WHERE email = p_email;

    -- Lock still active
    IF v_locked_until IS NOT NULL AND v_locked_until > NOW() THEN
        RETURN jsonb_build_object(
            'locked', true, 
            'remaining_seconds', ceil(extract(epoch from (v_locked_until - NOW()))), 
            'attempts', v_attempts
        );
    ELSE
        -- If lock expired, reset attempts
        IF v_locked_until IS NOT NULL THEN
            UPDATE public.login_attempts SET locked_until = NULL, attempts = 0 WHERE email = p_email;
            v_attempts := 0;
        END IF;
        
        RETURN jsonb_build_object(
            'locked', false, 
            'attempts', coalesce(v_attempts, 0)
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
