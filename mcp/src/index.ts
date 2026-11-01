#!/usr/bin/env node
/**
 * Home ERP MCP server.
 * Exposes pantry, shopping list, recipes, meal plans and food preferences
 * to Claude by calling the Home ERP backend REST API (default http://localhost:3003).
 * The backend must be running.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API = (process.env.HOME_ERP_API ?? 'http://localhost:3003').replace(/\/$/, '');

const CATEGORIES = [
  'maitotuotteet', 'lihat_ja_kala', 'kasvikset_ja_hedelmat', 'kuivatuotteet',
  'sailykkeet', 'pakasteet', 'juomat', 'hygienia_ja_siisteys',
  'taloustarvikkeet', 'mausteet_ja_oljyt', 'muu',
] as const;
const UNITS = ['kpl', 'l', 'dl', 'kg', 'g', 'pkt', 'prk', 'tlk'] as const;
const STORES = ['lidl', 'k-market', 'prisma', 'muu'] as const;
const MEAL_TYPES = ['aamiainen', 'lounas', 'paivallinen', 'valipala'] as const;
const PLAN_MEAL_TYPES = ['lounas', 'paivallinen'] as const;
const CADENCES = ['joka_reissu', 'viikoittain', 'kahden_viikon_valein', 'kuukausittain'] as const;
const TIERS = ['perus', 'sailyva', 'tarkistettava', 'tuore'] as const;
const STATUSES = ['on', 'vahissa', 'loppu'] as const;

async function call(method: string, path: string, body?: unknown) {
  let res: Response;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (process.env.HOME_ERP_API_TOKEN) headers['X-Api-Key'] = process.env.HOME_ERP_API_TOKEN;
  try {
    res = await fetch(API + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    const local = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(API);
    throw new Error(
      local
        ? `Home ERP -palveluun ei saada yhteyttä (${API}). Käynnistä backend: cd ~/dev/home-erp/backend && npm run start:dev`
        : `Home ERP -palveluun ei saada yhteyttä (${API}).`,
    );
  }
  if (res.status === 401) {
    throw new Error('Home ERP hylkäsi API-avaimen. Tarkista HOME_ERP_API_TOKEN.');
  }
  const text = await res.text();
  if (!res.ok) throw new Error(`Home ERP API ${method} ${path} -> ${res.status}: ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : { ok: true };
}

type Result = { content: { type: 'text'; text: string }[]; isError?: boolean };
function wrap<A>(fn: (args: A) => Promise<unknown>) {
  return async (args: A): Promise<Result> => {
    try {
      const data = await fn(args);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: (e as Error).message }], isError: true };
    }
  };
}
const clean = (o: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

const INSTRUCTIONS = `Home ERP on käyttäjän kotitalouden ruokajärjestelmä. Raaka-aineilla on varastotaso (tier):
- perus: oletetaan aina olevan (suola, sokeri, jauhot, öljyt, kuivamausteet, liemikuutiot, pasta, riisi). Ei saldoa. Jos käyttäjä sanoo että jokin loppui, lisää se pantry_add_item-työkalulla stock_status='loppu', jolloin se menee ostoslistalle.
- sailyva: tilaseuranta on / vahissa / loppu (säilykkeet, tahnat, erikoiskuivatuotteet, pakastemarjat). Päivitä tila pantry_update_item-työkalulla. Säilyvät jakautuvat reseptien käyttömäärän mukaan: restock_mode 'ydin' (vähintään 2 reseptiä tai käsin asetettu) menee ostoslistalle heti kun tila on vahissa/loppu; 'tarvittaessa' menee ostoslistalle vain kun ruokalistan resepti tarvitsee sitä eikä tila ole 'on'. recipe_count näkyy pantry_list- ja ingredients_list-tuloksissa.
- tarkistettava: sipulit, valkosipuli, peruna, porkkana, kananmunat, voi, kovat juustot. Ei saldoa; ruokalista laittaa ne ostoslistalle merkinnällä check_first, ja käyttäjä tarkistaa ne ennen kauppaa.
- tuore: liha, kala, maitotuotteet, tuoreet vihannekset ja yrtit. Ostetaan ruokalistan mukaan. Ylijäämä kirjataan määränä ja best_before-päivänä; pantry_expiring näyttää pian vanhenevat.
Vakiotuotteet (staples_*) ovat reseptien ulkopuolisia toistuvia ostoksia (esimerkiksi leipä, juusto, munat, maito, juomat). Niillä on ostorytmi, ja erääntyneet menevät ostoslistalle joko ruokalistan yhteydessä tai staples_add_due-työkalulla.
Pakastin (freezer_*) seuraa valmiita annoksia kappaleina. Kun käyttäjä tekee ison satsin, ehdota pakastimeen lisäämistä.
Kauppapäivä (settings_*): käyttäjä asettaa yhden tai kaksi kauppapäivää viikossa. Vakiotuote erääntyy jo silloin kun se loppuisi ennen seuraavaa kauppapäivää, ei vasta kun se on loppunut, ja jos kulutusväli on kauppareissujen väliä lyhyempi, ostoslistalle tulee useampi kappale kerralla. Ateriaviikko alkaa pääkauppapäivää seuraavasta päivästä.
Sijoita tuoretta raaka-ainetta vaativat ateriat viikon alkuun ja säilyviin tai pakasteeseen nojaavat loppuun.
Uutta reseptiä tallentaessa anna jokaiselle raaka-aineelle category ja tier.`;

/** Kotitalouden omat tavat Claudelle, esim. "Kokkaan 2-3 kertaa viikossa, muina iltoina leipää." */
const HOUSEHOLD_NOTES = process.env.HOME_ERP_HOUSEHOLD_NOTES?.trim();
const FULL_INSTRUCTIONS = HOUSEHOLD_NOTES
  ? `${INSTRUCTIONS}\n\nKotitalouden omat tavat: ${HOUSEHOLD_NOTES}`
  : INSTRUCTIONS;

