-- 0008: Vakiotuotteen ostorytmi vapaana päivämääränä (esim. wc-paperi 60 pv, pölypussit 180 pv).
-- Aja Supabasen SQL-editorissa kerran. Luotu 23.9.2026.

begin;

alter table favorite_products
  add column if not exists cadence_days integer check (cadence_days is null or cadence_days >= 0);

comment on column favorite_products.cadence_days is
  'Ostoväli päivinä. Ohittaa cadence-kentän. 0 = joka kauppareissu.';

commit;
