-- ============================================================================
-- 11_tryon_full_outfit.sql
-- Minimal additions for photo-realistic full-outfit try-on feature
-- Run after 10_subscriptions_schema.sql
-- ============================================================================

-- ============================================================================
-- CHANGE 1: Add try-on quality scoring to wardrobe_items
-- WHY UNAVOIDABLE: We need to track which garments are suitable for try-on
-- without blocking normal wardrobe usage. Storing in same table avoids JOINs
-- and keeps the data model simple. All columns are nullable with safe defaults.
-- ============================================================================

ALTER TABLE wardrobe_items 
ADD COLUMN IF NOT EXISTS tryon_quality_score FLOAT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tryon_ready BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tryon_fail_reason TEXT DEFAULT NULL;

COMMENT ON COLUMN wardrobe_items.tryon_quality_score IS 'Quality score for try-on suitability (0-1). NULL = not yet scored.';
COMMENT ON COLUMN wardrobe_items.tryon_ready IS 'Whether item passes minimum quality for try-on. NULL = not yet evaluated.';
COMMENT ON COLUMN wardrobe_items.tryon_fail_reason IS 'Reason if tryon_ready=false (e.g., "image too blurry", "garment cropped")';

-- ============================================================================
-- CHANGE 2: Add try-on credits to user_subscriptions
-- WHY UNAVOIDABLE: Credits system requires persistent storage. Using existing
-- subscription table avoids creating a separate credits table. Premium users
-- get more credits; this integrates with existing tier logic.
-- ============================================================================

ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS tryon_credits INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS tryon_credits_reset_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN user_subscriptions.tryon_credits IS 'Remaining try-on generation credits. Free tier starts with 5.';
COMMENT ON COLUMN user_subscriptions.tryon_credits_reset_at IS 'When credits were last reset (for monthly refresh logic)';

-- Update existing subscriptions: free=5 credits, premium=50 credits
UPDATE user_subscriptions 
SET tryon_credits = CASE WHEN tier = 'premium' THEN 50 ELSE 5 END
WHERE tryon_credits IS NULL OR tryon_credits = 5;

-- ============================================================================
-- CHANGE 3: Create tryon_user_photos table
-- WHY UNAVOIDABLE: Users need to upload 1-3 full-body photos of themselves.
-- These are fundamentally different from wardrobe_items (person vs clothing).
-- Cannot reuse wardrobe_items because:
--   - Different purpose (model photo vs garment)
--   - Different validation rules (full body detection vs garment detection)
--   - Different storage/access patterns
--   - Would pollute wardrobe queries with non-clothing items
-- ============================================================================

CREATE TABLE IF NOT EXISTS tryon_user_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Image URLs
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    
    -- Quality assessment
    quality_score FLOAT,
    is_valid BOOLEAN DEFAULT TRUE,
    validation_message TEXT,
    
    -- User preference
    is_default BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tryon_user_photos_user_id ON tryon_user_photos(user_id);

-- RLS
ALTER TABLE tryon_user_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tryon photos"
    ON tryon_user_photos FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tryon photos"
    ON tryon_user_photos FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tryon photos"
    ON tryon_user_photos FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tryon photos"
    ON tryon_user_photos FOR DELETE
    USING (auth.uid() = user_id);

-- Ensure only one default photo per user (trigger)
CREATE OR REPLACE FUNCTION ensure_single_default_tryon_photo()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = TRUE THEN
        UPDATE tryon_user_photos 
        SET is_default = FALSE 
        WHERE user_id = NEW.user_id AND id != NEW.id AND is_default = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ensure_single_default_tryon_photo ON tryon_user_photos;
CREATE TRIGGER trg_ensure_single_default_tryon_photo
    BEFORE INSERT OR UPDATE ON tryon_user_photos
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_tryon_photo();

-- Limit to 3 photos per user (check constraint via trigger)
CREATE OR REPLACE FUNCTION check_tryon_photo_limit()
RETURNS TRIGGER AS $$
DECLARE
    photo_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO photo_count 
    FROM tryon_user_photos 
    WHERE user_id = NEW.user_id;
    
    IF photo_count >= 3 THEN
        RAISE EXCEPTION 'Maximum 3 try-on photos allowed per user';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_tryon_photo_limit ON tryon_user_photos;
CREATE TRIGGER trg_check_tryon_photo_limit
    BEFORE INSERT ON tryon_user_photos
    FOR EACH ROW
    EXECUTE FUNCTION check_tryon_photo_limit();

