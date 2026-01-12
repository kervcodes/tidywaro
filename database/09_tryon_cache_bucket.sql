-- Create storage bucket for virtual try-on cached results
INSERT INTO storage.buckets (id, name, public)
VALUES ('tryon-cache', 'tryon-cache', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to tryon-cache
CREATE POLICY "Users can upload tryon cache"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tryon-cache');

-- Allow public read access to tryon-cache
CREATE POLICY "Public read access to tryon cache"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tryon-cache');

-- Allow authenticated users to delete their cached results
CREATE POLICY "Users can delete tryon cache"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'tryon-cache');
