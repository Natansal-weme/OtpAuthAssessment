import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { SmsModule } from './sms/sms.module';

/**
 * Root module.
 *
 * - `DatabaseModule` is global: `DatabaseService` can be injected anywhere without re-importing.
 * - `SmsModule` exports `SmsService` for modules that import it.
 * - `AuthModule` hosts the OTP flow (service + controller).
 *
 * TODO: Candidate - register any additional modules you create
 */
@Module({
  imports: [DatabaseModule, SmsModule, AuthModule],
})
export class AppModule {}
