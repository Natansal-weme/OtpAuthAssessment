import { Injectable } from '@nestjs/common';

/**
 * Mock SMS provider.
 *
 * In production this would call a real provider (Twilio, Vonage, ...). Here it only logs to the
 * console, so while developing you can read the OTP from the backend terminal output.
 *
 * It is `async` on purpose, to mimic a real network call - remember to `await` it.
 *
 * NOTE: This file is provided as-is. You should not need to change it.
 */
@Injectable()
export class SmsService {
  async sendSMS(phone: string, code: string): Promise<void> {
    console.log(`[SMS SERVICE] Sending OTP ${code} to ${phone}`);
  }
}
