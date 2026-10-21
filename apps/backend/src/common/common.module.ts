import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Clock, SystemClock } from './clock';
import { APP_CONFIG, loadConfig } from './config';
import { KeyedMutex } from './keyed-mutex';
import { RateLimitedExceptionFilter } from './rate-limited.exception';

/** Global infrastructure: configuration, clock and the per-key lock (a single shared instance). */
@Global()
@Module({
  providers: [
    { provide: APP_CONFIG, useFactory: () => loadConfig() },
    { provide: Clock, useClass: SystemClock },
    { provide: APP_FILTER, useClass: RateLimitedExceptionFilter },
    KeyedMutex,
  ],
  exports: [APP_CONFIG, Clock, KeyedMutex],
})
export class CommonModule {}
