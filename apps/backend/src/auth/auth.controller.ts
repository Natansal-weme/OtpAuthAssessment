import { Controller, NotImplementedException, Post } from '@nestjs/common';

/**
 * Auth endpoints (under the global `/api` prefix).
 */
@Controller('auth')
export class AuthController {
  @Post('request-otp')
  requestOtp() {
    // TODO: Candidate to implement
    throw new NotImplementedException();
  }

  @Post('verify-otp')
  verifyOtp() {
    // TODO: Candidate to implement
    throw new NotImplementedException();
  }

  @Post('complete-registration')
  completeRegistration() {
    // TODO: Candidate to implement
    throw new NotImplementedException();
  }
}
