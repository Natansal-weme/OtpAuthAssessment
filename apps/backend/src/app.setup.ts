import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { requireJson } from './common/require-json.middleware';

export const API_PREFIX = 'api';

/** HTTP-level setup shared by `main.ts` and the e2e tests. */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix(API_PREFIX);

  app.enableCors({
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  });

  app.use(cookieParser());
  app.use(requireJson);
}
