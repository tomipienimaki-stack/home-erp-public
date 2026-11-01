import {
  BadRequestException,
  Injectable,
  Logger,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import {
  PANTRY_CATEGORIES,
  PANTRY_UNITS,
  PantryCategory,
  PantryUnit,
} from '../common/types';

export interface ImportedRecipe {
  name: string;
  description: string | null;
  servings: number;
  prep_time_min: number | null;
  cook_time_min: number | null;
  meal_type: 'aamiainen' | 'lounas' | 'paivallinen' | 'valipala';
  instructions: string;
  tags: string[];
  ingredients: {
    name: string;
    quantity: number;
    unit: PantryUnit;
    category: PantryCategory;
    notes: string | null;
  }[];
}

const SUPPORTED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB

@Injectable()
export class AiRecipeImporterService {
  private readonly logger = new Logger(AiRecipeImporterService.name);
  private client: Anthropic | null = null;

  constructor(private readonly config: ConfigService) {}

  private getClient(): Anthropic {
    if (!this.client) {
      const key = this.config.get<string>('ANTHROPIC_API_KEY');
      if (!key) {
        throw new BadRequestException(
          'ANTHROPIC_API_KEY not set in backend .env',
        );
      }
      this.client = new Anthropic({ apiKey: key });
    }
    return this.client;
  }

  async fromImage(image_base64: string, mime_type: string): Promise<ImportedRecipe> {
    if (!SUPPORTED_MIME.has(mime_type)) {
      throw new BadRequestException(`Unsupported image type: ${mime_type}`);
    }
    // base64 ratio ~4/3 of raw bytes
    const approxBytes = Math.ceil((image_base64.length * 3) / 4);
    if (approxBytes > MAX_IMAGE_BYTES) {
      throw new PayloadTooLargeException(
        `Image too large (${(approxBytes / 1_000_000).toFixed(1)} MB). Max 4 MB.`,
      );
    }

    const system = `Olet datan poimija. Saat kuvan reseptistä (screenshot, valokuva tai skannattu).
Tehtävä: poimi resepti strukturoituna JSON:nina.

Säännöt:
- Vastaa AINOASTAAN JSON-objektina muodossa { "recipe": { ... } }
- Recipe-kenttä:
  - name (suomeksi jos kuva on suomeksi; muuten alkuperäisellä kielellä)
  - description: lyhyt 1-2 lauseen kuvaus (tai null)
  - servings: numero (oletus 2)
  - prep_time_min, cook_time_min: numero tai null
  - meal_type: yksi näistä: aamiainen | lounas | paivallinen | valipala (oletus paivallinen)
  - instructions: täydet ohjeet markdown-muodossa
  - tags: 2-4 lyhyttä avainsanaa suomeksi (esim. "pasta", "kana", "kasvis", "uuni", "nopea")
  - ingredients: lista. Jokaiselle:
    - name (suomeksi normalisoituna, isolla kirjaimella alussa)
    - quantity: numero (esim. 0.5 ei "½")
    - unit: yksi näistä: ${PANTRY_UNITS.join(', ')}. Käytä g/dl/l ensisijaisesti pienille määrille.
    - category: yksi näistä: ${PANTRY_CATEGORIES.join(', ')}
    - notes: kuten "hienonnettuna" tai null

- Jos kuva ei ole resepti, palauta: { "error": "Kuva ei näytä reseptiltä" }
- Älä keksi ainesosia jotka eivät näy kuvassa. Jos määrä puuttuu, käytä 1 ja yksikkö kpl.`;

    this.logger.log('Calling Claude vision for recipe extraction...');
    const res = await this.getClient().messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 4096,
      system,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mime_type as any,
                data: image_base64,
              },
            },
            {
              type: 'text',
              text: 'Poimi resepti tästä kuvasta yllä olevien sääntöjen mukaisesti.',
            },
          ],
        },
      ],
    });

    const textBlock = res.content.find((c: any) => c.type === 'text') as any;
    if (!textBlock?.text) throw new Error('AI returned no text');

    const match = textBlock.text.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error('AI returned non-JSON: ' + textBlock.text.slice(0, 200));
    }
    const parsed = JSON.parse(match[0]);
    if (parsed.error) throw new BadRequestException(parsed.error);
    if (!parsed.recipe) {
      throw new Error('AI response missing recipe field');
    }
    return parsed.recipe as ImportedRecipe;
  }
}
