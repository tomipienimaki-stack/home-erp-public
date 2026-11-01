import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { json, urlencoded } from 'express';

/** Yhteiset asetukset paikalliselle palvelimelle (main.ts) ja Vercel-funktiolle (serverless.ts). */
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService);

  // Kuvat reseptituontia varten. Vercel rajaa pyynnön rungon 4,5 megatavuun.
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN', 'http://localhost:5173'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );
}
