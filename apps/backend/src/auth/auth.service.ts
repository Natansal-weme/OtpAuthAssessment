import { Injectable, NotImplementedException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SmsService } from '../sms/sms.service';
import type {
  CompleteRegistrationResponse,
  RequestOtpResponse,
  UserProfileData,
  VerifyOtpResponse,
} from './auth.types';

/**
 * AuthService - the core of the assessment.
 *
 * ────────────────────────────────────────────────────────────────────────────────
 * The flow to implement
 * ────────────────────────────────────────────────────────────────────────────────
 *
 *   [ "/" phone ] --requestOtp--> [ "/verify" code ] --verifyOtp--+--> existing user: logged in
 *                                                                 |
 *                                                                 +--> new user: PENDING REGISTRATION
 *                                                                          |
 *                     [ "/register" name + email ] <-----------------------+
 *                                |
 *                                +--completeRegistration--> user created + logged in
 *
 * Available building blocks:
 *   - `this.db`  - in-memory database. Define the tables you need in `database/database.schema.ts`.
 *   - `this.sms` - mock SMS sender. `await this.sms.sendSMS(phone, code)` logs the code to the console.
 *
 * Everything else (data model, code generation, validation, expiry, tokens, sessions, error
 * handling, security hardening, ...) is up to you. Throw Nest HTTP exceptions
 * (`BadRequestException`, `UnauthorizedException`, ...) for error cases; the frontend receives
 * them as rejected mutations.
 *
 * Each method currently throws `NotImplementedException` (HTTP 501).
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly sms: SmsService,
  ) {}

  /**
   * Step 1 - the user submitted their phone number on "/".
   *
   * Expected outcome: a one-time code is generated for `phone` and sent with `SmsService`,
   * and whatever is needed to verify it later is persisted.
   */
  async requestOtp(phone: string): Promise<RequestOtpResponse> {
    // TODO: Candidate to implement
    throw new NotImplementedException('AuthService.requestOtp is not implemented yet');
  }

  /**
   * Step 2 - the user submitted the code they received on "/verify".
   *
   * Expected outcome:
   *   - Invalid code: the request is rejected.
   *   - Valid code + phone belongs to an existing user: the user is logged in.
   *   - Valid code + new phone: the user enters the "pending registration" state, and the client
   *     receives a `registrationToken` to finish registration with.
   */
  async verifyOtp(phone: string, code: string): Promise<VerifyOtpResponse> {
    // TODO: Candidate to implement
    throw new NotImplementedException('AuthService.verifyOtp is not implemented yet');
  }

  /**
   * Step 3 (new users only) - the user submitted their profile on "/register".
   *
   * Expected outcome: `token` is validated as a legitimate pending registration, the user is
   * created with `userData`, the pending registration is resolved, and the user is logged in.
   */
  async completeRegistration(
    token: string,
    userData: UserProfileData,
  ): Promise<CompleteRegistrationResponse> {
    // TODO: Candidate to implement
    throw new NotImplementedException('AuthService.completeRegistration is not implemented yet');
  }
}
