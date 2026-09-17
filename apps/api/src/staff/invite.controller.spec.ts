import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { InviteController } from './invite.controller';

const invite = { id: 'invite-1', status: 'PENDING', expiresAt: new Date('2020-01-01'), email: 'person@example.com', organizationId: 'org-1' };
const claims = { subject: 'neon-subject', email: 'person@example.com' };

function setup(invitation = invite) {
  const prisma = {
    staffInvitation: { findUnique: vi.fn().mockResolvedValue(invitation), update: vi.fn().mockResolvedValue(invitation) },
    $queryRaw: vi.fn().mockResolvedValue([{ id: invitation.id }]),
    $transaction: vi.fn(async (callback: (tx: typeof prisma) => unknown) => callback(prisma)),
  };
  const verifier = { verify: vi.fn() };
  return { controller: new InviteController(prisma as never), prisma, verifier };
}

describe('InviteController claim security', () => {
  it('persists EXPIRED before returning the conflict', async () => {
    const { controller, prisma } = setup();
    await expect(controller.claim('raw-token', { neonClaims: claims, headers: {} } as never)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.staffInvitation.update).toHaveBeenCalledWith({ where: { id: invite.id }, data: { status: 'EXPIRED' } });
  });

  it('rejects a wrong email while the invitation remains pending', async () => {
    const { controller, prisma } = setup({ ...invite, expiresAt: new Date('2099-01-01') });
    await expect(controller.claim('raw-token', { neonClaims: { ...claims, email: 'other@example.com' }, headers: {} } as never)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.staffInvitation.update).not.toHaveBeenCalled();
  });

  it('allows exactly one of two concurrent claims to consume an invitation', async () => {
    let status = 'PENDING';
    let locked = false;
    let releaseLock: (() => void) | undefined;
    const waitForLock = async () => {
      while (locked) await new Promise<void>((resolve) => { releaseLock = resolve; });
      locked = true;
    };
    const validInvite = {
      ...invite,
      expiresAt: new Date('2099-01-01'),
      firstName: 'Person',
      lastName: 'Example',
      role: 'REHABILITATION_SPECIALIST',
      professionalTitle: null,
    };
    const prisma = {
      $queryRaw: vi.fn(async () => { await waitForLock(); return [{ id: validInvite.id }]; }),
      $transaction: vi.fn(async (callback: (tx: typeof prisma) => unknown) => {
        try { return await callback(prisma); } finally { locked = false; releaseLock?.(); releaseLock = undefined; }
      }),
      staffInvitation: {
        findUnique: vi.fn(async () => ({ ...validInvite, status })),
        update: vi.fn(async ({ data }: { data: { status: string } }) => { status = data.status; return validInvite; }),
      },
      user: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: 'user-1' }) },
      organizationMembership: { create: vi.fn().mockResolvedValue({ id: 'membership-1' }) },
      practitioner: { create: vi.fn().mockResolvedValue({ id: 'practitioner-1' }) },
      auditEvent: { create: vi.fn().mockResolvedValue({}) },
    };
    const controller = new InviteController(prisma as never);
    const request = { neonClaims: claims, headers: {} } as never;

    const results = await Promise.allSettled([controller.claim('raw-token', request), controller.claim('raw-token', request)]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(status).toBe('ACCEPTED');
  });
});
