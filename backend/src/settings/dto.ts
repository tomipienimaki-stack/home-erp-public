import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, Max, Min } from 'class-validator';

export class UpdateSettingsDto {
  /** ISO-viikonpaivat: 1 = maanantai ... 7 = sunnuntai. Ensimmainen on paakauppapaiva. */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  shopping_weekdays!: number[];
}
