import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export class CreateFreezerItemDto {
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsUUID() recipe_id?: string | null;
  @IsInt() @Min(0) portions!: number;
  @IsOptional() @IsString() portion_size?: string | null;
  @IsOptional() @IsDateString() frozen_at?: string;
  @IsOptional() @IsString() notes?: string | null;
}

export class UpdateFreezerItemDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsInt() @Min(0) portions?: number;
  @IsOptional() @IsString() portion_size?: string | null;
  @IsOptional() @IsDateString() frozen_at?: string;
  @IsOptional() @IsString() notes?: string | null;
}

export class AdjustPortionsDto {
  /** Positiivinen = lisää pakastimeen, negatiivinen = otettu käyttöön. */
  @IsInt() delta!: number;
}
