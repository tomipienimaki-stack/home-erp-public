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
