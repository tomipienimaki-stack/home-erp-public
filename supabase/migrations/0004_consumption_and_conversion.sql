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
