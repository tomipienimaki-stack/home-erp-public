import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DailyJobsInterceptor } from './daily-jobs.interceptor';
import { PantryController } from './pantry.controller';
import { PantryService } from './pantry.service';
import { IngredientsModule } from '../ingredients/ingredients.module';

@Module({
  imports: [IngredientsModule],
  controllers: [PantryController],
  providers: [PantryService, { provide: APP_INTERCEPTOR, useClass: DailyJobsInterceptor }],
  exports: [PantryService],
})
export class PantryModule {}
