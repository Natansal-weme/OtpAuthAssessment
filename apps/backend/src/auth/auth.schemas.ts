import { z } from 'zod';
import { OTP_LENGTH } from './auth.constants';
import type { CompleteRegistrationDto, RequestOtpDto, VerifyOtpDto } from './auth.types';

/**
 * Runtime validation + normalization of request bodies. Each schema is checked against the
 * shared contract type with `satisfies`, so the two cannot drift apart.
 */

/** Accepts common formatting (spaces, dashes, parentheses), normalizes to E.164. */
export const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s\-().]/g, ''))
  .pipe(
    z
      .string()
      .regex(/^\+[1-9]\d{7,14}$/, 'Enter a valid phone number in international format, e.g. +15551234567'),
  );

export const requestOtpSchema = z.object({
  phone: phoneSchema,
}) satisfies z.ZodType<RequestOtpDto>;

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: z
    .string()
    .trim()
    .regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), `The code must be ${OTP_LENGTH} digits`),
}) satisfies z.ZodType<VerifyOtpDto>;

export const completeRegistrationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email('Enter a valid email address').max(254, 'Email is too long')),
}) satisfies z.ZodType<CompleteRegistrationDto>;
