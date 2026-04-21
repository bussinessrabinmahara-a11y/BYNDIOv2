-- ===========================================================================
-- BYNDIO Influencer Revenue Model (Phase-wise)
-- Phase 1: Growth (0-1000 Influencers)
-- Phase 2: Monetization (1000-10,000 Influencers)
-- Phase 3: Scale (10,000+ Influencers)
-- ===========================================================================

-- 1. Extend site_settings to track current phase
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS influencer_phase INTEGER DEFAULT 1;

-- 2. Influencer Revenue Tiers Configuration
CREATE TABLE IF NOT EXISTS public.influencer_revenue_tiers (
    phase INTEGER PRIMARY KEY,
    platform_commission_pct DECIMAL(5,2) DEFAULT 0,
    influencer_share_pct DECIMAL(5,2) DEFAULT 20,
    brand_collab_fee_pct DECIMAL(5,2) DEFAULT 5,
    min_influencers INTEGER,
    has_subscriptions BOOLEAN DEFAULT false,
    has_paid_badges BOOLEAN DEFAULT false,
    has_featured_fee BOOLEAN DEFAULT false
);

-- Seed Phase Data
INSERT INTO public.influencer_revenue_tiers (phase, platform_commission_pct, influencer_share_pct, brand_collab_fee_pct, min_influencers, has_subscriptions, has_paid_badges, has_featured_fee)
VALUES
  (1, 1.00, 20.00, 7.50, 0, false, false, false), -- Growth
  (2, 4.00, 15.00, 15.00, 1000, false, true, true), -- Monetization
  (3, 7.50, 10.00, 20.00, 10000, true, true, true)  -- Scale
ON CONFLICT (phase) DO UPDATE SET
  platform_commission_pct = EXCLUDED.platform_commission_pct,
  influencer_share_pct = EXCLUDED.influencer_share_pct,
  brand_collab_fee_pct = EXCLUDED.brand_collab_fee_pct;

-- 3. Influencer Specific Fields
ALTER TABLE public.influencers ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE public.influencers ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ;
ALTER TABLE public.influencers ADD COLUMN IF NOT EXISTS visibility_boost BOOLEAN DEFAULT true;
ALTER TABLE public.influencers ADD COLUMN IF NOT EXISTS storefront_fee_paid BOOLEAN DEFAULT true;

-- 4. Brand Collaborations Table
CREATE TABLE IF NOT EXISTS public.brand_collaborations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    brand_id UUID REFERENCES public.users(id) NOT NULL,
    influencer_id UUID REFERENCES public.users(id) NOT NULL,
    campaign_name TEXT NOT NULL,
    contract_amount DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
    payment_status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT timezone('utc',now()) NOT NULL
);

-- 5. FUNCTION: Calculate Influencer Commissions based on Phase
CREATE OR REPLACE FUNCTION public.calculate_influencer_payouts()
RETURNS TRIGGER AS $$
DECLARE
    curr_phase INTEGER;
    tier RECORD;
    v_platform_fee DECIMAL(10,2);
    v_influencer_payout DECIMAL(10,2);
BEGIN
    -- Get current phase from site_settings
    SELECT influencer_phase INTO curr_phase FROM public.site_settings WHERE id = 1;
    
    -- Get rates for current phase
    SELECT * INTO tier FROM public.influencer_revenue_tiers WHERE phase = curr_phase;
    
    -- Only apply if there is an influencer attached to the order item
    IF NEW.creator_id IS NOT NULL THEN
        -- Platform takes its cut based on phase
        v_platform_fee := (NEW.price * NEW.quantity) * (tier.platform_commission_pct / 100);
        
        -- Influencer gets their share
        v_influencer_payout := (NEW.price * NEW.quantity) * (tier.influencer_share_pct / 100);
        
        -- Update the record with calculated shares
        NEW.platform_commission := v_platform_fee;
        NEW.creator_share := v_influencer_payout;
        
        -- Log revenue source
        INSERT INTO public.platform_revenue (source, amount, user_id, reference_id, description)
        VALUES ('affiliate_cut', v_platform_fee, NEW.creator_id, NEW.id::text, 'Influencer commission cut - Phase ' || curr_phase);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. TRIGGER for Order Item Commission calculation
DROP TRIGGER IF EXISTS trg_calculate_influencer_payouts ON public.order_items;
CREATE TRIGGER trg_calculate_influencer_payouts
    BEFORE INSERT ON public.order_items
    FOR EACH ROW EXECUTE FUNCTION public.calculate_influencer_payouts();

-- 7. RPC to update Platform Phase automatically based on influencer count
CREATE OR REPLACE FUNCTION public.auto_update_platform_phase()
RETURNS VOID AS $$
DECLARE
    creator_count INTEGER;
    new_phase INTEGER := 1;
BEGIN
    SELECT COUNT(*) INTO creator_count FROM public.influencers;
    
    IF creator_count >= 10000 THEN
        new_phase := 3;
    ELSIF creator_count >= 1000 THEN
        new_phase := 2;
    ELSE
        new_phase := 1;
    END IF;
    
    UPDATE public.site_settings SET influencer_phase = new_phase WHERE id = 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS for new tables
ALTER TABLE public.influencer_revenue_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_collaborations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tiers" ON public.influencer_revenue_tiers FOR SELECT USING (true);
CREATE POLICY "Influencers can read own collaborations" ON public.brand_collaborations FOR SELECT USING (auth.uid() = influencer_id OR auth.uid() = brand_id);
CREATE POLICY "Admins can manage collaborations" ON public.brand_collaborations FOR ALL USING (public.is_admin());
