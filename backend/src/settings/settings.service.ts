import { Inject, Injectable, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SINGLE_USER_ID, SUPABASE_CLIENT } from '../supabase/supabase.module';
import { UserSettings, WEEKDAY_NAMES } from '../common/types';
import { UpdateSettingsDto } from './dto';

const TABLE = 'user_settings';
const DEFAULT_WEEKDAYS = [7];

/** ISO-viikonpaiva: 1 = maanantai ... 7 = sunnuntai. */
export function isoWeekday(d: Date): number {
  return ((d.getDay() + 6) % 7) + 1;
}

function ymd(d: Date): string {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private cache: UserSettings | null = null;

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly sb: SupabaseClient,
    @Inject(SINGLE_USER_ID) private readonly userId: string,
  ) {}

  /** Asetukset; luo oletusrivin jos sita ei viela ole. Kaatumaton: palauttaa oletukset virhetilanteessa. */
  async get(): Promise<UserSettings> {
    if (this.cache) return this.cache;
    const { data, error } = await this.sb
      .from(TABLE)
      .select('*')
      .eq('user_id', this.userId)
      .maybeSingle();
    if (error) {
      this.logger.warn(`user_settings ei luettavissa (${error.message}), kaytetaan oletuksia`);
      return { user_id: this.userId, shopping_weekdays: DEFAULT_WEEKDAYS } as UserSettings;
    }
    if (data) {
      this.cache = this.normalize(data as UserSettings);
      return this.cache;
    }
    const { data: created, error: e2 } = await this.sb
      .from(TABLE)
      .insert({ user_id: this.userId, shopping_weekdays: DEFAULT_WEEKDAYS })
      .select('*')
      .single();
    if (e2) {
      this.logger.warn(`user_settings ei luotavissa (${e2.message}), kaytetaan oletuksia`);
      return { user_id: this.userId, shopping_weekdays: DEFAULT_WEEKDAYS } as UserSettings;
    }
    this.cache = this.normalize(created as UserSettings);
    return this.cache;
  }

  async update(dto: UpdateSettingsDto): Promise<UserSettings> {
    const days = Array.from(new Set(dto.shopping_weekdays)).sort((a, b) => a - b);
    const { data, error } = await this.sb
      .from(TABLE)
      .upsert(
        { user_id: this.userId, shopping_weekdays: days },
        { onConflict: 'user_id' },
      )
      .select('*')
      .single();
    if (error) throw error;
    this.cache = this.normalize(data as UserSettings);
    return this.cache;
  }

  private normalize(s: UserSettings): UserSettings {
    const days = (s.shopping_weekdays ?? DEFAULT_WEEKDAYS)
      .map(Number)
      .filter((d) => d >= 1 && d <= 7)
      .sort((a, b) => a - b);
    return { ...s, shopping_weekdays: days.length ? days : DEFAULT_WEEKDAYS };
  }

  /** Seuraava kauppapaiva tasta paivasta eteenpain (tama paiva mukaan lukien). */
  async nextShoppingDate(from = new Date()): Promise<Date> {
    const { shopping_weekdays } = await this.get();
    const d = new Date(from);
    d.setHours(0, 0, 0, 0);
    for (let i = 0; i < 8; i++) {
      if (shopping_weekdays.includes(isoWeekday(d))) return d;
      d.setDate(d.getDate() + 1);
    }
    return d;
  }

  /** Paivia seuraavaan kauppapaivaan (0 = tanaan). */
  async daysUntilNextShopping(from = new Date()): Promise<number> {
    const start = new Date(from);
    start.setHours(0, 0, 0, 0);
    const next = await this.nextShoppingDate(start);
    return Math.round((next.getTime() - start.getTime()) / 86_400_000);
  }

  /**
   * Pisin vali kahden kauppareissun valilla paivina. Yhdella kauppapaivalla 7,
   * kahdella esim. ke+la -> 4.
   */
  async shoppingInterval(): Promise<number> {
    const { shopping_weekdays } = await this.get();
    if (shopping_weekdays.length < 2) return 7;
    const [a, b] = shopping_weekdays;
    return Math.max(b - a, 7 - (b - a));
  }

  /**
   * Ateriaviikon alkupaiva: paakauppapaivaa seuraava paiva.
   * Sunnuntain kauppapaivalla tama on maanantai kuten ennenkin.
   */
  async planWeekStartOf(date = new Date()): Promise<string> {
    const { shopping_weekdays } = await this.get();
    const startWeekday = (shopping_weekdays[0] % 7) + 1;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const back = (isoWeekday(d) - startWeekday + 7) % 7;
    d.setDate(d.getDate() - back);
    return ymd(d);
  }

  /** Yhteenveto kayttoliittymaa ja MCP:ta varten. */
  async summary(): Promise<{
    shopping_weekdays: number[];
    shopping_weekday_names: string[];
    next_shopping_date: string;
    days_until_next_shopping: number;
    shopping_interval_days: number;
    plan_week_start: string;
  }> {
    const s = await this.get();
    const next = await this.nextShoppingDate();
    return {
      shopping_weekdays: s.shopping_weekdays,
      shopping_weekday_names: s.shopping_weekdays.map((d) => WEEKDAY_NAMES[d - 1]),
      next_shopping_date: ymd(next),
      days_until_next_shopping: await this.daysUntilNextShopping(),
      shopping_interval_days: await this.shoppingInterval(),
      plan_week_start: await this.planWeekStartOf(),
    };
  }
}
