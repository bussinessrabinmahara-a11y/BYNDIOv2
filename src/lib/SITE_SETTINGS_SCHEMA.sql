-- ===========================================================================
-- SITE SETTINGS TABLE SCHEMA
-- Run this in your Supabase SQL Editor to support dynamic contact info
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.site_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    hero_title TEXT DEFAULT 'Shop Beyond Ordinary',
    hero_subtitle TEXT DEFAULT 'India''s 0% commission marketplace for creators and brands.',
    footer_about TEXT DEFAULT 'India''s 0% commission social commerce ecosystem.',
    contact_email TEXT DEFAULT 'support@byndio.in',
    contact_phone TEXT DEFAULT '1800-BYNDIO',
    contact_address TEXT DEFAULT 'Mumbai, Maharashtra, India',
    whatsapp_number TEXT,
    twitter_url TEXT,
    instagram_url TEXT,
    facebook_url TEXT,
    youtube_url TEXT,
    platform_fee NUMERIC DEFAULT 0,
    standard_shipping_fee NUMERIC DEFAULT 40,
    free_shipping_threshold NUMERIC DEFAULT 999,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure only one row exists
INSERT INTO public.site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- RLS POLICIES
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can view settings
CREATE POLICY "Public View Settings" ON public.site_settings
    FOR SELECT USING (true);

-- Only admins can update settings
CREATE POLICY "Admin Update Settings" ON public.site_settings
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admin Insert Settings" ON public.site_settings
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );
