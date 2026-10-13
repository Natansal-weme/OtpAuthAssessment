import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { SessionRecord } from '../database/database.schema';
import type { Row } from '../database/in-memory-table';
import { SESSION_TTL_MS } from './auth.constants';
import { generateToken, hashToken } from './crypto.util';

/** Logged-in sessions, backed by opaque tokens stored hashed. */
@Injectable()
export class SessionService {
  constructor(private readonly db: DatabaseService) {}

  private get sessions() {
    return this.db.table('sessions');
  }

  /** Creates a session and returns the raw token (only ever handed to the client). */
  create(userId: string): string {
    const token = generateToken();
    this.sessions.insert({
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    });
    return token;
  }

  /** Returns the live session for `token`, if any. Expired sessions are purged. */
  resolve(token: string | undefined): Row<SessionRecord> | undefined {
    if (!token) return undefined;
    const session = this.sessions.findOne({ tokenHash: hashToken(token) });
    if (!session) return undefined;
    if (session.expiresAt.getTime() <= Date.now()) {
      this.sessions.delete(session.id);
      return undefined;
    }
    return session;
  }

  revoke(token: string | undefined): void {
    if (!token) return;
    this.sessions.deleteMany({ tokenHash: hashToken(token) });
  }
}
