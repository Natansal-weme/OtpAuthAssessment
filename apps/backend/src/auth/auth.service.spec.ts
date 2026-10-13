import { ConflictException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DatabaseService } from '../database/database.service';
import { SmsService } from '../sms/sms.service';
import { UsersService } from '../users/users.service';
import {
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  PENDING_REGISTRATION_TTL_MS,
} from './auth.constants';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { PendingRegistrationService } from './pending-registration.service';
import { SessionService } from './session.service';

const PHONE = '+15551234567';
const OTHER_PHONE = '+15557654321';
const PROFILE = { name: 'Ada Lovelace', email: 'ada@example.com' };

describe('AuthService', () => {
  let service: AuthService;
  let db: DatabaseService;
  let sendSMS: jest.SpyInstance;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        OtpService,
        SessionService,
        PendingRegistrationService,
        UsersService,
        DatabaseService,
        SmsService,
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    db = moduleRef.get(DatabaseService);
    sendSMS = jest.spyOn(moduleRef.get(SmsService), 'sendSMS').mockResolvedValue();
  });

  afterEach(() => {
    db.reset();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  /** The code most recently "sent" by SMS. */
  const lastCode = (): string => sendSMS.mock.calls.at(-1)[1];

  /** A code that is guaranteed to be wrong. */
  const wrongCode = (): string => (lastCode() === '000000' ? '111111' : '000000');

  async function startRegistration(phone = PHONE): Promise<string> {
    await service.requestOtp(phone);
    const result = await service.verifyOtp(phone, lastCode());
    if (result.status !== 'registration_required') throw new Error('expected a new phone');
    return result.registrationToken;
  }

  async function registerUser(phone = PHONE, profile = PROFILE) {
    return service.completeRegistration(await startRegistration(phone), profile);
  }

  it('is defined', () => {
    expect(service).toBeDefined();
    expect(sendSMS).not.toHaveBeenCalled();
  });

  describe('requestOtp', () => {
    it('sends a code to the given phone', async () => {
      const response = await service.requestOtp(PHONE);

      expect(sendSMS).toHaveBeenCalledTimes(1);
      expect(sendSMS).toHaveBeenCalledWith(PHONE, expect.stringMatching(/^\d{6}$/));
      expect(response).toEqual({
        phone: PHONE,
        expiresInSeconds: OTP_TTL_MS / 1000,
        resendAvailableInSeconds: OTP_RESEND_COOLDOWN_MS / 1000,
      });
    });

    it('never stores the plain code', async () => {
      await service.requestOtp(PHONE);
      expect(JSON.stringify(db.snapshot())).not.toContain(lastCode());
    });

    it('returns the same response for known and unknown phones', async () => {
      await registerUser(PHONE);
      jest.useFakeTimers({ now: Date.now() + OTP_RESEND_COOLDOWN_MS });

      expect(await service.requestOtp(PHONE)).toEqual({
        ...(await service.requestOtp(OTHER_PHONE)),
        phone: PHONE,
      });
    });

    it('enforces a resend cooldown, then replaces the previous code', async () => {
      await service.requestOtp(PHONE);
      const firstCode = lastCode();

      await expect(service.requestOtp(PHONE)).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
      });

      jest.useFakeTimers({ now: Date.now() + OTP_RESEND_COOLDOWN_MS });
      await service.requestOtp(PHONE);
      expect(sendSMS).toHaveBeenCalledTimes(2);

      if (firstCode !== lastCode()) {
        await expect(service.verifyOtp(PHONE, firstCode)).rejects.toThrow(UnauthorizedException);
      }
      await expect(service.verifyOtp(PHONE, lastCode())).resolves.toBeDefined();
    });
  });

  describe('verifyOtp', () => {
    it('rejects an invalid code', async () => {
      await service.requestOtp(PHONE);
      await expect(service.verifyOtp(PHONE, wrongCode())).rejects.toThrow(UnauthorizedException);
    });

    it('rejects when no code was requested', async () => {
      await expect(service.verifyOtp(PHONE, '123456')).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a code issued for another phone', async () => {
      await service.requestOtp(PHONE);
      await service.requestOtp(OTHER_PHONE);
      const otherCode = lastCode();

      await expect(service.verifyOtp(PHONE, otherCode)).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an expired code', async () => {
      await service.requestOtp(PHONE);
      jest.useFakeTimers({ now: Date.now() + OTP_TTL_MS + 1 });

      await expect(service.verifyOtp(PHONE, lastCode())).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a code that was already used', async () => {
      await service.requestOtp(PHONE);
      const code = lastCode();
      await service.verifyOtp(PHONE, code);

      await expect(service.verifyOtp(PHONE, code)).rejects.toThrow(UnauthorizedException);
    });

    it('burns the code after too many wrong attempts', async () => {
      await service.requestOtp(PHONE);
      const code = lastCode();

      for (let i = 1; i < OTP_MAX_ATTEMPTS; i++) {
        await expect(service.verifyOtp(PHONE, wrongCode())).rejects.toThrow(UnauthorizedException);
      }
      await expect(service.verifyOtp(PHONE, wrongCode())).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
      });
      await expect(service.verifyOtp(PHONE, code)).rejects.toThrow(UnauthorizedException);
    });

    it('logs in an existing user', async () => {
      const { user } = await registerUser();
      jest.useFakeTimers({ now: Date.now() + OTP_RESEND_COOLDOWN_MS });

      await service.requestOtp(PHONE);
      const result = await service.verifyOtp(PHONE, lastCode());

      expect(result).toMatchObject({ status: 'authenticated', user });
      if (result.status !== 'authenticated') throw new Error('unreachable');
      expect(service.getSession({ sessionToken: result.sessionToken })).toEqual({
        status: 'authenticated',
        user,
      });
    });

    it('returns a registration token for a new phone number', async () => {
      await service.requestOtp(PHONE);
      const result = await service.verifyOtp(PHONE, lastCode());

      expect(result).toMatchObject({ status: 'registration_required', phone: PHONE });
      if (result.status !== 'registration_required') throw new Error('unreachable');
      expect(result.registrationToken).toEqual(expect.any(String));
      expect(db.table('users').count()).toBe(0);
      expect(service.getSession({ registrationToken: result.registrationToken })).toEqual({
        status: 'pending_registration',
        phone: PHONE,
      });
    });

    it('revokes the tokens the client previously held', async () => {
      const { sessionToken } = await registerUser();
      jest.useFakeTimers({ now: Date.now() + OTP_RESEND_COOLDOWN_MS });

      await service.requestOtp(OTHER_PHONE);
      await service.verifyOtp(OTHER_PHONE, lastCode(), { sessionToken });

      expect(service.getSession({ sessionToken })).toEqual({ status: 'anonymous' });
    });
  });

  describe('completeRegistration', () => {
    it('creates the user and logs them in', async () => {
      const token = await startRegistration();
      const { user, sessionToken } = await service.completeRegistration(token, PROFILE);

      expect(user).toMatchObject({ phone: PHONE, ...PROFILE, id: expect.any(String) });
      expect(db.table('users').count()).toBe(1);
      expect(service.getSession({ sessionToken })).toEqual({ status: 'authenticated', user });
    });

    it('rejects an invalid registration token', async () => {
      await expect(service.completeRegistration('forged-token', PROFILE)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.completeRegistration(undefined, PROFILE)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(db.table('users').count()).toBe(0);
    });

    it('does not accept a registration token twice', async () => {
      const token = await startRegistration();
      await service.completeRegistration(token, PROFILE);

      await expect(
        service.completeRegistration(token, { name: 'Mallory', email: 'mallory@example.com' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(db.table('users').count()).toBe(1);
    });

    it('rejects an expired registration token', async () => {
      const token = await startRegistration();
      jest.useFakeTimers({ now: Date.now() + PENDING_REGISTRATION_TTL_MS + 1 });

      await expect(service.completeRegistration(token, PROFILE)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects an email that is already taken', async () => {
      await registerUser(PHONE);
      const token = await startRegistration(OTHER_PHONE);

      await expect(service.completeRegistration(token, PROFILE)).rejects.toThrow(ConflictException);
    });

    it('never stores raw tokens', async () => {
      const { sessionToken } = await registerUser();
      expect(JSON.stringify(db.snapshot())).not.toContain(sessionToken);
    });
  });

  describe('logout', () => {
    it('revokes the session', async () => {
      const { sessionToken } = await registerUser();
      service.logout({ sessionToken });
      expect(service.getSession({ sessionToken })).toEqual({ status: 'anonymous' });
    });
  });
});
