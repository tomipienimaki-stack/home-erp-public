import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import {
  INGREDIENT_TIERS,
  IngredientTier,
  RESTOCK_MODES,
  RestockMode,
  PANTRY_CATEGORIES,
  PANTRY_UNITS,
  PantryCategory,
  PantryUnit,
} from '../common/types';

export class CreateIngredientDto {
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsEnum(PANTRY_UNITS) default_unit?: PantryUnit;
  @IsOptional() @IsEnum(PANTRY_CATEGORIES) category?: PantryCategory;
  @IsOptional() @IsEnum(INGREDIENT_TIERS) tier?: IngredientTier;
}

export class UpdateIngredientDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsEnum(PANTRY_UNITS) default_unit?: PantryUnit;
  @IsOptional() @IsEnum(PANTRY_CATEGORIES) category?: PantryCategory;
  @IsOptional() @IsEnum(INGREDIENT_TIERS) tier?: IngredientTier;
  /** null palauttaa automaattisen (reseptimäärän mukaisen) täydennystavan. */
  @IsOptional() @IsEnum(RESTOCK_MODES) restock_override?: RestockMode | null;
}
