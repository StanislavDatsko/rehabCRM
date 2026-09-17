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
});
