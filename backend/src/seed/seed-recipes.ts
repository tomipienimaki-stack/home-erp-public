/**
 * One-shot seed: generate 35 Finnish weekday recipes via Claude and insert them.
 * Run with: npm run seed:recipes
 */
import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_ID = process.env.SINGLE_USER_ID;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE || !USER_ID || !ANTHROPIC_KEY) {
  console.error('Missing env vars. Need SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SINGLE_USER_ID, ANTHROPIC_API_KEY.');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

const VALID_CATEGORIES = [
  'maitotuotteet', 'lihat_ja_kala', 'kasvikset_ja_hedelmat', 'kuivatuotteet',
  'sailykkeet', 'pakasteet', 'juomat', 'hygienia_ja_siisteys',
  'taloustarvikkeet', 'mausteet_ja_oljyt', 'muu',
] as const;
const VALID_UNITS = ['kpl', 'l', 'dl', 'kg', 'g', 'pkt', 'prk', 'tlk'] as const;
const VALID_MEAL_TYPES = ['aamiainen', 'lounas', 'paivallinen', 'valipala'] as const;

interface GeneratedRecipe {
  name: string;
  description?: string;
  servings: number;
  prep_time_min?: number;
  cook_time_min?: number;
  meal_type: typeof VALID_MEAL_TYPES[number];
  instructions: string;
  tags: string[];
  ingredients: {
    name: string;
    quantity: number;
    unit: typeof VALID_UNITS[number];
    category: typeof VALID_CATEGORIES[number];
    notes?: string;
  }[];
}

const SYSTEM = `Olet suomalainen kotikokki. Generoi 35 arkista perheen ruokaa suomalaiselle yhden hengen taloudelle.

Säännöt:
- Vastaus AINOASTAAN JSON-objektina: { "recipes": [<35 reseptiä>] }
- Reseptit ovat realistisia arkiruokia: pasta, kanaa, kalaa, kasviksia, keittoja, padat, perinneruokia.
- Variaatio: kasvis, kana, kala, jauheliha, kasvis-painotteinen jne. — ei toistoa.
- Älä keksi liian eksoottisia raaka-aineita; pysy suomalaisen kaupan valikoimassa.
- servings: 2 oletuksena.
- meal_type: yksi näistä: aamiainen | lounas | paivallinen | valipala (oletus paivallinen).
- tags: 2–4 lyhyttä avainsanaa (esim. "nopea", "pasta", "kasvis", "kana", "kala", "uuni", "wokki").
- instructions: lyhyt markdown, 3–6 askelta numeroituna.
- ingredients: 4–10 ainesosaa. Jokaiselle:
  - name suomeksi (esim. "Kananfilee", "Sipuli", "Pasta")
  - quantity numeerisena
  - unit: yksi näistä: ${VALID_UNITS.join(', ')}
  - category: yksi näistä: ${VALID_CATEGORIES.join(', ')}
- Käytä unitia järkevästi (maito = l, peruna = kpl tai kg, jauheliha = g, mausteet = tl/rkl mutta käytä g tai dl koska näitä ei ole listassa).`;

async function generate(): Promise<GeneratedRecipe[]> {
  console.log('Kysytään Claudelta 35 reseptiä... (kestää ~30 s)');
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 16000,
    system: SYSTEM,
    messages: [{ role: 'user', content: 'Generoi 35 arkista suomalaista reseptiä.' }],
  });

  const textBlock = response.content.find((c) => c.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('No text in AI response');

  const m = textBlock.text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('AI returned non-JSON:\n' + textBlock.text.slice(0, 500));

  const parsed = JSON.parse(m[0]);
  if (!Array.isArray(parsed.recipes)) throw new Error('Missing recipes[]');

  return parsed.recipes.filter((r: any) => r.name && Array.isArray(r.ingredients));
}

async function upsertIngredient(name: string, category: string, unit: string): Promise<string> {
  const { data: existing } = await sb
    .from('ingredients')
    .select('id')
    .eq('user_id', USER_ID!)
    .ilike('name', name)
    .maybeSingle();
  if (existing) return existing.id;

  const safeCat = VALID_CATEGORIES.includes(category as any) ? category : 'muu';
  const safeUnit = VALID_UNITS.includes(unit as any) ? unit : 'kpl';
  const { data, error } = await sb
    .from('ingredients')
    .insert({ user_id: USER_ID, name: name.trim(), category: safeCat, default_unit: safeUnit })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function insertRecipe(r: GeneratedRecipe): Promise<void> {
  const mealType = VALID_MEAL_TYPES.includes(r.meal_type) ? r.meal_type : 'paivallinen';
  const { data: recipe, error } = await sb
    .from('recipes')
    .insert({
      user_id: USER_ID,
      name: r.name.trim(),
      description: r.description ?? null,
      servings: r.servings ?? 2,
      prep_time_min: r.prep_time_min ?? null,
      cook_time_min: r.cook_time_min ?? null,
      meal_type: mealType,
      instructions: r.instructions ?? null,
      tags: Array.isArray(r.tags) ? r.tags : [],
    })
    .select('id')
    .single();
  if (error) throw error;

  const rows: any[] = [];
  for (const ing of r.ingredients) {
    if (!ing.name || !ing.quantity) continue;
    const ingredientId = await upsertIngredient(ing.name, ing.category, ing.unit);
    const safeUnit = VALID_UNITS.includes(ing.unit) ? ing.unit : 'kpl';
    rows.push({
      user_id: USER_ID,
      recipe_id: recipe.id,
      ingredient_id: ingredientId,
      quantity: ing.quantity,
      unit: safeUnit,
      notes: ing.notes ?? null,
    });
  }
  if (rows.length === 0) return;

  // Dedup by ingredient_id (unique constraint per recipe)
  const seen = new Set();
  const deduped = rows.filter((r) => {
    if (seen.has(r.ingredient_id)) return false;
    seen.add(r.ingredient_id);
    return true;
  });

  const { error: riErr } = await sb.from('recipe_ingredients').insert(deduped);
  if (riErr) throw riErr;
}

async function main() {
  const recipes = await generate();
  console.log(`Saatiin ${recipes.length} reseptiä. Tallennetaan...`);

  let ok = 0, fail = 0;
  for (let i = 0; i < recipes.length; i++) {
    try {
      await insertRecipe(recipes[i]);
      ok++;
      process.stdout.write(`\rTallennettu ${ok}/${recipes.length}`);
    } catch (err) {
      fail++;
      console.error(`\nVirhe reseptissä "${recipes[i].name}":`, (err as Error).message);
    }
  }
  console.log(`\nValmis. OK: ${ok}, virhe: ${fail}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
