import { describe, expect, it, vi } from 'vitest';
import { IdentityResolutionError, IdentityService } from './identity.service';

describe('IdentityService', () => {
  it('reads current DB roles for the session user ID, including legacy providers', async () => {
    const membership = { id: 'm1', organizationId: 'o1', organization: { name: 'Clinic' }, role: 'ORGANIZATION_ADMIN' };
    const user = { id: 'u1', status: 'ACTIVE', email: 'a@example.com', displayName: 'Anna', memberships: [membership] };
    const findFirst = vi.fn().mockResolvedValue(user);
    const service = new IdentityService({ user: { findFirst } } as never);
    const before = await service.resolvePrincipal('legacy:subject', 'u1');
    membership.role = 'REHABILITATION_SPECIALIST';
    const after = await service.resolvePrincipal('legacy:subject', 'u1');
    expect(before.role).toBe('ORGANIZATION_ADMIN');
    expect(after.role).toBe('REHABILITATION_SPECIALIST');
    expect(after.permissions).not.toEqual(before.permissions);
    expect(after.organizationId).toBe('o1');
    expect(findFirst).toHaveBeenLastCalledWith(expect.objectContaining({ where: { id: 'u1' } }));
  });
  it('rejects unknown subjects', async () => {
    const prisma = {
      user: { findFirst: async () => null },
    };
    const service = new IdentityService(prisma as never);
    await expect(service.resolvePrincipal('missing-sub')).rejects.toBeInstanceOf(
      IdentityResolutionError,
    );
  });

  it('rejects disabled users', async () => {
    const prisma = {
      user: {
        findFirst: async () => ({
          id: 'u1',
          status: 'DISABLED',
          memberships: [],
        }),
      },
    };
    const service = new IdentityService(prisma as never);
    await expect(service.resolvePrincipal('sub')).rejects.toMatchObject({
      reason: 'user_disabled',
    });
  });
});
