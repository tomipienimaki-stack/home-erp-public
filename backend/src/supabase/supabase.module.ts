import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ownerId, supabaseServiceKey, supabaseUrl } from './env';

export const SUPABASE_CLIENT = 'SUPABASE_CLIENT';
export const SINGLE_USER_ID = 'SINGLE_USER_ID';

@Global()
@Module({
  providers: [
    {
      provide: SUPABASE_CLIENT,
      inject: [ConfigService],
      useFactory: (_config: ConfigService): SupabaseClient => {
        const url = supabaseUrl();
        const key = supabaseServiceKey();
        if (!url || !key) {
          throw new Error(
            'Supabase ei ole kytketty: aseta SUPABASE_URL ja SUPABASE_SERVICE_ROLE_KEY (tai kytke Supabase Vercelin Storage-välilehdeltä).',
          );
        }
        return createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
      },
    },
    {
      provide: SINGLE_USER_ID,
      inject: [ConfigService],
      useFactory: (_config: ConfigService): string => ownerId(),
    },
  ],
  exports: [SUPABASE_CLIENT, SINGLE_USER_ID],
})
export class SupabaseModule {}