const server = new McpServer({ name: 'home-erp', version: '0.5.0' }, { instructions: FULL_INSTRUCTIONS });

// ---------- Pantry ----------
server.tool('pantry_list',
  'Listaa kaikki kotivaraston tuotteet (määrä, yksikkö, minimiraja, kategoria). Käytä kun pitää tietää mitä kotona on.',
  {}, wrap(async () => call('GET', '/pantry')));

server.tool('pantry_add_item',
  'Lisää uusi tuote kotivarastoon. Anna joko name (uusi/olemassa oleva raaka-aine nimellä) tai ingredient_id.',
  {
    name: z.string().optional(),
    ingredient_id: z.string().uuid().optional(),
    category: z.enum(CATEGORIES).optional(),
    current_quantity: z.number().min(0).optional().describe('Vain tuoreille ylijäämille ja muille määräseurattaville'),
    unit: z.enum(UNITS).optional(),
    min_threshold: z.number().min(0).optional().describe('Kun määrä <= tämä (ja > 0), tuote lisätään ostoslistalle'),
    stock_status: z.enum(STATUSES).optional().describe('Säilyville ja loppuneille perustarvikkeille'),
    best_before: z.string().optional().describe('Tuoreen ylijäämän parasta ennen, YYYY-MM-DD'),
    preferred_store: z.enum(STORES).optional(),
    notes: z.string().optional(),
  },
  wrap(async (a) => call('POST', '/pantry', clean(a))));

server.tool('pantry_update_item',
  'Päivitä varastotuotteen määrä, minimiraja, kauppa tai muistiinpano. Hae id ensin pantry_list-työkalulla.',
  {
    id: z.string().uuid(),
    current_quantity: z.number().min(0).optional(),
    unit: z.enum(UNITS).optional(),
    min_threshold: z.number().min(0).optional(),
    stock_status: z.enum(STATUSES).optional().describe("on / vahissa / loppu. 'vahissa' ja 'loppu' lisäävät ostoslistalle."),
    best_before: z.string().optional().describe('YYYY-MM-DD'),
    preferred_store: z.enum(STORES).optional(),
    notes: z.string().optional(),
  },
  wrap(async ({ id, ...rest }) => call('PATCH', `/pantry/${id}`, clean(rest))));

