import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { RateLimitedException } from './rate-limited.exception';

/** Per-IP limit on the auth mutations: fixed one-minute windows. */
export const IP_RATE_LIMIT = { windowMs: 60_000, limit: 10 } as const;

const SWEEP_THRESHOLD = 10_000;

/**
 * In-memory fixed-window limiter (single instance only; multi-instance needs Redis).
 *
 * Trusts the socket address: `X-Forwarded-For` is ignored unless Express `trust proxy` is configured.
 */
@Injectable()
export class IpRateLimitGuard implements CanActivate {
  private readonly windows = new Map<string, { startedAt: number; count: number }>();

  canActivate(context: ExecutionContext): boolean {
    const key = context.switchToHttp().getRequest<Request>().ip ?? 'unknown';
    const now = Date.now();
    if (this.windows.size > SWEEP_THRESHOLD) this.sweep(now);

    let window = this.windows.get(key);
    if (!window || now - window.startedAt >= IP_RATE_LIMIT.windowMs) {
      window = { startedAt: now, count: 0 };
      this.windows.set(key, window);
    }
    window.count += 1;
    if (window.count > IP_RATE_LIMIT.limit) {
      throw new RateLimitedException(
        Math.max(1, Math.ceil((window.startedAt + IP_RATE_LIMIT.windowMs - now) / 1000)),
        'Too many requests.',
      );
    }
    return true;
  }

  private sweep(now: number): void {
    for (const [key, window] of this.windows) {
      if (now - window.startedAt >= IP_RATE_LIMIT.windowMs) this.windows.delete(key);
    }
  }
}
