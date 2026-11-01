import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import {
  PANTRY_CATEGORIES,
  PantryCategory,
  PREFERENCE_TYPES,
  PreferenceType,
} from '../common/types';

export class CreateFoodPreferenceDto {
  @IsEnum(PREFERENCE_TYPES) type!: PreferenceType;
  @ValidateIf((o) => !o.category) @IsUUID() ingredient_id?: string;
  @ValidateIf((o) => !o.ingredient_id) @IsEnum(PANTRY_CATEGORIES) category?: PantryCategory;
  @IsOptional() @IsString() notes?: string | null;
}
