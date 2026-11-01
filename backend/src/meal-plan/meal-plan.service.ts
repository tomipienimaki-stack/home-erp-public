import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SINGLE_USER_ID, SUPABASE_CLIENT } from '../supabase/supabase.module';
import { PantryService } from '../pantry/pantry.service';
import { ShoppingListService } from '../shopping-list/shopping-list.service';
import { FavoritesService } from '../favorites/favorites.service';
import { SettingsService } from '../settings/settings.service';
import {
  MealPlan,
  MealPlanEntry,
  PantryCategory,
  PantryUnit,
  StoreId,
} from '../common/types';
import {
  CreateEntryDto,
  CreateMealPlanDto,
  UpdateEntryDto,
} from './dto';

const TABLE = 'meal_plans';
const ENTRY_TABLE = 'meal_plan_entries';
const RECIPE_TABLE = 'recipes';
const RI_TABLE = 'recipe_ingredients';
const STORE_TABLE = 'store_products';

@Injectable()
export class MealPlanService {
  private readonly logger = new Logger(MealPlanService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly sb: SupabaseClient,
    @Inject(SINGLE_USER_ID) private readonly userId: string,
    private readonly pantry: PantryService,
    private readonly shopping: ShoppingListService,
    private readonly favorites: FavoritesService,
    private readonly settings: SettingsService,
  ) {}

  static mondayOf(date = new Date()): string {
    const d = new Date(date);
    const day = (d.getDay() + 6) % 7; // 0 = Monday
    d.setDate(d.getDate() - day);
    return d.toISOString().slice(0, 10);
  }

  async list(): Promise<MealPlan[]> {
    const { data, error } = await this.sb
      .from(TABLE)
      .select('*')
      .eq('user_id', this.userId)
      .order('week_start', { ascending: false });
    if (error) throw error;
    return (data ?? []) as MealPlan[];
  }

  /**
   * Oletusviikko: se viikko, jonka voi viela ostoksilla ratkaista.
   * Kuluva viikko, mutta jos se on tyhja ja seuraavassa on jo aterioita,
   * naytetaan seuraava. Nain ostoslista ja viikkonakyma eivat ajaudu eri viikoille.
   */
  async getCurrent(): Promise<MealPlan & { entries: MealPlanEntry[] }> {
    const thisWeek = await this.settings.planWeekStartOf();
    const current = await this.getByWeek(thisWeek);
    if (current.entries.length > 0) return current;

    const next = MealPlanService.addDays(thisWeek, 7);
    const { data: nextPlan } = await this.sb
      .from(TABLE)
      .select('id')
      .eq('user_id', this.userId)
      .eq('week_start', next)
      .maybeSingle();
    if (!nextPlan) return current;
    const { count } = await this.sb
      .from(ENTRY_TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', this.userId)
      .eq('meal_plan_id', (nextPlan as any).id);
    return (count ?? 0) > 0 ? this.getWithEntries((nextPlan as any).id) : current;
  }

  static addDays(ymd: string, days: number): string {
    const d = new Date(`${ymd}T00:00:00`);
    d.setDate(d.getDate() + days);
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
  }

  /** Hae tai luo tietyn viikon suunnitelma. */
  async getByWeek(weekStart: string): Promise<MealPlan & { entries: MealPlanEntry[] }> {
    const monday = weekStart;
    const { data: existing } = await this.sb
      .from(TABLE)
      .select('*')
      .eq('user_id', this.userId)
      .eq('week_start', monday)
      .maybeSingle();

    let plan = existing as MealPlan | null;
    if (!plan) {
      plan = await this.create({ week_start: monday });
    }
    return this.getWithEntries(plan.id);
  }

  async getWithEntries(id: string): Promise<MealPlan & { entries: MealPlanEntry[] }> {
    const { data: plan, error } = await this.sb
      .from(TABLE)
      .select('*')
      .eq('user_id', this.userId)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!plan) throw new NotFoundException(`Meal plan ${id} not found`);

    const { data: entries, error: e2 } = await this.sb
      .from(ENTRY_TABLE)
      .select('*, recipe:recipes(*)')
      .eq('user_id', this.userId)
      .eq('meal_plan_id', id)
      .order('day_of_week')
      .order('meal_type');
    if (e2) throw e2;

    return { ...(plan as MealPlan), entries: (entries ?? []) as MealPlanEntry[] };
  }

  async create(dto: CreateMealPlanDto): Promise<MealPlan> {
    const { data, error } = await this.sb
      .from(TABLE)
      .insert({
        user_id: this.userId,
        week_start: dto.week_start,
        ai_generated: dto.ai_generated ?? false,
      })
      .select('*')
      .single();
    if (error) {
      if ((error as any).code === '23505') {
        const { data: existing } = await this.sb
          .from(TABLE)
          .select('*')
          .eq('user_id', this.userId)
          .eq('week_start', dto.week_start)
          .single();
        return existing as MealPlan;
      }
      throw error;
    }
    return data as MealPlan;
  }

