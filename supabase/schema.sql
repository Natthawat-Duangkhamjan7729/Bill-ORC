-- Bill ORC database schema
-- Run this in the Supabase Dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to run more than once.

-- ============================================================
-- 1. Tables
-- ============================================================

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  store_name text,
  purchase_date date,
  category text,
  subtotal numeric(12, 2),
  tax_amount numeric(12, 2),
  total_amount numeric(12, 2),
  image_url text,
  created_at timestamptz not null default now()
);

-- Upgrade for databases created before the category feature existed.
alter table public.receipts add column if not exists category text;

create table if not exists public.receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts (id) on delete cascade,
  item_name text not null,
  quantity numeric(12, 3) not null default 1,
  unit_price numeric(12, 2),
  total_price numeric(12, 2)
);

-- Daily sales income, entered by hand (no OCR needed — totals usually
-- come straight from the till or banking app).
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  sale_date date not null,
  amount numeric(12, 2) not null check (amount > 0),
  channel text, -- เงินสด / โอน / เดลิเวอรี่ / อื่น ๆ
  note text,
  created_at timestamptz not null default now()
);

-- Speeds up the dashboard (list my receipts, newest first) and search.
create index if not exists receipts_user_date_idx
  on public.receipts (user_id, purchase_date desc);

create index if not exists sales_user_date_idx
  on public.sales (user_id, sale_date desc);

create index if not exists receipt_items_receipt_idx
  on public.receipt_items (receipt_id);

-- ============================================================
-- 2. Row Level Security: each user can only see their own data
-- ============================================================

alter table public.receipts enable row level security;
alter table public.receipt_items enable row level security;
alter table public.sales enable row level security;

drop policy if exists "Users manage own sales" on public.sales;
create policy "Users manage own sales"
  on public.sales
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own receipts" on public.receipts;
create policy "Users manage own receipts"
  on public.receipts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own receipt items" on public.receipt_items;
create policy "Users manage own receipt items"
  on public.receipt_items
  for all
  using (
    exists (
      select 1 from public.receipts r
      where r.id = receipt_id and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.receipts r
      where r.id = receipt_id and r.user_id = auth.uid()
    )
  );

-- ============================================================
-- 3. Storage bucket for receipt images
--    Files are stored as <user_id>/<filename> so each user can
--    only access their own folder.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

drop policy if exists "Users upload own receipt images" on storage.objects;
create policy "Users upload own receipt images"
  on storage.objects
  for insert
  with check (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users read own receipt images" on storage.objects;
create policy "Users read own receipt images"
  on storage.objects
  for select
  using (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users delete own receipt images" on storage.objects;
create policy "Users delete own receipt images"
  on storage.objects
  for delete
  using (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
