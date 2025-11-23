-- Update the bucket to be public
-- This is required for 'public' URLs to work
update storage.buckets
set public = true
where id = 'wardrobe-items';

-- Verify the change
select id, name, public from storage.buckets where id = 'wardrobe-items';
