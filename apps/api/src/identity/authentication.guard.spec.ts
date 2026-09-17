import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS, type StaffRole } from '@repo/contracts';
import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { SecurityEventLogger } from '../common/auth/security-events';
import { AuthenticationGuard } from './authentication.guard';
import { IdentityResolutionError, IdentityService } from './identity.service';
import { PermissionsGuard } from './permissions.guard';
import type { TokenVerifier } from './token-verifier';

function principal(role: StaffRole, permissions: AuthenticatedPrincipal['permissions']): AuthenticatedPrincipal {
  return {
    subject: 'sub',
    userId: 'user-1',
    organizationId: 'org-1',
    membershipId: 'mem-1',
    role,
    permissions,
    email: 'staff@rehabcrm.local',
    displayName: 'Staff',
    organizationName: 'Demo',
  };
}

function httpContext(input: {
  authorization?: string;
  path?: string;
  isPublic?: boolean;
  required?: AuthenticatedPrincipal['permissions'];
  principal?: AuthenticatedPrincipal;
}) {
  const request: {
    headers: Record<string, string>;
    path: string;
    url: string;
    principal?: AuthenticatedPrincipal;
  } = {
    headers: input.authorization ? { authorization: input.authorization, 'x-request-id': 'req-1' } : { 'x-request-id': 'req-1' },
    path: input.path ?? '/api/v1/me',
    url: input.path ?? '/api/v1/me',
    principal: input.principal,
  };

  const reflector = {
    getAllAndOverride: (key: string) => {
      if (key === 'rehabcrm.isPublic') {
        return input.isPublic ?? false;
      }
      if (key === 'rehabcrm.requiredPermissions') {
        return input.required;
      }
      return undefined;
    },
  } as unknown as Reflector;

  return {
    request,
    reflector,
    context: {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    },
  };
}

describe('AuthenticationGuard', () => {
  it('rejects anonymous requests to protected routes', async () => {
    const { context, reflector } = httpContext({});
    const guard = new AuthenticationGuard(
      reflector,
      { verify: vi.fn() } as unknown as TokenVerifier,
      { resolvePrincipal: vi.fn(), denyApplicationAccess: vi.fn() } as unknown as IdentityService,
      new SecurityEventLogger(),
    );
    await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects invalid tokens', async () => {
    const { context, reflector } = httpContext({ authorization: 'Bearer not-a-jwt' });
    const guard = new AuthenticationGuard(
      reflector,
      { verify: vi.fn().mockRejectedValue(new Error('bad')) } as unknown as TokenVerifier,
      { resolvePrincipal: vi.fn(), denyApplicationAccess: vi.fn() } as unknown as IdentityService,
      new SecurityEventLogger(),
    );
    await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('denies unknown OIDC subjects', async () => {
    const { context, reflector } = httpContext({ authorization: 'Bearer token' });
    const identity = {
      resolvePrincipal: vi.fn().mockRejectedValue(new IdentityResolutionError('unknown_subject')),
      denyApplicationAccess: vi.fn(() => {
        throw new ForbiddenException('This account does not have access to RehabCRM.');
      }),
    };
    const guard = new AuthenticationGuard(
      reflector,
      { verify: vi.fn().mockResolvedValue({ subject: 'unknown' }) } as unknown as TokenVerifier,
      identity as unknown as IdentityService,
      new SecurityEventLogger(),
    );
    await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('denies disabled users and disabled memberships', async () => {
    for (const reason of ['user_disabled', 'membership_disabled'] as const) {
      const { context, reflector } = httpContext({ authorization: 'Bearer token' });
      const identity = {
        resolvePrincipal: vi.fn().mockRejectedValue(new IdentityResolutionError(reason)),
        denyApplicationAccess: vi.fn(() => {
          throw new ForbiddenException('This account does not have access to RehabCRM.');
        }),
      };
      const guard = new AuthenticationGuard(
        reflector,
        { verify: vi.fn().mockResolvedValue({ subject: 'sub' }) } as unknown as TokenVerifier,
        identity as unknown as IdentityService,
        new SecurityEventLogger(),
      );
      await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(ForbiddenException);
    }
  });
});

describe('PermissionsGuard', () => {
  it('allows a specialist with clinical_note.read', () => {
    const specialist = principal('REHABILITATION_SPECIALIST', [PERMISSIONS.CLINICAL_NOTE_READ]);
    const { context, reflector } = httpContext({
      required: [PERMISSIONS.CLINICAL_NOTE_READ],
      principal: specialist,
    });
    const guard = new PermissionsGuard(reflector, new SecurityEventLogger());
    expect(guard.canActivate(context as never)).toBe(true);
  });

  it('forbids a specialist without clinical_note.read', () => {
    const receptionist = principal('REHABILITATION_SPECIALIST', []);
    const { context, reflector } = httpContext({
      required: [PERMISSIONS.CLINICAL_NOTE_READ],
      principal: receptionist,
    });
    const guard = new PermissionsGuard(reflector, new SecurityEventLogger());
    expect(() => guard.canActivate(context as never)).toThrow(ForbiddenException);
  });
});
