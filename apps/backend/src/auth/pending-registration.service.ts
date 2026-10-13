import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { PendingRegistrationRecord } from '../database/database.schema';
import type { Row } from '../database/in-memory-table';
import { PENDING_REGISTRATION_TTL_MS } from './auth.constants';
import { generateToken, hashToken } from './crypto.util';

/**
 * The "pending registration" state: proof that a phone number passed OTP verification but has no
 * account yet. Only `AuthService.verifyOtp` creates one, so registration cannot skip the OTP step,
 * and the phone comes from here rather than from the client.
 */
@Injectable()
export class PendingRegistrationService {
  constructor(private readonly db: DatabaseService) {}

  private get pending() {
    return this.db.table('pendingRegistrations');
  }

  /** Starts a pending registration for a verified phone and returns the raw token. */
  create(phone: string): string {
    this.pending.deleteMany({ phone });
    const token = generateToken();
    this.pending.insert({
      phone,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + PENDING_REGISTRATION_TTL_MS),
    });
    return token;
  }

  /** Returns the live pending registration for `token`, if any. Expired ones are purged. */
  resolve(token: string | undefined): Row<PendingRegistrationRecord> | undefined {
    if (!token) return undefined;
    const pending = this.pending.findOne({ tokenHash: hashToken(token) });
    if (!pending) return undefined;
    if (pending.expiresAt.getTime() <= Date.now()) {
      this.pending.delete(pending.id);
      return undefined;
    }
    return pending;
  }

  consume(id: string): void {
    this.pending.delete(id);
  }

  revoke(token: string | undefined): void {
    if (!token) return;
    this.pending.deleteMany({ tokenHash: hashToken(token) });
  }
}
