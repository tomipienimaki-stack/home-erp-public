import { Body, Controller, Get, Patch } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto';

@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  summary() {
    return this.service.summary();
  }

  @Patch()
  async update(@Body() dto: UpdateSettingsDto) {
    await this.service.update(dto);
    return this.service.summary();
  }
}