server.tool('pantry_expiring',
  'Tuoreet ylijäämät, jotka vanhenevat pian. Käytä kun suunnitellaan mitä kokata.',
  { days: z.number().int().min(0).optional().describe('Oletus 3 päivää') },
  wrap(async ({ days }) => call('GET', '/pantry/expiring' + (days !== undefined ? `?days=${days}` : ''))));

server.tool('pantry_consume',
  'Vähennä varastotuotteen määrää (esim. käytettiin ruoanlaitossa). Tarkistaa minimirajan ja lisää tarvittaessa ostoslistalle.',
  { id: z.string().uuid(), amount: z.number().min(0) },
  wrap(async ({ id, amount }) => call('POST', `/pantry/${id}/consume`, { amount })));

server.tool('pantry_remove_item', 'Poista tuote kotivarastosta.',
  { id: z.string().uuid() }, wrap(async ({ id }) => call('DELETE', `/pantry/${id}`)));

server.tool('pantry_check_thresholds',
  'Aja minimirajatarkistus: kaikki rajan alle menneet tuotteet lisätään ostoslistalle.',
  {}, wrap(async () => call('POST', '/pantry/check-thresholds')));

// ---------- Shopping list ----------
server.tool('shopping_list',
  'Näytä ostoslistan avoimet tuotteet. check_first=true tarkoittaa "tarkista kotona ennen kauppaa"; note kertoo mihin resepteihin tarvitaan. include_bought=true näyttää myös ostetut.',
  { include_bought: z.boolean().optional() },
  wrap(async ({ include_bought }) => call('GET', include_bought ? '/shopping-list/all' : '/shopping-list')));

server.tool('shopping_add',
  'Lisää tuote ostoslistalle.',
  {
    name: z.string().min(1),
    quantity_to_buy: z.number().min(0),
    unit: z.enum(UNITS),
    category: z.enum(CATEGORIES),
    store: z.enum(STORES).optional(),
    ingredient_id: z.string().uuid().optional(),
  },
  wrap(async (a) => call('POST', '/shopping-list', { ...clean(a), source: 'manual' })));

server.tool('shopping_mark_bought',
  'Merkitse ostoslistan tuote ostetuksi. Jos tuote on sidottu varastoon, varaston määrä kasvaa.',
  { id: z.string().uuid(), quantity_bought: z.number().min(0).optional() },
  wrap(async ({ id, quantity_bought }) =>
    call('POST', `/shopping-list/${id}/bought`, clean({ quantity_bought }))));

server.tool('shopping_update',
  'Muuta ostoslistan tuotteen nimeä, määrää, yksikköä, kategoriaa tai kauppaa.',
  {
    id: z.string().uuid(),
    name: z.string().min(1).optional(),
    quantity_to_buy: z.number().min(0).optional(),
    unit: z.enum(UNITS).optional(),
    category: z.enum(CATEGORIES).optional(),
    store: z.enum(STORES).optional(),
  },
  wrap(async ({ id, ...rest }) => call('PATCH', `/shopping-list/${id}`, clean(rest))));

server.tool('shopping_remove', 'Poista tuote ostoslistalta.',
  { id: z.string().uuid() }, wrap(async ({ id }) => call('DELETE', `/shopping-list/${id}`)));

server.tool('shopping_clear_bought', 'Poista kaikki ostetuiksi merkityt tuotteet listalta.',
  {}, wrap(async () => call('POST', '/shopping-list/clear-bought')));

