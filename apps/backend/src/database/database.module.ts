import { Global, Module } from '@nestjs/common';
import { resolve } from 'node:path';
import { DATABASE_DIR, DatabaseService } from './database.service';

/**
 * Global module: `DatabaseService` can be injected in any provider without importing this module.
 *
 * Data is written to `$DATABASE_DIR` (default: `data/`, relative to the backend's working directory).
 */
@Global()
@Module({
  providers: [
    { provide: DATABASE_DIR, useFactory: () => resolve(process.env.DATABASE_DIR ?? 'data') },
    DatabaseService,
  ],
  exports: [DatabaseService],
})
export class DatabaseModule {}
