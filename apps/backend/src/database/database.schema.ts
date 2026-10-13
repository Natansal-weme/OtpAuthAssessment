import type { z } from 'zod';
import type { Row, TableSchema } from './table';

/**
 * Database schema registry.
 *
 * The database has NO tables yet - defining them is part of the assessment.
 *
 * ────────────────────────────────────────────────────────────────────────────────
 * How to define a table
 * ────────────────────────────────────────────────────────────────────────────────
 *
 * 1. Describe the row shape with a zod object schema. Do NOT declare `id`, `createdAt` or
 *    `updatedAt`: the database adds them to every row (see `BaseRecord`).
 *    Rows are stored as JSON files, so use `z.coerce.date()` for `Date` columns.
 *
 *      import { z } from 'zod';
 *
 *      export const ExampleSchema = z.object({
 *        title: z.string().min(1),
 *        done: z.boolean().default(false),
 *        dueAt: z.coerce.date().optional(),
 *      });
 *
 * 2. Register it in `databaseSchema` below. The key is the table name:
 *
 *      export const databaseSchema = {
 *        examples: ExampleSchema,
 *      } satisfies Record<string, TableSchema>;
 *
 * 3. Inject `DatabaseService` and use the table. It is fully typed and every call is async:
 *
 *      const examples = this.db.table('examples');            // Table<typeof ExampleSchema>
 *      const row = await examples.insert({ title: 'a' });     // validated with ExampleSchema
 *      await examples.findOne({ title: 'a' });                // Row<Example> | undefined
 *      await examples.findMany({ dueAt: { $lt: new Date() } });
 *      await examples.update(row.id, { done: true });
 *
 *    Need the row type elsewhere? `TableRow<'examples'>` (or `z.infer<typeof ExampleSchema>`
 *    for the shape without the auto-managed columns).
 *
 * See `table.ts` for the full table API.
 */

/**
 * Table name -> row schema.
 *
 * TODO: Candidate to implement
 */
export const databaseSchema = {} satisfies Record<string, TableSchema>;

export type DatabaseSchema = typeof databaseSchema;

/** Union of all registered table names. */
export type TableName = Extract<keyof DatabaseSchema, string>;

/** A stored row of table `K`, including `id`, `createdAt` and `updatedAt`. */
export type TableRow<K extends TableName> = Row<z.output<DatabaseSchema[K]>>;
