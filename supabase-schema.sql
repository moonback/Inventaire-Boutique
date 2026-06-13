create table if not exists public.inventory_items (
  barcode text primary key,
  name text not null,
  quantity integer not null default 0 check (quantity >= 0),
  image_url text,
  brand text,
  category text,
  last_updated bigint not null
);

alter table public.inventory_items enable row level security;

create policy "Allow public inventory reads"
  on public.inventory_items
  for select
  using (true);

create policy "Allow public inventory inserts"
  on public.inventory_items
  for insert
  with check (true);

create policy "Allow public inventory updates"
  on public.inventory_items
  for update
  using (true)
  with check (true);

create policy "Allow public inventory deletes"
  on public.inventory_items
  for delete
  using (true);
