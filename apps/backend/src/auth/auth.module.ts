import { Module } from '@nestjs/common';
import { SmsModule } from '../sms/sms.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { PendingRegistrationService } from './pending-registration.service';
import { SessionService } from './session.service';

/**
 * Auth feature module.
 *
 * `DatabaseService` is available here because `DatabaseModule` is global.
 */
@Module({
  imports: [SmsModule, UsersModule],
  controllers: [AuthController],
  providers: [AuthService, OtpService, SessionService, PendingRegistrationService],
  exports: [AuthService, SessionService],
})
export class AuthModule {}
