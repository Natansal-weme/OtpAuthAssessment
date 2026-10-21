import { PhoneSchema } from './phone';

describe('PhoneSchema', () => {
  it.each([
    ['0501234567', '+972501234567'],
    ['050-123-4567', '+972501234567'],
    [' 050 123 4567 ', '+972501234567'],
    ['02-1234567', '+97221234567'],
    ['0771234567', '+972771234567'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(PhoneSchema.parse(input)).toBe(expected);
  });

  it.each(['', '501234567', '+972501234567', '00501234567', '050123456a', '05012345678', '0012345678'])(
    'rejects %j',
    (input) => {
      expect(PhoneSchema.safeParse(input).success).toBe(false);
    },
  );
});
