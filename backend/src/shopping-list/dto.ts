import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import {
  PANTRY_CATEGORIES,
  PANTRY_UNITS,
  PantryCategory,
  PantryUnit,
  SHOPPING_SOURCES,
  STORES,
  ShoppingSource,
  StoreId,
} from '../common/types';

export class CreateShoppingItemDto {
  @IsOptional() @IsUUID() ingredient_id?: string | null;

  @IsString() @MinLength(1) name!: string;

  @IsNumber() @Min(0) quantity_to_buy!: number;
  @IsEnum(PANTRY_UNITS) unit!: PantryUnit;
  @IsEnum(PANTRY_CATEGORIES) category!: PantryCategory;

  @IsOptional() @IsEnum(STORES) store?: StoreId | null;
  @IsOptional() @IsEnum(SHOPPING_SOURCES) source?: ShoppingSource;
  @IsOptional() @IsUUID() meal_plan_id?: string | null;
  @IsOptional() @IsNumber() @Min(0) pantry_addition_amount?: number | null;
  @IsOptional() @IsEnum(PANTRY_UNITS) pantry_addition_unit?: PantryUnit | null;
  @IsOptional() @IsBoolean() check_first?: boolean;
  @IsOptional() @IsString() note?: string | null;
  @IsOptional() @IsUUID() favorite_id?: string | null;
}

export class UpdateShoppingItemDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsNumber() @Min(0) quantity_to_buy?: number;
  @IsOptional() @IsEnum(PANTRY_UNITS) unit?: PantryUnit;
  @IsOptional() @IsEnum(PANTRY_CATEGORIES) category?: PantryCategory;
  @IsOptional() @IsEnum(STORES) store?: StoreId | null;
  @IsOptional() @IsBoolean() check_first?: boolean;
  @IsOptional() @IsString() note?: string | null;
}

export class MarkBoughtDto {
  @IsOptional() @IsNumber() @Min(0) quantity_bought?: number;
}
