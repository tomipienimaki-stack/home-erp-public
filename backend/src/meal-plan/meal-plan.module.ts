import { Module } from '@nestjs/common';
import { MealPlanController } from './meal-plan.controller';
import { MealPlanService } from './meal-plan.service';
import { AiMealPlanService } from './ai-meal-plan.service';
import { PantryModule } from '../pantry/pantry.module';
import { ShoppingListModule } from '../shopping-list/shopping-list.module';
import { FavoritesModule } from '../favorites/favorites.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [PantryModule, ShoppingListModule, FavoritesModule, SettingsModule],
  controllers: [MealPlanController],
  providers: [MealPlanService, AiMealPlanService],
  exports: [MealPlanService],
})
export class MealPlanModule {}
