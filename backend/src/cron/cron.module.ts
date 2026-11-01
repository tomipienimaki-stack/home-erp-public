import { Module } from '@nestjs/common';
import { PantryModule } from '../pantry/pantry.module';
import { CronController } from './cron.controller';

@Module({
  imports: [PantryModule],
  controllers: [CronController],
})
export class CronModule {}
