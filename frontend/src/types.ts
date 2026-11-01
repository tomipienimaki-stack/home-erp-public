export const PANTRY_CATEGORIES = [
  'maitotuotteet',
  'lihat_ja_kala',
  'kasvikset_ja_hedelmat',
  'kuivatuotteet',
  'sailykkeet',
  'pakasteet',
  'juomat',
  'hygienia_ja_siisteys',
  'taloustarvikkeet',
  'mausteet_ja_oljyt',
  'muu',
] as const;
export type PantryCategory = (typeof PANTRY_CATEGORIES)[number];

export const PANTRY_UNITS = ['kpl', 'l', 'dl', 'kg', 'g', 'pkt', 'prk', 'tlk'] as const;
export type PantryUnit = (typeof PANTRY_UNITS)[number];

export const STORES = ['lidl', 'k-market', 'prisma', 'muu'] as const;
export type StoreId = (typeof STORES)[number];

export const MEAL_TYPES = ['aamiainen', 'lounas', 'paivallinen', 'valipala'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const PLAN_MEAL_TYPES = ['lounas', 'paivallinen'] as const;
export type PlanMealType = (typeof PLAN_MEAL_TYPES)[number];

export const PREFERENCE_TYPES = ['avoid', 'prefer', 'allergy'] as const;
export type PreferenceType = (typeof PREFERENCE_TYPES)[number];

export type ShoppingStatus = 'pending' | 'bought';
export type ShoppingSource = 'meal_plan' | 'threshold' | 'manual' | 'vakio';
export type StapleCadence = 'joka_reissu' | 'viikoittain' | 'kahden_viikon_valein' | 'kuukausittain';

export interface Ingredient {
  id: string;
  name: string;
  default_unit: PantryUnit;
  category: PantryCategory;
  tier?: IngredientTier;
  restock_override?: 'ydin' | 'tarvittaessa' | null;
  created_at: string;
}

export type IngredientTier = 'perus' | 'sailyva' | 'tarkistettava' | 'tuore';
export type StockStatus = 'on' | 'vahissa' | 'loppu';

export interface FreezerItem {
  id: string;
  name: string;
  recipe_id: string | null;
  portions: number;
  portion_size: string | null;
  frozen_at: string;
  notes: string | null;
}

export interface StoreProduct {
  id: string;
  ingredient_id: string;
  store: StoreId;
  product_name: string;
  package_size: number;
  package_unit: PantryUnit;
  approx_price: number | null;
  updated_at: string;
  ingredient?: Ingredient;
}

export interface PantryItem {
  id: string;
  ingredient_id: string;
  current_quantity: number;
  unit: PantryUnit;
  min_threshold: number;
  preferred_store: StoreId | null;
  notes: string | null;
  daily_consumption: number;
  last_consumption_at: string | null;
  stock_status?: StockStatus | null;
  best_before?: string | null;
  recipe_count?: number;
  restock_mode?: 'ydin' | 'tarvittaessa';
  created_at: string;
  updated_at: string;
  ingredient?: Ingredient;
}

export interface ShoppingListItem {
  id: string;
  ingredient_id: string | null;
  name: string;
  quantity_to_buy: number;
  unit: PantryUnit;
  category: PantryCategory;
  store: StoreId | null;
  status: ShoppingStatus;
  source: ShoppingSource;
  meal_plan_id: string | null;
  bought_at: string | null;
  created_at: string;
  pantry_addition_amount: number | null;
  pantry_addition_unit: PantryUnit | null;
  check_first?: boolean;
  favorite_id?: string | null;
  note?: string | null;
}

export interface Recipe {
  id: string;
  name: string;
  description: string | null;
  servings: number;
  prep_time_min: number | null;
  cook_time_min: number | null;
  meal_type: MealType;
  instructions: string | null;
  tags: string[];
  last_cooked_at: string | null;
  created_at: string;
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  ingredient_id: string;
  quantity: number;
  unit: PantryUnit;
  notes: string | null;
  ingredient?: Ingredient;
  // availability fields from /:id/ingredients
  have?: number;
  need?: number;
  sufficient?: boolean;
  missing?: number;
}

export interface RecipeWithIngredients extends Recipe {
  ingredients: RecipeIngredient[];
}

export interface FoodPreference {
  id: string;
  type: PreferenceType;
  ingredient_id: string | null;
  category: PantryCategory | null;
  notes: string | null;
  ingredient?: Ingredient;
}

export interface FavoriteProduct {
  id: string;
  name: string;
  store: StoreId;
  category: PantryCategory;
  package_size: number | null;
  package_unit: PantryUnit | null;
  approx_price: number | null;
  notes: string | null;
  ingredient_id: string | null;
  in_stock: boolean;
  cadence?: StapleCadence | null;
  cadence_days?: number | null;
  last_bought_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImportedFavoriteItem {
  name: string;
  store: StoreId;
  category: PantryCategory;
  package_size: number | null;
  package_unit: PantryUnit | null;
  approx_price: number | null;
  in_stock: boolean;
}

export interface MealPlanEntry {
  id: string;
  meal_plan_id: string;
  day_of_week: number;
  meal_type: PlanMealType;
  recipe_id: string | null;
  servings: number;
  cooked: boolean;
  cooked_at: string | null;
  recipe?: Recipe;
}

export interface MealPlan {
  id: string;
  week_start: string;
  ai_generated: boolean;
  created_at: string;
  entries?: MealPlanEntry[];
}

// =====================
// Labels & visuals
// =====================

export const CATEGORY_LABELS: Record<PantryCategory, string> = {
  maitotuotteet: 'Maitotuotteet',
  lihat_ja_kala: 'Lihat & kala',
  kasvikset_ja_hedelmat: 'Kasvikset & hedelmät',
  kuivatuotteet: 'Kuivatuotteet',
  sailykkeet: 'Säilykkeet',
  pakasteet: 'Pakasteet',
  juomat: 'Juomat',
  hygienia_ja_siisteys: 'Hygienia & siisteys',
  taloustarvikkeet: 'Taloustarvikkeet',
  mausteet_ja_oljyt: 'Mausteet & öljyt',
  muu: 'Muu',
};

export const CATEGORY_COLORS: Record<PantryCategory, { bg: string; text: string; ring: string }> = {
  maitotuotteet:         { bg: 'bg-sky-100',     text: 'text-sky-800',     ring: 'ring-sky-200' },
  lihat_ja_kala:         { bg: 'bg-rose-100',    text: 'text-rose-800',    ring: 'ring-rose-200' },
  kasvikset_ja_hedelmat: { bg: 'bg-emerald-100', text: 'text-emerald-800', ring: 'ring-emerald-200' },
  kuivatuotteet:         { bg: 'bg-amber-100',   text: 'text-amber-800',   ring: 'ring-amber-200' },
  sailykkeet:            { bg: 'bg-orange-100',  text: 'text-orange-800',  ring: 'ring-orange-200' },
  pakasteet:             { bg: 'bg-cyan-100',    text: 'text-cyan-800',    ring: 'ring-cyan-200' },
  juomat:                { bg: 'bg-indigo-100',  text: 'text-indigo-800',  ring: 'ring-indigo-200' },
  hygienia_ja_siisteys:  { bg: 'bg-violet-100',  text: 'text-violet-800',  ring: 'ring-violet-200' },
  taloustarvikkeet:      { bg: 'bg-stone-200',   text: 'text-stone-800',   ring: 'ring-stone-300' },
  mausteet_ja_oljyt:     { bg: 'bg-yellow-100',  text: 'text-yellow-800',  ring: 'ring-yellow-200' },
  muu:                   { bg: 'bg-cream-200',   text: 'text-ink-700',     ring: 'ring-cream-200' },
};

import {
  Milk,
  Beef,
  Apple,
  Wheat,
  Package,
  Snowflake,
  Coffee,
  Sparkles,
  Hammer,
  Boxes,
  Flame,
  type LucideIcon,
} from 'lucide-react';

export const CATEGORY_ICONS: Record<PantryCategory, LucideIcon> = {
  maitotuotteet: Milk,
  lihat_ja_kala: Beef,
  kasvikset_ja_hedelmat: Apple,
  kuivatuotteet: Wheat,
  sailykkeet: Package,
  pakasteet: Snowflake,
  juomat: Coffee,
  hygienia_ja_siisteys: Sparkles,
  taloustarvikkeet: Hammer,
  mausteet_ja_oljyt: Flame,
  muu: Boxes,
};

export const STORE_LABELS: Record<StoreId, string> = {
  lidl: 'Lidl',
  'k-market': 'K-Market',
  prisma: 'Prisma',
  muu: 'Muu',
};

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  aamiainen: 'Aamiainen',
  lounas: 'Lounas',
  paivallinen: 'Päivällinen',
  valipala: 'Välipala',
};

export const DAY_LABELS = ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su'] as const;
export const DAY_LABELS_LONG = ['Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai', 'Perjantai', 'Lauantai', 'Sunnuntai'] as const;

export const PREFERENCE_LABELS: Record<PreferenceType, string> = {
  avoid: 'Vältä',
  prefer: 'Suosi',
  allergy: 'Allergia',
};
