import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { AiRecipeImporterService } from './ai-recipe-importer.service';
import { CreateRecipeDto, ImportFromImageDto, UpdateRecipeDto } from './dto';

@Controller('recipes')
export class RecipesController {
  constructor(
    private readonly recipes: RecipesService,
    private readonly importer: AiRecipeImporterService,
  ) {}

  @Get()
  list(@Query('meal_type') mealType?: string, @Query('tag') tag?: string) {
    return this.recipes.list({ meal_type: mealType, tag });
  }

  @Post()
  create(@Body() dto: CreateRecipeDto) {
    return this.recipes.create(dto);
  }

  @Post('import-from-image')
  importFromImage(@Body() dto: ImportFromImageDto) {
    return this.importer.fromImage(dto.image_base64, dto.mime_type);
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.recipes.getWithIngredients(id);
  }

  @Get(':id/ingredients')
  ingredientsAvailability(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.recipes.getIngredientsWithAvailability(id);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateRecipeDto,
  ) {
    return this.recipes.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.recipes.delete(id);
  }
}
