import { api, ApiError, type User } from './api';

/**
 * Client-side auth state. The server is the authority: this only caches `/auth/me` and remembers
 * where the user is in the sign-in flow, so pages survive a refresh.
 */

let currentUser: Promise<User | null> | undefined;

/** The signed-in user, or `null`. Fetched once, then cached until `setCurrentUser`. */
export function getCurrentUser(): Promise<User | null> {
  currentUser ??= api.me().then(
    ({ user }) => user,
    (error: unknown) => {
      if (error instanceof ApiError && error.status === 401) return null;
      currentUser = undefined; // don't cache network failures
      throw error;
    },
  );
  return currentUser;
}

export function setCurrentUser(user: User | null): void {
  currentUser = Promise.resolve(user);
}

/** Where a signed-out user is in the flow. Kept in `sessionStorage` (per tab, survives refresh). */
export interface PendingSignIn {
  /** As typed by the user; the server normalizes it. */
  phone: string;
  stage: 'verify' | 'register';
  resendAvailableAt?: string;
}

const PENDING_KEY = 'otp-auth.pending-sign-in';
let pendingFallback: PendingSignIn | null = null;

export function getPendingSignIn(): PendingSignIn | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingSignIn) : null;
  } catch {
    return pendingFallback;
  }
}

export function setPendingSignIn(pending: PendingSignIn | null): void {
  pendingFallback = pending;
  try {
    if (pending) sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    else sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // Storage unavailable (private mode, blocked): the in-memory fallback still works until refresh.
  }
}

/** `+972501234567` -> `050-123-4567`. */
export function formatPhone(e164: string): string {
  const local = e164.startsWith('+972') ? `0${e164.slice(4)}` : e164;
  return local.length === 10 ? `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}` : local;
}