  async delete(id: string): Promise<{ id: string }> {
    const { error } = await this.sb
      .from(TABLE)
      .delete()
      .eq('user_id', this.userId)
      .eq('id', id);
    if (error) throw error;
    return { id };
  }

  // -----------------------------------------------------------
  // Entries
  // -----------------------------------------------------------

  async addEntry(planId: string, dto: CreateEntryDto): Promise<MealPlanEntry> {
    const { data, error } = await this.sb
      .from(ENTRY_TABLE)
      .upsert(
        {
          user_id: this.userId,
          meal_plan_id: planId,
          day_of_week: dto.day_of_week,
          meal_type: dto.meal_type,
          recipe_id: dto.recipe_id ?? null,
          servings: dto.servings ?? 2,
        },
        { onConflict: 'meal_plan_id,day_of_week,meal_type' },
      )
      .select('*, recipe:recipes(*)')
      .single();
    if (error) throw error;
    return data as MealPlanEntry;
  }

  async updateEntry(entryId: string, dto: UpdateEntryDto): Promise<MealPlanEntry> {
    const { data, error } = await this.sb
      .from(ENTRY_TABLE)
      .update(dto)
      .eq('user_id', this.userId)
      .eq('id', entryId)
      .select('*, recipe:recipes(*)')
      .single();
    if (error) throw error;
    if (!data) throw new NotFoundException(`Entry ${entryId} not found`);
    return data as MealPlanEntry;
  }

  async deleteEntry(entryId: string): Promise<{ id: string }> {
    const { error } = await this.sb
      .from(ENTRY_TABLE)
      .delete()
      .eq('user_id', this.userId)
      .eq('id', entryId);
    if (error) throw error;
    return { id: entryId };
  }

  // -----------------------------------------------------------
  // Cook — deducts ingredients from pantry
  // -----------------------------------------------------------

  async markCooked(entryId: string): Promise<MealPlanEntry> {
    const { data: entry, error } = await this.sb
      .from(ENTRY_TABLE)
      .select('*, recipe:recipes(*)')
      .eq('user_id', this.userId)
      .eq('id', entryId)
      .maybeSingle();
    if (error) throw error;
    if (!entry) throw new NotFoundException(`Entry ${entryId} not found`);
    const e = entry as MealPlanEntry;
    if (!e.recipe_id) throw new BadRequestException('Entry has no recipe');
    if (e.cooked) return e;

    const { data: recipe } = await this.sb
      .from(RECIPE_TABLE)
      .select('servings')
      .eq('user_id', this.userId)
      .eq('id', e.recipe_id)
      .maybeSingle();
    const recipeServings = Number((recipe as any)?.servings ?? 2);
    const scale = Number(e.servings) / Math.max(1, recipeServings);

    const { data: ris, error: riErr } = await this.sb
      .from(RI_TABLE)
      .select('ingredient_id, quantity')
      .eq('user_id', this.userId)
      .eq('recipe_id', e.recipe_id);
    if (riErr) throw riErr;

    for (const ri of (ris ?? []) as any[]) {
      const amount = Number(ri.quantity) * scale;
      if (amount > 0) await this.pantry.deductByIngredient(ri.ingredient_id, amount);
    }

    const { data: updated, error: updErr } = await this.sb
      .from(ENTRY_TABLE)
      .update({ cooked: true, cooked_at: new Date().toISOString() })
      .eq('user_id', this.userId)
      .eq('id', entryId)
      .select('*, recipe:recipes(*)')
      .single();
    if (updErr) throw updErr;

    await this.sb
      .from(RECIPE_TABLE)
      .update({ last_cooked_at: new Date().toISOString() })
      .eq('user_id', this.userId)
      .eq('id', e.recipe_id);

    this.logger.log(`Cooked entry ${entryId} — ${(ris ?? []).length} ingredients deducted`);
    return updated as MealPlanEntry;
  }

  // -----------------------------------------------------------
  // Shopping list from a plan
  // -----------------------------------------------------------

