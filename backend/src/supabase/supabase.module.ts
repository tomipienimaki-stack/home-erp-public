import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_CLIENT = 'SUPABASE_CLIENT';
export const SINGLE_USER_ID = 'SINGLE_USER_ID';

@Global()
@Module({
  providers: [
    {
      provide: SUPABASE_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): SupabaseClient => {
        const url = config.get<string>('SUPABASE_URL');
        const key = config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
        if (!url || !key) {
          throw new Error(
            'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env',
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
      useFactory: (config: ConfigService): string => {
        const id = config.get<string>('SINGLE_USER_ID');
        if (!id) throw new Error('SINGLE_USER_ID must be set in .env');
        return id;
      },
    },
  ],
  exports: [SUPABASE_CLIENT, SINGLE_USER_ID],
})
export class SupabaseModule {}
