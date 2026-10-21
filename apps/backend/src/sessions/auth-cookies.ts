import { Inject, Injectable } from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import { API_PREFIX } from '../app.setup';
import { APP_CONFIG, type AppConfig } from '../common/config';
import type { IssuedToken } from './sessions.service';

export const SESSION_COOKIE = 'sid';
export const REGISTRATION_COOKIE = 'reg_ticket';

/** The registration ticket is only ever needed by the auth endpoints. */
const REGISTRATION_COOKIE_PATH = `/${API_PREFIX}/auth`;

/** Reads and writes the auth cookies: httpOnly, `SameSite=Lax`, `Secure` in production. */
@Injectable()
export class AuthCookies {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  private options(path: string): CookieOptions {
    return { httpOnly: true, sameSite: 'lax', secure: this.config.isProduction, path };
  }

  readSession(req: Request): string | undefined {
    return readCookie(req, SESSION_COOKIE);
  }

  setSession(res: Response, { token, expiresAt }: IssuedToken): void {
    res.cookie(SESSION_COOKIE, token, { ...this.options('/'), expires: expiresAt });
  }

  clearSession(res: Response): void {
    res.clearCookie(SESSION_COOKIE, this.options('/'));
  }

  readRegistrationTicket(req: Request): string | undefined {
    return readCookie(req, REGISTRATION_COOKIE);
  }

  setRegistrationTicket(res: Response, { token, expiresAt }: IssuedToken): void {
    res.cookie(REGISTRATION_COOKIE, token, {
      ...this.options(REGISTRATION_COOKIE_PATH),
      expires: expiresAt,
    });
  }

  clearRegistrationTicket(res: Response): void {
    res.clearCookie(REGISTRATION_COOKIE, this.options(REGISTRATION_COOKIE_PATH));
  }
}

function readCookie(req: Request, name: string): string | undefined {
  const value: unknown = req.cookies?.[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
