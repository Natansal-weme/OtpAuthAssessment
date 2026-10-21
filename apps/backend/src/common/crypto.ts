import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** 32 random bytes, URL-safe. Used for session and registration tokens. */
export function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

/** SHA-256 hex digest. Enough for high-entropy tokens; low-entropy secrets need an HMAC. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Constant-time comparison of two hex digests. */
export function digestsEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}
