import { Injectable } from '@nestjs/common';

/**
 * Runs async functions one at a time per key.
 *
 * The JSON database has no atomic updates, so read-modify-write sequences (attempt counters, send
 * limits, single-use tokens) go through this lock. It only serializes within this process: running
 * several instances requires a shared lock (e.g. Redis) or a database with transactions.
 */
@Injectable()
export class KeyedMutex {
  private readonly tails = new Map<string, Promise<void>>();

  async run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(key) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => (release = resolve));
    const tail = previous.then(() => current);
    this.tails.set(key, tail);

    await previous;
    try {
      return await fn();
    } finally {
      release();
      if (this.tails.get(key) === tail) this.tails.delete(key);
    }
  }
}
