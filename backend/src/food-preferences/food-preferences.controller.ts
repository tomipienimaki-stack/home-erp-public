import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { FoodPreferencesService } from './food-preferences.service';
import { CreateFoodPreferenceDto } from './dto';

@Controller('food-preferences')
export class FoodPreferencesController {
  constructor(private readonly prefs: FoodPreferencesService) {}

  @Get()
  list() {
    return this.prefs.list();
  }

  @Post()
  create(@Body() dto: CreateFoodPreferenceDto) {
    return this.prefs.create(dto);
  }

  @Delete(':id')
  delete(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.prefs.delete(id);
  }
}
