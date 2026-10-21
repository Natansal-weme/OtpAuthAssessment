/**
 * Backend entry point.
 *
 * All routes are served under the `/api` prefix, e.g. `POST /api/auth/request-otp`.
 */
import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { existsSync } from 'node:fs';
import { AppModule } from './app.module';
import { API_PREFIX, configureApp } from './app.setup';

// Local secrets (OTP_SECRET) live in `apps/backend/.env`, see `.env.example`.
if (existsSync('.env')) process.loadEnvFile('.env');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);

  Logger.log(`Backend running on http://localhost:${port}/${API_PREFIX}`, 'Bootstrap');
}

void bootstrap();
