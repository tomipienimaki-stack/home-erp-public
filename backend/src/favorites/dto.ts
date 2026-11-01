import {
  IsDateString,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  PANTRY_CATEGORIES,
  STAPLE_CADENCES,
  StapleCadence,
  PANTRY_UNITS,
  PantryCategory,
  PantryUnit,
  STORES,
  StoreId,
} from '../common/types';

export class CreateFavoriteDto {
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsEnum(STORES) store?: StoreId;
  @IsOptional() @IsEnum(PANTRY_CATEGORIES) category?: PantryCategory;
  @IsOptional() @IsNumber() @Min(0) package_size?: number | null;
  @IsOptional() @IsEnum(PANTRY_UNITS) package_unit?: PantryUnit | null;
  @IsOptional() @IsNumber() @Min(0) approx_price?: number | null;
  @IsOptional() @IsString() notes?: string | null;
  @IsOptional() @IsUUID() ingredient_id?: string | null;
  @IsOptional() @IsBoolean() in_stock?: boolean;
  @IsOptional() @IsEnum(STAPLE_CADENCES) cadence?: StapleCadence | null;
  @IsOptional() @IsNumber() @Min(0) cadence_days?: number | null;
  @IsOptional() @IsDateString() last_bought_at?: string | null;
}

export class UpdateFavoriteDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEnum(STORES) store?: StoreId;
  @IsOptional() @IsEnum(PANTRY_CATEGORIES) category?: PantryCategory;
  @IsOptional() @IsNumber() @Min(0) package_size?: number | null;
  @IsOptional() @IsEnum(PANTRY_UNITS) package_unit?: PantryUnit | null;
  @IsOptional() @IsNumber() @Min(0) approx_price?: number | null;
  @IsOptional() @IsString() notes?: string | null;
  @IsOptional() @IsBoolean() in_stock?: boolean;
  @IsOptional() @IsEnum(STAPLE_CADENCES) cadence?: StapleCadence | null;
  @IsOptional() @IsNumber() @Min(0) cadence_days?: number | null;
  @IsOptional() @IsDateString() last_bought_at?: string | null;
}

export class ImportTextDto {
  @IsString() @MinLength(10) text!: string;
  @IsOptional() @IsEnum(STORES) default_store?: StoreId;
}

class BulkInsertItem {
  @IsString() name!: string;
  @IsOptional() @IsEnum(STORES) store?: StoreId;
  @IsOptional() @IsEnum(PANTRY_CATEGORIES) category?: PantryCategory;
  @IsOptional() @IsNumber() package_size?: number | null;
  @IsOptional() @IsEnum(PANTRY_UNITS) package_unit?: PantryUnit | null;
  @IsOptional() @IsNumber() approx_price?: number | null;
  @IsOptional() @IsBoolean() in_stock?: boolean;
  @IsOptional() @IsEnum(STAPLE_CADENCES) cadence?: StapleCadence | null;
  @IsOptional() @IsNumber() @Min(0) cadence_days?: number | null;
  @IsOptional() @IsDateString() last_bought_at?: string | null;
}

export class BulkInsertDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkInsertItem)
  items!: BulkInsertItem[];
}
