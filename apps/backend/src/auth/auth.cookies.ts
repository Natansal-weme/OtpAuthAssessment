import type { CookieOptions, Request, Response } from 'express';
import {
  PENDING_REGISTRATION_TTL_MS,
  REGISTRATION_COOKIE,
  SESSION_COOKIE,
  SESSION_TTL_MS,
} from './auth.constants';
import type { ClientTokens } from './auth.service';

/**
 * Auth tokens travel only as cookies that client-side JS cannot read (`httpOnly`) and that the
 * browser never attaches to cross-site requests (`SameSite=Strict`, which also blocks CSRF).
 */
const baseOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  path: '/api',
};

export function readClientTokens(req: Request): ClientTokens {
  const cookies: Record<string, unknown> = req.cookies ?? {};
  const read = (name: string) => (typeof cookies[name] === 'string' ? cookies[name] : undefined);
  return {
    sessionToken: read(SESSION_COOKIE),
    registrationToken: read(REGISTRATION_COOKIE),
  };
}

export function setSessionCookie(res: Response, token: string): void {
  res.clearCookie(REGISTRATION_COOKIE, baseOptions);
  res.cookie(SESSION_COOKIE, token, { ...baseOptions, maxAge: SESSION_TTL_MS });
}

export function setRegistrationCookie(res: Response, token: string): void {
  res.clearCookie(SESSION_COOKIE, baseOptions);
  res.cookie(REGISTRATION_COOKIE, token, { ...baseOptions, maxAge: PENDING_REGISTRATION_TTL_MS });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(SESSION_COOKIE, baseOptions);
  res.clearCookie(REGISTRATION_COOKIE, baseOptions);
}
