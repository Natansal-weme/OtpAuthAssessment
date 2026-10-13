import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import type {
  PublicUser,
  RequestOtpResponse,
  SessionResponse,
  UserProfileData,
} from './auth.types';
import { OtpService } from './otp.service';
import { PendingRegistrationService } from './pending-registration.service';
import { SessionService } from './session.service';

/** Tokens the client presented as cookies on the current request. */
export interface ClientTokens {
  sessionToken?: string;
  registrationToken?: string;
}

/**
 * Internal results: the public response body plus the raw token the controller must hand to the
 * client as an `httpOnly` cookie. Raw tokens never appear in response bodies.
 */
export type VerifyOtpResult =
  | { status: 'authenticated'; user: PublicUser; sessionToken: string }
  | { status: 'registration_required'; phone: string; registrationToken: string };

export interface CompleteRegistrationResult {
  user: PublicUser;
  sessionToken: string;
}

/**
 * Orchestrates the OTP sign-in flow:
 *
 *   [ "/" phone ] --requestOtp--> [ "/verify" code ] --verifyOtp--+--> existing user: session
 *                                                                 |
 *                                                                 +--> new user: pending registration
 *                                                                          |
 *                     [ "/register" name + email ] <-----------------------+
 *                                |
 *                                +--completeRegistration--> user created + session
 *
 * Each step requires the server-side artifact produced by the previous one (OTP challenge ->
 * pending registration -> session), so no step can be skipped from the client.
 *
 * Expects already-validated, normalized input (see `auth.schemas.ts`).
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly otp: OtpService,
    private readonly users: UsersService,
    private readonly sessions: SessionService,
    private readonly pendingRegistrations: PendingRegistrationService,
  ) {}

  /** Step 1. Same response whether or not the phone has an account (no enumeration). */
  async requestOtp(phone: string): Promise<RequestOtpResponse> {
    const issued = await this.otp.issue(phone);
    return { phone, ...issued };
  }

  /**
   * Step 2. On success, any tokens the client already held are revoked so that a browser is only
   * ever in one auth state, and a fresh token is issued (no session fixation).
   */
  async verifyOtp(phone: string, code: string, current: ClientTokens = {}): Promise<VerifyOtpResult> {
    this.otp.verify(phone, code);
    this.revoke(current);

    const user = this.users.findByPhone(phone);
    if (user) {
      return {
        status: 'authenticated',
        user: this.users.toPublic(user),
        sessionToken: this.sessions.create(user.id),
      };
    }

    return {
      status: 'registration_required',
      phone,
      registrationToken: this.pendingRegistrations.create(phone),
    };
  }

  /**
   * Step 3 (new users). The phone comes from the pending registration, never from the client.
   * No `await` between resolving and consuming it, so a token cannot register twice.
   */
  async completeRegistration(
    registrationToken: string | undefined,
    profile: UserProfileData,
  ): Promise<CompleteRegistrationResult> {
    const pending = this.pendingRegistrations.resolve(registrationToken);
    if (!pending) {
      throw new UnauthorizedException(
        'Your verification has expired. Please verify your phone number again.',
      );
    }

    if (this.users.findByPhone(pending.phone)) {
      this.pendingRegistrations.consume(pending.id);
      throw new ConflictException('This phone number is already registered. Please sign in again.');
    }
    const user = this.users.create(pending.phone, profile);
    this.pendingRegistrations.consume(pending.id);

    return {
      user: this.users.toPublic(user),
      sessionToken: this.sessions.create(user.id),
    };
  }

  /** Where the client stands in the flow, derived from its cookies. */
  getSession({ sessionToken, registrationToken }: ClientTokens): SessionResponse {
    const session = this.sessions.resolve(sessionToken);
    const user = session && this.users.findById(session.userId);
    if (user) return { status: 'authenticated', user: this.users.toPublic(user) };

    const pending = this.pendingRegistrations.resolve(registrationToken);
    if (pending) return { status: 'pending_registration', phone: pending.phone };

    return { status: 'anonymous' };
  }

  logout(tokens: ClientTokens): void {
    this.revoke(tokens);
  }

  private revoke({ sessionToken, registrationToken }: ClientTokens): void {
    this.sessions.revoke(sessionToken);
    this.pendingRegistrations.revoke(registrationToken);
  }
}
