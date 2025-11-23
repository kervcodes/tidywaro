-- Enable RLS on storage.objects if not already enabled (it usually is)
-- alter table storage.objects enable row level security;

-- Policy to allow authenticated users to upload files to the 'wardrobe-items' bucket
-- We restrict it to the specific bucket and ensure the user is authenticated.
create policy "Authenticated users can upload wardrobe items"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'wardrobe-items'
);

-- Policy to allow users to view files in the 'wardrobe-items' bucket
-- (If the bucket is Public, this might not be strictly necessary for public URLs, 
-- but good for consistency if using the API)
create policy "Anyone can view wardrobe items"
on storage.objects for select
to public
using ( bucket_id = 'wardrobe-items' );
