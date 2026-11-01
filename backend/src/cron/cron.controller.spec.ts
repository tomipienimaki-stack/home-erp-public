import { UnauthorizedException } from '@nestjs/common';
import { IS_PUBLIC } from '../auth/public.decorator';
import { CronController } from './cron.controller';

describe('CronController', () => {
  const pantry = {
    applyDailyConsumption: jest.fn().mockResolvedValue({ decremented: 3 }),
    checkAllThresholds: jest.fn().mockResolvedValue({ created: 2 }),
  };
  const controller = () => new CronController(pantry as any);
  const original = process.env.CRON_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = 's3cret';
  });
  afterAll(() => {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  });

  it('REQ-M02-3: ilman Authorization-otsaketta 401', async () => {
    await expect(controller().dailyConsumption(undefined)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(controller().dailyThresholdCheck(undefined)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(pantry.applyDailyConsumption).not.toHaveBeenCalled();
  });

  it('REQ-M02-3: väärä salaisuus 401 (myös eri pituinen)', async () => {
    await expect(controller().dailyConsumption('Bearer wrong')).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(controller().dailyConsumption('Bearer s3cret-and-more')).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(controller().dailyThresholdCheck('s3cret')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('REQ-M02-3: puuttuva CRON_SECRET palauttaa aina 401', async () => {
    delete process.env.CRON_SECRET;
    await expect(controller().dailyConsumption('Bearer ')).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(controller().dailyThresholdCheck('Bearer undefined')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(pantry.checkAllThresholds).not.toHaveBeenCalled();
  });

  it('REQ-M02-3: oikea salaisuus kutsuu palvelumetodia', async () => {
    await expect(controller().dailyConsumption('Bearer s3cret')).resolves.toEqual({ decremented: 3 });
    await expect(controller().dailyThresholdCheck('Bearer s3cret')).resolves.toEqual({ created: 2 });
    expect(pantry.applyDailyConsumption).toHaveBeenCalledTimes(1);
    expect(pantry.checkAllThresholds).toHaveBeenCalledTimes(1);
  });

  it('REQ-M02-3: reitit ovat @Public() (M-01)', () => {
    expect(Reflect.getMetadata(IS_PUBLIC, CronController)).toBe(true);
  });
});
