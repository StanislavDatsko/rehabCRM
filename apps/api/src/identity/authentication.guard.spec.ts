import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { SecurityEventLogger } from '../common/auth/security-events';
import { AuthenticationGuard } from './authentication.guard';

const context = (cookie?: string) => {
  const request = { headers: { ...(cookie ? { cookie } : {}), 'x-request-id': 'test' }, path: '/api/v1/me', url: '/api/v1/me' };
  return { switchToHttp: () => ({ getRequest: () => request }), getHandler: () => ({}), getClass: () => ({}) };
};

describe('AuthenticationGuard', () => {
  it('rejects anonymous requests', async () => {
    const guard = new AuthenticationGuard(new Reflector(), {} as never, new SecurityEventLogger(), { resolve: vi.fn().mockResolvedValue(null) } as never);
    await expect(guard.canActivate(context() as never)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('resolves an opaque session cookie', async () => {
    const guard = new AuthenticationGuard(new Reflector(), { resolvePrincipal: vi.fn().mockResolvedValue({ userId: 'u1' }) } as never, new SecurityEventLogger(), { resolve: vi.fn().mockResolvedValue({ user: { identityProviderSubject: 'local:u1' } }) } as never);
    await expect(guard.canActivate(context('rehabmis_session=opaque-token') as never)).resolves.toBe(true);
  });
});
