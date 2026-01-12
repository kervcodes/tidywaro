-- Create a table for wardrobe items
create table wardrobe_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  image_url text not null,
  category text, -- e.g., 'top', 'bottom', 'shoes'
  color text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table wardrobe_items enable row level security;

create policy "Users can view their own items." on wardrobe_items
  for select using ((select auth.uid()) = user_id);

create policy "Users can insert their own items." on wardrobe_items
  for insert with check ((select auth.uid()) = user_id);

create policy "Users can update their own items." on wardrobe_items
  for update using ((select auth.uid()) = user_id);

create policy "Users can delete their own items." on wardrobe_items
  for delete using ((select auth.uid()) = user_id);
