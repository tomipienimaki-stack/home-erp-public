import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'node:crypto';
import { SINGLE_USER_ID, SUPABASE_CLIENT } from '../supabase/supabase.module';
import { IS_PUBLIC } from './public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private readonly disabled: boolean;
  private readonly apiToken?: string;

  constructor(
    private readonly reflector: Reflector,
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    @Inject(SINGLE_USER_ID) private readonly singleUserId: string,
    config: ConfigService,
  ) {
    this.disabled = config.get<string>('AUTH_DISABLED') === 'true';
    this.apiToken = config.get<string>('HOME_ERP_API_TOKEN') || undefined;
    if (this.disabled) {
      this.logger.warn('AUTH_DISABLED=true: kaikki pyynnöt päästetään läpi. Älä käytä tuotannossa.');
    }
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (this.disabled) return true;
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const headers = ctx.switchToHttp().getRequest().headers ?? {};

    const apiKey = headers['x-api-key'];
    if (this.apiToken && typeof apiKey === 'string' && this.matchesToken(apiKey)) return true;

    const auth = headers['authorization'];
    if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
      const jwt = auth.slice('Bearer '.length).trim();
      const { data, error } = await this.supabase.auth.getUser(jwt);
      if (!error && data?.user?.id === this.singleUserId) return true;
    }

    throw new UnauthorizedException();
  }

  private matchesToken(given: string): boolean {
    const a = Buffer.from(given);
    const b = Buffer.from(this.apiToken as string);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }
}
