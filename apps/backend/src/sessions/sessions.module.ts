import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthCookies } from './auth-cookies';
import { SessionGuard } from './session.guard';
import { SessionsService } from './sessions.service';

@Module({
  imports: [UsersModule],
  providers: [SessionsService, AuthCookies, SessionGuard],
  exports: [SessionsService, AuthCookies, SessionGuard, UsersModule],
})
export class SessionsModule {}
