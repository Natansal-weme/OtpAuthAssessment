import { Module } from '@nestjs/common';
import { SmsModule } from '../sms/sms.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

/**
 * Auth feature module.
 *
 * `DatabaseService` is available here because `DatabaseModule` is global.
 *
 * TODO: Candidate - register any additional providers you create.
 */
@Module({
  imports: [SmsModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
