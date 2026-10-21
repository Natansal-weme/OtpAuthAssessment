import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { IpRateLimitGuard } from '../common/ip-rate-limit.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthCookies } from '../sessions/auth-cookies';
import { CurrentUser, SessionGuard } from '../sessions/session.guard';
import type { IssuedToken } from '../sessions/sessions.service';
import { toUserDto, type User } from '../users/users.service';
import {
  type CompleteRegistrationBody,
  CompleteRegistrationSchema,
  type RequestOtpBody,
  RequestOtpSchema,
  type VerifyOtpBody,
  VerifyOtpSchema,
} from './auth.schemas';
import { AuthService } from './auth.service';

/**
 * Auth endpoints (under the global `/api` prefix). The mutations are rate limited per IP; per-phone
 * limits live in `OtpService`.
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly cookies: AuthCookies,
  ) {}

  @Post('request-otp')
  @UseGuards(IpRateLimitGuard)
  @HttpCode(202)
  async requestOtp(@Body(new ZodValidationPipe(RequestOtpSchema)) body: RequestOtpBody) {
    const { resendAvailableAt } = await this.auth.requestOtp(body.phone);
    return { resendAvailableAt };
  }

  @Post('verify-otp')
  @UseGuards(IpRateLimitGuard)
  @HttpCode(200)
  async verifyOtp(
    @Body(new ZodValidationPipe(VerifyOtpSchema)) body: VerifyOtpBody,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.verifyOtp(body.phone, body.code);
    if (result.status === 'registration_required') {
      this.cookies.setRegistrationTicket(res, result.ticket);
      return { status: result.status };
    }
    await this.startSession(req, res, result.session);
    return { status: result.status, user: toUserDto(result.user) };
  }

  @Post('complete-registration')
  @UseGuards(IpRateLimitGuard)
  async completeRegistration(
    @Body(new ZodValidationPipe(CompleteRegistrationSchema)) body: CompleteRegistrationBody,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // The ticket is single use: clear it whatever the outcome.
    this.cookies.clearRegistrationTicket(res);
    const { user, session } = await this.auth.completeRegistration(
      this.cookies.readRegistrationTicket(req),
      body,
    );
    await this.startSession(req, res, session);
    return { user: toUserDto(user) };
  }

  @Get('me')
  @UseGuards(SessionGuard)
  me(@CurrentUser() user: User) {
    return { user: toUserDto(user) };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = this.cookies.readSession(req);
    if (token) await this.auth.logout(token);
    this.cookies.clearSession(res);
  }

  /** Sets the new session cookie, revoking the session it replaces (if any). */
  private async startSession(req: Request, res: Response, session: IssuedToken) {
    const previous = this.cookies.readSession(req);
    if (previous) await this.auth.logout(previous);
    this.cookies.setSession(res, session);
  }
}
