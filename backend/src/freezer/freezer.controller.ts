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
import { FreezerService } from './freezer.service';
import { AdjustPortionsDto, CreateFreezerItemDto, UpdateFreezerItemDto } from './dto';

@Controller('freezer')
export class FreezerController {
  constructor(private readonly freezer: FreezerService) {}

  @Get()
  list(@Query('include_empty') includeEmpty?: string) {
    return this.freezer.list(includeEmpty === 'true');
  }

  @Post()
  create(@Body() dto: CreateFreezerItemDto) {
    return this.freezer.create(dto);
  }

  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateFreezerItemDto) {
    return this.freezer.update(id, dto);
  }

  @Post(':id/adjust')
  adjust(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: AdjustPortionsDto) {
    return this.freezer.adjust(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.freezer.delete(id);
  }
}
