import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SINGLE_USER_ID, SUPABASE_CLIENT } from '../supabase/supabase.module';
import { ShoppingListItem } from '../common/types';
import {
  CreateShoppingItemDto,
  MarkBoughtDto,
  UpdateShoppingItemDto,
} from './dto';

const TABLE = 'shopping_list_items';
const PANTRY_TABLE = 'pantry_items';

@Injectable()
export class ShoppingListService {
  private readonly logger = new Logger(ShoppingListService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly sb: SupabaseClient,
    @Inject(SINGLE_USER_ID) private readonly userId: string,
  ) {}

  async listPending(): Promise<ShoppingListItem[]> {
    const { data, error } = await this.sb
      .from(TABLE)
      .select('*')
      .eq('user_id', this.userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as ShoppingListItem[];
  }

  async listAll(): Promise<ShoppingListItem[]> {
    const { data, error } = await this.sb
      .from(TABLE)
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as ShoppingListItem[];
  }

  async create(dto: CreateShoppingItemDto): Promise<ShoppingListItem> {
    const { data, error } = await this.sb
      .from(TABLE)
      .insert({
        user_id: this.userId,
        ingredient_id: dto.ingredient_id ?? null,
        name: dto.name.trim(),
        quantity_to_buy: dto.quantity_to_buy,
        unit: dto.unit,
        category: dto.category,
        store: dto.store ?? null,
        source: dto.source ?? 'manual',
        meal_plan_id: dto.meal_plan_id ?? null,
        pantry_addition_amount: dto.pantry_addition_amount ?? null,
        pantry_addition_unit: dto.pantry_addition_unit ?? null,
        favorite_id: dto.favorite_id ?? null,
        check_first: dto.check_first ?? false,
        note: dto.note ?? null,
        status: 'pending',
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as ShoppingListItem;
  }

  async update(id: string, dto: UpdateShoppingItemDto): Promise<ShoppingListItem> {
    const { data, error } = await this.sb
      .from(TABLE)
      .update(dto)
      .eq('user_id', this.userId)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    if (!data) throw new NotFoundException(`Shopping item ${id} not found`);
    return data as ShoppingListItem;
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

  async markBought(id: string, dto: MarkBoughtDto): Promise<ShoppingListItem> {
    const { data: row, error: getErr } = await this.sb
      .from(TABLE)
      .select('*')
      .eq('user_id', this.userId)
      .eq('id', id)
      .maybeSingle();
    if (getErr) throw getErr;
    if (!row) throw new NotFoundException(`Shopping item ${id} not found`);

    const item = row as ShoppingListItem;

    // Determine pantry addition: prefer explicit pack-conversion fields if set.
    // Otherwise scale quantity_to_buy by quantity_bought / quantity_to_buy.
    const userQty = dto.quantity_bought ?? Number(item.quantity_to_buy);
    let pantryAddition: number;
    let pantryUnit = item.unit;
    if (
      item.pantry_addition_amount != null &&
      item.pantry_addition_unit != null
    ) {
      const ratio = userQty / Number(item.quantity_to_buy || 1);
      pantryAddition = Number(item.pantry_addition_amount) * ratio;
      pantryUnit = item.pantry_addition_unit;
    } else {
      pantryAddition = userQty;
    }

    const { data: updated, error: updErr } = await this.sb
      .from(TABLE)
      .update({ status: 'bought', bought_at: new Date().toISOString() })
      .eq('user_id', this.userId)
      .eq('id', id)
      .select('*')
      .single();
    if (updErr) throw updErr;

    // Vakiotuote: päivitetään viimeisin ostopäivä.
    if (item.favorite_id) {
      await this.sb
        .from('favorite_products')
        .update({ last_bought_at: new Date().toISOString().slice(0, 10) })
        .eq('user_id', this.userId)
        .eq('id', item.favorite_id);
    }

    // Varastotaso ratkaisee, mitä ostoksen jälkeen kirjataan.
    let tier: string | null = null;
    if (item.ingredient_id) {
      const { data: ing } = await this.sb
        .from('ingredients')
        .select('tier')
        .eq('user_id', this.userId)
        .eq('id', item.ingredient_id)
        .maybeSingle();
      tier = (ing as any)?.tier ?? null;
    }
    if (item.ingredient_id && tier === 'sailyva') {
      // Säilyvä: tila takaisin 'on', ei määriä.
      await this.sb
        .from(PANTRY_TABLE)
        .upsert(
          {
            user_id: this.userId,
            ingredient_id: item.ingredient_id,
            current_quantity: 0,
            unit: item.unit,
            min_threshold: 0,
            stock_status: 'on',
          },
          { onConflict: 'user_id,ingredient_id' },
        );
      return updated as ShoppingListItem;
    }
    if (tier === 'perus' || tier === 'tarkistettava') {
      // Ei määräseurantaa. Jos tuote oli merkitty loppuneeksi, tila takaisin 'on'.
      await this.sb
        .from(PANTRY_TABLE)
        .update({ stock_status: 'on' })
        .eq('user_id', this.userId)
        .eq('ingredient_id', item.ingredient_id as string)
        .not('stock_status', 'is', null);
      return updated as ShoppingListItem;
    }

    // Sync to pantry if linked by ingredient_id
    if (item.ingredient_id) {
      const { data: pantryRow } = await this.sb
        .from(PANTRY_TABLE)
        .select('id, current_quantity')
        .eq('user_id', this.userId)
        .eq('ingredient_id', item.ingredient_id)
        .maybeSingle();

      if (pantryRow) {
        const next = Number(pantryRow.current_quantity) + pantryAddition;
        await this.sb
          .from(PANTRY_TABLE)
          .update({ current_quantity: next })
          .eq('user_id', this.userId)
          .eq('id', pantryRow.id);
      } else {
        // Auto-add a pantry row at the purchased quantity
        await this.sb.from(PANTRY_TABLE).insert({
          user_id: this.userId,
          ingredient_id: item.ingredient_id,
          current_quantity: pantryAddition,
          unit: pantryUnit,
          min_threshold: 0,
          preferred_store: item.store,
        });
      }
    }

    return updated as ShoppingListItem;
  }

  async clearBought(): Promise<{ removed: number }> {
    const { data, error } = await this.sb
      .from(TABLE)
      .delete()
      .eq('user_id', this.userId)
      .eq('status', 'bought')
      .select('id');
    if (error) throw error;
    return { removed: data?.length ?? 0 };
  }
}
