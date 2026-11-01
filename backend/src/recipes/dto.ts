import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  MEAL_TYPES,
  MealType,
  INGREDIENT_TIERS,
  IngredientTier,
  PANTRY_CATEGORIES,
  PantryCategory,
  PANTRY_UNITS,
  PantryUnit,
} from '../common/types';

export class RecipeIngredientInput {
  // Either ingredient_id or name (we upsert by name)
  @ValidateIf((o) => !o.name) @IsUUID() ingredient_id?: string;
  @ValidateIf((o) => !o.ingredient_id) @IsString() @MinLength(1) name?: string;

  @IsNumber() @Min(0) quantity!: number;
  @IsEnum(PANTRY_UNITS) unit!: PantryUnit;
  @IsOptional() @IsString() notes?: string | null;
  // Used only when a new ingredient is created by name.
  @IsOptional() @IsEnum(PANTRY_CATEGORIES) category?: PantryCategory;
  @IsOptional() @IsEnum(INGREDIENT_TIERS) tier?: IngredientTier;
}

export class CreateRecipeDto {
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsInt() @Min(1) servings?: number;
  @IsOptional() @IsInt() @Min(0) prep_time_min?: number | null;
  @IsOptional() @IsInt() @Min(0) cook_time_min?: number | null;
  @IsOptional() @IsEnum(MEAL_TYPES) meal_type?: MealType;
  @IsOptional() @IsString() instructions?: string | null;
  @IsOptional() @IsArray() @ArrayMaxSize(20) tags?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientInput)
  ingredients!: RecipeIngredientInput[];
}

export class ImportFromImageDto {
  @IsString() @MinLength(1) image_base64!: string;
  @IsString() @MinLength(1) mime_type!: string;
}

export class UpdateRecipeDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsInt() @Min(1) servings?: number;
  @IsOptional() @IsInt() @Min(0) prep_time_min?: number | null;
  @IsOptional() @IsInt() @Min(0) cook_time_min?: number | null;
  @IsOptional() @IsEnum(MEAL_TYPES) meal_type?: MealType;
  @IsOptional() @IsString() instructions?: string | null;
  @IsOptional() @IsArray() tags?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientInput)
  ingredients?: RecipeIngredientInput[];
}
