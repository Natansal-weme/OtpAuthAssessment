import { Injectable } from '@nestjs/common';
import type { DatabaseSchema, TableName } from './database.schema';
import { InMemoryTable } from './in-memory-table';

/**
 * Mock in-memory JSON database.
 *
 * Tables are created lazily the first time they are accessed, and are typed through the
 * `DatabaseSchema` registry (see `database.schema.ts` for how to define a table).
 *
 *   constructor(private readonly db: DatabaseService) {}
 *
 *   const examples = this.db.table('examples'); // InMemoryTable<ExampleRecord>
 *
 * `DatabaseService` is a singleton (provided by the global `DatabaseModule`), so all services
 * share the same data for the lifetime of the process.
 *
 * NOTE: This file is provided as-is. You should not need to change it.
 */
@Injectable()
export class DatabaseService {
  private readonly tables = new Map<string, InMemoryTable<object>>();

  /** Returns the (typed) table registered under `name` in `DatabaseSchema`. */
  table<K extends TableName>(name: K): InMemoryTable<DatabaseSchema[K]> {
    let table = this.tables.get(name);
    if (!table) {
      table = new InMemoryTable<object>(name);
      this.tables.set(name, table);
    }
    return table as unknown as InMemoryTable<DatabaseSchema[K]>;
  }

  /** JSON-serializable dump of the whole database, e.g. `console.dir(db.snapshot(), { depth: null })`. */
  snapshot(): Record<string, unknown[]> {
    return Object.fromEntries([...this.tables].map(([name, table]) => [name, table.toJSON()]));
  }

  /** Drops all tables and data. Useful in tests. */
  reset(): void {
    this.tables.clear();
  }
}
