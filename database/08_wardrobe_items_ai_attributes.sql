-- Add AI-detected attributes to wardrobe_items
-- Run this migration after 02_wardrobe_items.sql

-- Add new columns for AI-detected attributes
ALTER TABLE wardrobe_items 
ADD COLUMN IF NOT EXISTS subcategory text,
ADD COLUMN IF NOT EXISTS style text,
ADD COLUMN IF NOT EXISTS pattern text,
ADD COLUMN IF NOT EXISTS material text,
ADD COLUMN IF NOT EXISTS season text[],
ADD COLUMN IF NOT EXISTS occasions text[],
ADD COLUMN IF NOT EXISTS brand text,
ADD COLUMN IF NOT EXISTS ai_description text,
ADD COLUMN IF NOT EXISTS ai_confidence float;

-- Add comment for documentation
COMMENT ON COLUMN wardrobe_items.subcategory IS 'AI-detected subcategory (e.g., t-shirt, jeans, sneakers)';
COMMENT ON COLUMN wardrobe_items.style IS 'AI-detected style (e.g., casual, formal, sporty)';
COMMENT ON COLUMN wardrobe_items.pattern IS 'AI-detected pattern (e.g., solid, striped, floral)';
COMMENT ON COLUMN wardrobe_items.material IS 'AI-detected material (e.g., cotton, denim, leather)';
COMMENT ON COLUMN wardrobe_items.season IS 'AI-detected suitable seasons';
COMMENT ON COLUMN wardrobe_items.occasions IS 'AI-detected suitable occasions';
COMMENT ON COLUMN wardrobe_items.ai_description IS 'AI-generated description of the item';
COMMENT ON COLUMN wardrobe_items.ai_confidence IS 'AI confidence score (0-1)';
