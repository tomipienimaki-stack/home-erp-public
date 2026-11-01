import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SINGLE_USER_ID, SUPABASE_CLIENT } from '../supabase/supabase.module';
import { FoodPreference } from '../common/types';
import { CreateFoodPreferenceDto } from './dto';

const TABLE = 'food_preferences';

@Injectable()
export class FoodPreferencesService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly sb: SupabaseClient,
    @Inject(SINGLE_USER_ID) private readonly userId: string,
  ) {}

  async list(): Promise<FoodPreference[]> {
    const { data, error } = await this.sb
      .from(TABLE)
      .select('*, ingredient:ingredients(*)')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as FoodPreference[];
  }

  async create(dto: CreateFoodPreferenceDto): Promise<FoodPreference> {
    const { data, error } = await this.sb
      .from(TABLE)
      .insert({
        user_id: this.userId,
        type: dto.type,
        ingredient_id: dto.ingredient_id ?? null,
        category: dto.category ?? null,
        notes: dto.notes ?? null,
      })
      .select('*, ingredient:ingredients(*)')
      .single();
    if (error) throw error;
    return data as FoodPreference;
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
