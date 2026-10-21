import { z } from 'zod';
import { PhoneSchema } from '../common/phone';
import { UserSchema } from '../database/database.schema';

/** Request bodies of the auth endpoints. */

export const RequestOtpSchema = z.object({ phone: PhoneSchema });
export type RequestOtpBody = z.output<typeof RequestOtpSchema>;

export const VerifyOtpSchema = z.object({
  phone: PhoneSchema,
  code: z.string().regex(/^\d{6}$/, 'The code is 6 digits'),
});
export type VerifyOtpBody = z.output<typeof VerifyOtpSchema>;

export const CompleteRegistrationSchema = UserSchema.pick({ name: true, email: true });
export type CompleteRegistrationBody = z.output<typeof CompleteRegistrationSchema>;
