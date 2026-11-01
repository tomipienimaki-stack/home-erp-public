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
