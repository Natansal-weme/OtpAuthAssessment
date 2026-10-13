import type { Collection } from '@loewen-digital/flatdb';
import type { z } from 'zod';

/** Columns automatically managed by the database for every row. */
export interface BaseRecord {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Any `z.object(...)` schema (strict, loose or the default strip mode). */
export type TableSchema = z.ZodObject<z.core.$ZodShape, z.core.$ZodObjectConfig>;

/** A stored row: the schema's output type plus the auto-managed columns. */
export type Row<T> = T & BaseRecord;

/** Operators of a single column condition, e.g. `{ expiresAt: { $gt: new Date() } }`. */
export interface Operators<V> {
  $eq?: V;
  $ne?: V;
  $gt?: V;
  $gte?: V;
  $lt?: V;
  $lte?: V;
  $between?: [V, V];
  $in?: V[];
  $nin?: V[];
  $startsWith?: string;
  $endsWith?: string;
  $contains?: V extends readonly (infer E)[] ? E : string;
  $regex?: RegExp | string;
}

/**
 * Object filter: every key must match.
 *  - `{ phone: '+1555' }`                strict equality (`Date` values compare by timestamp),
 *  - `{ attempts: { $lt: 5 } }`          operators, see `Operators`,
 *  - `{ $or: [...] }`, `$and`, `$not`    logical combinators.
 */
export type QueryFilter<T> = { [K in keyof Row<T>]?: Row<T>[K] | Operators<Row<T>[K]> } & {
  $or?: QueryFilter<T>[];
  $and?: QueryFilter<T>[];
  $not?: QueryFilter<T>;
};

/**
 * Filter accepted by the query methods:
 *  - an object: see `QueryFilter`,
 *  - a predicate: full control, for anything else.
 */
export type RowFilter<T> = QueryFilter<T> | ((row: Row<T>) => boolean);

type StoredDoc = Record<string, any> & { _id: string; createdAt: string; updatedAt: string };

const RESERVED_COLUMNS = ['id', '_id', 'createdAt', 'updatedAt'];

/**
 * A single table, persisted as one JSON file per row by `@loewen-digital/flatdb`.
 *
 *  - `id`, `createdAt` and `updatedAt` are generated automatically.
 *  - Every write is validated with the table's zod schema, and every read is parsed with it, so
 *    rows always come back as `z.output<schema>` (defaults applied, unknown keys stripped).
 *  - Rows are stored as JSON. Columns must survive a JSON round-trip: use `z.coerce.date()`
 *    (not `z.date()`) for `Date` columns. Writes that would not survive it are rejected.
 *  - Values returned are fresh objects: mutating them does NOT change what is stored. Use
 *    `update()` to persist changes.
 *
 */
export class Table<S extends TableSchema> {
  constructor(
    readonly name: string,
    readonly schema: S,
    private readonly collection: Promise<Collection>,
  ) {
    const reserved = Object.keys(schema.shape).filter((key) => RESERVED_COLUMNS.includes(key));
    if (reserved.length > 0) {
      throw new Error(`Table "${name}": ${reserved.join(', ')} are managed by the database, remove them from the schema`);
    }
  }

  /** Validates `data`, inserts it and returns the stored row (including the generated `id`). */
  async insert(data: z.input<S>): Promise<Row<z.output<S>>> {
    const now = new Date().toISOString();
    const doc = { ...this.serialize(data), createdAt: now, updatedAt: now };
    const stored = await (await this.collection).insert(doc);
    return this.toRow(stored as StoredDoc);
  }

  async findById(id: string): Promise<Row<z.output<S>> | undefined> {
    const stored = await (await this.collection).findById(id);
    return stored ? this.toRow(stored as StoredDoc) : undefined;
  }

