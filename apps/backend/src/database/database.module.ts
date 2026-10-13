import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service';

/** Global module: `DatabaseService` can be injected in any provider without importing this module. */
@Global()
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
