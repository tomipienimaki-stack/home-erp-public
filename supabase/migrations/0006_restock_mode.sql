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
