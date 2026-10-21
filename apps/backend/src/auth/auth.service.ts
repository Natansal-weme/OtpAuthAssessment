import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { KeyedMutex } from '../common/keyed-mutex';
import { OtpService } from '../otp/otp.service';
import { type IssuedToken, SessionsService } from '../sessions/sessions.service';
import { type User, UsersService } from '../users/users.service';
import type { CompleteRegistrationBody } from './auth.schemas';

export type VerifyOtpResult =
  | { status: 'authenticated'; user: User; session: IssuedToken }
  | { status: 'registration_required'; ticket: IssuedToken };

/**
 * The sign-in / sign-up flow:
 *
 *   request-otp ──> verify-otp ──┬─> known phone:   session
 *                                └─> unknown phone: registration ticket ──> complete-registration ──> session
 *
 * Phones are canonical (E.164) by the time they get here.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly otp: OtpService,
    private readonly users: UsersService,
    private readonly sessions: SessionsService,
    private readonly mutex: KeyedMutex,
  ) {}

  /** Same response whether or not the phone is registered: no account enumeration. */
  requestOtp(phone: string): Promise<{ resendAvailableAt: Date }> {
    return this.otp.issue(phone);
  }

  async verifyOtp(phone: string, code: string): Promise<VerifyOtpResult> {
    const verification = await this.otp.verify(phone, code);
    if (!verification.ok) {
      throw new UnauthorizedException(
        verification.reason === 'invalid_code'
          ? {
              statusCode: 401,
              reason: verification.reason,
              message: 'Incorrect code.',
              attemptsRemaining: verification.attemptsRemaining,
            }
          : {
              statusCode: 401,
              reason: verification.reason,
              message: 'This code has expired or was entered incorrectly too many times. Request a new code.',
            },
      );
    }

    const user = await this.users.findByPhone(phone);
    if (user) return { status: 'authenticated', user, session: await this.sessions.createSession(user.id) };
    return { status: 'registration_required', ticket: await this.sessions.createRegistrationTicket(phone) };
  }

  async completeRegistration(
    ticket: string | undefined,
    profile: CompleteRegistrationBody,
  ): Promise<{ user: User; session: IssuedToken }> {
    const phone = ticket && (await this.sessions.consumeRegistrationTicket(ticket));
    if (!phone) {
      throw new UnauthorizedException({
        statusCode: 401,
        reason: 'registration_expired',
        message: 'Your verification has expired. Please sign in again.',
      });
    }

    const user = await this.mutex.run(phone, async () => {
      if (await this.users.findByPhone(phone)) {
        throw new ConflictException({
          statusCode: 409,
          reason: 'already_registered',
          message: 'This phone number is already registered. Please sign in.',
        });
      }
      return this.users.create({ phone, ...profile });
    });

    return { user, session: await this.sessions.createSession(user.id) };
  }

  logout(sessionToken: string): Promise<void> {
    return this.sessions.revokeSession(sessionToken);
  }
}
