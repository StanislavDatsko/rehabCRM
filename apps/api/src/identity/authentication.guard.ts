import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../common/auth/public.decorator';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { SecurityEventLogger } from '../common/auth/security-events';
import { IdentityResolutionError, IdentityService } from './identity.service';
import { SessionService } from './session.service';
import { readSessionCookie } from './session-cookie';

const PUBLIC_PATH_PREFIXES = ['/health/', '/api/docs'];

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly identity: IdentityService,
    private readonly security: SecurityEventLogger,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<
      Request & { principal?: AuthenticatedPrincipal }
    >();
    const requestId = String(request.headers['x-request-id'] ?? 'unknown');
    const path = request.path ?? request.url;

    const isPublic =
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) === true || PUBLIC_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));

    if (isPublic) {
      return true;
    }

    const cookieToken = readSessionCookie(request.headers.cookie);
    if (cookieToken) {
      const session = await this.sessions.resolve(cookieToken);
      if (session) {
        try {
          request.principal = await this.identity.resolvePrincipal(session.user.identityProviderSubject, session.userId);
        } catch (error) {
          if (!(error instanceof IdentityResolutionError)) throw error;
          this.security.accessDenied({ requestId, reason: error.reason, path });
          this.identity.denyApplicationAccess();
        }
        this.security.authenticated({ requestId, userId: request.principal.userId, path });
        return true;
      }
    }
    this.security.accessDenied({ requestId, reason: 'anonymous', path });
    throw new UnauthorizedException('Authentication is required.');
  }
}
