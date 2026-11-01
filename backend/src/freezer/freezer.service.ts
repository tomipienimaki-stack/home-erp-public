import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SINGLE_USER_ID, SUPABASE_CLIENT } from '../supabase/supabase.module';
import { FreezerItem } from '../common/types';
import { AdjustPortionsDto, CreateFreezerItemDto, UpdateFreezerItemDto } from './dto';

const TABLE = 'freezer_items';

@Injectable()
export class FreezerService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly sb: SupabaseClient,
    @Inject(SINGLE_USER_ID) private readonly userId: string,
  ) {}

  /** Pakastimen sisältö, vanhimmat ensin. includeEmpty näyttää myös loppuneet. */
  async list(includeEmpty = false): Promise<FreezerItem[]> {
    let q = this.sb
      .from(TABLE)
      .select('*')
      .eq('user_id', this.userId)
      .order('frozen_at', { ascending: true });
    if (!includeEmpty) q = q.gt('portions', 0);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as FreezerItem[];
  }

  async get(id: string): Promise<FreezerItem> {
    const { data, error } = await this.sb
      .from(TABLE)
      .select('*')
      .eq('user_id', this.userId)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException(`Freezer item ${id} not found`);
    return data as FreezerItem;
  }

  async create(dto: CreateFreezerItemDto): Promise<FreezerItem> {
    const { data, error } = await this.sb
      .from(TABLE)
      .insert({
        user_id: this.userId,
        name: dto.name.trim(),
        recipe_id: dto.recipe_id ?? null,
        portions: dto.portions,
        portion_size: dto.portion_size ?? null,
        frozen_at: dto.frozen_at ?? new Date().toISOString().slice(0, 10),
        notes: dto.notes ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as FreezerItem;
  }

  async update(id: string, dto: UpdateFreezerItemDto): Promise<FreezerItem> {
    const { data, error } = await this.sb
      .from(TABLE)
      .update(dto)
      .eq('user_id', this.userId)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    if (!data) throw new NotFoundException(`Freezer item ${id} not found`);
    return data as FreezerItem;
  }

  async adjust(id: string, dto: AdjustPortionsDto): Promise<FreezerItem> {
    const current = await this.get(id);
    const next = Math.max(0, Number(current.portions) + dto.delta);
    return this.update(id, { portions: next });
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