// ---------- Recipes ----------
server.tool('recipes_list',
  'Listaa reseptit. Suodata halutessa ateriatyypillä tai tagilla.',
  { meal_type: z.enum(MEAL_TYPES).optional(), tag: z.string().optional() },
  wrap(async ({ meal_type, tag }) => {
    const q = new URLSearchParams(clean({ meal_type, tag }) as Record<string, string>).toString();
    return call('GET', '/recipes' + (q ? `?${q}` : ''));
  }));

server.tool('recipe_get',
  'Hae resepti kokonaisuudessaan sekä tieto, mitkä raaka-aineet löytyvät kotivarastosta ja mitä puuttuu.',
  { id: z.string().uuid() },
  wrap(async ({ id }) => {
    const [recipe, availability] = await Promise.all([
      call('GET', `/recipes/${id}`),
      call('GET', `/recipes/${id}/ingredients`).catch((e) => ({ error: (e as Error).message })),
    ]);
    return { recipe, availability };
  }));

server.tool('recipe_create',
  'Tallenna uusi resepti Home ERP:hen. Raaka-aineet nimellä; uudet raaka-aineet luodaan automaattisesti.',
  {
    name: z.string().min(1),
    description: z.string().optional(),
    servings: z.number().int().min(1).optional(),
    prep_time_min: z.number().int().min(0).optional(),
    cook_time_min: z.number().int().min(0).optional(),
    meal_type: z.enum(MEAL_TYPES).optional(),
    instructions: z.string().optional(),
    tags: z.array(z.string()).max(20).optional(),
    ingredients: z.array(z.object({
      name: z.string().min(1),
      quantity: z.number().min(0),
      unit: z.enum(UNITS),
      notes: z.string().optional(),
      category: z.enum(CATEGORIES).optional()
        .describe('Kauppakategoria. Anna aina: käytetään kun raaka-aine luodaan ensimmäistä kertaa.'),
      tier: z.enum(TIERS).optional()
        .describe('Varastotaso uudelle raaka-aineelle, ks. palvelimen ohjeet.'),
    })),
  },
  wrap(async (a) => call('POST', '/recipes', clean(a))));

server.tool('recipe_delete', 'Poista resepti.',
  { id: z.string().uuid() }, wrap(async ({ id }) => call('DELETE', `/recipes/${id}`)));

// ---------- Meal plans ----------
server.tool('meal_plan_current', 'Näytä kuluvan viikon ateriasuunnitelma.',
  {}, wrap(async () => call('GET', '/meal-plans/current')));

server.tool('meal_plan_list', 'Listaa kaikki ateriasuunnitelmat.',
  {}, wrap(async () => call('GET', '/meal-plans')));

server.tool('meal_plan_create', 'Luo tyhjä ateriasuunnitelma viikolle (week_start = maanantai, YYYY-MM-DD).',
  { week_start: z.string() },
  wrap(async ({ week_start }) => call('POST', '/meal-plans', { week_start })));

server.tool('meal_plan_generate',
  'Generoi ateriasuunnitelma Home ERP:n oman AI:n avulla reseptien, varaston ja mieltymysten pohjalta.',
  {
    week_start: z.string().optional(),
    days: z.number().int().min(1).max(7).optional(),
    meal_types: z.array(z.enum(PLAN_MEAL_TYPES)).optional(),
    extra_instructions: z.string().optional(),
  },
  wrap(async (a) => call('POST', '/meal-plans/generate', clean(a))));

server.tool('meal_plan_add_entry',
  'Lisää resepti ateriasuunnitelmaan tietylle päivälle (1 = maanantai ... 7 = sunnuntai).',
  {
    meal_plan_id: z.string().uuid(),
    day_of_week: z.number().int().min(1).max(7),
    meal_type: z.enum(PLAN_MEAL_TYPES),
    recipe_id: z.string().uuid(),
    servings: z.number().int().min(1).optional(),
  },
  wrap(async ({ meal_plan_id, ...rest }) => call('POST', `/meal-plans/${meal_plan_id}/entries`, clean(rest))));

