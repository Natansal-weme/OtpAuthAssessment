import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  clearAuthCookies,
  readClientTokens,
  setRegistrationCookie,
  setSessionCookie,
} from './auth.cookies';
import { completeRegistrationSchema, requestOtpSchema, verifyOtpSchema } from './auth.schemas';
import { AuthService } from './auth.service';
import type {
  CompleteRegistrationDto,
  CompleteRegistrationResponse,
  RequestOtpDto,
  RequestOtpResponse,
  SessionResponse,
  VerifyOtpDto,
  VerifyOtpResponse,
} from './auth.types';

/**
 * Auth HTTP endpoints (all under the global `/api` prefix):
 *
 *   POST /api/auth/request-otp            body: RequestOtpDto            -> RequestOtpResponse
 *   POST /api/auth/verify-otp             body: VerifyOtpDto             -> VerifyOtpResponse
 *   POST /api/auth/complete-registration  body: CompleteRegistrationDto  -> CompleteRegistrationResponse
 *   GET  /api/auth/session                                               -> SessionResponse
 *   POST /api/auth/logout                                                -> 204
 *
 * HTTP concerns only: input validation and translating tokens to/from `httpOnly` cookies.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('request-otp')
  @HttpCode(HttpStatus.OK)
  requestOtp(
    @Body(new ZodValidationPipe(requestOtpSchema)) body: RequestOtpDto,
  ): Promise<RequestOtpResponse> {
    return this.authService.requestOtp(body.phone);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Body(new ZodValidationPipe(verifyOtpSchema)) body: VerifyOtpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<VerifyOtpResponse> {
    const result = await this.authService.verifyOtp(body.phone, body.code, readClientTokens(req));

    if (result.status === 'authenticated') {
      setSessionCookie(res, result.sessionToken);
      return { status: result.status, user: result.user };
    }
    setRegistrationCookie(res, result.registrationToken);
    return { status: result.status, phone: result.phone };
  }

  @Post('complete-registration')
  async completeRegistration(
    @Body(new ZodValidationPipe(completeRegistrationSchema)) body: CompleteRegistrationDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CompleteRegistrationResponse> {
    const { registrationToken } = readClientTokens(req);
    const { user, sessionToken } = await this.authService.completeRegistration(registrationToken, body);
    setSessionCookie(res, sessionToken);
    return { user };
  }

  @Get('session')
  getSession(@Req() req: Request): SessionResponse {
    return this.authService.getSession(readClientTokens(req));
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): void {
    this.authService.logout(readClientTokens(req));
    clearAuthCookies(res);
  }
}
