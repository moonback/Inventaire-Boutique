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


-- MIGRATION: CRÉATION DU BUCKET DE STOCKAGE POUR LES PHOTOS DE PRODUITS
-- Exécutez ces lignes dans l'éditeur SQL de Supabase pour configurer le bucket de photos :

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-photos', 'product-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Select Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-photos');

CREATE POLICY "Public Insert Access" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-photos');

CREATE POLICY "Public Update Access" ON storage.objects
  FOR UPDATE USING (bucket_id = 'product-photos');

CREATE POLICY "Public Delete Access" ON storage.objects
  FOR DELETE USING (bucket_id = 'product-photos');