  async generateShoppingList(planId: string): Promise<{ created: number; staples: number }> {
    const plan = await this.getWithEntries(planId);

    type Need = {
      ingredient_id: string;
      name: string;
      category: PantryCategory;
      unit: PantryUnit;
      tier: string;
      total_needed: number;
      recipes: Map<string, number>;
    };
    const needs = new Map<string, Need>();

    for (const entry of plan.entries) {
      if (!entry.recipe_id) continue;
      const { data: recipe } = await this.sb
        .from(RECIPE_TABLE)
        .select('servings, name')
        .eq('user_id', this.userId)
        .eq('id', entry.recipe_id)
        .maybeSingle();
      const recipeName = String((recipe as any)?.name ?? 'Resepti');
      const recipeServings = Number((recipe as any)?.servings ?? 2);
      const scale = Number(entry.servings) / Math.max(1, recipeServings);

      const { data: ris } = await this.sb
        .from(RI_TABLE)
        .select('ingredient_id, quantity, unit, ingredient:ingredients(*)')
        .eq('user_id', this.userId)
        .eq('recipe_id', entry.recipe_id);

      for (const ri of (ris ?? []) as any[]) {
        const key = `${ri.ingredient_id}::${ri.unit}`;
        const existing = needs.get(key);
        const qty = Number(ri.quantity) * scale;
        const tier = ri.ingredient?.tier ?? 'tuore';
        // Perustarvikkeet oletetaan olevan.
        if (tier === 'perus') continue;
        if (existing) {
          existing.total_needed += qty;
          existing.recipes.set(recipeName, (existing.recipes.get(recipeName) ?? 0) + qty);
        } else {
          needs.set(key, {
            ingredient_id: ri.ingredient_id,
            name: ri.ingredient?.name ?? 'Tuote',
            category: ri.ingredient?.category ?? 'muu',
            unit: ri.unit,
            tier,
            total_needed: qty,
            recipes: new Map([[recipeName, qty]]),
          });
        }
      }
    }

    let created = 0;
    for (const need of needs.values()) {
      const pantry = await this.pantry.findByIngredient(need.ingredient_id);
      const checkFirst = need.tier === 'tarkistettava';
      // Säilyvä: ostetaan vain jos se ei ole kotona (tila muu kuin 'on').
      if (need.tier === 'sailyva' && pantry?.stock_status === 'on') continue;
      // Tarkistettavista ei ole saldoa: koko tarve listalle tarkistettavaksi.
      const have =
        pantry && !checkFirst && need.tier !== 'sailyva' ? Number(pantry.current_quantity) : 0;
      const fmt = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
      const note = [...need.recipes.entries()]
        .map(([r, q]) => `${r} ${fmt(q)}`)
        .join(', ');
      const missing = Math.max(0, need.total_needed - have);
      if (missing <= 0) continue;

      // Skip if already pending for this ingredient
      const { data: existingPending } = await this.sb
        .from('shopping_list_items')
        .select('id')
        .eq('user_id', this.userId)
        .eq('ingredient_id', need.ingredient_id)
        .eq('status', 'pending')
        .limit(1);
      if (existingPending && existingPending.length > 0) continue;

      // Choose a store from store_products (cheapest if priced)
      const { data: products } = await this.sb
        .from(STORE_TABLE)
        .select('store, approx_price')
        .eq('user_id', this.userId)
        .eq('ingredient_id', need.ingredient_id);
      let store: StoreId | null = null;
      if (products && products.length > 0) {
        const sorted = [...products].sort((a, b) => {
          const ap = a.approx_price ?? Infinity;
          const bp = b.approx_price ?? Infinity;
          return Number(ap) - Number(bp);
        });
        store = sorted[0].store as StoreId;
      } else if (pantry?.preferred_store) {
        store = pantry.preferred_store;
      }

      await this.shopping.create({
        ingredient_id: need.ingredient_id,
        name: need.name,
        quantity_to_buy: Math.ceil(missing * 10) / 10,
        unit: need.unit,
        category: need.category,
        store,
        source: 'meal_plan',
        meal_plan_id: planId,
        check_first: checkFirst,
        note,
      });
      created++;
    }
    const staples = await this.favorites.addDueToShoppingList();
    return { created, staples: staples.created };
  }

  // -----------------------------------------------------------
  // Batch cooking suggestions
  // -----------------------------------------------------------

  async batchSuggestions(planId: string) {
    const plan = await this.getWithEntries(planId);
    const recipeIds = plan.entries
      .map((e) => e.recipe_id)
      .filter((x): x is string => !!x);
    if (recipeIds.length === 0) return { suggestions: [] };

    const { data: ris } = await this.sb
      .from(RI_TABLE)
      .select('recipe_id, ingredient_id, ingredient:ingredients(name, category)')
      .eq('user_id', this.userId)
      .in('recipe_id', recipeIds);

    const byIngredient = new Map<string, { name: string; recipes: Set<string> }>();
    for (const ri of (ris ?? []) as any[]) {
      const cur = byIngredient.get(ri.ingredient_id) ?? {
        name: ri.ingredient?.name ?? '?',
        recipes: new Set<string>(),
      };
      cur.recipes.add(ri.recipe_id);
      byIngredient.set(ri.ingredient_id, cur);
    }

    const recipeNameMap = new Map(
      plan.entries
        .filter((e) => e.recipe?.id)
        .map((e) => [e.recipe!.id, e.recipe!.name]),
    );

    const suggestions: {
      kind: string;
      ingredient: string;
      recipes: string[];
      message: string;
    }[] = [];
    for (const [, v] of byIngredient) {
      if (v.recipes.size >= 3) {
        suggestions.push({
          kind: 'shared_ingredient',
          ingredient: v.name,
          recipes: [...v.recipes].map((r) => recipeNameMap.get(r) ?? r),
          message: `${v.name} on ${v.recipes.size} reseptissä — valmista kerralla.`,
        });
      }
    }

    return { suggestions };
  }
}
