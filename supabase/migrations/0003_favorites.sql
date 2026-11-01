-- Favorite products — things the user typically buys at the store,
-- independent of recipe ingredients. Importable from a pasted text dump
-- (e.g. S-Kaupat suosikit-page).

create table if not exists favorite_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  store store_id not null default 'muu',
  category pantry_category not null default 'muu',
  package_size numeric,
  package_unit pantry_unit,
  approx_price numeric,
  notes text,
  ingredient_id uuid references ingredients(id) on delete set null,
  in_stock boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fav_user_idx on favorite_products(user_id);
create index if not exists fav_category_idx on favorite_products(category);
create index if not exists fav_store_idx on favorite_products(store);
create index if not exists fav_ingredient_idx on favorite_products(ingredient_id);

drop trigger if exists fav_updated_at on favorite_products;
create trigger fav_updated_at
  before update on favorite_products
  for each row execute function set_updated_at();

alter table favorite_products enable row level security;
drop policy if exists "fav_owner_all" on favorite_products;
create policy "fav_owner_all" on favorite_products
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
