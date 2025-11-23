-- Safely drop existing policies to avoid "already exists" errors
drop policy if exists "Authenticated users can upload wardrobe items" on storage.objects;
drop policy if exists "Anyone can view wardrobe items" on storage.objects;

-- Re-create the Upload Policy
create policy "Authenticated users can upload wardrobe items" on storage.objects for insert
to authenticated
with check (
  bucket_id = 'wardrobe-items'
);

-- Re-create the View Policy (Crucial for displaying images)
create policy "Anyone can view wardrobe items" on storage.objects for select
to public
using ( bucket_id = 'wardrobe-items' );
