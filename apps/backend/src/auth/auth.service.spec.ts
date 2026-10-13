import { Test } from '@nestjs/testing';
import { DatabaseService } from '../database/database.service';
import { SmsService } from '../sms/sms.service';
import { AuthService } from './auth.service';

/**
 * AuthService tests.
 *
 * The testing module below is already wired with the real in-memory database and a spied
 * `SmsService`, so you can read the code that was "sent" from `sendSMS.mock.calls`.
 *
 * TODO: Candidate to implement
 */
describe('AuthService', () => {
  let service: AuthService;
  let db: DatabaseService;
  let sendSMS: jest.SpyInstance;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [AuthService, DatabaseService, SmsService],
    }).compile();

    service = moduleRef.get(AuthService);
    db = moduleRef.get(DatabaseService);
    sendSMS = jest.spyOn(moduleRef.get(SmsService), 'sendSMS').mockResolvedValue();
  });

  afterEach(() => {
    db.reset();
    jest.restoreAllMocks();
  });

  it('is defined', () => {
    expect(service).toBeDefined();
    expect(sendSMS).not.toHaveBeenCalled();
  });

  describe('requestOtp', () => {
    it.todo('sends a code to the given phone');
  });

  describe('verifyOtp', () => {
    it.todo('rejects an invalid code');
    it.todo('logs in an existing user');
    it.todo('returns a registration token for a new phone number');
  });

  describe('completeRegistration', () => {
    it.todo('creates the user and logs them in');
    it.todo('rejects an invalid registration token');
  });
});
