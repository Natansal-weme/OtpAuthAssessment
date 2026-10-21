/** Injection token for the validated `AppConfig`. */
export const APP_CONFIG = Symbol('APP_CONFIG');

export interface AppConfig {
  /** Secret for the OTP HMAC. Never stored in the database. */
  otpSecret: string;
  /** Adds the `Secure` flag to cookies. */
  isProduction: boolean;
}

const MIN_SECRET_LENGTH = 32;

/** Reads and validates the configuration. Throws on startup if anything is missing. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const otpSecret = env.OTP_SECRET ?? '';
  if (otpSecret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `OTP_SECRET must be set to at least ${MIN_SECRET_LENGTH} characters ` +
        '(see apps/backend/.env.example).',
    );
  }
  return { otpSecret, isProduction: env.NODE_ENV === 'production' };
}
