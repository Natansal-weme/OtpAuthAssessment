/**
 * Database schema registry.
 *
 * The in-memory database has NO tables yet - defining them is part of the assessment.
 *
 * ────────────────────────────────────────────────────────────────────────────────
 * How to define a table
 * ────────────────────────────────────────────────────────────────────────────────
 *
 * 1. Describe the row shape with a TypeScript interface. Do NOT declare `id`,
 *    `createdAt` or `updatedAt`: the database adds them to every row (see `BaseRecord`).
 *
 *      export interface ExampleRecord {
 *        title: string;
 *        done: boolean;
 *      }
 *
 * 2. Register it in `DatabaseSchema` below. The key is the table name:
 *
 *      export interface DatabaseSchema {
 *        examples: ExampleRecord;
 *      }
 *
 *    (Alternatively, register it from your own module with declaration merging:
 *        declare module '../database/database.schema' {
 *          interface DatabaseSchema { examples: ExampleRecord }
 *        }
 *    )
 *
 * 3. Inject `DatabaseService` and use the table. It is fully typed:
 *
 *      const examples = this.db.table('examples');      // InMemoryTable<ExampleRecord>
 *      const row = examples.insert({ title: 'a', done: false });
 *      examples.findOne({ title: 'a' });                 // Row<ExampleRecord> | undefined
 *      examples.update(row.id, { done: true });
 *
 * See `in-memory-table.ts` for the full table API.
 */

/** Columns automatically managed by the database for every row. */
export interface BaseRecord {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Table name -> row shape.
 *
 * TODO: Candidate to implement
 */
export interface DatabaseSchema {}

/** Union of all registered table names. */
export type TableName = Extract<keyof DatabaseSchema, string>;
