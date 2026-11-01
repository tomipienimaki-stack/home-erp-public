import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { SupabaseClient } from '@supabase/supabase-js';
import { SINGLE_USER_ID, SUPABASE_CLIENT } from '../supabase/supabase.module';
import {
  CADENCE_DAYS,
  FavoriteProduct,
  PANTRY_CATEGORIES,
  PANTRY_UNITS,
  STORES,
  StapleCadence,
} from '../common/types';
import { SettingsService } from '../settings/settings.service';
import {
  BulkInsertDto,
  CreateFavoriteDto,
  ImportTextDto,
  UpdateFavoriteDto,
} from './dto';

const TABLE = 'favorite_products';
const SHOPPING_TABLE = 'shopping_list_items';

@Injectable()
export class FavoritesService {
  private readonly logger = new Logger(FavoritesService.name);
  private client: Anthropic | null = null;

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly sb: SupabaseClient,
    @Inject(SINGLE_USER_ID) private readonly userId: string,
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
  ) {}

  private getClient(): Anthropic {
    if (!this.client) {
      const key = this.config.get<string>('ANTHROPIC_API_KEY');
      if (!key) throw new BadRequestException('ANTHROPIC_API_KEY not set');
      this.client = new Anthropic({ apiKey: key });
    }
    return this.client;
  }

  async list(): Promise<FavoriteProduct[]> {
    const { data, error } = await this.sb
      .from(TABLE)
      .select('*')
      .eq('user_id', this.userId)
      .order('category')
      .order('name');
    if (error) throw error;
    return (data ?? []) as FavoriteProduct[];
  }

  private cadenceDaysOf(f: FavoriteProduct): number {
    return f.cadence_days ?? CADENCE_DAYS[f.cadence as StapleCadence] ?? 0;
  }

  /**
   * Vakiotuotteet, jotka on syytä ostaa seuraavalla kauppareissulla.
   * Tuote erääntyy, jos se loppuisi ennen seuraavaa reissua tai sen aikana,
   * ei vasta kun se on jo loppunut. Näin kaikki osuu samalle kauppapäivälle.
   */
  async due(): Promise<Array<FavoriteProduct & { suggested_quantity: number }>> {
    const { data, error } = await this.sb
      .from(TABLE)
      .select('*')
      .eq('user_id', this.userId)
      .or('cadence.not.is.null,cadence_days.not.is.null')
      .order('category')
      .order('name');
    if (error) throw error;

    const untilNext = await this.settings.daysUntilNextShopping();
    const interval = await this.settings.shoppingInterval();
    const today = Date.now();

    return ((data ?? []) as FavoriteProduct[])
      .filter((f) => {
        const days = this.cadenceDaysOf(f);
        if (days === 0 || !f.last_bought_at) return true;
        const since = (today - new Date(f.last_bought_at).getTime()) / 86_400_000;
        // Erääntyy, jos varasto loppuu ennen SEURAAVAA SEURAAVAA reissua. Tuotetta
        // ostetaan nyt, jotta se riittää yli tulevan reissuvälin: pelkkä
        // "loppuu ennen seuraavaa reissua" jättäisi viikoittaisen leivän ostamatta
        // juuri sillä reissulla, jolla se pitäisi ostaa.
        return since + untilNext + interval >= days;
      })
      .map((f) => {
        const days = this.cadenceDaysOf(f);
        // Jos kulutusväli on kauppareissujen väliä lyhyempi, ostetaan useampi kerralla.
        const suggested_quantity =
          days > 0 ? Math.max(1, Math.ceil(interval / days)) : 1;
        return { ...f, suggested_quantity };
      });
  }

  /** Lisää erääntyneet vakiotuotteet ostoslistalle (ei tuplia). */
  async addDueToShoppingList(): Promise<{ created: number; skipped: number }> {
    const due = await this.due();
    let created = 0;
    let skipped = 0;
    for (const f of due) {
      const { data: existing } = await this.sb
        .from(SHOPPING_TABLE)
        .select('id')
        .eq('user_id', this.userId)
        .eq('favorite_id', f.id)
        .eq('status', 'pending')
        .limit(1);
      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }
      const days = this.cadenceDaysOf(f);
      const note =
        f.suggested_quantity > 1
          ? `Kuluu ${days} vrk välein, ostetaan ${f.suggested_quantity} kerralla`
          : null;
      const { error } = await this.sb.from(SHOPPING_TABLE).insert({
        user_id: this.userId,
        ingredient_id: f.ingredient_id,
        favorite_id: f.id,
        name: f.name,
        quantity_to_buy: f.suggested_quantity,
        // Ostoslistalla ostetaan kappaleita, ei pakkauskoon yksikoita:
        // package_unit kertoo paljonko paketissa on, ei mita kaupasta otetaan.
        unit: 'kpl',
        category: f.category,
        store: f.store,
        status: 'pending',
        source: 'vakio',
        note,
      });
      if (error) throw error;
      created++;
    }
    this.logger.log(`Vakiotuotteet: ${created} lisatty, ${skipped} jo listalla`);
    return { created, skipped };
  }

  async create(dto: CreateFavoriteDto): Promise<FavoriteProduct> {
    const { data, error } = await this.sb
      .from(TABLE)
      .insert({
        user_id: this.userId,
        name: dto.name.trim(),
        store: dto.store ?? 'muu',
        category: dto.category ?? 'muu',
        package_size: dto.package_size ?? null,
        package_unit: dto.package_unit ?? null,
        approx_price: dto.approx_price ?? null,
        notes: dto.notes ?? null,
        ingredient_id: dto.ingredient_id ?? null,
        in_stock: dto.in_stock ?? true,
        cadence: dto.cadence ?? null,
        cadence_days: dto.cadence_days ?? null,
        last_bought_at: dto.last_bought_at ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as FavoriteProduct;
  }

  async update(id: string, dto: UpdateFavoriteDto): Promise<FavoriteProduct> {
    const { data, error } = await this.sb
      .from(TABLE)
      .update(dto)
      .eq('user_id', this.userId)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    if (!data) throw new NotFoundException(`Favorite ${id} not found`);
    return data as FavoriteProduct;
  }

  async delete(id: string): Promise<{ id: string }> {
    const { error } = await this.sb
      .from(TABLE)
      .delete()
      .eq('user_id', this.userId)
      .eq('id', id);
    if (error) throw error;
    return { id };
  }

  async bulkInsert(dto: BulkInsertDto): Promise<{ inserted: number }> {
    if (dto.items.length === 0) return { inserted: 0 };
    const rows = dto.items.map((it) => ({
      user_id: this.userId,
      name: it.name.trim(),
      store: it.store ?? 'muu',
      category: it.category ?? 'muu',
      package_size: it.package_size ?? null,
      package_unit: it.package_unit ?? null,
      approx_price: it.approx_price ?? null,
      in_stock: it.in_stock ?? true,
    }));
    const { error, data } = await this.sb.from(TABLE).insert(rows).select('id');
    if (error) throw error;
    return { inserted: data?.length ?? 0 };
  }

  // ============================================================
  // Add a favorite to the active shopping list
  // ============================================================
  async addToShoppingList(id: string, quantity = 1): Promise<{ ok: true }> {
    const fav = (await this.sb
      .from(TABLE)
      .select('*')
      .eq('user_id', this.userId)
      .eq('id', id)
      .maybeSingle()).data as FavoriteProduct | null;
    if (!fav) throw new NotFoundException('Favorite not found');

    // Pack → base unit conversion: if favorite has a known package_size + unit,
    // record the pantry addition so markBought adds the right amount.
    const pantry_addition_amount =
      fav.package_size != null && fav.package_unit
        ? Number(fav.package_size) * quantity
        : null;
    const pantry_addition_unit =
      fav.package_size != null && fav.package_unit ? fav.package_unit : null;

    await this.sb.from(SHOPPING_TABLE).insert({
      user_id: this.userId,
      ingredient_id: fav.ingredient_id,
      name: fav.name,
      quantity_to_buy: quantity,
      unit: 'pkt',
      category: fav.category,
      store: fav.store,
      status: 'pending',
      source: 'manual',
      pantry_addition_amount,
      pantry_addition_unit,
    });
    return { ok: true };
  }

  // ============================================================
  // Import — Claude parses raw text dump into structured items
  // ============================================================
  async importText(dto: ImportTextDto): Promise<{
    items: Array<{
      name: string;
      store: string;
      category: string;
      package_size: number | null;
      package_unit: string | null;
      approx_price: number | null;
      in_stock: boolean;
    }>;
  }> {
    const defaultStore = dto.default_store ?? 'k-market';
    const system = `Olet datan poimija. Saat raakaa, sotkuista tekstiä joka on kopioitu suomalaisen ruokakaupan (S-Kaupat / K-Market / Lidl / Prisma) "suosikit"-sivulta. Tekstissä toistuu vakiotekstiä kuten "Lisää yksi kappale ostoskoriin", "Poista yksi kappale ostoskorista", "Lisää suosikkeihin" — älä huomioi näitä.

Tehtävä: poimi LISTA tuotteista strukturoituna JSON:nina.

Säännöt:
- Vastaa AINOASTAAN JSON:ina: { "items": [...] }
- Jokainen item:
  - name (täydellinen tuotenimi sellaisena kuin se on)
  - store: "${STORES.join('" | "')}" (oletus: "${defaultStore}")
  - category: yksi näistä: ${PANTRY_CATEGORIES.join(', ')}. Mappaa kaupan kategoria näihin (esim. "Hedelmät ja vihannekset" → "kasvikset_ja_hedelmat", "Juustot, tofut ja kasvipohjaiset" → "maitotuotteet", "Kahvit, teet ja mehut" → "juomat", "Liha ja kasviproteiinit" → "lihat_ja_kala", "Maito, munat ja rasvat" → "maitotuotteet", "Leivät, keksit ja leivonnaiset" → "kuivatuotteet", "Karkit ja suklaat" → "muu", "Kodinhoito ja taloustarvikkeet" → "taloustarvikkeet" tai "hygienia_ja_siisteys", "Öljyt, maustaminen ja kastikkeet" → "mausteet_ja_oljyt", "Pakasteet" → "pakasteet", "Pastat, riisit ja nuudelit" → "kuivatuotteet", "Snacksit" → "muu", "Valmisruoka" → "muu")
  - package_size: numeerinen pakkauskoko jos näkyvissä (esim. "500g" → 500, "1,5 L" → 1.5, "1l" → 1)
  - package_unit: yksi näistä jos pakkauskoko on tiedossa: ${PANTRY_UNITS.join(', ')}. Yleensä g/kg/l/dl/kpl.
  - approx_price: euroissa numerona jos näkyvissä (esim. "10,59 €" → 10.59). Jätä null jos ei näy.
  - in_stock: false jos teksti sanoo "Ei valikoimassa", muuten true.

Ohita "Alkoholi"-otsikon alla olevat erikoiset tuotteet jotka eivät ole oikeasti alkoholia — virvoitusjuomat menevät kategoriaan "juomat".

Jos jokin tuote on ilmoitettu duplikaattina eri pakkauskoissa, säilytä molemmat.`;

    this.logger.log(`Importing favorites from text (${dto.text.length} chars)`);
    const res = await this.getClient().messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 16000,
      system,
      messages: [{ role: 'user', content: dto.text }],
    });

    const text = res.content.find((c: any) => c.type === 'text') as any;
    if (!text?.text) throw new Error('AI returned no text');
    const match = text.text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI returned non-JSON');
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed.items)) throw new Error('AI response missing items[]');
    return { items: parsed.items };
  }
}
