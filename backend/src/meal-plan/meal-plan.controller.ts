import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { MealPlanService } from './meal-plan.service';
import { AiMealPlanService } from './ai-meal-plan.service';
import {
  CreateEntryDto,
  CreateMealPlanDto,
  GenerateMealPlanDto,
  UpdateEntryDto,
} from './dto';

@Controller('meal-plans')
export class MealPlanController {
  constructor(
    private readonly plans: MealPlanService,
    private readonly ai: AiMealPlanService,
  ) {}

  @Get()
  list() {
    return this.plans.list();
  }

  @Get('current')
  current() {
    return this.plans.getCurrent();
  }

  @Get('week/:weekStart')
  byWeek(@Param('weekStart') weekStart: string) {
    return this.plans.getByWeek(weekStart);
  }

  @Post()
  create(@Body() dto: CreateMealPlanDto) {
    return this.plans.create(dto);
  }

  @Post('generate')
  generate(@Body() dto: GenerateMealPlanDto) {
    return this.ai.generate(dto);
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.plans.getWithEntries(id);
  }

  @Delete(':id')
  delete(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.plans.delete(id);
  }

  @Post(':id/entries')
  addEntry(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: CreateEntryDto) {
    return this.plans.addEntry(id, dto);
  }

  @Patch(':id/entries/:entryId')
  updateEntry(
    @Param('id', new ParseUUIDPipe()) _id: string,
    @Param('entryId', new ParseUUIDPipe()) entryId: string,
    @Body() dto: UpdateEntryDto,
  ) {
    return this.plans.updateEntry(entryId, dto);
  }

  @Delete(':id/entries/:entryId')
  deleteEntry(
    @Param('id', new ParseUUIDPipe()) _id: string,
    @Param('entryId', new ParseUUIDPipe()) entryId: string,
  ) {
    return this.plans.deleteEntry(entryId);
  }

  @Post(':id/entries/:entryId/cooked')
  markCooked(
    @Param('id', new ParseUUIDPipe()) _id: string,
    @Param('entryId', new ParseUUIDPipe()) entryId: string,
  ) {
    return this.plans.markCooked(entryId);
  }

  @Post(':id/shopping-list')
  generateShoppingList(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.plans.generateShoppingList(id);
  }

  @Get(':id/batch-suggestions')
  batchSuggestions(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.plans.batchSuggestions(id);
  }
}