server.tool('meal_plan_mark_cooked',
  'Merkitse ateria kokatuksi. Vähentää raaka-aineet kotivarastosta.',
  { meal_plan_id: z.string().uuid(), entry_id: z.string().uuid() },
  wrap(async ({ meal_plan_id, entry_id }) =>
    call('POST', `/meal-plans/${meal_plan_id}/entries/${entry_id}/cooked`)));

server.tool('meal_plan_to_shopping_list',
  'Laske ateriasuunnitelman puuttuvat raaka-aineet varastoon verrattuna ja lisää ne ostoslistalle.',
  { meal_plan_id: z.string().uuid() },
  wrap(async ({ meal_plan_id }) => call('POST', `/meal-plans/${meal_plan_id}/shopping-list`)));

// ---------- Preferences ----------
server.tool('food_preferences_list', 'Listaa ruokamieltymykset, vältettävät ruoat ja allergiat.',
  {}, wrap(async () => call('GET', '/food-preferences')));

server.tool('food_preference_add',
  'Lisää ruokamieltymys (prefer), vältettävä (avoid) tai allergia. Anna ingredient_id tai category.',
  {
    type: z.enum(['avoid', 'prefer', 'allergy']),
    ingredient_id: z.string().uuid().optional(),
    category: z.enum(CATEGORIES).optional(),
    notes: z.string().optional(),
  },
  wrap(async (a) => call('POST', '/food-preferences', clean(a))));

server.tool('ingredient_update',
  'Muuta raaka-aineen nimeä, oletusyksikköä tai kauppakategoriaa (vaikuttaa ostoslistan ryhmittelyyn).',
  {
    id: z.string().uuid(),
    name: z.string().min(1).optional(),
    default_unit: z.enum(UNITS).optional(),
    category: z.enum(CATEGORIES).optional(),
    tier: z.enum(TIERS).optional(),
    restock_override: z.enum(['ydin', 'tarvittaessa', 'auto']).optional()
      .describe("Säilyvän täydennystapa: 'ydin', 'tarvittaessa' tai 'auto' (reseptimäärän mukaan)."),
  },
  wrap(async ({ id, restock_override, ...rest }) =>
    call('PATCH', `/ingredients/${id}`, {
      ...clean(rest),
      ...(restock_override ? { restock_override: restock_override === 'auto' ? null : restock_override } : {}),
    })));

server.tool('ingredients_list',
  "Listaa raaka-aineet, id:t ja varastotasot. tier='perus' antaa perustarvikelistan.",
  { category: z.enum(CATEGORIES).optional(), tier: z.enum(TIERS).optional() },
  wrap(async ({ category, tier }) => {
    const q = new URLSearchParams(clean({ category, tier }) as Record<string, string>).toString();
    return call('GET', '/ingredients' + (q ? `?${q}` : ''));
  }));

// ---------- Vakiotuotteet ----------
server.tool('settings_get',
  'Kauppapäivät, seuraava kauppapäivä ja ateriaviikon alku.',
  {}, wrap(async () => call('GET', '/settings')));

server.tool('settings_set_shopping_days',
  'Aseta kauppapäivä(t). 1 = maanantai ... 7 = sunnuntai, korkeintaan kaksi päivää. Ensimmäinen on pääkauppapäivä, jota seuraavasta päivästä ateriaviikko alkaa.',
  {
    shopping_weekdays: z.array(z.number().int().min(1).max(7)).min(1).max(2)
      .describe('Esim. [7] = vain sunnuntai, [3,6] = keskiviikko ja lauantai'),
  },
  wrap(async (a: any) => call('PATCH', '/settings', a)));

server.tool('staples_list', 'Vakiotuotteet ja niiden ostorytmit.',
  {}, wrap(async () => call('GET', '/favorites')));

server.tool('staples_due', 'Vakiotuotteet, jotka on syytä ostaa seuraavalla kauppareissulla. suggested_quantity kertoo montako kappaletta kerralla.',
  {}, wrap(async () => call('GET', '/favorites/due')));

