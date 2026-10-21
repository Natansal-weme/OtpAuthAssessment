import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { configureApp } from '../app.setup';
import { Clock } from '../common/clock';
import { APP_CONFIG, type AppConfig } from '../common/config';
import { DATABASE_DIR } from '../database/database.service';
import { SmsService } from '../sms/sms.service';

/** A clock that only moves when told to. */
export class FakeClock extends Clock {
  /** Starts at the real time: cookie expiry is enforced by the HTTP client with the real clock. */
  private current = new Date();

  now(): Date {
    return new Date(this.current);
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

/** Captures sent codes instead of logging them. */
export class FakeSms {
  readonly sent: { phone: string; code: string }[] = [];

  async sendSMS(phone: string, code: string): Promise<void> {
    this.sent.push({ phone, code });
  }

  lastCode(): string {
    const last = this.sent.at(-1);
    if (!last) throw new Error('No SMS was sent');
    return last.code;
  }
}

export const TEST_CONFIG: AppConfig = { otpSecret: 'test-secret-'.padEnd(32, 'x'), isProduction: false };

/** The full app with an in-memory database, a fake clock and a fake SMS provider. */
export async function createTestApp(): Promise<{
  app: INestApplication;
  clock: FakeClock;
  sms: FakeSms;
}> {
  const clock = new FakeClock();
  const sms = new FakeSms();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DATABASE_DIR)
    .useValue(null)
    .overrideProvider(APP_CONFIG)
    .useValue(TEST_CONFIG)
    .overrideProvider(Clock)
    .useValue(clock)
    .overrideProvider(SmsService)
    .useValue(sms)
    .compile();

  const app = moduleRef.createNestApplication({ logger: false });
  configureApp(app);
  await app.init();
  return { app, clock, sms };
}
