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

/** A registered account. `phone` (E.164) and `email` (lowercased) are unique. */
export interface UserRecord {
  phone: string;
  name: string;
  email: string;
}

/**
 * An outstanding one-time code for a phone number. At most one per phone: issuing a new code
 * replaces the previous one. Only an HMAC of the code is stored, never the code itself.
 */
export interface OtpChallengeRecord {
  phone: string;
  codeHash: string;
  expiresAt: Date;
  /** Failed verification attempts so far; the challenge is burned at `OTP_MAX_ATTEMPTS`. */
  attempts: number;
}

/**
 * "Pending registration" state: the phone was proven via OTP but no account exists yet.
 * Can only be created by a successful OTP verification, and is consumed by registration.
 */
export interface PendingRegistrationRecord {
  phone: string;
  /** SHA-256 of the opaque token held by the client in an `httpOnly` cookie. */
  tokenHash: string;
  expiresAt: Date;
}

/** A logged-in session. */
export interface SessionRecord {
  userId: string;
  /** SHA-256 of the opaque token held by the client in an `httpOnly` cookie. */
  tokenHash: string;
  expiresAt: Date;
}

/** Table name -> row shape. */
export interface DatabaseSchema {
  users: UserRecord;
  otpChallenges: OtpChallengeRecord;
  pendingRegistrations: PendingRegistrationRecord;
  sessions: SessionRecord;
}

/** Union of all registered table names. */
export type TableName = Extract<keyof DatabaseSchema, string>;
