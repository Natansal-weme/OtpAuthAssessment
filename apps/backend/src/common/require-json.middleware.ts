import type { NextFunction, Request, Response } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Rejects mutating requests that are not `application/json` (`415`).
 *
 * Part of the CSRF defence: a cross-site page can only send JSON after a CORS preflight, which is
 * refused for origins other than `CLIENT_ORIGIN`. HTML forms can't produce JSON at all.
 */
export function requireJson(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method) || req.is('application/json')) return next();
  res.status(415).json({
    statusCode: 415,
    reason: 'unsupported_media_type',
    message: 'Requests must be sent as application/json',
  });
}
