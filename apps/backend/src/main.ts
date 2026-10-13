/**
 * Backend entry point.
 *
 * All routes are served under the `/api` prefix, e.g. `POST /api/auth/request-otp`.
 */
import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

export const API_PREFIX = 'api';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix(API_PREFIX);

  app.enableCors({
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  });

  // TODO: Candidate to implement (optional)

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);

  Logger.log(`Backend running on http://localhost:${port}/${API_PREFIX}`, 'Bootstrap');
}

void bootstrap();
