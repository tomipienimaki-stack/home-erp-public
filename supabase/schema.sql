-- Home ERP: koko tietokantaskeema yhtenä tiedostona.
-- Liitä Supabasen SQL-editoriin (SQL Editor → New query) ja aja kerran tyhjään projektiin.
-- Tämä tiedosto on generoitu: muokkaa supabase/migrations/-tiedostoja ja aja scripts/build-schema.sh.

-- =====================================================================
-- 0001_init_pantry_shopping.sql
-- =====================================================================

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


-- =====================================================================
-- 0002_meal_planning.sql
-- =====================================================================

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


-- =====================================================================
-- 0003_favorites.sql
-- =====================================================================

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


-- =====================================================================
-- 0004_consumption_and_conversion.sql
-- =====================================================================

-- Daily consumption prediction + package → base-unit conversion on purchase.

-- ============================================================
-- Pantry: daily consumption tracking
-- ============================================================
alter table pantry_items
  add column if not exists daily_consumption numeric not null default 0,
  add column if not exists last_consumption_at timestamptz;

create index if not exists pantry_consumption_idx
  on pantry_items(daily_consumption)
  where daily_consumption > 0;

-- ============================================================
-- Shopping list: optional package → pantry conversion
-- If set, markBought will add pantry_addition_amount (in pantry_addition_unit)
-- to pantry instead of quantity_to_buy (in unit).
-- ============================================================
alter table shopping_list_items
  add column if not exists pantry_addition_amount numeric,
  add column if not exists pantry_addition_unit pantry_unit;


-- =====================================================================
-- 0005_tiers_freezer_merge.sql
-- =====================================================================

-- 0005: Varastotasot, varaston tilat, vanhenemispäivät ja pakastin.

begin;

-- ---------- Uudet tyypit ja sarakkeet ----------
do $$ begin
  create type ingredient_tier as enum ('perus','sailyva','tarkistettava','tuore');
exception when duplicate_object then null; end $$;

do $$ begin
  create type stock_status as enum ('on','vahissa','loppu');
exception when duplicate_object then null; end $$;

alter table ingredients add column if not exists tier ingredient_tier not null default 'tuore';

alter table pantry_items
  add column if not exists stock_status stock_status,
  add column if not exists best_before date;

alter table shopping_list_items
  add column if not exists check_first boolean not null default false,
  add column if not exists note text;

-- ---------- Pakastin ----------
create table if not exists freezer_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  recipe_id uuid references recipes(id) on delete set null,
  portions integer not null default 1 check (portions >= 0),
  portion_size text,
  frozen_at date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists freezer_user_idx on freezer_items(user_id);
drop trigger if exists freezer_items_updated_at on freezer_items;
create trigger freezer_items_updated_at before update on freezer_items
  for each row execute function set_updated_at();
alter table freezer_items enable row level security;
drop policy if exists "freezer_owner_all" on freezer_items;
create policy "freezer_owner_all" on freezer_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Tuplien yhdistäminen, nimien siistiminen ja tasojen asetus olivat asennuskohtaisia
-- datamuutoksia, eikä niitä ajeta uudessa asennuksessa.

-- ---------- Säilyvät varastoon oletustilalla 'vahissa' ----------
insert into pantry_items (user_id, ingredient_id, current_quantity, unit, min_threshold, stock_status)
select i.user_id, i.id, 0, i.default_unit, 0, 'vahissa'
  from ingredients i
 where i.tier = 'sailyva'
on conflict (user_id, ingredient_id) do update set stock_status = excluded.stock_status;

commit;


-- =====================================================================
-- 0006_restock_mode.sql
-- =====================================================================

-- 0006: Säilyvien jako ydinvarastoon ja tarvittaessa ostettaviin reseptien käyttömäärän mukaan.
-- Aja Supabasen SQL-editorissa kerran. Luotu 21.9.2026.

begin;

-- Käsin asetettu poikkeus. null = automaattinen (>= 3 reseptiä = ydin).
alter table ingredients
  add column if not exists restock_override text
  check (restock_override in ('ydin', 'tarvittaessa'));

