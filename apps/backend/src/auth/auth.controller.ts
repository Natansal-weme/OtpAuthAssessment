import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { CompleteRegistrationDto, RequestOtpDto, VerifyOtpDto } from './auth.types';

/**
 * Auth HTTP endpoints (all under the global `/api` prefix):
 *
 *   POST /api/auth/request-otp            body: RequestOtpDto            -> RequestOtpResponse
 *   POST /api/auth/verify-otp             body: VerifyOtpDto             -> VerifyOtpResponse
 *   POST /api/auth/complete-registration  body: CompleteRegistrationDto  -> CompleteRegistrationResponse
 *
 * Note: there is NO validation in place - `@Body()` is whatever JSON the client sent, the DTO
 * types are compile-time only.
 *
 * Keep this layer thin: HTTP concerns here, business logic in `AuthService`.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('request-otp')
  @HttpCode(HttpStatus.OK)
  async requestOtp(@Body() body: RequestOtpDto) {
    // TODO: Candidate to implement
    return this.authService.requestOtp(body.phone);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() body: VerifyOtpDto) {
    // TODO: Candidate to implement
    return this.authService.verifyOtp(body.phone, body.code);
  }

  @Post('complete-registration')
  async completeRegistration(@Body() body: CompleteRegistrationDto) {
    // TODO: Candidate to implement
    const { token, ...userData } = body;
    return this.authService.completeRegistration(token, userData);
  }
}
