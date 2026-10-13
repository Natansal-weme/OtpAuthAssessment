import type { BaseRecord } from './database.schema';

/** A stored row: your interface plus the auto-managed columns. */
export type Row<T> = T & BaseRecord;

/**
 * Filter accepted by the query methods:
 *  - an object: matches rows where every given key is strictly equal (`===`) to the given value,
 *  - a predicate: full control, for anything else (ranges, dates, case-insensitive, ...).
 */
export type RowFilter<T> = Partial<Row<T>> | ((row: Row<T>) => boolean);

/**
 * A single in-memory "table".
 *
 * Behaves like a tiny document store:
 *  - `id`, `createdAt` and `updatedAt` are generated automatically.
 *  - Every value going in or out is deep-cloned, so mutating a returned object does NOT change
 *    what is stored (just like a real database). Use `update()` to persist changes.
 *  - Supported column values: JSON values (string, number, boolean, null, arrays, plain objects)
 *    and `Date`.
 *  - Data lives in process memory and is lost on restart.
 *
 * NOTE: This file is provided as-is. You may extend it if your solution needs to, but you
 * should not need to.
 */
export class InMemoryTable<T extends object> {
  private readonly rows = new Map<string, Row<T>>();

  constructor(readonly name: string) {}

  /** Inserts a new row and returns it (including the generated `id`). */
  insert(data: T): Row<T> {
    const now = new Date();
    const row = { ...clone(data), id: crypto.randomUUID(), createdAt: now, updatedAt: now } as Row<T>;
    this.rows.set(row.id, row);
    return clone(row);
  }

  findById(id: string): Row<T> | undefined {
    const row = this.rows.get(id);
    return row ? clone(row) : undefined;
  }

  /** Returns the first row matching `filter`, or `undefined`. */
  findOne(filter: RowFilter<T>): Row<T> | undefined {
    const match = this.matcher(filter);
    for (const row of this.rows.values()) {
      if (match(row)) return clone(row);
    }
    return undefined;
  }

  /** Returns all rows matching `filter` (all rows when omitted), in insertion order. */
  findMany(filter?: RowFilter<T>): Row<T>[] {
    const rows = [...this.rows.values()];
    return (filter ? rows.filter(this.matcher(filter)) : rows).map((row) => clone(row));
  }

  /**
   * Shallow-merges `patch` into the row with the given id and bumps `updatedAt`.
   * Returns the updated row, or `undefined` if no row has that id.
   */
  update(id: string, patch: Partial<T>): Row<T> | undefined {
    const existing = this.rows.get(id);
    if (!existing) return undefined;

    const updated = {
      ...existing,
      ...clone(patch),
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    } as Row<T>;
    this.rows.set(id, updated);
    return clone(updated);
  }

  /** Deletes a row by id. Returns `true` if a row was deleted. */
  delete(id: string): boolean {
    return this.rows.delete(id);
  }

  /** Deletes every row matching `filter`. Returns the number of deleted rows. */
  deleteMany(filter: RowFilter<T>): number {
    const match = this.matcher(filter);
    let deleted = 0;
    for (const [id, row] of this.rows) {
      if (match(row)) {
        this.rows.delete(id);
        deleted++;
      }
    }
    return deleted;
  }

  count(filter?: RowFilter<T>): number {
    return filter ? this.findMany(filter).length : this.rows.size;
  }

  /** Removes all rows. */
  clear(): void {
    this.rows.clear();
  }

  /** Plain, JSON-serializable copy of the table content (handy for debugging / tests). */
  toJSON(): Row<T>[] {
    return this.findMany();
  }

  private matcher(filter: RowFilter<T>): (row: Row<T>) => boolean {
    if (typeof filter === 'function') return filter;
    const entries = Object.entries(filter) as [keyof Row<T>, unknown][];
    return (row) => entries.every(([key, value]) => row[key] === value);
  }
}

/**
 * Deep clone for JSON values + `Date`.
 * (`structuredClone` is avoided on purpose: under Jest it returns objects from another realm,
 * which breaks `instanceof Date` checks in tests.)
 */
function clone<V>(value: V): V {
  if (value instanceof Date) return new Date(value.getTime()) as V;
  if (Array.isArray(value)) return value.map(clone) as V;
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)])) as V;
  }
  return value;
}
