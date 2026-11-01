import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { Public } from '../auth/public.decorator';
import { PantryService } from '../pantry/pantry.service';

/** Vercel Cron kutsuu näitä GET-reitteillä ja lähettää `Authorization: Bearer <CRON_SECRET>`. */
@Public()
@Controller('cron')
export class CronController {
  constructor(private readonly pantry: PantryService) {}

  @Get('daily-consumption')
  async dailyConsumption(@Headers('authorization') auth?: string): Promise<{ decremented: number }> {
    this.assertCronSecret(auth);
    return this.pantry.applyDailyConsumption();
  }

  @Get('daily-threshold-check')
  async dailyThresholdCheck(@Headers('authorization') auth?: string): Promise<{ created: number }> {
    this.assertCronSecret(auth);
    return this.pantry.checkAllThresholds();
  }

  private assertCronSecret(auth?: string): void {
    const secret = process.env.CRON_SECRET;
    if (!secret || !auth) throw new UnauthorizedException();
    const expected = Buffer.from(`Bearer ${secret}`);
    const actual = Buffer.from(auth);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new UnauthorizedException();
    }
  }
}
