import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Collection } from '@loewen-digital/flatdb';
import { z } from 'zod';
import { Table } from './table';

const ExampleSchema = z.object({
  title: z.string().min(1),
  done: z.boolean().default(false),
  dueAt: z.coerce.date().optional(),
});

async function createTable(dir?: string, schema = ExampleSchema) {
  const { flatdb, collection, FsAdapter, MemoryAdapter } = await import('@loewen-digital/flatdb');
  const db = flatdb(dir ? new FsAdapter(dir) : new MemoryAdapter(), { examples: collection() });
  return new Table('examples', schema, Promise.resolve(db.examples as Collection));
}

describe('Table', () => {
  let table: Table<typeof ExampleSchema>;

  beforeEach(async () => {
    table = await createTable();
  });

  it('inserts rows with generated id, timestamps and schema defaults', async () => {
    const row = await table.insert({ title: 'a' });

    expect(row).toMatchObject({ title: 'a', done: false });
    expect(row.id).toEqual(expect.any(String));
    expect(row.createdAt).toBeInstanceOf(Date);
    expect(row.updatedAt).toBeInstanceOf(Date);
    expect(await table.findById(row.id)).toEqual(row);
  });

  it('validates writes with the schema', async () => {
    await expect(table.insert({ title: '' })).rejects.toThrow(z.ZodError);
    expect(await table.count()).toBe(0);
  });

  it('finds rows by equality, operators or predicate', async () => {
    await table.insert({ title: 'a', dueAt: new Date('2026-01-01') });
    const b = await table.insert({ title: 'b', done: true, dueAt: new Date('2026-06-01') });

    expect(await table.findOne({ title: 'b' })).toEqual(b);
    expect(await table.findOne({ id: b.id })).toEqual(b);
    expect(await table.findMany({ dueAt: { $gt: new Date('2026-03-01') } })).toEqual([b]);
    expect(await table.findMany((row) => !row.done)).toHaveLength(1);
    expect(await table.count()).toBe(2);
  });

  it('returns copies, so mutations do not leak into storage', async () => {
    const row = await table.insert({ title: 'a' });
    row.title = 'mutated';

    expect((await table.findById(row.id))?.title).toBe('a');
  });

  it('updates rows but never overwrites id / createdAt', async () => {
    const row = await table.insert({ title: 'a', dueAt: new Date() });
    const updated = await table.update(row.id, { done: true, dueAt: undefined });

    expect(updated).toMatchObject({ id: row.id, createdAt: row.createdAt, done: true });
    expect(updated?.dueAt).toBeUndefined();
    expect(await table.update('missing', { done: true })).toBeUndefined();
  });

  it('deletes rows', async () => {
    const row = await table.insert({ title: 'a' });
    await table.insert({ title: 'b' });
    await table.insert({ title: 'c', done: true });

    expect(await table.delete(row.id)).toBe(true);
    expect(await table.deleteMany({ done: false })).toBe(1);
    expect(await table.findMany()).toEqual([expect.objectContaining({ title: 'c' })]);
  });

  it('rejects schemas that redefine the auto-managed columns', async () => {
    await expect(createTable(undefined, z.object({ id: z.string() }) as never)).rejects.toThrow(/managed by the database/);
  });

  it('rejects rows that do not survive JSON storage', async () => {
    const dated = await createTable(undefined, z.object({ title: z.string(), at: z.date() }) as never);

    await expect(dated.insert({ title: 'a', at: new Date() } as never)).rejects.toThrow(/z\.coerce\.date\(\)/);
  });

  describe('on the filesystem', () => {
    let dir: string;

    beforeEach(async () => {
      dir = await mkdtemp(join(tmpdir(), 'flatdb-'));
    });

    afterEach(async () => {
      await rm(dir, { recursive: true, force: true });
    });

    it('stores one JSON file per row and reads them back after a restart', async () => {
      const row = await (await createTable(dir)).insert({ title: 'a', dueAt: new Date('2026-01-01') });

      expect(await readdir(join(dir, 'examples'))).toContain(`${row.id}.json`);
      expect(await (await createTable(dir)).findById(row.id)).toEqual(row);
    });
  });
});
