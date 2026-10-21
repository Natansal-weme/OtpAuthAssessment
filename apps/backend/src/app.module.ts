import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { DatabaseModule } from './database/database.module';

/**
 * Root module.
 *
 * - `CommonModule` and `DatabaseModule` are global: config, clock, lock and `DatabaseService` can be
 *   injected anywhere.
 * - `AuthModule` hosts the OTP flow; it pulls in `OtpModule`, `SessionsModule` and `UsersModule`.
 */
@Module({
  imports: [CommonModule, DatabaseModule, AuthModule],
})
export class AppModule {}
