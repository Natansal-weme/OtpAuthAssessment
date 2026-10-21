import { Injectable } from '@nestjs/common';
import { Clock } from '../common/clock';
import { randomToken, sha256 } from '../common/crypto';
import { KeyedMutex } from '../common/keyed-mutex';
import { DatabaseService } from '../database/database.service';

export const SESSION_TTL_MS = 7 * 24 * 60 * 60_000;
export const REGISTRATION_TICKET_TTL_MS = 15 * 60_000;

/** A freshly issued bearer secret. Only its hash is stored. */
export interface IssuedToken {
  token: string;
  expiresAt: Date;
}

/**
 * Sessions and registration tickets: opaque random tokens handed to the client in httpOnly cookies
 * and stored as SHA-256 hashes. Expired rows are deleted when they are read.
 */
@Injectable()
export class SessionsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly clock: Clock,
    private readonly mutex: KeyedMutex,
  ) {}

  async createSession(userId: string): Promise<IssuedToken> {
    const token = randomToken();
    const expiresAt = new Date(this.clock.now().getTime() + SESSION_TTL_MS);
    await this.db.table('sessions').insert({ tokenHash: sha256(token), userId, expiresAt });
    return { token, expiresAt };
  }

  /** Returns the user id of a valid session, or `undefined`. */
  async findSessionUserId(token: string): Promise<string | undefined> {
    const sessions = this.db.table('sessions');
    const session = await sessions.findOne({ tokenHash: sha256(token) });
    if (!session) return undefined;
    if (session.expiresAt <= this.clock.now()) {
      await sessions.delete(session.id);
      return undefined;
    }
    return session.userId;
  }

  async revokeSession(token: string): Promise<void> {
    await this.db.table('sessions').deleteMany({ tokenHash: sha256(token) });
  }

  /** Issues a ticket proving `phone` was verified. Replaces earlier tickets of the same phone. */
  async createRegistrationTicket(phone: string): Promise<IssuedToken> {
    const tickets = this.db.table('registrationTickets');
    await tickets.deleteMany({ phone });
    const token = randomToken();
    const expiresAt = new Date(this.clock.now().getTime() + REGISTRATION_TICKET_TTL_MS);
    await tickets.insert({ tokenHash: sha256(token), phone, expiresAt });
    return { token, expiresAt };
  }

  /** Consumes a ticket (single use) and returns its verified phone, or `undefined`. */
  consumeRegistrationTicket(token: string): Promise<string | undefined> {
    const tokenHash = sha256(token);
    return this.mutex.run(`ticket:${tokenHash}`, async () => {
      const tickets = this.db.table('registrationTickets');
      const ticket = await tickets.findOne({ tokenHash });
      if (!ticket) return undefined;
      await tickets.delete(ticket.id);
      return ticket.expiresAt > this.clock.now() ? ticket.phone : undefined;
    });
  }
}
