import { Inject, Injectable } from '@nestjs/common';
import { createHmac, randomInt } from 'node:crypto';
import { Clock } from '../common/clock';
import { APP_CONFIG, type AppConfig } from '../common/config';
import { digestsEqual } from '../common/crypto';
import { KeyedMutex } from '../common/keyed-mutex';
import { RateLimitedException } from '../common/rate-limited.exception';
import { DatabaseService } from '../database/database.service';
import { SmsService } from '../sms/sms.service';

export const OTP_POLICY = {
  codeLength: 6,
  codeTtlMs: 5 * 60_000,
  maxAttempts: 3,
  resendCooldownMs: 30_000,
  maxSendsPerWindow: 5,
  sendWindowMs: 60 * 60_000,
} as const;

export type OtpVerification =
  | { ok: true }
  | { ok: false; reason: 'invalid_code'; attemptsRemaining: number }
  | { ok: false; reason: 'expired_or_locked' };

/**
 * Issues and verifies one-time codes. Owns the whole challenge lifecycle: code generation and
 * hashing, expiry, the attempt cap and the per-phone send limits.
 *
 * `phone` is always canonical (E.164). Every operation on a phone runs under its lock.
 */
@Injectable()
export class OtpService {
  constructor(
    private readonly db: DatabaseService,
    private readonly sms: SmsService,
    private readonly clock: Clock,
    private readonly mutex: KeyedMutex,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  private get challenges() {
    return this.db.table('otpChallenges');
  }

  /**
   * Sends a new code to `phone`, replacing any previous one.
   * Throws `RateLimitedException` while in the resend cooldown or over the hourly send cap.
   */
  issue(phone: string): Promise<{ resendAvailableAt: Date }> {
    return this.mutex.run(phone, async () => {
      const now = this.clock.now();
      const existing = await this.challenges.findOne({ phone });
      const windowEndsAt =
        existing && new Date(existing.windowStartedAt.getTime() + OTP_POLICY.sendWindowMs);
      const inWindow = existing && windowEndsAt && now < windowEndsAt;

      if (existing && inWindow) {
        const cooldownEndsAt = new Date(existing.lastSentAt.getTime() + OTP_POLICY.resendCooldownMs);
        if (now < cooldownEndsAt) {
          throw new RateLimitedException(
            secondsBetween(now, cooldownEndsAt),
            'Please wait before requesting another code.',
          );
        }
        if (existing.sendCount >= OTP_POLICY.maxSendsPerWindow) {
          throw new RateLimitedException(
            secondsBetween(now, windowEndsAt),
            'Too many codes were requested for this number. Please try again later.',
          );
        }
      }

      const code = randomInt(0, 10 ** OTP_POLICY.codeLength)
        .toString()
        .padStart(OTP_POLICY.codeLength, '0');
      const challenge = {
        codeHash: this.hash(phone, code),
        expiresAt: new Date(now.getTime() + OTP_POLICY.codeTtlMs),
        attempts: 0,
        lastSentAt: now,
        sendCount: inWindow ? existing.sendCount + 1 : 1,
        windowStartedAt: inWindow ? existing.windowStartedAt : now,
      };
      if (existing) await this.challenges.update(existing.id, challenge);
      else await this.challenges.insert({ phone, ...challenge });

      await this.sms.sendSMS(phone, code);
      return { resendAvailableAt: new Date(now.getTime() + OTP_POLICY.resendCooldownMs) };
    });
  }

  /** Checks `code` against the phone's challenge. A correct code consumes the challenge. */
  verify(phone: string, code: string): Promise<OtpVerification> {
    return this.mutex.run(phone, async () => {
      const now = this.clock.now();
      const challenge = await this.challenges.findOne({ phone });

      if (!challenge || challenge.expiresAt <= now || challenge.attempts >= OTP_POLICY.maxAttempts) {
        // Lazy cleanup: once the send window is over, nothing on the row is needed anymore.
        const windowOver =
          challenge && challenge.windowStartedAt.getTime() + OTP_POLICY.sendWindowMs <= now.getTime();
        if (windowOver) await this.challenges.delete(challenge.id);
        return { ok: false, reason: 'expired_or_locked' };
      }

      if (digestsEqual(challenge.codeHash, this.hash(phone, code))) {
        await this.challenges.delete(challenge.id);
        return { ok: true };
      }

      const attempts = challenge.attempts + 1;
      await this.challenges.update(challenge.id, { attempts });
      return {
        ok: false,
        reason: 'invalid_code',
        attemptsRemaining: OTP_POLICY.maxAttempts - attempts,
      };
    });
  }

  /** Keyed with a server secret: a plain hash of a 6-digit code is trivial to reverse. */
  private hash(phone: string, code: string): string {
    return createHmac('sha256', this.config.otpSecret).update(`${phone}:${code}`).digest('hex');
  }
}

function secondsBetween(from: Date, to: Date): number {
  return Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 1000));
}
