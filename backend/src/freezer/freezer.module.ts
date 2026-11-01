import { Module } from '@nestjs/common';
import { FreezerController } from './freezer.controller';
import { FreezerService } from './freezer.service';

@Module({
  controllers: [FreezerController],
  providers: [FreezerService],
  exports: [FreezerService],
})
export class FreezerModule {}
