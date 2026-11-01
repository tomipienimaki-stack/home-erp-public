-- Pantry + Shopping + Meal Planning module — full schema.
-- This migration drops the v1 pantry/shopping tables (assumed empty) and
-- introduces the ingredient master + recipes + meal-plan model.
--
-- Run AFTER 0001_init_pantry_shopping.sql. Idempotent where possible.

-- ============================================================
-- Drop v1 tables (data assumed empty)
-- ============================================================
drop table if exists shopping_list_items cascade;
drop table if exists pantry_items cascade;

-- ============================================================
-- Updated enums
-- ============================================================
do $$ begin
  drop type if exists shopping_status cascade;
exception when others then null; end $$;

do $$ begin
  drop type if exists pantry_category cascade;
exception when others then null; end $$;

-- Recreate pantry_category with mausteet_ja_oljyt added
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
  'mausteet_ja_oljyt',
  'muu'
);

create type shopping_status as enum ('pending','bought');

do $$ begin
  create type meal_type as enum ('aamiainen','lounas','paivallinen','valipala');
exception when duplicate_object then null; end $$;

do $$ begin
  create type plan_meal_type as enum ('lounas','paivallinen');
exception when duplicate_object then null; end $$;

do $$ begin
  create type store_id as enum ('lidl','k-market','prisma','muu');
exception when duplicate_object then null; end $$;

do $$ begin
  create type shopping_source as enum ('meal_plan','threshold','manual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type preference_type as enum ('avoid','prefer','allergy');
exception when duplicate_object then null; end $$;

-- pantry_unit already exists from 0001 — reuse

-- ============================================================
-- ingredients (master)
-- ============================================================
create table if not exists ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  default_unit pantry_unit not null default 'kpl',
  category pantry_category not null default 'muu',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists ingredients_user_idx on ingredients(user_id);
create index if not exists ingredients_category_idx on ingredients(category);

alter table ingredients enable row level security;
drop policy if exists "ingredients_owner_all" on ingredients;
create policy "ingredients_owner_all" on ingredients
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- store_products
-- ============================================================
create table if not exists store_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  store store_id not null,
  product_name text not null,
  package_size numeric not null default 1,
  package_unit pantry_unit not null default 'kpl',
  approx_price numeric,
  updated_at timestamptz not null default now(),
  unique (user_id, ingredient_id, store)
);

create index if not exists store_products_user_idx on store_products(user_id);
create index if not exists store_products_ingredient_idx on store_products(ingredient_id);
create index if not exists store_products_store_idx on store_products(store);

alter table store_products enable row level security;
drop policy if exists "store_products_owner_all" on store_products;
create policy "store_products_owner_all" on store_products
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- pantry_items (rebuilt with ingredient_id)
-- ============================================================
create table pantry_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  current_quantity numeric not null default 0,
  unit pantry_unit not null default 'kpl',
  min_threshold numeric not null default 0,
  preferred_store store_id,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, ingredient_id)
);

create index pantry_items_user_idx on pantry_items(user_id);
create index pantry_items_ingredient_idx on pantry_items(ingredient_id);
create index pantry_items_quantity_idx on pantry_items(current_quantity);

drop trigger if exists pantry_items_updated_at on pantry_items;
create trigger pantry_items_updated_at
  before update on pantry_items
  for each row execute function set_updated_at();

alter table pantry_items enable row level security;
create policy "pantry_owner_all" on pantry_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- recipes
-- ============================================================
create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  servings integer not null default 2,
  prep_time_min integer,
  cook_time_min integer,
  meal_type meal_type not null default 'paivallinen',
  instructions text,
  tags text[] not null default '{}',
  last_cooked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists recipes_user_idx on recipes(user_id);
create index if not exists recipes_meal_type_idx on recipes(meal_type);
create index if not exists recipes_tags_idx on recipes using gin(tags);

alter table recipes enable row level security;
drop policy if exists "recipes_owner_all" on recipes;
create policy "recipes_owner_all" on recipes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- recipe_ingredients
-- ============================================================
create table if not exists recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references recipes(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  quantity numeric not null default 1,
  unit pantry_unit not null default 'kpl',
  notes text,
  unique (recipe_id, ingredient_id)
);

create index if not exists ri_recipe_idx on recipe_ingredients(recipe_id);
create index if not exists ri_ingredient_idx on recipe_ingredients(ingredient_id);

alter table recipe_ingredients enable row level security;
drop policy if exists "ri_owner_all" on recipe_ingredients;
create policy "ri_owner_all" on recipe_ingredients
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- food_preferences
-- ============================================================
create table if not exists food_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type preference_type not null,
  ingredient_id uuid references ingredients(id) on delete cascade,
  category pantry_category,
  notes text,
  created_at timestamptz not null default now(),
  check (ingredient_id is not null or category is not null)
);

create index if not exists fp_user_idx on food_preferences(user_id);

alter table food_preferences enable row level security;
drop policy if exists "fp_owner_all" on food_preferences;
create policy "fp_owner_all" on food_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- meal_plans
-- ============================================================
create table if not exists meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  ai_generated boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create index if not exists mp_user_idx on meal_plans(user_id);
create index if not exists mp_week_idx on meal_plans(week_start);

alter table meal_plans enable row level security;
drop policy if exists "mp_owner_all" on meal_plans;
create policy "mp_owner_all" on meal_plans
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- meal_plan_entries
-- ============================================================
create table if not exists meal_plan_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_plan_id uuid not null references meal_plans(id) on delete cascade,
  day_of_week int2 not null check (day_of_week between 1 and 7),
  meal_type plan_meal_type not null,
  recipe_id uuid references recipes(id) on delete set null,
  servings integer not null default 2,
  cooked boolean not null default false,
  cooked_at timestamptz,
  unique (meal_plan_id, day_of_week, meal_type)
);

create index if not exists mpe_plan_idx on meal_plan_entries(meal_plan_id);
create index if not exists mpe_recipe_idx on meal_plan_entries(recipe_id);

alter table meal_plan_entries enable row level security;
drop policy if exists "mpe_owner_all" on meal_plan_entries;
create policy "mpe_owner_all" on meal_plan_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- shopping_list_items (rebuilt with ingredient_id + source)
-- ============================================================
create table shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ingredient_id uuid references ingredients(id) on delete set null,
  name text not null,
  quantity_to_buy numeric not null default 1,
  unit pantry_unit not null default 'kpl',
  category pantry_category not null default 'muu',
  store store_id,
  status shopping_status not null default 'pending',
  source shopping_source not null default 'manual',
  meal_plan_id uuid references meal_plans(id) on delete set null,
  bought_at timestamptz,
  created_at timestamptz not null default now()
);

create index shopping_user_idx on shopping_list_items(user_id);
create index shopping_status_idx on shopping_list_items(status);
create index shopping_ingredient_idx on shopping_list_items(ingredient_id);
create index shopping_plan_idx on shopping_list_items(meal_plan_id);

alter table shopping_list_items enable row level security;
create policy "shopping_owner_all" on shopping_list_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
