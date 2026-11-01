import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { PLAN_MEAL_TYPES, PlanMealType } from '../common/types';

export class CreateMealPlanDto {
  @IsDateString() week_start!: string;
  @IsOptional() @IsBoolean() ai_generated?: boolean;
}

export class CreateEntryDto {
  @IsInt() @Min(1) @Max(7) day_of_week!: number;
  @IsEnum(PLAN_MEAL_TYPES) meal_type!: PlanMealType;
  @IsOptional() @IsUUID() recipe_id?: string | null;
  @IsOptional() @IsInt() @Min(1) servings?: number;
}

export class UpdateEntryDto {
  @IsOptional() @IsUUID() recipe_id?: string | null;
  @IsOptional() @IsInt() @Min(1) servings?: number;
  @IsOptional() @IsBoolean() cooked?: boolean;
}

export class GenerateMealPlanDto {
  @IsOptional() @IsDateString() week_start?: string;
  @IsOptional() @IsInt() @Min(1) @Max(7) days?: number;
  @IsOptional() @IsArray() @IsEnum(PLAN_MEAL_TYPES, { each: true })
  meal_types?: PlanMealType[];
  @IsOptional() @IsString() extra_instructions?: string;
}
