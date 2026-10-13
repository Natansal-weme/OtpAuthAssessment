import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { OTP_LENGTH } from './auth.constants';

/**
 * Server-side secret mixed into OTP hashes. A 6-digit code has only 10^6 possibilities, so a plain
 * hash could be brute-forced from a DB dump; keyed with a secret it cannot.
 * Falls back to a per-process random key (fine here since the DB is in-memory too).
 */
const OTP_SECRET = process.env.OTP_SECRET ?? randomBytes(32).toString('hex');

/** Uniformly random numeric code, zero-padded to `OTP_LENGTH` digits. */
export function generateOtp(): string {
  return randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, '0');
}

/** The code is bound to the phone, so a hash can never verify a code for another number. */
export function hashOtp(phone: string, code: string): string {
  return createHmac('sha256', OTP_SECRET).update(`${phone}:${code}`).digest('hex');
}

/** High-entropy opaque token for cookies (sessions, pending registrations). */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Tokens are stored hashed, so a leaked table cannot be replayed as cookies. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
