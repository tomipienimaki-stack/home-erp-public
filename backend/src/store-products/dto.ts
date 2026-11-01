import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { PANTRY_UNITS, PantryUnit, STORES, StoreId } from '../common/types';

export class CreateStoreProductDto {
  @IsUUID() ingredient_id!: string;
  @IsEnum(STORES) store!: StoreId;
  @IsString() @MinLength(1) product_name!: string;
  @IsNumber() @Min(0) package_size!: number;
  @IsEnum(PANTRY_UNITS) package_unit!: PantryUnit;
  @IsOptional() @IsNumber() @Min(0) approx_price?: number | null;
}

export class UpdateStoreProductDto {
  @IsOptional() @IsString() product_name?: string;
  @IsOptional() @IsNumber() @Min(0) package_size?: number;
  @IsOptional() @IsEnum(PANTRY_UNITS) package_unit?: PantryUnit;
  @IsOptional() @IsNumber() @Min(0) approx_price?: number | null;
}
