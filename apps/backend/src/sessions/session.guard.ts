import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { type User, UsersService } from '../users/users.service';
import { AuthCookies } from './auth-cookies';
import { SessionsService } from './sessions.service';

type AuthenticatedRequest = Request & { user?: User };

/** Requires a valid session cookie and exposes the user to `@CurrentUser()`. */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly sessions: SessionsService,
    private readonly users: UsersService,
    private readonly cookies: AuthCookies,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.cookies.readSession(req);
    const userId = token && (await this.sessions.findSessionUserId(token));
    const user = userId && (await this.users.findById(userId));
    if (!user) {
      throw new UnauthorizedException({
        statusCode: 401,
        reason: 'unauthenticated',
        message: 'You are not signed in.',
      });
    }
    req.user = user;
    return true;
  }
}

/** The user authenticated by `SessionGuard`. */
export const CurrentUser = createParamDecorator(
  (_: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
