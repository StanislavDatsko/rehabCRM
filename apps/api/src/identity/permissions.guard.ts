import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Permission } from '@repo/contracts';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../common/auth/public.decorator';
import { REQUIRED_PERMISSIONS_KEY } from '../common/auth/require-permissions.decorator';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { SecurityEventLogger } from '../common/auth/security-events';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly security: SecurityEventLogger,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const required = this.reflector.getAllAndOverride<Permission[] | undefined>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<
      Request & { principal?: AuthenticatedPrincipal }
    >();
    const principal = request.principal;
    const requestId = String(request.headers['x-request-id'] ?? 'unknown');

    if (!principal) {
      this.security.accessDenied({ requestId, reason: 'anonymous', path: request.path });
      throw new ForbiddenException('You do not have permission to perform this action.');
    }

    const missing = required.filter((permission) => !principal.permissions.includes(permission));
    if (missing.length > 0) {
      this.security.accessDenied({
        requestId,
        reason: 'missing_permission',
        userId: principal.userId,
        path: request.path,
      });
      throw new ForbiddenException('You do not have permission to perform this action.');
    }

    return true;
  }
}
