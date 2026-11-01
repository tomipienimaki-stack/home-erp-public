import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SupabaseClient } from '@supabase/supabase-js';
import { SINGLE_USER_ID, SUPABASE_CLIENT } from '../supabase/supabase.module';
import { IngredientsService } from '../ingredients/ingredients.service';
import { PantryItem } from '../common/types';
import {
  ConsumePantryItemDto,
  CreatePantryItemDto,
  UpdatePantryItemDto,
} from './dto';

const TABLE = 'pantry_items';
const SHOPPING_TABLE = 'shopping_list_items';

@Injectable()
export class PantryService {
  private readonly logger = new Logger(PantryService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly sb: SupabaseClient,
    @Inject(SINGLE_USER_ID) private readonly userId: string,
    private readonly ingredients: IngredientsService,
  ) {}

  /** Joined select string for pantry rows + their ingredient row. */
  private get joinSelect() {
    return '*, ingredient:ingredients(*)';
  }

  async list(): Promise<PantryItem[]> {
    const { data, error } = await this.sb
      .from(TABLE)
      .select(this.joinSelect)
      .eq('user_id', this.userId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    const usage = await this.ingredients.usage();
    return ((data ?? []) as unknown as PantryItem[])
      .map((row) => ({ ...row, ...(usage.get(row.ingredient_id) ?? {}) }))
      .sort((a, b) => (b.recipe_count ?? 0) - (a.recipe_count ?? 0));
  }

  async get(id: string): Promise<PantryItem> {
    const { data, error } = await this.sb
      .from(TABLE)
      .select(this.joinSelect)
      .eq('user_id', this.userId)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException(`Pantry item ${id} not found`);
    return data as unknown as PantryItem;
  }

  /** Look up pantry row by ingredient_id (or null if not stocked). */
  async findByIngredient(ingredientId: string): Promise<PantryItem | null> {
    const { data, error } = await this.sb
      .from(TABLE)
      .select(this.joinSelect)
      .eq('user_id', this.userId)
      .eq('ingredient_id', ingredientId)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as unknown as PantryItem | null;
  }

  async create(dto: CreatePantryItemDto): Promise<PantryItem> {
    let ingredientId = dto.ingredient_id;
    if (!ingredientId) {
      if (!dto.name) throw new BadRequestException('ingredient_id or name required');
      const ing = await this.ingredients.upsertByName(dto.name, {
        default_unit: dto.unit,
        category: dto.category,
      });
      ingredientId = ing.id;
    }

    const { data, error } = await this.sb
      .from(TABLE)
      .insert({
        user_id: this.userId,
        ingredient_id: ingredientId,
        current_quantity: dto.current_quantity ?? 0,
        unit: dto.unit ?? 'kpl',
        min_threshold: dto.min_threshold ?? 0,
        preferred_store: dto.preferred_store ?? null,
        notes: dto.notes ?? null,
        stock_status: dto.stock_status ?? null,
        best_before: dto.best_before ?? null,
      })
      .select(this.joinSelect)
      .single();
    if (error) {
      if ((error as any).code === '23505') {
        // Already exists for this ingredient — update instead
        const existing = await this.findByIngredient(ingredientId);
        if (existing) return this.update(existing.id, dto);
      }
      throw error;
    }
    await this.checkThresholdFor(data as unknown as PantryItem);
    return data as unknown as PantryItem;
  }

  async update(id: string, dto: UpdatePantryItemDto): Promise<PantryItem> {
    const { data, error } = await this.sb
      .from(TABLE)
      .update(dto)
      .eq('user_id', this.userId)
      .eq('id', id)
      .select(this.joinSelect)
      .single();
    if (error) throw error;
    if (!data) throw new NotFoundException(`Pantry item ${id} not found`);
    await this.checkThresholdFor(data as unknown as PantryItem);
    return data as unknown as PantryItem;
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

  async consume(id: string, dto: ConsumePantryItemDto): Promise<PantryItem> {
    const current = await this.get(id);
    const next = Math.max(0, Number(current.current_quantity) - dto.amount);
    return this.update(id, { current_quantity: next });
  }

  /** Deduct an amount by ingredient_id (creates a 0-row if not stocked). */
  async deductByIngredient(
    ingredientId: string,
    amount: number,
  ): Promise<PantryItem | null> {
    const row = await this.findByIngredient(ingredientId);
    if (!row) return null;
    return this.update(row.id, {
      current_quantity: Math.max(0, Number(row.current_quantity) - amount),
    });
  }

  /** Ostettu säilyvä tuote: tila takaisin 'on'. Palauttaa true jos rivi oli tilaseurannassa. */
  async markRestocked(ingredientId: string): Promise<boolean> {
    const row = await this.findByIngredient(ingredientId);
    if (!row || !row.stock_status) return false;
    const { error } = await this.sb
      .from(TABLE)
      .update({ stock_status: 'on' })
      .eq('user_id', this.userId)
      .eq('id', row.id);
    if (error) throw error;
    return true;
  }

  /** Tuoreet, joiden parasta ennen -päivä on enintään `days` päivän päästä. */
  async expiringSoon(days = 3): Promise<PantryItem[]> {
    const limit = new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
    const { data, error } = await this.sb
      .from(TABLE)
      .select(this.joinSelect)
      .eq('user_id', this.userId)
      .not('best_before', 'is', null)
      .lte('best_before', limit)
      .gt('current_quantity', 0)
      .order('best_before');
    if (error) throw error;
    return (data ?? []) as unknown as PantryItem[];
  }

  // ===============================================================
  // Threshold logic
  // ===============================================================

  async checkAllThresholds(): Promise<{ created: number }> {
    const items = await this.list();
    let created = 0;
    for (const item of items) {
      if (await this.checkThresholdFor(item)) created++;
    }
    return { created };
  }

  private async checkThresholdFor(item: PantryItem): Promise<boolean> {
    // Säilyvät: tila ratkaisee, ei määrä.
    if (item.stock_status) {
      if (item.stock_status === 'on') return false;
      // Säilyvistä vain ydinvarasto täydennetään automaattisesti; tarvittaessa-ryhmä ostetaan ruokalistan mukaan.
      if (item.ingredient?.tier === 'sailyva') {
        const mode = (await this.ingredients.usage()).get(item.ingredient_id)?.restock_mode;
        if (mode !== 'ydin') return false;
      }
    } else {
      // Määräseuranta vain jos minimiraja on asetettu (tuoreiden ylijäämät eivät tilaa mitään).
      if (Number(item.min_threshold) <= 0) return false;
      if (Number(item.current_quantity) > Number(item.min_threshold)) return false;
    }

    const { data: existing, error: lookupErr } = await this.sb
      .from(SHOPPING_TABLE)
      .select('id')
      .eq('user_id', this.userId)
      .eq('ingredient_id', item.ingredient_id)
      .eq('status', 'pending')
      .limit(1);
    if (lookupErr) throw lookupErr;
    if (existing && existing.length > 0) return false;

    const target = Number(item.min_threshold) * 2 || 1;
    const quantityToBuy = item.stock_status
      ? 1
      : Math.max(1, target - Number(item.current_quantity));

    const ingredient = item.ingredient;
    const { error: insertErr } = await this.sb.from(SHOPPING_TABLE).insert({
      user_id: this.userId,
      ingredient_id: item.ingredient_id,
      name: ingredient?.name ?? 'Tuote',
      quantity_to_buy: quantityToBuy,
      unit: item.stock_status ? 'kpl' : item.unit,
      category: ingredient?.category ?? 'muu',
      store: item.preferred_store,
      status: 'pending',
      source: 'threshold',
    });
    if (insertErr) throw insertErr;
    this.logger.log(`Auto-added "${ingredient?.name ?? '?'}" to shopping list`);
    return true;
  }

  @Cron('0 7 * * *', { name: 'daily-threshold-check' })
  async scheduledThresholdCheck() {
    try {
      const { created } = await this.checkAllThresholds();
      this.logger.log(`Daily threshold check: ${created} item(s) added`);
    } catch (err) {
      this.logger.error('Daily threshold check failed', err as Error);
    }
  }

  // ===============================================================
  // Daily consumption auto-decrement (06:00)
  // ===============================================================

  @Cron('0 6 * * *', { name: 'daily-consumption-decrement' })
  async scheduledConsumption() {
    try {
      const result = await this.applyDailyConsumption();
      this.logger.log(
        `Daily consumption: decremented ${result.decremented} item(s)`,
      );
    } catch (err) {
      this.logger.error('Daily consumption failed', err as Error);
    }
  }

  async applyDailyConsumption(): Promise<{ decremented: number }> {
    const { data: items, error } = await this.sb
      .from(TABLE)
      .select(this.joinSelect)
      .eq('user_id', this.userId)
      .gt('daily_consumption', 0);
    if (error) throw error;

    const now = new Date();
    let decremented = 0;
    for (const row of (items ?? []) as unknown as PantryItem[]) {
      const daily = Number(row.daily_consumption);
      if (daily <= 0) continue;
      const step = consumptionStep(row.last_consumption_at, now);
      if (!step) continue;
      const next = Math.max(0, Number(row.current_quantity) - daily * step.days);
      await this.update(row.id, { current_quantity: next });
      await this.sb
        .from(TABLE)
        .update({ last_consumption_at: step.nextMark.toISOString() })
        .eq('id', row.id)
        .eq('user_id', this.userId);
      decremented++;
    }
    return { decremented };
  }
}

const DAY_MS = 86_400_000;

/**
 * Kuinka monta täyttä vuorokautta kulutusta kirjataan nyt. Idempotentti: saman
 * vuorokauden aikana toistettu ajo ei vähennä uudelleen, ja aikaleima siirtyy
 * vain kirjattujen vuorokausien verran, jottei osavuorokausia häviä.
 */
export function consumptionStep(
  lastIso: string | null | undefined,
  now: Date,
): { days: number; nextMark: Date } | null {
  if (!lastIso) return { days: 1, nextMark: now };
  const last = new Date(lastIso);
  const days = Math.floor((now.getTime() - last.getTime()) / DAY_MS);
  if (days < 1) return null;
  return { days, nextMark: new Date(last.getTime() + days * DAY_MS) };
}
