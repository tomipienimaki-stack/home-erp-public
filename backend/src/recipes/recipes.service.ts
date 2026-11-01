import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SINGLE_USER_ID, SUPABASE_CLIENT } from '../supabase/supabase.module';
import { IngredientsService } from '../ingredients/ingredients.service';
import { Recipe, RecipeIngredient } from '../common/types';
import {
  CreateRecipeDto,
  RecipeIngredientInput,
  UpdateRecipeDto,
} from './dto';

const TABLE = 'recipes';
const RI_TABLE = 'recipe_ingredients';
const PANTRY_TABLE = 'pantry_items';

@Injectable()
export class RecipesService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly sb: SupabaseClient,
    @Inject(SINGLE_USER_ID) private readonly userId: string,
    private readonly ingredients: IngredientsService,
  ) {}

  async list(filters: { meal_type?: string; tag?: string } = {}): Promise<Recipe[]> {
    let q = this.sb
      .from(TABLE)
      .select('*')
      .eq('user_id', this.userId)
      .order('name');
    if (filters.meal_type) q = q.eq('meal_type', filters.meal_type);
    if (filters.tag) q = q.contains('tags', [filters.tag]);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as Recipe[];
  }

  async getWithIngredients(id: string): Promise<Recipe & { ingredients: RecipeIngredient[] }> {
    const { data: recipe, error } = await this.sb
      .from(TABLE)
      .select('*')
      .eq('user_id', this.userId)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!recipe) throw new NotFoundException(`Recipe ${id} not found`);

    const { data: ris, error: riErr } = await this.sb
      .from(RI_TABLE)
      .select('*, ingredient:ingredients(*)')
      .eq('user_id', this.userId)
      .eq('recipe_id', id);
    if (riErr) throw riErr;

    return { ...(recipe as Recipe), ingredients: (ris ?? []) as RecipeIngredient[] };
  }

  /** Returns recipe ingredients with current pantry availability per ingredient. */
  async getIngredientsWithAvailability(id: string) {
    const recipe = await this.getWithIngredients(id);

    const ingredientIds = recipe.ingredients.map((r) => r.ingredient_id);
    if (ingredientIds.length === 0) {
      return { recipe, ingredients: [] };
    }

    const { data: pantryRows, error } = await this.sb
      .from(PANTRY_TABLE)
      .select('ingredient_id, current_quantity, unit')
      .eq('user_id', this.userId)
      .in('ingredient_id', ingredientIds);
    if (error) throw error;
    const map = new Map((pantryRows ?? []).map((r: any) => [r.ingredient_id, r]));

    const ingredients = recipe.ingredients.map((ri) => {
      const pantry = map.get(ri.ingredient_id);
      const have = pantry ? Number(pantry.current_quantity) : 0;
      const need = Number(ri.quantity);
      return {
        ...ri,
        have,
        need,
        sufficient: have >= need,
        missing: Math.max(0, need - have),
      };
    });

    return { recipe, ingredients };
  }

  async create(dto: CreateRecipeDto): Promise<Recipe> {
    const { data: recipe, error } = await this.sb
      .from(TABLE)
      .insert({
        user_id: this.userId,
        name: dto.name.trim(),
        description: dto.description ?? null,
        servings: dto.servings ?? 2,
        prep_time_min: dto.prep_time_min ?? null,
        cook_time_min: dto.cook_time_min ?? null,
        meal_type: dto.meal_type ?? 'paivallinen',
        instructions: dto.instructions ?? null,
        tags: dto.tags ?? [],
      })
      .select('*')
      .single();
    if (error) throw error;

    await this.replaceIngredients((recipe as Recipe).id, dto.ingredients);
    return recipe as Recipe;
  }

  async update(id: string, dto: UpdateRecipeDto): Promise<Recipe> {
    const patch: Record<string, any> = {};
    for (const key of [
      'name',
      'description',
      'servings',
      'prep_time_min',
      'cook_time_min',
      'meal_type',
      'instructions',
      'tags',
    ] as const) {
      if (key in dto) patch[key] = (dto as any)[key];
    }

    let recipe: Recipe;
    if (Object.keys(patch).length > 0) {
      const { data, error } = await this.sb
        .from(TABLE)
        .update(patch)
        .eq('user_id', this.userId)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      if (!data) throw new NotFoundException(`Recipe ${id} not found`);
      recipe = data as Recipe;
    } else {
      recipe = await this.get(id);
    }

    if (dto.ingredients) {
      await this.replaceIngredients(recipe.id, dto.ingredients);
    }
    return recipe;
  }

  async get(id: string): Promise<Recipe> {
    const { data, error } = await this.sb
      .from(TABLE)
      .select('*')
      .eq('user_id', this.userId)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException(`Recipe ${id} not found`);
    return data as Recipe;
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

  /** Replace the full set of ingredients for a recipe. */
  private async replaceIngredients(
    recipeId: string,
    inputs: RecipeIngredientInput[],
  ): Promise<void> {
    await this.sb
      .from(RI_TABLE)
      .delete()
      .eq('user_id', this.userId)
      .eq('recipe_id', recipeId);

    if (inputs.length === 0) return;

    const rows: any[] = [];
    for (const input of inputs) {
      let ingredientId = input.ingredient_id;
      if (!ingredientId) {
        if (!input.name) continue;
        const ing = await this.ingredients.upsertByName(input.name, {
          default_unit: input.unit,
          category: input.category,
          tier: input.tier,
        });
        ingredientId = ing.id;
      }
      rows.push({
        user_id: this.userId,
        recipe_id: recipeId,
        ingredient_id: ingredientId,
        quantity: input.quantity,
        unit: input.unit,
        notes: input.notes ?? null,
      });
    }

    if (rows.length === 0) return;
    const { error } = await this.sb.from(RI_TABLE).insert(rows);
    if (error) throw error;
  }
}
