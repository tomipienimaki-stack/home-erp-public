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
