-- Pantry + Shopping List module — initial schema
-- Single-user Home ERP. RLS enforces auth.uid() ownership.
-- Uses gen_random_uuid() (built-in pgcrypto, enabled by default in Supabase).

-- ============================================================
-- ENUMS
-- ============================================================
do $$ begin
  create type pantry_category as enum (
    'maitotuotteet',
    'lihat_ja_kala',
    'kasvikset_ja_hedelmat',
    'kuivatuotteet',
    'sailykkeet',
    'pakasteet',
    'juomat',
    'hygienia_ja_siisteys',
    'taloustarvikkeet',
    'muu'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type pantry_unit as enum ('kpl','l','dl','kg','g','pkt','prk','tlk');
exception when duplicate_object then null; end $$;

do $$ begin
  create type shopping_status as enum ('pending','bought');
exception when duplicate_object then null; end $$;

-- ============================================================
-- pantry_items
-- ============================================================
create table if not exists pantry_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category pantry_category not null default 'muu',
  current_quantity numeric not null default 0,
  unit pantry_unit not null default 'kpl',
  min_threshold numeric not null default 0,
  preferred_store text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pantry_items_user_idx on pantry_items(user_id);
create index if not exists pantry_items_category_idx on pantry_items(category);
create index if not exists pantry_items_quantity_idx on pantry_items(current_quantity);

-- ============================================================
-- shopping_list_items
-- ============================================================
create table if not exists shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pantry_item_id uuid references pantry_items(id) on delete set null,
  name text not null,
  quantity_to_buy numeric not null default 1,
  unit pantry_unit not null default 'kpl',
  category pantry_category not null default 'muu',
  store text,
  status shopping_status not null default 'pending',
  auto_generated boolean not null default false,
  bought_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists shopping_user_idx on shopping_list_items(user_id);
create index if not exists shopping_status_idx on shopping_list_items(status);
create index if not exists shopping_pantry_idx on shopping_list_items(pantry_item_id);

-- ============================================================
-- updated_at trigger
-- ============================================================
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists pantry_items_updated_at on pantry_items;
create trigger pantry_items_updated_at
  before update on pantry_items
  for each row execute function set_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table pantry_items enable row level security;
alter table shopping_list_items enable row level security;

drop policy if exists "pantry_owner_all" on pantry_items;
create policy "pantry_owner_all" on pantry_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "shopping_owner_all" on shopping_list_items;
create policy "shopping_owner_all" on shopping_list_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
