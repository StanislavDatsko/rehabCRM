import { describe, expect, it } from 'vitest';
import { IdentityResolutionError, IdentityService } from './identity.service';

describe('IdentityService', () => {
  it('rejects unknown subjects', async () => {
    const prisma = {
      user: { findUnique: async () => null },
    };
    const service = new IdentityService(prisma as never);
    await expect(service.resolvePrincipal('missing-sub')).rejects.toBeInstanceOf(
      IdentityResolutionError,
    );
  });

  it('rejects disabled users', async () => {
    const prisma = {
      user: {
        findUnique: async () => ({
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
