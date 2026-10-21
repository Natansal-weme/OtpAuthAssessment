/** Typed client for the backend auth API (`/api/auth/*`). */

export interface User {
  id: string;
  /** E.164, e.g. `+972501234567`. */
  phone: string;
  name: string;
  email: string;
}

interface ErrorBody {
  reason?: string;
  message?: string;
  attemptsRemaining?: number;
  retryAfterSeconds?: number;
  errors?: { path: string; message: string }[];
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ErrorBody,
  ) {
    super(body.message ?? `Request failed (${status})`);
  }

  get reason(): string | undefined {
    return this.body.reason;
  }

  /** Validation errors by field name (`400`). */
  get fieldErrors(): Record<string, string> {
    return Object.fromEntries((this.body.errors ?? []).map(({ path, message }) => [path, message]));
  }
}

async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/auth/${path}`, {
      method,
      credentials: 'same-origin',
      // The API only accepts JSON for mutations (CSRF defence), even without a body.
      ...(method === 'POST' && {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      }),
    });
  } catch {
    throw new ApiError(0, { message: 'Network error. Check your connection and try again.' });
  }

  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => ({}))) as ErrorBody;
  if (res.ok) return data as T;

  const retryAfter = Number(res.headers.get('Retry-After')) || undefined;
  throw new ApiError(res.status, {
    ...data,
    retryAfterSeconds: data.retryAfterSeconds ?? retryAfter,
    // The per-IP limiter answers without a `reason` or a user-facing message.
    message: data.reason ? data.message : res.status === 429 ? 'Too many attempts.' : data.message,
  });
}

export const api = {
  requestOtp: (phone: string) => call<{ resendAvailableAt: string }>('POST', 'request-otp', { phone }),
  verifyOtp: (phone: string, code: string) =>
    call<{ status: 'authenticated'; user: User } | { status: 'registration_required' }>(
      'POST',
      'verify-otp',
      { phone, code },
    ),
  completeRegistration: (profile: { name: string; email: string }) =>
    call<{ user: User }>('POST', 'complete-registration', profile),
  me: () => call<{ user: User }>('GET', 'me'),
  logout: () => call<void>('POST', 'logout'),
};

/** A user-facing message for any error thrown by `api`. */
export function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Something went wrong. Please try again.';
  const wait = error.body.retryAfterSeconds;
  return wait ? `${error.message} Try again in ${formatWait(wait)}.` : error.message;
}

export function formatWait(seconds: number): string {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}
