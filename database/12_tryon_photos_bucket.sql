-- ============================================================================
-- Migration: 12_tryon_photos_bucket.sql
-- Purpose: Create storage bucket for user try-on photos
-- Date: 2024
-- Additive: YES (new bucket, no changes to existing)
-- ============================================================================

-- Create the tryon-photos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('tryon-photos', 'tryon-photos', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- RLS POLICIES (same pattern as tryon-cache bucket from 09_tryon_cache_bucket.sql)
-- Note: Policy names must be unique across all tables
-- ============================================================================

-- Allow authenticated users to upload their own photos
-- Path format: {user_id}/filename.jpg
CREATE POLICY "storage_tryon_photos_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'tryon-photos' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own photos
CREATE POLICY "storage_tryon_photos_select_own"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'tryon-photos' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own photos
CREATE POLICY "storage_tryon_photos_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'tryon-photos' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Public read access for generated results (they need to be viewable in app)
CREATE POLICY "storage_tryon_photos_public_read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'tryon-photos');
