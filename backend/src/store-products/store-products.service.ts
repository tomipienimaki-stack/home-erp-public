import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SINGLE_USER_ID, SUPABASE_CLIENT } from '../supabase/supabase.module';
import { StoreProduct } from '../common/types';
import { CreateStoreProductDto, UpdateStoreProductDto } from './dto';

const TABLE = 'store_products';

@Injectable()
export class StoreProductsService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly sb: SupabaseClient,
    @Inject(SINGLE_USER_ID) private readonly userId: string,
  ) {}

  async list(filters: { store?: string; ingredient_id?: string } = {}): Promise<StoreProduct[]> {
    let q = this.sb
      .from(TABLE)
      .select('*, ingredient:ingredients(*)')
      .eq('user_id', this.userId)
      .order('product_name');
    if (filters.store) q = q.eq('store', filters.store);
    if (filters.ingredient_id) q = q.eq('ingredient_id', filters.ingredient_id);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as StoreProduct[];
  }

  async listByIngredient(ingredientId: string): Promise<StoreProduct[]> {
    return this.list({ ingredient_id: ingredientId });
  }

  async create(dto: CreateStoreProductDto): Promise<StoreProduct> {
    const { data, error } = await this.sb
      .from(TABLE)
      .insert({
        user_id: this.userId,
        ingredient_id: dto.ingredient_id,
        store: dto.store,
        product_name: dto.product_name.trim(),
        package_size: dto.package_size,
        package_unit: dto.package_unit,
        approx_price: dto.approx_price ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as StoreProduct;
  }

  async update(id: string, dto: UpdateStoreProductDto): Promise<StoreProduct> {
    const { data, error } = await this.sb
      .from(TABLE)
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('user_id', this.userId)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    if (!data) throw new NotFoundException(`Store product ${id} not found`);
    return data as StoreProduct;
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
}
