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
import { PantryService } from './pantry.service';
import {
  ConsumePantryItemDto,
  CreatePantryItemDto,
  UpdatePantryItemDto,
} from './dto';

@Controller('pantry')
export class PantryController {
  constructor(private readonly pantry: PantryService) {}

  @Get()
  list() {
    return this.pantry.list();
  }

  @Post()
  create(@Body() dto: CreatePantryItemDto) {
    return this.pantry.create(dto);
  }

  @Get('expiring')
  expiring(@Query('days') days?: string) {
    return this.pantry.expiringSoon(days ? Number(days) : 3);
  }

  @Post('check-thresholds')
  checkThresholds() {
    return this.pantry.checkAllThresholds();
  }

  @Post('apply-consumption')
  applyConsumption() {
    return this.pantry.applyDailyConsumption();
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.pantry.get(id);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePantryItemDto,
  ) {
    return this.pantry.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.pantry.delete(id);
  }

  @Post(':id/consume')
  consume(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ConsumePantryItemDto,
  ) {
    return this.pantry.consume(id, dto);
  }
}
