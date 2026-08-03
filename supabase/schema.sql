-- Bill-ORC database schema
-- Run this once in your Supabase project: Dashboard -> SQL Editor -> New query -> paste -> Run.

-- ============================================================
-- Tables
-- ============================================================

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  store_name text not null default '',
  purchase_date date,
  subtotal numeric(12, 2),
  tax_amount numeric(12, 2),
  total_amount numeric(12, 2),
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts (id) on delete cascade,
  item_name text not null default '',
  quantity numeric(12, 3) not null default 1,
  unit_price numeric(12, 2),
  total_price numeric(12, 2)
);

create index if not exists receipts_user_id_purchase_date_idx
  on public.receipts (user_id, purchase_date desc);

create index if not exists receipt_items_receipt_id_idx
  on public.receipt_items (receipt_id);

-- ============================================================
-- Row Level Security: each user can only touch their own data
-- ============================================================

alter table public.receipts enable row level security;
alter table public.receipt_items enable row level security;

create policy "Users can view own receipts"
  on public.receipts for select
  using (auth.uid() = user_id);

create policy "Users can insert own receipts"
  on public.receipts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own receipts"
  on public.receipts for update
  using (auth.uid() = user_id);

create policy "Users can delete own receipts"
  on public.receipts for delete
  using (auth.uid() = user_id);

-- Items are owned through their parent receipt.
create policy "Users can view own receipt items"
  on public.receipt_items for select
  using (exists (
    select 1 from public.receipts r
    where r.id = receipt_id and r.user_id = auth.uid()
  ));

create policy "Users can insert own receipt items"
  on public.receipt_items for insert
  with check (exists (
    select 1 from public.receipts r
    where r.id = receipt_id and r.user_id = auth.uid()
  ));

create policy "Users can update own receipt items"
  on public.receipt_items for update
  using (exists (
    select 1 from public.receipts r
    where r.id = receipt_id and r.user_id = auth.uid()
  ));

create policy "Users can delete own receipt items"
  on public.receipt_items for delete
  using (exists (
    select 1 from public.receipts r
    where r.id = receipt_id and r.user_id = auth.uid()
  ));

-- ============================================================
-- Storage bucket for receipt images
-- ============================================================

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- Files are stored under a folder named after the user's id
-- (e.g. receipts/<user_id>/<file>), and policies enforce that.
create policy "Users can upload own receipt images"
  on storage.objects for insert
  with check (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can view own receipt images"
  on storage.objects for select
  using (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own receipt images"
  on storage.objects for delete
  using (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
