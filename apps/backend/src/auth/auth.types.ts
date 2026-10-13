/**
 * Auth API contract (request bodies + responses of `AuthController`).
 *
 * The frontend imports these types (type-only, see `apps/frontend/src/api/hooks.ts`), so both
 * sides always agree on the shape of the API. Keep this file free of runtime code and backend
 * dependencies: plain types/interfaces only.
 *
 * Tokens (pending-registration token and session token) are NEVER part of a request/response
 * body: the server sets them as `httpOnly` cookies, so they are not readable by client-side JS.
 * The client learns where it stands in the flow through `GET /api/auth/session`.
 */

// ────────────────────────────────────────────────────────────────────────────────
// Shared
// ────────────────────────────────────────────────────────────────────────────────

/** Profile data collected on the `/register` screen. */
export interface UserProfileData {
  name: string;
  email: string;
}

/** User shape that is safe to send to the client. */
export interface PublicUser extends UserProfileData {
  id: string;
  phone: string;
  createdAt: string;
}

// ────────────────────────────────────────────────────────────────────────────────
// auth.requestOtp
// ────────────────────────────────────────────────────────────────────────────────

export interface RequestOtpDto {
  phone: string;
}

/**
 * Identical for known and unknown phone numbers, so the endpoint cannot be used to discover
 * which numbers have an account.
 */
export interface RequestOtpResponse {
  /** Normalized (E.164) phone number the code was sent to. */
  phone: string;
  /** Seconds until the code expires. */
  expiresInSeconds: number;
  /** Seconds until a new code may be requested for this phone. */
  resendAvailableInSeconds: number;
}

// ────────────────────────────────────────────────────────────────────────────────
// auth.verifyOtp
// ────────────────────────────────────────────────────────────────────────────────

export interface VerifyOtpDto {
  phone: string;
  code: string;
}

/**
 * Result of a successful OTP verification. The two branches are the two possible flows:
 *
 *  - `authenticated`: the phone belongs to an existing user. A session cookie was set.
 *  - `registration_required`: the phone is new. The user is in the "pending registration"
 *    state (a pending-registration cookie was set) and must complete their profile on `/register`.
 */
export type VerifyOtpResponse =
  | { status: 'authenticated'; user: PublicUser }
  | { status: 'registration_required'; phone: string };

// ────────────────────────────────────────────────────────────────────────────────
// auth.completeRegistration
// ────────────────────────────────────────────────────────────────────────────────

/** The pending registration is identified by its `httpOnly` cookie, not by the body. */
export type CompleteRegistrationDto = UserProfileData;

export interface CompleteRegistrationResponse {
  user: PublicUser;
}

// ────────────────────────────────────────────────────────────────────────────────
// auth.session
// ────────────────────────────────────────────────────────────────────────────────

/** Where the current browser stands in the auth flow (derived from its cookies). */
export type SessionResponse =
  | { status: 'anonymous' }
  | { status: 'pending_registration'; phone: string }
  | { status: 'authenticated'; user: PublicUser };
