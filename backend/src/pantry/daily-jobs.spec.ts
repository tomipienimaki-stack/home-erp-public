import { consumptionStep } from './pantry.service';
import { DailyJobsInterceptor } from './daily-jobs.interceptor';

describe('consumptionStep', () => {
  const now = new Date('2026-11-10T08:00:00Z');

  it('ensimmäinen ajo kirjaa yhden päivän', () => {
    expect(consumptionStep(null, now)).toEqual({ days: 1, nextMark: now });
  });

  it('samana vuorokautena toistettu ajo ei vähennä uudelleen', () => {
    expect(consumptionStep('2026-11-10T01:00:00Z', now)).toBeNull();
    expect(consumptionStep('2026-11-09T09:00:00Z', now)).toBeNull();
  });

  it('kirjaa väliin jääneet vuorokaudet ja säilyttää osavuorokauden', () => {
    const step = consumptionStep('2026-11-07T06:00:00Z', now)!;
    expect(step.days).toBe(3);
    expect(step.nextMark.toISOString()).toBe('2026-11-10T06:00:00.000Z');
  });
});

describe('DailyJobsInterceptor', () => {
  const make = () => {
    const pantry = {
      applyDailyConsumption: jest.fn().mockResolvedValue({ decremented: 1 }),
      checkAllThresholds: jest.fn().mockResolvedValue({ created: 2 }),
    };
    return { pantry, i: new DailyJobsInterceptor(pantry as any, {} as any) };
  };

  it('ajaa kerran päivässä', async () => {
    const { pantry, i } = make();
    await Promise.all([i.ensureRan('2026-11-10'), i.ensureRan('2026-11-10')]);
    await i.ensureRan('2026-11-10');
    expect(pantry.applyDailyConsumption).toHaveBeenCalledTimes(1);
    await i.ensureRan('2026-11-11');
    expect(pantry.applyDailyConsumption).toHaveBeenCalledTimes(2);
    expect(pantry.checkAllThresholds).toHaveBeenCalledTimes(2);
  });

  it('epäonnistunut ajo yritetään uudelleen', async () => {
    const { pantry, i } = make();
    pantry.applyDailyConsumption.mockRejectedValueOnce(new Error('verkko'));
    await i.ensureRan('2026-11-10');
    await i.ensureRan('2026-11-10');
    expect(pantry.applyDailyConsumption).toHaveBeenCalledTimes(2);
  });
});
