-- Subscriptions Schema for Tidywaro
-- Run this in Supabase SQL Editor

-- Subscription tiers enum
CREATE TYPE subscription_tier AS ENUM ('free', 'premium');

-- Subscription status enum  
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing', 'incomplete');

-- User subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Subscription tier
    tier subscription_tier NOT NULL DEFAULT 'free',
    status subscription_status NOT NULL DEFAULT 'active',
    
    -- Stripe references
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    stripe_price_id TEXT,
    
    -- Billing period
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMPTZ,
    
    -- Limits
    item_limit INTEGER NOT NULL DEFAULT 10, -- Free tier: 10 items
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one subscription per user
    CONSTRAINT unique_user_subscription UNIQUE (user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer ON user_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_subscription ON user_subscriptions(stripe_subscription_id);

-- Enable RLS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription"
    ON user_subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- Only service role can insert/update (through webhook)
CREATE POLICY "Service role can manage subscriptions"
    ON user_subscriptions FOR ALL
    USING (auth.role() = 'service_role');

-- Allow authenticated users to insert their own subscription (for initial creation)
CREATE POLICY "Users can create own subscription"
    ON user_subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Function to automatically create free subscription for new users
CREATE OR REPLACE FUNCTION create_free_subscription()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_subscriptions (user_id, tier, status, item_limit)
    VALUES (NEW.id, 'free', 'active', 10)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create subscription when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_free_subscription();

-- Create subscriptions for existing users who don't have one
INSERT INTO user_subscriptions (user_id, tier, status, item_limit)
SELECT id, 'free', 'active', 10
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_subscriptions)
ON CONFLICT (user_id) DO NOTHING;

-- Function to check if user can add more items
CREATE OR REPLACE FUNCTION can_add_wardrobe_item(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_item_limit INTEGER;
    v_current_count INTEGER;
    v_tier subscription_tier;
BEGIN
    -- Get user's subscription info
    SELECT tier, item_limit INTO v_tier, v_item_limit
    FROM user_subscriptions
    WHERE user_id = p_user_id;
    
    -- If no subscription found, create free tier
    IF v_item_limit IS NULL THEN
        INSERT INTO user_subscriptions (user_id, tier, status, item_limit)
        VALUES (p_user_id, 'free', 'active', 10)
        RETURNING item_limit INTO v_item_limit;
    END IF;
    
    -- Premium users have unlimited items (item_limit = -1)
    IF v_item_limit = -1 THEN
        RETURN TRUE;
    END IF;
    
    -- Count current items
    SELECT COUNT(*) INTO v_current_count
    FROM wardrobe_items
    WHERE user_id = p_user_id;
    
    RETURN v_current_count < v_item_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's subscription with usage stats
CREATE OR REPLACE FUNCTION get_subscription_with_usage(p_user_id UUID)
RETURNS TABLE (
    tier subscription_tier,
    status subscription_status,
    item_limit INTEGER,
    items_used INTEGER,
    can_add_items BOOLEAN,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(s.tier, 'free'::subscription_tier),
        COALESCE(s.status, 'active'::subscription_status),
        COALESCE(s.item_limit, 10),
        (SELECT COUNT(*)::INTEGER FROM wardrobe_items WHERE wardrobe_items.user_id = p_user_id),
        can_add_wardrobe_item(p_user_id),
        s.current_period_end,
        COALESCE(s.cancel_at_period_end, FALSE)
    FROM user_subscriptions s
    WHERE s.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_subscription_timestamp ON user_subscriptions;
CREATE TRIGGER update_subscription_timestamp
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_updated_at();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON user_subscriptions TO authenticated;
GRANT INSERT ON user_subscriptions TO authenticated;
GRANT EXECUTE ON FUNCTION can_add_wardrobe_item TO authenticated;
GRANT EXECUTE ON FUNCTION get_subscription_with_usage TO authenticated;
