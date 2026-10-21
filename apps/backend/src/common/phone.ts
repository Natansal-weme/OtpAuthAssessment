import { z } from 'zod';

const ISRAEL_PREFIX = '+972';

/**
 * Israeli phone number in local format (`050-123-4567`, `02 123 4567`), normalized to E.164
 * (`+972501234567`). Landlines are accepted: some can receive SMS as a voice call.
 */
export const PhoneSchema = z
  .string()
  .transform((value) => value.replace(/[\s-]/g, ''))
  .pipe(
    z
      .string()
      .regex(/^0[1-9]\d{7,8}$/, 'Enter an Israeli phone number starting with 0, e.g. 050-123-4567'),
  )
  .transform((local) => `${ISRAEL_PREFIX}${local.slice(1)}`);
