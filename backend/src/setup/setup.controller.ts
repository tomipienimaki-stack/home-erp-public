import {
  Body,
  ConflictException,
  Controller,
  Get,
  Inject,
  InternalServerErrorException,
  Logger,
  Optional,
  Post,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { Public } from '../auth/public.decorator';
import { RecipesService } from '../recipes/recipes.service';
import { SINGLE_USER_ID, SUPABASE_CLIENT } from '../supabase/supabase.module';
import { STARTER_RECIPES, withStarterTag } from './starter-recipes';

export class CreateOwnerDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  /** Lisätäänkö esimerkkireseptit. Oletuksena kyllä. */
  @IsOptional()
  @IsBoolean()
  starterRecipes?: boolean;
}

/**
 * Ensimmäinen käyttöönotto: tyhjässä asennuksessa sovellus pyytää luomaan
 * omistajan tunnuksen. Kun omistaja on olemassa, POST /setup on suljettu.
 */
@Public()
@Controller('setup')
export class SetupController {
  private readonly logger = new Logger(SetupController.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly sb: SupabaseClient,
    @Inject(SINGLE_USER_ID) private readonly ownerId: string,
    @Optional() private readonly recipes?: RecipesService,
  ) {}

  @Get()
  async status(): Promise<{ needsOwner: boolean }> {
    return { needsOwner: !(await this.ownerExists()) };
  }

  @Post()
  async createOwner(@Body() dto: CreateOwnerDto): Promise<{ created: true; starterRecipes: number }> {
    if (await this.ownerExists()) throw new ConflictException('Omistaja on jo luotu.');
    const { error } = await this.sb.auth.admin.createUser({
      id: this.ownerId,
      email: dto.email,
      password: dto.password,
      email_confirm: true,
    });
    if (error) throw new InternalServerErrorException(`Tunnuksen luonti epäonnistui: ${error.message}`);
    const starterRecipes = dto.starterRecipes === false ? 0 : await this.addStarterRecipes();
    return { created: true, starterRecipes };
  }

  /** Esimerkkireseptien virhe ei kaada tunnuksen luontia: tunnus on jo olemassa. */
  private async addStarterRecipes(): Promise<number> {
    if (!this.recipes) return 0;
    let added = 0;
    for (const recipe of STARTER_RECIPES) {
      try {
        await this.recipes.create(withStarterTag(recipe));
        added++;
      } catch (err) {
        this.logger.error(`Esimerkkireseptin "${recipe.name}" lisäys epäonnistui`, err as Error);
      }
    }
    return added;
  }

  private async ownerExists(): Promise<boolean> {
    const { data, error } = await this.sb.auth.admin.getUserById(this.ownerId);
    if (data?.user) return true;
    // GoTrue palauttaa puuttuvalle käyttäjälle 404:n. Muut virheet nostetaan,
    // jottei tunnusta luoda vahingossa, kun tilaa ei saada selville.
    if (error && (error as { status?: number }).status !== 404) {
      throw new InternalServerErrorException(`Käyttäjätietoja ei saatu: ${error.message}`);
    }
    return false;
  }
}
