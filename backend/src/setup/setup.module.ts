import { Module } from '@nestjs/common';
import { RecipesModule } from '../recipes/recipes.module';
import { SetupController } from './setup.controller';

@Module({ imports: [RecipesModule], controllers: [SetupController] })
export class SetupModule {}
