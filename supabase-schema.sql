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

-- MIGRATION: AJOUT DES CHAMPS DE PRIX (PRIX D'ACHAT ET DE VENTE)
-- Exécutez ces lignes dans l'éditeur SQL de Supabase si la table existe déjà :
--
-- ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS purchase_price numeric check (purchase_price >= 0);
-- ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS sales_price numeric check (sales_price >= 0);
-- ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS last_movement integer default 0;

