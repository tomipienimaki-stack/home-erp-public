import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { SupabaseClient } from '@supabase/supabase-js';
import { SINGLE_USER_ID, SUPABASE_CLIENT } from '../supabase/supabase.module';
import { MealPlanService } from './meal-plan.service';
import { GenerateMealPlanDto } from './dto';
import { PlanMealType } from '../common/types';

@Injectable()
export class AiMealPlanService {
  private readonly logger = new Logger(AiMealPlanService.name);
  private client: Anthropic | null = null;

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly sb: SupabaseClient,
    @Inject(SINGLE_USER_ID) private readonly userId: string,
    private readonly config: ConfigService,
    private readonly plans: MealPlanService,
  ) {}

  private getClient(): Anthropic {
    if (!this.client) {
      const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
      if (!apiKey) {
        throw new BadRequestException(
          'ANTHROPIC_API_KEY not set in backend .env — cannot generate meal plan.',
        );
      }
      this.client = new Anthropic({ apiKey });
    }
    return this.client;
  }

  async generate(dto: GenerateMealPlanDto) {
    const weekStart = dto.week_start ?? MealPlanService.mondayOf();
    const days = dto.days ?? 7;
    const mealTypes: PlanMealType[] = dto.meal_types ?? ['paivallinen'];

    // Gather context
    const { data: recipes } = await this.sb
      .from('recipes')
      .select('id, name, meal_type, tags, last_cooked_at, servings')
      .eq('user_id', this.userId);

    if (!recipes || recipes.length === 0) {
      throw new BadRequestException(
        'Ei reseptejä — lisää reseptejä ensin tai generoi aloitusreseptit.',
      );
    }

    const { data: prefs } = await this.sb
      .from('food_preferences')
      .select('type, category, ingredient:ingredients(name)')
      .eq('user_id', this.userId);

    const { data: pantry } = await this.sb
      .from('pantry_items')
      .select('current_quantity, ingredient:ingredients(name, category)')
      .eq('user_id', this.userId);

    const recipeList = (recipes as any[]).map((r) => ({
      id: r.id,
      name: r.name,
      meal_type: r.meal_type,
      tags: r.tags ?? [],
      last_cooked_at: r.last_cooked_at,
    }));

    const prefList = (prefs ?? []).map((p: any) => ({
      type: p.type,
      target: p.ingredient?.name ?? p.category ?? 'unknown',
    }));

    const pantryList = (pantry ?? [])
      .filter((p: any) => Number(p.current_quantity) > 0)
      .map((p: any) => p.ingredient?.name)
      .filter(Boolean);

    const systemPrompt = `Olet kotikokin avustaja suomeksi. Suunnittele viikon ruokalista käyttäjän reseptikirjastosta.
Säännöt:
- Käytä VAIN annettuja reseptejä (recipe_id viittaa olemassa olevaan).
- Vältä saman reseptin toistoa kahden viikon sisällä (last_cooked_at).
- Suosi reseptejä jotka käyttävät jo varastossa olevia raaka-aineita.
- Kunnioita ruokarajoitteita (avoid/allergy ovat ehdottomia, prefer suosituksia).
- ÄLÄ täytä kaikkia päiviä. Käyttäjä syö päivällisen useimpina iltoina leipää ja juustoa, ja kokkaa vain 2-3 kertaa viikossa. Suunnittele siis KORKEINTAAN 3 ateriaa viikkoon, ellei ohjeissa muuta sanota. Loput illat jäävät tyhjiksi eli leipäilloiksi.
- Sijoita tuoreita raaka-aineita vaativat reseptit (kala, tuore liha, salaatti) viikon alkupäiviin ja säilyvät tai pakastetta käyttävät loppupäiviin, koska kaupassa käydään vain kerran viikossa.
- Vastaa AINOASTAAN JSON-objektina muodossa { "entries": [{ "day": 1-7, "meal_type": "lounas"|"paivallinen", "recipe_id": "uuid", "reason": "lyhyt selitys" }, ...] }
- day 1 = viikon ensimmainen paiva (kauppapaivaa seuraava paiva), day 7 = viikon viimeinen paiva.`;

    const userPrompt = JSON.stringify(
      {
        week_start: weekStart,
        days,
        meal_types: mealTypes,
        recipes: recipeList,
        preferences: prefList,
        in_pantry: pantryList,
        extra_instructions: dto.extra_instructions ?? null,
      },
      null,
      2,
    );

    this.logger.log(`Generating meal plan for ${weekStart} (${recipeList.length} recipes)`);
    const client = this.getClient();
    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textBlock = response.content.find((c: any) => c.type === 'text') as any;
    if (!textBlock?.text) throw new Error('AI returned no text');

    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error(`AI returned unparseable response: ${textBlock.text.slice(0, 200)}`);

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed.entries)) {
      throw new Error('AI response missing entries[]');
    }

    // Create plan (or get existing) + add entries
    const plan = await this.plans.create({ week_start: weekStart, ai_generated: true });

    // Clear existing entries on this plan so AI fully replaces
    await this.sb
      .from('meal_plan_entries')
      .delete()
      .eq('user_id', this.userId)
      .eq('meal_plan_id', plan.id);

    const validRecipeIds = new Set(recipeList.map((r) => r.id));
    let inserted = 0;
    for (const e of parsed.entries) {
      if (!validRecipeIds.has(e.recipe_id)) continue;
      if (!mealTypes.includes(e.meal_type)) continue;
      if (typeof e.day !== 'number' || e.day < 1 || e.day > days) continue;

      await this.plans.addEntry(plan.id, {
        day_of_week: e.day,
        meal_type: e.meal_type as PlanMealType,
        recipe_id: e.recipe_id,
      });
      inserted++;
    }

    return this.plans.getWithEntries(plan.id).then((p) => ({ ...p, inserted }));
  }
}
