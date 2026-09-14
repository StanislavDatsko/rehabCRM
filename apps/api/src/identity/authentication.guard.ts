import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../common/auth/public.decorator';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { SecurityEventLogger } from '../common/auth/security-events';
import { IdentityResolutionError, IdentityService } from './identity.service';
import { TOKEN_VERIFIER, type TokenVerifier } from './token-verifier';

const PUBLIC_PATH_PREFIXES = ['/health/', '/api/docs'];

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(TOKEN_VERIFIER) private readonly tokens: TokenVerifier,
    private readonly identity: IdentityService,
    private readonly security: SecurityEventLogger,
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

    const header = request.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      this.security.accessDenied({ requestId, reason: 'anonymous', path });
      throw new UnauthorizedException('Authentication is required.');
    }

    const accessToken = header.slice('Bearer '.length).trim();
    if (!accessToken) {
      this.security.accessDenied({ requestId, reason: 'anonymous', path });
      throw new UnauthorizedException('Authentication is required.');
    }

    let subject: string;
    try {
      const verified = await this.tokens.verify(accessToken);
      subject = verified.subject;
    } catch {
      this.security.accessDenied({ requestId, reason: 'invalid_token', path });
      throw new UnauthorizedException('Authentication is required.');
    }

    try {
      const principal = await this.identity.resolvePrincipal(subject);
      request.principal = principal;
      this.security.authenticated({ requestId, userId: principal.userId, path });
      return true;
    } catch (error) {
      if (error instanceof IdentityResolutionError) {
        this.security.accessDenied({
          requestId,
          reason: error.reason,
          subject,
          path,
        });
        this.identity.denyApplicationAccess();
      }
      throw error;
    }
  }
}
