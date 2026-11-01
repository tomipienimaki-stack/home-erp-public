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

export const SHOPPING_SOURCES = ['meal_plan', 'threshold', 'manual', 'vakio'] as const;

/** Vakiotuotteen ostorytmi ja sitä vastaava väli päivinä. */
export const STAPLE_CADENCES = ['joka_reissu', 'viikoittain', 'kahden_viikon_valein', 'kuukausittain'] as const;
export type StapleCadence = (typeof STAPLE_CADENCES)[number];
export const CADENCE_DAYS: Record<StapleCadence, number> = {
  joka_reissu: 0,
  viikoittain: 7,
  kahden_viikon_valein: 14,
  kuukausittain: 30,
};
export type ShoppingSource = (typeof SHOPPING_SOURCES)[number];

/** ISO-viikonpaivien nimet, indeksi 0 = maanantai. */
export const WEEKDAY_NAMES = [
  'maanantai',
  'tiistai',
  'keskiviikko',
  'torstai',
  'perjantai',
  'lauantai',
  'sunnuntai',
] as const;

export interface UserSettings {
  user_id: string;
  /** ISO-viikonpaivat 1-7, ensimmainen on paakauppapaiva. */
  shopping_weekdays: number[];
  created_at?: string;
  updated_at?: string;
}

export const PREFERENCE_TYPES = ['avoid', 'prefer', 'allergy'] as const;
export type PreferenceType = (typeof PREFERENCE_TYPES)[number];

export type ShoppingStatus = 'pending' | 'bought';

/** perus = oletetaan aina olevan; sailyva = on/vahissa/loppu; tarkistettava = ruokalistalta "tarkista"-osioon; tuore = ostetaan ruokalistan mukaan. */
export const INGREDIENT_TIERS = ['perus', 'sailyva', 'tarkistettava', 'tuore'] as const;
export type IngredientTier = (typeof INGREDIENT_TIERS)[number];

export const RESTOCK_MODES = ['ydin', 'tarvittaessa'] as const;
export type RestockMode = (typeof RESTOCK_MODES)[number];

export const STOCK_STATUSES = ['on', 'vahissa', 'loppu'] as const;
export type StockStatus = (typeof STOCK_STATUSES)[number];

// ============================================================
// Entity interfaces (DB row shapes)
// ============================================================

export interface Ingredient {
  id: string;
  user_id: string;
  name: string;
  default_unit: PantryUnit;
  category: PantryCategory;
  tier: IngredientTier;
  restock_override?: RestockMode | null;
  created_at: string;
}

export interface StoreProduct {
  id: string;
  user_id: string;
  ingredient_id: string;
  store: StoreId;
  product_name: string;
  package_size: number;
  package_unit: PantryUnit;
  approx_price: number | null;
  updated_at: string;
}

export interface PantryItem {
  id: string;
  user_id: string;
  ingredient_id: string;
  current_quantity: number;
  unit: PantryUnit;
  min_threshold: number;
  preferred_store: StoreId | null;
  notes: string | null;
  daily_consumption: number;
  last_consumption_at: string | null;
  stock_status: StockStatus | null;
  best_before: string | null;
  /** Liitetty palvelussa ingredient_usage-näkymästä. */
  recipe_count?: number;
  restock_mode?: RestockMode;
  created_at: string;
  updated_at: string;
  // joined from ingredients (selected by service)
  ingredient?: Ingredient;
}

export interface ShoppingListItem {
  id: string;
  user_id: string;
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
  /** When set, markBought adds this to pantry instead of quantity_to_buy + unit. */
  pantry_addition_amount: number | null;
  pantry_addition_unit: PantryUnit | null;
  check_first: boolean;
  note: string | null;
  favorite_id: string | null;
}

export interface FreezerItem {
  id: string;
  user_id: string;
  name: string;
  recipe_id: string | null;
  portions: number;
  portion_size: string | null;
  frozen_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Recipe {
  id: string;
  user_id: string;
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
  user_id: string;
  recipe_id: string;
  ingredient_id: string;
  quantity: number;
  unit: PantryUnit;
  notes: string | null;
  ingredient?: Ingredient;
}

export interface FoodPreference {
  id: string;
  user_id: string;
  type: PreferenceType;
  ingredient_id: string | null;
  category: PantryCategory | null;
  notes: string | null;
  created_at: string;
  ingredient?: Ingredient;
}

export interface MealPlan {
  id: string;
  user_id: string;
  week_start: string; // ISO date "YYYY-MM-DD"
  ai_generated: boolean;
  created_at: string;
  entries?: MealPlanEntry[];
}

export interface FavoriteProduct {
  id: string;
  user_id: string;
  name: string;
  store: StoreId;
  category: PantryCategory;
  package_size: number | null;
  package_unit: PantryUnit | null;
  approx_price: number | null;
  notes: string | null;
  ingredient_id: string | null;
  in_stock: boolean;
  cadence: StapleCadence | null;
  /** Ostovali paivina; ohittaa cadence-kentan. */
  cadence_days: number | null;
  last_bought_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MealPlanEntry {
  id: string;
  user_id: string;
  meal_plan_id: string;
  day_of_week: number; // 1..7
  meal_type: PlanMealType;
  recipe_id: string | null;
  servings: number;
  cooked: boolean;
  cooked_at: string | null;
  recipe?: Recipe;
}