-- ============================================================================
-- CHANGE 4: Create tryon_jobs table
-- WHY UNAVOIDABLE: Async job processing requires tracking state. Cannot reuse:
--   - daily_outfits: only for weekly plans, not ad-hoc try-ons
--   - wardrobe_items: wrong entity type
--   - tryon_user_photos: wrong purpose
-- Job queue needs: status, input refs, output, retries, timestamps.
-- This is the minimal structure for reliable async processing.
-- ============================================================================

CREATE TYPE tryon_job_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE IF NOT EXISTS tryon_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Input references
    user_photo_id UUID REFERENCES tryon_user_photos(id) ON DELETE SET NULL,
    user_photo_url TEXT NOT NULL,  -- Denormalized for reliability if photo deleted
    wardrobe_item_ids UUID[] NOT NULL,  -- Array of item IDs in the outfit
    
    -- Job state
    status tryon_job_status DEFAULT 'pending',
    priority INTEGER DEFAULT 0,  -- Higher = processed first
    
    -- Output
    result_url TEXT,
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Credits
    credits_charged INTEGER DEFAULT 1,
    credits_refunded BOOLEAN DEFAULT FALSE,
    
    -- Cache key for deduplication
    cache_key TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_tryon_jobs_user_id ON tryon_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_tryon_jobs_status ON tryon_jobs(status) WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_tryon_jobs_cache_key ON tryon_jobs(cache_key) WHERE cache_key IS NOT NULL;

-- RLS
ALTER TABLE tryon_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tryon jobs"
    ON tryon_jobs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tryon jobs"
    ON tryon_jobs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users cannot update/delete jobs directly (only via service role)
CREATE POLICY "Service role can manage all jobs"
    ON tryon_jobs FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to deduct credits (returns TRUE if successful)
CREATE OR REPLACE FUNCTION deduct_tryon_credits(p_user_id UUID, p_amount INTEGER DEFAULT 1)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_credits INTEGER;
BEGIN
    SELECT tryon_credits INTO v_current_credits
    FROM user_subscriptions
    WHERE user_id = p_user_id
    FOR UPDATE;  -- Lock row
    
    IF v_current_credits IS NULL OR v_current_credits < p_amount THEN
        RETURN FALSE;
    END IF;
    
    UPDATE user_subscriptions
    SET tryon_credits = tryon_credits - p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to refund credits (for failed jobs)
CREATE OR REPLACE FUNCTION refund_tryon_credits(p_user_id UUID, p_amount INTEGER DEFAULT 1)
RETURNS VOID AS $$
BEGIN
    UPDATE user_subscriptions
    SET tryon_credits = tryon_credits + p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get next pending job (for worker)
CREATE OR REPLACE FUNCTION get_next_tryon_job()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    user_photo_url TEXT,
    wardrobe_item_ids UUID[],
    cache_key TEXT,
    retry_count INTEGER
) AS $$
DECLARE
    v_job_id UUID;
BEGIN
    -- Select and lock the next pending job
    SELECT j.id INTO v_job_id
    FROM tryon_jobs j
    WHERE j.status = 'pending'
    ORDER BY j.priority DESC, j.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
    
    IF v_job_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Mark as processing
    UPDATE tryon_jobs
    SET status = 'processing',
        started_at = NOW(),
        updated_at = NOW()
    WHERE tryon_jobs.id = v_job_id;
    
    -- Return job details
    RETURN QUERY
    SELECT j.id, j.user_id, j.user_photo_url, j.wardrobe_item_ids, j.cache_key, j.retry_count
    FROM tryon_jobs j
    WHERE j.id = v_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check for cached result
CREATE OR REPLACE FUNCTION find_cached_tryon_result(p_cache_key TEXT)
RETURNS TEXT AS $$
DECLARE
    v_result_url TEXT;
BEGIN
    SELECT result_url INTO v_result_url
    FROM tryon_jobs
    WHERE cache_key = p_cache_key 
      AND status = 'completed' 
      AND result_url IS NOT NULL
    ORDER BY completed_at DESC
    LIMIT 1;
    
    RETURN v_result_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tryon_user_photos TO authenticated;
GRANT SELECT, INSERT ON tryon_jobs TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_tryon_credits TO authenticated;
GRANT EXECUTE ON FUNCTION find_cached_tryon_result TO authenticated;

-- Service role needs full access for worker
GRANT ALL ON tryon_jobs TO service_role;
GRANT EXECUTE ON FUNCTION get_next_tryon_job TO service_role;
GRANT EXECUTE ON FUNCTION refund_tryon_credits TO service_role;
