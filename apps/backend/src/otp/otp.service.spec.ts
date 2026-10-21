import type { INestApplication } from '@nestjs/common';
import { RateLimitedException } from '../common/rate-limited.exception';
import { DatabaseService } from '../database/database.service';
import { createTestApp, type FakeClock, type FakeSms } from '../test/test-app';
import { OTP_POLICY, OtpService } from './otp.service';

const PHONE = '+972501234567';

describe('OtpService', () => {
  let app: INestApplication;
  let clock: FakeClock;
  let sms: FakeSms;
  let otp: OtpService;
  let db: DatabaseService;

  beforeEach(async () => {
    ({ app, clock, sms } = await createTestApp());
    otp = app.get(OtpService);
    db = app.get(DatabaseService);
  });

  afterEach(() => app.close());

  const wrongCode = () => (sms.lastCode() === '000000' ? '111111' : '000000');

  it('sends a 6-digit code and stores only its HMAC', async () => {
    await otp.issue(PHONE);

    const code = sms.lastCode();
    expect(sms.sent).toEqual([{ phone: PHONE, code }]);
    expect(code).toMatch(/^\d{6}$/);
    const stored = JSON.stringify(await db.snapshot());
    expect(stored).not.toContain(`"${code}"`);
  });

  it('accepts the correct code once', async () => {
    await otp.issue(PHONE);
    const code = sms.lastCode();

    expect(await otp.verify(PHONE, code)).toEqual({ ok: true });
    expect(await otp.verify(PHONE, code)).toEqual({ ok: false, reason: 'expired_or_locked' });
  });

  it('binds the code to the phone', async () => {
    await otp.issue(PHONE);
    await otp.issue('+972521111111');

    expect(await otp.verify('+972521111111', sms.sent[0].code)).toMatchObject({ ok: false });
  });

  it(`locks the challenge after ${OTP_POLICY.maxAttempts} wrong attempts`, async () => {
    await otp.issue(PHONE);
    const code = sms.lastCode();

    expect(await otp.verify(PHONE, wrongCode())).toEqual({ ok: false, reason: 'invalid_code', attemptsRemaining: 2 });
    expect(await otp.verify(PHONE, wrongCode())).toEqual({ ok: false, reason: 'invalid_code', attemptsRemaining: 1 });
    expect(await otp.verify(PHONE, wrongCode())).toEqual({ ok: false, reason: 'invalid_code', attemptsRemaining: 0 });
    expect(await otp.verify(PHONE, code)).toEqual({ ok: false, reason: 'expired_or_locked' });
  });

  it('does not let parallel guesses bypass the attempt cap', async () => {
    await otp.issue(PHONE);
    const code = sms.lastCode();

    const results = await Promise.all(Array.from({ length: 20 }, () => otp.verify(PHONE, wrongCode())));

    expect(results.filter((result) => !result.ok && result.reason === 'invalid_code')).toHaveLength(OTP_POLICY.maxAttempts);
    expect(await otp.verify(PHONE, code)).toEqual({ ok: false, reason: 'expired_or_locked' });
  });

  it('expires codes', async () => {
    await otp.issue(PHONE);
    clock.advance(OTP_POLICY.codeTtlMs);

    expect(await otp.verify(PHONE, sms.lastCode())).toEqual({ ok: false, reason: 'expired_or_locked' });
  });

  it('only accepts the latest code', async () => {
    await otp.issue(PHONE);
    const first = sms.lastCode();
    clock.advance(OTP_POLICY.resendCooldownMs);
    await otp.issue(PHONE);

    if (first !== sms.lastCode()) expect(await otp.verify(PHONE, first)).toMatchObject({ ok: false });
    expect(await otp.verify(PHONE, sms.lastCode())).toEqual({ ok: true });
  });

  it('enforces the resend cooldown', async () => {
    await otp.issue(PHONE);
    clock.advance(OTP_POLICY.resendCooldownMs - 10_000);

    await expect(otp.issue(PHONE)).rejects.toMatchObject({ retryAfterSeconds: 10 });
    expect(sms.sent).toHaveLength(1);
  });

  it('caps sends per hour, then allows them again', async () => {
    for (let i = 0; i < OTP_POLICY.maxSendsPerWindow; i++) {
      await otp.issue(PHONE);
      clock.advance(OTP_POLICY.resendCooldownMs);
    }

    await expect(otp.issue(PHONE)).rejects.toBeInstanceOf(RateLimitedException);
    expect(sms.sent).toHaveLength(OTP_POLICY.maxSendsPerWindow);

    clock.advance(OTP_POLICY.sendWindowMs);
    await expect(otp.issue(PHONE)).resolves.toBeDefined();
  });

  it('keeps the send cap across lockouts', async () => {
    for (let i = 0; i < OTP_POLICY.maxSendsPerWindow; i++) {
      await otp.issue(PHONE);
      for (let attempt = 0; attempt < OTP_POLICY.maxAttempts; attempt++) await otp.verify(PHONE, wrongCode());
      clock.advance(OTP_POLICY.resendCooldownMs);
    }

    await expect(otp.issue(PHONE)).rejects.toBeInstanceOf(RateLimitedException);
  });
});
