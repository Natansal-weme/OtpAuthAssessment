import { z } from 'zod';
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

/** Phones are stored in E.164 (`+972…`), see `common/phone.ts`. */
const E164 = z.string().regex(/^\+\d{8,15}$/);
const SHA256_HEX = z.string().regex(/^[0-9a-f]{64}$/);

/** A registered user. Exists only once the profile is complete. */
export const UserSchema = z.object({
  phone: E164,
  name: z
    .string()
    .trim()
    .min(1, 'Enter your name')
    .max(100, 'Name must be at most 100 characters'),
  email: z.email('Enter a valid email address').toLowerCase(),
});

/**
 * The OTP challenge of a phone (at most one per phone). The code itself is never stored, only its
 * HMAC. `sendCount` / `windowStartedAt` outlive the code so the hourly send cap survives resends.
 */
export const OtpChallengeSchema = z.object({
  phone: E164,
  codeHash: SHA256_HEX,
  expiresAt: z.coerce.date(),
  attempts: z.number().int().min(0),
  lastSentAt: z.coerce.date(),
  sendCount: z.number().int().min(1),
  windowStartedAt: z.coerce.date(),
});

/** Proof that `phone` was verified, consumed by `complete-registration`. Single use. */
export const RegistrationTicketSchema = z.object({
  tokenHash: SHA256_HEX,
  phone: E164,
  expiresAt: z.coerce.date(),
});

export const SessionSchema = z.object({
  tokenHash: SHA256_HEX,
  userId: z.string(),
  expiresAt: z.coerce.date(),
});

/** Table name -> row schema. */
export const databaseSchema = {
  users: UserSchema,
  otpChallenges: OtpChallengeSchema,
  registrationTickets: RegistrationTicketSchema,
  sessions: SessionSchema,
} satisfies Record<string, TableSchema>;

export type DatabaseSchema = typeof databaseSchema;

/** Union of all registered table names. */
export type TableName = Extract<keyof DatabaseSchema, string>;

/** A stored row of table `K`, including `id`, `createdAt` and `updatedAt`. */
export type TableRow<K extends TableName> = Row<z.output<DatabaseSchema[K]>>;