server.tool('staples_add_due', 'Lisää erääntyneet vakiotuotteet ostoslistalle.',
  {}, wrap(async () => call('POST', '/favorites/add-due-to-shopping')));

server.tool('staple_add',
  'Lisää uusi vakiotuote (reseptien ulkopuolinen toistuva ostos).',
  {
    name: z.string().min(1).describe('Tuotenimi kuten kaupassa'),
    cadence: z.enum(CADENCES).optional().describe('Ostorytmi; ilman tätä tai cadence_days-kenttää tuote ei mene listalle automaattisesti'),
    cadence_days: z.number().int().min(0).optional().describe('Ostoväli päivinä, esim. 60. Ohittaa cadence-kentän. 0 = joka reissu.'),
    category: z.enum(CATEGORIES).optional(),
    store: z.enum(STORES).optional(),
    package_size: z.number().min(0).optional(),
    package_unit: z.enum(UNITS).optional(),
    approx_price: z.number().min(0).optional(),
    ingredient_id: z.string().uuid().optional().describe('Jos tuote vastaa reseptien raaka-ainetta'),
    notes: z.string().optional(),
  },
  wrap(async (a) => call('POST', '/favorites', clean(a))));

server.tool('staple_update',
  'Muuta vakiotuotteen rytmiä, kauppaa tai muita tietoja.',
  {
    id: z.string().uuid(),
    name: z.string().min(1).optional(),
    cadence: z.enum(CADENCES).optional(),
    cadence_days: z.number().int().min(0).optional(),
    category: z.enum(CATEGORIES).optional(),
    store: z.enum(STORES).optional(),
    approx_price: z.number().min(0).optional(),
    last_bought_at: z.string().optional().describe('YYYY-MM-DD'),
    notes: z.string().optional(),
  },
  wrap(async ({ id, ...rest }) => call('PATCH', `/favorites/${id}`, clean(rest))));

server.tool('staple_to_shopping',
  'Lisaa yksittainen vakiotuote ostoslistalle heti, rytmista riippumatta (esim. wc-paperi loppumassa).',
  { id: z.string().uuid(), quantity: z.number().min(0).optional() },
  wrap(async ({ id, quantity }) =>
    call('POST', `/favorites/${id}/add-to-shopping` + (quantity ? `?quantity=${quantity}` : ''))));

server.tool('staple_remove', 'Poista vakiotuote.',
  { id: z.string().uuid() }, wrap(async ({ id }) => call('DELETE', `/favorites/${id}`)));

// ---------- Freezer ----------
server.tool('freezer_list', 'Pakastimen valmiit annokset, vanhimmat ensin.',
  { include_empty: z.boolean().optional() },
  wrap(async ({ include_empty }) => call('GET', '/freezer' + (include_empty ? '?include_empty=true' : ''))));

server.tool('freezer_add',
  'Lisää pakastimeen erä valmiita annoksia (esim. 7 × ragù 350 g).',
  {
    name: z.string().min(1),
    portions: z.number().int().min(0),
    portion_size: z.string().optional().describe('esim. "350 g" tai "2 hengen annos"'),
    recipe_id: z.string().uuid().optional(),
    frozen_at: z.string().optional().describe('YYYY-MM-DD, oletus tänään'),
    notes: z.string().optional(),
  },
  wrap(async (a) => call('POST', '/freezer', clean(a))));

server.tool('freezer_adjust',
  'Muuta pakastimen annosmäärää: delta -1 kun annos otetaan käyttöön, +n kun lisätään samaan erään.',
  { id: z.string().uuid(), delta: z.number().int() },
  wrap(async ({ id, delta }) => call('POST', `/freezer/${id}/adjust`, { delta })));

server.tool('freezer_remove', 'Poista pakastinerä kokonaan.',
  { id: z.string().uuid() }, wrap(async ({ id }) => call('DELETE', `/freezer/${id}`)));

await server.connect(new StdioServerTransport());
