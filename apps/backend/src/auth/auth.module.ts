import { Module } from '@nestjs/common';
import { SmsModule } from '../sms/sms.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

// TODO: Candidate to implement
@Module({
  imports: [SmsModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
