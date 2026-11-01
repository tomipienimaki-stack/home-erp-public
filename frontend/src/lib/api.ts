import type {
  FavoriteProduct,
  FoodPreference,
  FreezerItem,
  ImportedFavoriteItem,
  Ingredient,
  MealPlan,
  MealPlanEntry,
  PantryCategory,
  PantryItem,
  PantryUnit,
  PlanMealType,
  PreferenceType,
  Recipe,
  RecipeIngredient,
  RecipeWithIngredients,
  ShoppingListItem,
  ShoppingSource,
  StoreId,
  StoreProduct,
} from '../types';
import { authDisabled, supabase } from './supabase';

const BASE = '/api';

async function http<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, ...rest } = init;
  const authHeaders: Record<string, string> = {};
  if (!authDisabled()) {
    const { data } = await supabase.auth.getSession();
    if (data.session) authHeaders.Authorization = `Bearer ${data.session.access_token}`;
  }
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(rest.headers || {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  if (res.status === 401 && !authDisabled()) {
    await supabase.auth.signOut();
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ============================================================
// Ingredients
// ============================================================
export const IngredientsAPI = {
  list: (category?: PantryCategory) =>
    http<Ingredient[]>(`/ingredients${category ? `?category=${category}` : ''}`),
  create: (body: { name: string; default_unit?: PantryUnit; category?: PantryCategory }) =>
    http<Ingredient>('/ingredients', { method: 'POST', json: body }),
  update: (id: string, body: Partial<Ingredient>) =>
    http<Ingredient>(`/ingredients/${id}`, { method: 'PATCH', json: body }),
  delete: (id: string) => http<{ id: string }>(`/ingredients/${id}`, { method: 'DELETE' }),
};

// ============================================================
// Pantry
// ============================================================
export const PantryAPI = {
  list: () => http<PantryItem[]>('/pantry'),
  get: (id: string) => http<PantryItem>(`/pantry/${id}`),
  create: (body: {
    ingredient_id?: string;
    name?: string;
    category?: PantryCategory;
    current_quantity: number;
    unit: PantryUnit;
    min_threshold: number;
    preferred_store?: StoreId | null;
    notes?: string | null;
  }) => http<PantryItem>('/pantry', { method: 'POST', json: body }),
  update: (id: string, body: Partial<PantryItem>) =>
    http<PantryItem>(`/pantry/${id}`, { method: 'PATCH', json: body }),
  delete: (id: string) => http<{ id: string }>(`/pantry/${id}`, { method: 'DELETE' }),
  consume: (id: string, amount: number) =>
    http<PantryItem>(`/pantry/${id}/consume`, { method: 'POST', json: { amount } }),
  checkThresholds: () =>
    http<{ created: number }>('/pantry/check-thresholds', { method: 'POST' }),
};

// ============================================================
// Shopping list
// ============================================================
export const ShoppingAPI = {
  listPending: () => http<ShoppingListItem[]>('/shopping-list'),
  listAll: () => http<ShoppingListItem[]>('/shopping-list/all'),
  create: (body: {
    ingredient_id?: string | null;
    name: string;
    quantity_to_buy: number;
    unit: PantryUnit;
    category: PantryCategory;
    store?: StoreId | null;
    source?: ShoppingSource;
  }) => http<ShoppingListItem>('/shopping-list', { method: 'POST', json: body }),
  update: (id: string, body: Partial<ShoppingListItem>) =>
    http<ShoppingListItem>(`/shopping-list/${id}`, { method: 'PATCH', json: body }),
  delete: (id: string) =>
    http<{ id: string }>(`/shopping-list/${id}`, { method: 'DELETE' }),
  markBought: (id: string, quantity_bought?: number) =>
    http<ShoppingListItem>(`/shopping-list/${id}/bought`, {
      method: 'POST',
      json: quantity_bought !== undefined ? { quantity_bought } : {},
    }),
  clearBought: () =>
    http<{ removed: number }>('/shopping-list/clear-bought', { method: 'POST' }),
};

// ============================================================
// Recipes
// ============================================================
export const RecipesAPI = {
  list: (params?: { meal_type?: string; tag?: string }) => {
    const qs = new URLSearchParams();
    if (params?.meal_type) qs.set('meal_type', params.meal_type);
    if (params?.tag) qs.set('tag', params.tag);
    const s = qs.toString();
    return http<Recipe[]>(`/recipes${s ? `?${s}` : ''}`);
  },
  get: (id: string) => http<RecipeWithIngredients>(`/recipes/${id}`),
  availability: (id: string) =>
    http<{ recipe: RecipeWithIngredients; ingredients: RecipeIngredient[] }>(
      `/recipes/${id}/ingredients`,
    ),
  create: (body: any) => http<Recipe>('/recipes', { method: 'POST', json: body }),
  update: (id: string, body: any) =>
    http<Recipe>(`/recipes/${id}`, { method: 'PATCH', json: body }),
  delete: (id: string) =>
    http<{ id: string }>(`/recipes/${id}`, { method: 'DELETE' }),
  importFromImage: (image_base64: string, mime_type: string) =>
    http<{
      name: string;
      description: string | null;
      servings: number;
      prep_time_min: number | null;
      cook_time_min: number | null;
      meal_type: 'aamiainen' | 'lounas' | 'paivallinen' | 'valipala';
      instructions: string;
      tags: string[];
      ingredients: {
        name: string;
        quantity: number;
        unit: PantryUnit;
        category: PantryCategory;
        notes: string | null;
      }[];
    }>('/recipes/import-from-image', {
      method: 'POST',
      json: { image_base64, mime_type },
    }),
};

// ============================================================
// Store products
// ============================================================
export const StoreProductsAPI = {
  list: () => http<StoreProduct[]>('/store-products'),
  byIngredient: (ingredientId: string) =>
    http<StoreProduct[]>(`/store-products/by-ingredient/${ingredientId}`),
  create: (body: {
    ingredient_id: string;
    store: StoreId;
    product_name: string;
    package_size: number;
    package_unit: PantryUnit;
    approx_price?: number | null;
  }) => http<StoreProduct>('/store-products', { method: 'POST', json: body }),
  delete: (id: string) =>
    http<{ id: string }>(`/store-products/${id}`, { method: 'DELETE' }),
};

// ============================================================
// Food preferences
// ============================================================
export const PreferencesAPI = {
  list: () => http<FoodPreference[]>('/food-preferences'),
  create: (body: {
    type: PreferenceType;
    ingredient_id?: string;
    category?: PantryCategory;
    notes?: string | null;
  }) => http<FoodPreference>('/food-preferences', { method: 'POST', json: body }),
  delete: (id: string) =>
    http<{ id: string }>(`/food-preferences/${id}`, { method: 'DELETE' }),
};

// ============================================================
// Favorites
// ============================================================
export const FreezerAPI = {
  list: () => http<FreezerItem[]>('/freezer'),
  create: (body: { name: string; portions: number; portion_size?: string; recipe_id?: string }) =>
    http<FreezerItem>('/freezer', { method: 'POST', json: body }),
  adjust: (id: string, delta: number) =>
    http<FreezerItem>(`/freezer/${id}/adjust`, { method: 'POST', json: { delta } }),
  delete: (id: string) => http<{ id: string }>(`/freezer/${id}`, { method: 'DELETE' }),
};

export const FavoritesAPI = {
  list: () => http<FavoriteProduct[]>('/favorites'),
  create: (body: Partial<FavoriteProduct> & { name: string }) =>
    http<FavoriteProduct>('/favorites', { method: 'POST', json: body }),
  update: (id: string, body: Partial<FavoriteProduct>) =>
    http<FavoriteProduct>(`/favorites/${id}`, { method: 'PATCH', json: body }),
  delete: (id: string) =>
    http<{ id: string }>(`/favorites/${id}`, { method: 'DELETE' }),
  bulkInsert: (items: ImportedFavoriteItem[]) =>
    http<{ inserted: number }>('/favorites/bulk', {
      method: 'POST',
      json: { items },
    }),
  importText: (text: string, default_store?: StoreId) =>
    http<{ items: ImportedFavoriteItem[] }>('/favorites/import-text', {
      method: 'POST',
      json: { text, default_store },
    }),
  due: () => http<FavoriteProduct[]>('/favorites/due'),
  addDueToShopping: () =>
    http<{ created: number; skipped: number }>('/favorites/add-due-to-shopping', { method: 'POST' }),
  addToShopping: (id: string, quantity?: number) =>
    http<{ ok: true }>(
      `/favorites/${id}/add-to-shopping${quantity ? `?quantity=${quantity}` : ''}`,
      { method: 'POST' },
    ),
};

// ============================================================
// Meal plans
// ============================================================
export const MealPlanAPI = {
  list: () => http<MealPlan[]>('/meal-plans'),
  current: () => http<MealPlan & { entries: MealPlanEntry[] }>('/meal-plans/current'),
  byWeek: (weekStart: string) =>
    http<MealPlan & { entries: MealPlanEntry[] }>(`/meal-plans/week/${weekStart}`),
  get: (id: string) => http<MealPlan & { entries: MealPlanEntry[] }>(`/meal-plans/${id}`),
  create: (body: { week_start: string }) =>
    http<MealPlan>('/meal-plans', { method: 'POST', json: body }),
  addEntry: (id: string, body: {
    day_of_week: number;
    meal_type: PlanMealType;
    recipe_id?: string | null;
    servings?: number;
  }) => http<MealPlanEntry>(`/meal-plans/${id}/entries`, { method: 'POST', json: body }),
  updateEntry: (id: string, entryId: string, body: Partial<MealPlanEntry>) =>
    http<MealPlanEntry>(`/meal-plans/${id}/entries/${entryId}`, {
      method: 'PATCH',
      json: body,
    }),
  deleteEntry: (id: string, entryId: string) =>
    http<{ id: string }>(`/meal-plans/${id}/entries/${entryId}`, { method: 'DELETE' }),
  markCooked: (id: string, entryId: string) =>
    http<MealPlanEntry>(`/meal-plans/${id}/entries/${entryId}/cooked`, {
      method: 'POST',
    }),
  generate: (body?: {
    week_start?: string;
    days?: number;
    meal_types?: PlanMealType[];
    extra_instructions?: string;
  }) =>
    http<MealPlan & { entries: MealPlanEntry[]; inserted: number }>(
      '/meal-plans/generate',
      { method: 'POST', json: body ?? {} },
    ),
  generateShoppingList: (id: string) =>
    http<{ created: number }>(`/meal-plans/${id}/shopping-list`, { method: 'POST' }),
  batchSuggestions: (id: string) =>
    http<{ suggestions: { kind: string; ingredient: string; recipes: string[]; message: string }[] }>(
      `/meal-plans/${id}/batch-suggestions`,
    ),
};

// ============================================================
// Settings — kauppapäivä
// ============================================================
export interface SettingsSummary {
  shopping_weekdays: number[];
  shopping_weekday_names: string[];
  next_shopping_date: string;
  days_until_next_shopping: number;
  shopping_interval_days: number;
  plan_week_start: string;
}

export const SettingsAPI = {
  get: () => http<SettingsSummary>('/settings'),
  update: (body: { shopping_weekdays: number[] }) =>
    http<SettingsSummary>('/settings', { method: 'PATCH', json: body }),
};
