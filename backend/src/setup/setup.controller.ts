import {
  Body,
  ConflictException,
  Controller,
  Get,
  Inject,
  InternalServerErrorException,
  Post,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { Public } from '../auth/public.decorator';
import { SINGLE_USER_ID, SUPABASE_CLIENT } from '../supabase/supabase.module';

export class CreateOwnerDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

/**
 * Ensimmäinen käyttöönotto: tyhjässä asennuksessa sovellus pyytää luomaan
 * omistajan tunnuksen. Kun omistaja on olemassa, POST /setup on suljettu.
 */
@Public()
@Controller('setup')
export class SetupController {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly sb: SupabaseClient,
    @Inject(SINGLE_USER_ID) private readonly ownerId: string,
  ) {}

  @Get()
  async status(): Promise<{ needsOwner: boolean }> {
    return { needsOwner: !(await this.ownerExists()) };
  }

  @Post()
  async createOwner(@Body() dto: CreateOwnerDto): Promise<{ created: true }> {
    if (await this.ownerExists()) throw new ConflictException('Omistaja on jo luotu.');
    const { error } = await this.sb.auth.admin.createUser({
      id: this.ownerId,
      email: dto.email,
      password: dto.password,
      email_confirm: true,
    });
    if (error) throw new InternalServerErrorException(`Tunnuksen luonti epäonnistui: ${error.message}`);
    return { created: true };
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
