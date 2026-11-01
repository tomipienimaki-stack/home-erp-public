import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { IngredientsModule } from './ingredients/ingredients.module';
import { PantryModule } from './pantry/pantry.module';
import { ShoppingListModule } from './shopping-list/shopping-list.module';
import { RecipesModule } from './recipes/recipes.module';
import { StoreProductsModule } from './store-products/store-products.module';
import { FoodPreferencesModule } from './food-preferences/food-preferences.module';
import { MealPlanModule } from './meal-plan/meal-plan.module';
import { FavoritesModule } from './favorites/favorites.module';
import { FreezerModule } from './freezer/freezer.module';
import { SettingsModule } from './settings/settings.module';
import { CronModule } from './cron/cron.module';
import { SetupModule } from './setup/setup.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Vercelissä päivittäiset ajot käynnistyvät käytön yhteydessä (DailyJobsInterceptor)
    ...(process.env.VERCEL ? [] : [ScheduleModule.forRoot()]),
    SupabaseModule,
    AuthModule,
    IngredientsModule,
    PantryModule,
    ShoppingListModule,
    RecipesModule,
    StoreProductsModule,
    FoodPreferencesModule,
    MealPlanModule,
    FavoritesModule,
    FreezerModule,
    SettingsModule,
    CronModule,
    SetupModule,
  ],
})
export class AppModule {}
