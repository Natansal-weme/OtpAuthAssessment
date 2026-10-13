import { completeRegistrationSchema, requestOtpSchema, verifyOtpSchema } from './auth.schemas';

describe('auth schemas', () => {
  it('normalizes phone numbers to E.164', () => {
    expect(requestOtpSchema.parse({ phone: ' +1 (555) 123-4567 ' })).toEqual({ phone: '+15551234567' });
  });

  it.each(['', '5551234567', '+0123456789', '+1555abc4567', '+1234'])('rejects phone %p', (phone) => {
    expect(requestOtpSchema.safeParse({ phone }).success).toBe(false);
  });

  it('only accepts 6-digit codes', () => {
    expect(verifyOtpSchema.safeParse({ phone: '+15551234567', code: '123456' }).success).toBe(true);
    expect(verifyOtpSchema.safeParse({ phone: '+15551234567', code: '12345' }).success).toBe(false);
    expect(verifyOtpSchema.safeParse({ phone: '+15551234567', code: 'abcdef' }).success).toBe(false);
  });

  it('trims the name, lowercases the email and strips unknown fields', () => {
    expect(
      completeRegistrationSchema.parse({ name: '  Ada ', email: ' Ada@Example.COM ', phone: '+1999' }),
    ).toEqual({ name: 'Ada', email: 'ada@example.com' });
  });

  it('rejects a missing name or invalid email', () => {
    expect(completeRegistrationSchema.safeParse({ name: ' ', email: 'ada@example.com' }).success).toBe(false);
    expect(completeRegistrationSchema.safeParse({ name: 'Ada', email: 'not-an-email' }).success).toBe(false);
  });
});
