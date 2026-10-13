/**
 * Auth API contract (request bodies + responses of `AuthController`).
 *
 * The frontend imports these types (type-only, see `apps/frontend/src/api/hooks.ts`), so both
 * sides always agree on the shape of the API. Keep this file free of runtime code and backend
 * dependencies: plain types/interfaces only.
 *
 * The shapes below are a SUGGESTED starting point. Feel free to change them (add fields,
 * rename, restructure). The frontend type-check will tell you what needs updating.
 */

// ────────────────────────────────────────────────────────────────────────────────
// Shared
// ────────────────────────────────────────────────────────────────────────────────

/** Profile data collected on the `/register` screen. */
export interface UserProfileData {
  name: string;
  email: string;
}

/**
 * User shape that is safe to send to the client.
 *
 * TODO: Candidate - adjust to your data model.
 */
export interface PublicUser extends UserProfileData {
  id: string;
  phone: string;
}

// ────────────────────────────────────────────────────────────────────────────────
// auth.requestOtp
// ────────────────────────────────────────────────────────────────────────────────

export interface RequestOtpDto {
  phone: string;
}

export interface RequestOtpResponse {
  // TODO: Candidate - define the response.
  success: boolean;
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
 *  - `authenticated`: the phone belongs to an existing user, so they are now logged in.
 *  - `registration_required`: the phone is new. The user is in the "pending registration"
 *    state and must complete their profile on `/register` using `registrationToken`.
 *
 * TODO: Candidate - adjust as needed.
 */
export type VerifyOtpResponse =
  | { status: 'authenticated'; user: PublicUser }
  | { status: 'registration_required'; registrationToken: string };

// ────────────────────────────────────────────────────────────────────────────────
// auth.completeRegistration
// ────────────────────────────────────────────────────────────────────────────────

export interface CompleteRegistrationDto extends UserProfileData {
  /** The `registrationToken` returned by `verifyOtp` for a new phone number. */
  token: string;
}

export interface CompleteRegistrationResponse {
  // TODO: Candidate - adjust as needed.
  user: PublicUser;
}
