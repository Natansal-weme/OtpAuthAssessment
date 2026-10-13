import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { SmsModule } from './sms/sms.module';
import { UsersModule } from './users/users.module';

/**
 * Root module.
 *
 * - `DatabaseModule` is global: `DatabaseService` can be injected anywhere without re-importing.
 * - `SmsModule` exports `SmsService` for modules that import it.
 * - `UsersModule` owns user accounts.
 * - `AuthModule` hosts the OTP flow (OTP challenges, pending registrations, sessions).
 */
@Module({
  imports: [DatabaseModule, SmsModule, UsersModule, AuthModule],
})
export class AppModule {}
