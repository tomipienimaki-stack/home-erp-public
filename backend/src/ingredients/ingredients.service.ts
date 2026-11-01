import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SINGLE_USER_ID, SUPABASE_CLIENT } from '../supabase/supabase.module';
import { Ingredient } from '../common/types';
import { CreateIngredientDto, UpdateIngredientDto } from './dto';

const TABLE = 'ingredients';

@Injectable()
export class IngredientsService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly sb: SupabaseClient,
    @Inject(SINGLE_USER_ID) private readonly userId: string,
  ) {}

  async list(category?: string, tier?: string): Promise<Ingredient[]> {
    let q = this.sb
      .from(TABLE)
      .select('*')
      .eq('user_id', this.userId)
      .order('name');
    if (category) q = q.eq('category', category);
    if (tier) q = q.eq('tier', tier);
    const { data, error } = await q;
    if (error) throw error;
    const usage = await this.usage();
    return ((data ?? []) as Ingredient[]).map((i) => ({ ...i, ...(usage.get(i.id) ?? {}) }));
  }

  /**
   * Käyttömäärä resepteissä ja täydennystapa per raaka-aine.
   * Ydinvarasto = käsin asetettu tai vähintään RESTOCK_CORE_MIN_RECIPES reseptiä (oletus 2).
   */
  async usage(): Promise<Map<string, { recipe_count: number; restock_mode: 'ydin' | 'tarvittaessa' }>> {
    const minRecipes = Number(process.env.RESTOCK_CORE_MIN_RECIPES ?? 2);
    const [{ data: counts, error: e1 }, { data: overrides, error: e2 }] = await Promise.all([
      this.sb.from('ingredient_usage').select('ingredient_id, recipe_count').eq('user_id', this.userId),
      this.sb.from(TABLE).select('id, restock_override').eq('user_id', this.userId),
    ]);
    // Näkymä tulee migraatiosta 0006; ilman sitä palautetaan tyhjä (ei kaadeta varastonäkymää).
    if (e1 || e2) return new Map();
    const override = new Map((overrides ?? []).map((r: any) => [r.id, r.restock_override]));
    return new Map(
      (counts ?? []).map((r: any) => {
        const n = Number(r.recipe_count);
        const mode = override.get(r.ingredient_id) ?? (n >= minRecipes ? 'ydin' : 'tarvittaessa');
        return [r.ingredient_id, { recipe_count: n, restock_mode: mode }];
      }),
    );
  }

  async get(id: string): Promise<Ingredient> {
    const { data, error } = await this.sb
      .from(TABLE)
      .select('*')
      .eq('user_id', this.userId)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException(`Ingredient ${id} not found`);
    return data as Ingredient;
  }

  async create(dto: CreateIngredientDto): Promise<Ingredient> {
    const { data, error } = await this.sb
      .from(TABLE)
      .insert({
        user_id: this.userId,
        name: dto.name.trim(),
        default_unit: dto.default_unit ?? 'kpl',
        category: dto.category ?? 'muu',
      })
      .select('*')
      .single();
    if (error) {
      if ((error as any).code === '23505') {
        throw new ConflictException(`Ingredient "${dto.name}" already exists`);
      }
      throw error;
    }
    return data as Ingredient;
  }

  /** Create or fetch existing ingredient by name (case-insensitive). */
  async upsertByName(
    name: string,
    fallback: Partial<CreateIngredientDto> = {},
  ): Promise<Ingredient> {
    const trimmed = name.trim();
    const { data: existing, error: lookupErr } = await this.sb
      .from(TABLE)
      .select('*')
      .eq('user_id', this.userId)
      .ilike('name', trimmed)
      .maybeSingle();
    if (lookupErr) throw lookupErr;
    if (existing) return existing as Ingredient;
    return this.create({
      name: trimmed,
      default_unit: fallback.default_unit ?? 'kpl',
      category: fallback.category ?? 'muu',
      tier: fallback.tier,
    });
  }

  async update(id: string, dto: UpdateIngredientDto): Promise<Ingredient> {
    const { data, error } = await this.sb
      .from(TABLE)
      .update(dto)
      .eq('user_id', this.userId)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    if (!data) throw new NotFoundException(`Ingredient ${id} not found`);
    return data as Ingredient;
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