  /** Returns the first row matching `filter`, or `undefined`. */
  async findOne(filter: RowFilter<z.output<S>> = {}): Promise<Row<z.output<S>> | undefined> {
    if (typeof filter === 'function') return (await this.findMany()).find(filter);
    const stored = await (await this.collection).findOne(toQuery(filter));
    return stored ? this.toRow(stored as StoredDoc) : undefined;
  }

  /** Returns all rows matching `filter` (all rows when omitted). */
  async findMany(filter: RowFilter<z.output<S>> = {}): Promise<Row<z.output<S>>[]> {
    const collection = await this.collection;
    if (typeof filter === 'function') {
      return (await collection.find()).map((doc) => this.toRow(doc as StoredDoc)).filter(filter);
    }
    return (await collection.find(toQuery(filter))).map((doc) => this.toRow(doc as StoredDoc));
  }

  /**
   * Shallow-merges `patch` into the row with the given id, validates the result and bumps
   * `updatedAt`. Returns the updated row, or `undefined` if no row has that id.
   */
  async update(id: string, patch: Partial<z.input<S>>): Promise<Row<z.output<S>> | undefined> {
    const collection = await this.collection;
    const existing = (await collection.findById(id)) as StoredDoc | null;
    if (!existing) return undefined;

    const { _id, createdAt, updatedAt, ...data } = existing;
    const next: Record<string, unknown> = { ...this.serialize({ ...data, ...patch }), createdAt };
    next.updatedAt = new Date().toISOString();
    // flatdb merges `next` into the stored row, so removed columns have to be cleared explicitly.
    for (const key of Object.keys(data)) if (!(key in next)) next[key] = undefined;

    await collection.update({ _id: id }, next);
    return this.findById(id);
  }

  /** Deletes a row by id. Returns `true` if a row was deleted. */
  async delete(id: string): Promise<boolean> {
    return (await (await this.collection).delete({ _id: id })) > 0;
  }

  /** Deletes every row matching `filter`. Returns the number of deleted rows. */
  async deleteMany(filter: RowFilter<z.output<S>>): Promise<number> {
    const collection = await this.collection;
    if (typeof filter !== 'function') return collection.delete(toQuery(filter));
    const ids = (await this.findMany(filter)).map((row) => row.id);
    return ids.length > 0 ? collection.delete({ _id: { $in: ids } }) : 0;
  }

  async count(filter: RowFilter<z.output<S>> = {}): Promise<number> {
    if (typeof filter === 'function') return (await this.findMany(filter)).length;
    return (await this.collection).count(toQuery(filter));
  }

  /** Removes all rows. */
  async clear(): Promise<void> {
    await (await this.collection).delete({});
  }

  /** Validates `data` and returns it exactly as it will be stored on disk. */
  private serialize(data: unknown): Record<string, unknown> {
    const json = JSON.parse(JSON.stringify(this.schema.parse(data)));
    const roundTrip = this.schema.safeParse(json);
    if (!roundTrip.success) {
      throw new Error(
        `Table "${this.name}": row does not survive a JSON round-trip. ` +
          'Use z.coerce.date() instead of z.date() for Date columns.',
        { cause: roundTrip.error },
      );
    }
    return json;
  }

  private toRow({ _id, createdAt, updatedAt, ...data }: StoredDoc): Row<z.output<S>> {
    return {
      ...(this.schema.parse(data) as z.output<S>),
      id: _id,
      createdAt: new Date(createdAt),
      updatedAt: new Date(updatedAt),
    };
  }
}

/** Translates a `QueryFilter` to the stored representation: `id` -> `_id`, `Date` -> ISO string. */
function toQuery(filter: object): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(filter).map(([key, value]) => {
      if (key === '$or' || key === '$and') return [key, (value as object[]).map(toQuery)];
      if (key === '$not') return [key, toQuery(value as object)];
      return [key === 'id' ? '_id' : key, toStoredValue(value)];
    }),
  );
}

function toStoredValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (value instanceof RegExp) return value;
  if (Array.isArray(value)) return value.map(toStoredValue);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toStoredValue(item)]));
  }
  return value;
}
