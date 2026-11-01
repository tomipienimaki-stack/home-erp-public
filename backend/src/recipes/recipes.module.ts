import { Module } from '@nestjs/common';
import { IngredientsModule } from '../ingredients/ingredients.module';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';
import { AiRecipeImporterService } from './ai-recipe-importer.service';

@Module({
  imports: [IngredientsModule],
  controllers: [RecipesController],
  providers: [RecipesService, AiRecipeImporterService],
  exports: [RecipesService],
})
export class RecipesModule {}
