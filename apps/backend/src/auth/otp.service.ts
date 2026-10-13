import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SmsService } from '../sms/sms.service';
import { OTP_MAX_ATTEMPTS, OTP_RESEND_COOLDOWN_MS, OTP_TTL_MS } from './auth.constants';
import { generateOtp, hashOtp, safeEqual } from './crypto.util';

export interface IssuedOtp {
  expiresInSeconds: number;
  resendAvailableInSeconds: number;
}

/** Issues and verifies one-time codes. Knows nothing about users or sessions. */
@Injectable()
export class OtpService {
  constructor(
    private readonly db: DatabaseService,
    private readonly sms: SmsService,
  ) {}

  private get challenges() {
    return this.db.table('otpChallenges');
  }

  /** Generates a code for `phone`, replacing any previous one, and sends it by SMS. */
  async issue(phone: string): Promise<IssuedOtp> {
    const now = Date.now();
    const existing = this.challenges.findOne({ phone });
    if (existing) {
      const cooldownLeftMs = existing.createdAt.getTime() + OTP_RESEND_COOLDOWN_MS - now;
      if (cooldownLeftMs > 0) {
        throw new HttpException(
          `Please wait ${Math.ceil(cooldownLeftMs / 1000)}s before requesting a new code`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    this.challenges.deleteMany({ phone });
    const code = generateOtp();
    const challenge = this.challenges.insert({
      phone,
      codeHash: hashOtp(phone, code),
      expiresAt: new Date(now + OTP_TTL_MS),
      attempts: 0,
    });

    try {
      await this.sms.sendSMS(phone, code);
    } catch (error) {
      this.challenges.delete(challenge.id);
      throw error;
    }

    return {
      expiresInSeconds: OTP_TTL_MS / 1000,
      resendAvailableInSeconds: OTP_RESEND_COOLDOWN_MS / 1000,
    };
  }

  /**
   * Verifies `code` for `phone` and consumes the challenge on success (codes are single-use).
   * Throws on any failure; every failure mode shares the same message so nothing leaks.
   *
   * There is no `await` between reading and consuming the challenge, so two concurrent requests
   * cannot both succeed with the same code.
   */
  verify(phone: string, code: string): void {
    const challenge = this.challenges.findOne({ phone });
    const invalid = new UnauthorizedException('Invalid or expired code');

    if (!challenge) throw invalid;

    if (challenge.expiresAt.getTime() <= Date.now()) {
      this.challenges.delete(challenge.id);
      throw invalid;
    }

    if (!safeEqual(challenge.codeHash, hashOtp(phone, code))) {
      const attempts = challenge.attempts + 1;
      if (attempts >= OTP_MAX_ATTEMPTS) {
        this.challenges.delete(challenge.id);
        throw new HttpException(
          'Too many incorrect attempts. Please request a new code.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      this.challenges.update(challenge.id, { attempts });
      throw invalid;
    }

    this.challenges.delete(challenge.id);
  }
}
