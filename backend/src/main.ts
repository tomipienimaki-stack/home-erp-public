import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';

/** Paikallinen kehityspalvelin. Vercelissä ajetaan serverless.ts. */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  const port = Number(app.get(ConfigService).get<string>('PORT', '3001'));
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Home ERP backend running on http://localhost:${port}`);
}
bootstrap();
