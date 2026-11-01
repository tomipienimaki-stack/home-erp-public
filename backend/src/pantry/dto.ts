import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  PANTRY_CATEGORIES,
  PANTRY_UNITS,
  PantryCategory,
  PantryUnit,
  STOCK_STATUSES,
  STORES,
  StockStatus,
  StoreId,
} from '../common/types';

export class CreatePantryItemDto {
  // Either an existing ingredient_id, OR a name (we upsert).
  @ValidateIf((o) => !o.name) @IsUUID() ingredient_id?: string;
  @ValidateIf((o) => !o.ingredient_id) @IsString() @MinLength(1) name?: string;

  @IsOptional() @IsEnum(PANTRY_CATEGORIES) category?: PantryCategory;

  @IsOptional() @IsNumber() @Min(0) current_quantity?: number;
  @IsOptional() @IsEnum(PANTRY_UNITS) unit?: PantryUnit;
  @IsOptional() @IsNumber() @Min(0) min_threshold?: number;

  @IsOptional() @IsEnum(STORES) preferred_store?: StoreId | null;
  @IsOptional() @IsString() notes?: string | null;
  @IsOptional() @IsNumber() @Min(0) daily_consumption?: number;
  @IsOptional() @IsEnum(STOCK_STATUSES) stock_status?: StockStatus | null;
  @IsOptional() @IsDateString() best_before?: string | null;
}

export class UpdatePantryItemDto {
  @IsOptional() @IsNumber() @Min(0) current_quantity?: number;
  @IsOptional() @IsEnum(PANTRY_UNITS) unit?: PantryUnit;
  @IsOptional() @IsNumber() @Min(0) min_threshold?: number;
  @IsOptional() @IsEnum(STORES) preferred_store?: StoreId | null;
  @IsOptional() @IsString() notes?: string | null;
  @IsOptional() @IsNumber() @Min(0) daily_consumption?: number;
  @IsOptional() @IsEnum(STOCK_STATUSES) stock_status?: StockStatus | null;
  @IsOptional() @IsDateString() best_before?: string | null;
}

export class ConsumePantryItemDto {
  @IsNumber() @Min(0) amount!: number;
}
