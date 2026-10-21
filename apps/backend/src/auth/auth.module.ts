import { Module } from '@nestjs/common';
import { IpRateLimitGuard } from '../common/ip-rate-limit.guard';
import { OtpModule } from '../otp/otp.module';
import { SessionsModule } from '../sessions/sessions.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [OtpModule, SessionsModule],
  controllers: [AuthController],
  providers: [AuthService, IpRateLimitGuard],
})
export class AuthModule {}
