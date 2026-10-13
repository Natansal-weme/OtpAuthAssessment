const SECOND = 1000;
const MINUTE = 60 * SECOND;
const DAY = 24 * 60 * MINUTE;

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 5 * MINUTE;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 30 * SECOND;

export const PENDING_REGISTRATION_TTL_MS = 15 * MINUTE;
export const SESSION_TTL_MS = 7 * DAY;

export const SESSION_COOKIE = 'sid';
export const REGISTRATION_COOKIE = 'reg';
