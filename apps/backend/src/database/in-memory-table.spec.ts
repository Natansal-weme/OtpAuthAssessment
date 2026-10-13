import { InMemoryTable } from './in-memory-table';

interface ExampleRecord {
  title: string;
  done: boolean;
}

describe('InMemoryTable', () => {
  let table: InMemoryTable<ExampleRecord>;

  beforeEach(() => {
    table = new InMemoryTable<ExampleRecord>('examples');
  });

  it('inserts rows with generated id and timestamps', () => {
    const row = table.insert({ title: 'a', done: false });

    expect(row.id).toEqual(expect.any(String));
    expect(row.createdAt).toBeInstanceOf(Date);
    expect(row.updatedAt).toBeInstanceOf(Date);
    expect(table.findById(row.id)).toEqual(row);
  });

  it('finds rows by partial object or predicate', () => {
    table.insert({ title: 'a', done: false });
    const b = table.insert({ title: 'b', done: true });

    expect(table.findOne({ title: 'b' })).toEqual(b);
    expect(table.findMany((row) => !row.done)).toHaveLength(1);
    expect(table.count()).toBe(2);
  });

  it('returns copies, so mutations do not leak into storage', () => {
    const row = table.insert({ title: 'a', done: false });
    row.title = 'mutated';

    expect(table.findById(row.id)?.title).toBe('a');
  });

  it('updates rows but never overwrites id / createdAt', () => {
    const row = table.insert({ title: 'a', done: false });
    const updated = table.update(row.id, { done: true });

    expect(updated).toMatchObject({ id: row.id, createdAt: row.createdAt, done: true });
    expect(table.update('missing', { done: true })).toBeUndefined();
  });

  it('deletes rows', () => {
    const row = table.insert({ title: 'a', done: false });
    table.insert({ title: 'b', done: false });
    table.insert({ title: 'c', done: true });

    expect(table.delete(row.id)).toBe(true);
    expect(table.deleteMany({ done: false })).toBe(1);
    expect(table.findMany()).toEqual([expect.objectContaining({ title: 'c' })]);
  });
});
