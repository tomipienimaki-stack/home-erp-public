import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { IS_PUBLIC } from '../auth/public.decorator';
import { PantryService } from './pantry.service';

/**
 * Päivittäiset ajot ilman ajastinta: kun sovellusta käytetään ensimmäisen kerran
 * uutena päivänä, kirjataan kulutus ja lisätään vähiin käyneet ostoslistalle.
 * Molemmat ajot ovat idempotentteja, joten useampi palvelininstanssi tai kesken
 * jäänyt ajo ei haittaa.
 */
@Injectable()
export class DailyJobsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(DailyJobsInterceptor.name);
  private lastRunDay: string | null = null;
  private running: Promise<void> | null = null;

  constructor(
    private readonly pantry: PantryService,
    private readonly reflector: Reflector,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!isPublic && process.env.DAILY_JOBS_ON_REQUEST !== 'false') {
      // Ei odoteta: pyyntö palvelee heti, ja ajo valmistuu taustalla.
      void this.ensureRan();
    }
    return next.handle();
  }

  ensureRan(today = new Date().toISOString().slice(0, 10)): Promise<void> {
    if (this.lastRunDay === today) return Promise.resolve();
    this.running ??= this.run(today).finally(() => (this.running = null));
    return this.running;
  }

  private async run(today: string): Promise<void> {
    try {
      const { decremented } = await this.pantry.applyDailyConsumption();
      const { created } = await this.pantry.checkAllThresholds();
      this.logger.log(`Päivän ajot: kulutus ${decremented}, ostoslistalle ${created}`);
      this.lastRunDay = today;
    } catch (err) {
      // Ajon virhe ei saa estää varsinaista pyyntöä. Yritetään uudelleen seuraavalla pyynnöllä.
      this.logger.error('Päivän ajot epäonnistuivat', err as Error);
    }
  }
}