-- Raaka-aineen käyttömäärä resepteissä ja siitä johdettu täydennystapa.
create or replace view ingredient_usage with (security_invoker = true) as
select i.id as ingredient_id,
       i.user_id,
       count(distinct ri.recipe_id)::int as recipe_count,
       coalesce(
         i.restock_override,
         case when count(distinct ri.recipe_id) >= 3 then 'ydin' else 'tarvittaessa' end
       ) as restock_mode
  from ingredients i
  left join recipe_ingredients ri on ri.ingredient_id = i.id
 group by i.id, i.user_id, i.restock_override;

-- Siivous: tarvittaessa-ryhmän säilyvät pois ostoslistalta, jos ne tulivat tilamuutoksesta.
delete from shopping_list_items s
 using ingredient_usage u, ingredients i
 where s.status = 'pending'
   and s.source = 'threshold'
   and s.ingredient_id = u.ingredient_id
   and s.ingredient_id = i.id
   and i.tier = 'sailyva'
   and u.restock_mode = 'tarvittaessa';

-- Tilaseurattavat ostetaan kappaleina, ei grammoina.
update shopping_list_items s
   set unit = 'kpl', quantity_to_buy = 1
  from ingredients i
 where s.ingredient_id = i.id
   and i.tier = 'sailyva'
   and s.source = 'threshold'
   and s.status = 'pending';

commit;


-- =====================================================================
-- 0007_staples.sql
-- =====================================================================

-- 0007: Vakiotuotteet — reseptien ulkopuoliset ostokset omalla ostorytmillään.
-- Aja Supabasen SQL-editorissa kerran. Luotu 23.9.2026.

-- Enum-lisäys on ajettava transaktion ulkopuolella.
alter type shopping_source add value if not exists 'vakio';

begin;

do $$ begin
  create type staple_cadence as enum ('joka_reissu', 'viikoittain', 'kahden_viikon_valein', 'kuukausittain');
exception when duplicate_object then null; end $$;

alter table favorite_products
  add column if not exists cadence staple_cadence,
  add column if not exists last_bought_at date;

-- Ostoslistan rivi voi viitata vakiotuotteeseen, jolloin ostokuittaus päivittää last_bought_at.
alter table shopping_list_items
  add column if not exists favorite_id uuid references favorite_products(id) on delete set null;

create index if not exists fav_cadence_idx on favorite_products(cadence);
create index if not exists shopping_favorite_idx on shopping_list_items(favorite_id);

commit;


-- =====================================================================
-- 0008_cadence_days.sql
-- =====================================================================

-- 0008: Vakiotuotteen ostorytmi vapaana päivämääränä (esim. wc-paperi 60 pv, pölypussit 180 pv).
-- Aja Supabasen SQL-editorissa kerran. Luotu 23.9.2026.

begin;

alter table favorite_products
  add column if not exists cadence_days integer check (cadence_days is null or cadence_days >= 0);

comment on column favorite_products.cadence_days is
  'Ostoväli päivinä. Ohittaa cadence-kentän. 0 = joka kauppareissu.';

commit;


-- =====================================================================
-- 0009_shopping_day.sql
-- =====================================================================

-- 0009: Kauppapäivä — tavoitteena yksi, korkeintaan kaksi kauppareissua viikossa.
-- Aja Supabasen SQL-editorissa kerran. Luotu 23.9.2026.

begin;

create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- ISO-viikonpäivät: 1 = maanantai ... 7 = sunnuntai.
  -- Ensimmäinen alkio on pääkauppapäivä, jonka jälkeisestä päivästä ateriaviikko alkaa.
  shopping_weekdays smallint[] not null default '{7}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shopping_weekdays_valid check (
    array_length(shopping_weekdays, 1) between 1 and 2
    and shopping_weekdays <@ array[1,2,3,4,5,6,7]::smallint[]
  )
);

drop trigger if exists user_settings_updated_at on user_settings;
create trigger user_settings_updated_at
  before update on user_settings
  for each row execute function set_updated_at();

alter table user_settings enable row level security;
drop policy if exists "user_settings_owner_all" on user_settings;
create policy "user_settings_owner_all" on user_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Oletusasetus nykyisille käyttäjille: sunnuntai, jolloin ateriaviikko alkaa maanantaista
-- kuten tähänkin asti.
insert into user_settings (user_id)
select id from auth.users
on conflict (user_id) do nothing;

commit;

