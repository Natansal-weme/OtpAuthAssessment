import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

/** `429` that also tells the client when to retry (`Retry-After` header, in seconds). */
export class RateLimitedException extends HttpException {
  constructor(
    readonly retryAfterSeconds: number,
    message: string,
  ) {
    super(
      { statusCode: HttpStatus.TOO_MANY_REQUESTS, reason: 'rate_limited', message, retryAfterSeconds },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

@Catch(RateLimitedException)
export class RateLimitedExceptionFilter implements ExceptionFilter {
  catch(exception: RateLimitedException, host: ArgumentsHost): void {
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(exception.getStatus())
      .setHeader('Retry-After', String(exception.retryAfterSeconds))
      .json(exception.getResponse());
  }
}
