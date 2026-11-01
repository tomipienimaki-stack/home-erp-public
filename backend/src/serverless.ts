import type { IncomingMessage, ServerResponse } from 'node:http';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';

type Server = ReturnType<typeof express>;
let server: Promise<Server> | undefined;

async function createServer(): Promise<Server> {
  const instance = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(instance), {
    logger: ['error', 'warn'],
  });
  configureApp(app);
  await app.init();
  return instance;
}

/**
 * Muuntaa Vercelin pyynnön backendin reitiksi. Juuren vercel.json ohjaa
 * `/api/:path*` osoitteeseen `/api?path=:path*`. Varalla poistetaan myös
 * `/api`-etuliite, jos alkuperäinen polku on tallella.
 */
export function toBackendUrl(rawUrl: string): string {
  const url = new URL(rawUrl, 'http://localhost');
  const rewritten = url.searchParams.get('path');
  url.searchParams.delete('path');
  const path =
    rewritten !== null
      ? '/' + rewritten.replace(/^\/+/, '')
      : url.pathname.replace(/^\/api(?=\/|$)/, '') || '/';
  const query = url.searchParams.toString();
  return path + (query ? `?${query}` : '');
}

/** Vercel-funktion käsittelijä. Nest-sovellus luodaan kerran ja pidetään lämpimänä. */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  server ??= createServer();
  const app = await server;
  req.url = toBackendUrl(req.url ?? '/');
  app(req as any, res as any);
}
