import { describe, expect, it, vi } from 'vitest';
import { InviteController } from './invite.controller';

const setup = (role: string) => {
  const invite = { id: 'i1', status: 'PENDING', expiresAt: new Date(Date.now() + 60_000), email: 'staff@example.com', firstName: 'Staff', lastName: 'Member', role, organizationId: 'o1', professionalTitle: null };
  const tx = {
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn().mockResolvedValue([{ id: 'i1' }]),
    staffInvitation: { findUnique: vi.fn().mockResolvedValue(invite), update: vi.fn() },
    user: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: 'u1' }) },
    organizationMembership: { create: vi.fn().mockResolvedValue({ id: 'm1' }), findFirst: vi.fn().mockResolvedValue(null) },
    practitioner: { create: vi.fn() },
    auditEvent: { create: vi.fn() },
  };
  const prisma = { $transaction: vi.fn((fn: (value: typeof tx) => unknown) => fn(tx)) };
  const response = { cookie: vi.fn() };
  const passwords = { hash: vi.fn().mockResolvedValue('hash'), verify: vi.fn().mockResolvedValue(true) };
  const controller = new InviteController(prisma as never, passwords as never, { create: vi.fn().mockResolvedValue({ rawToken: 'token' }) } as never);
  return { controller, tx, response, passwords, invite };
};

describe('InviteController local claims', () => {
  it.each(['missing', 'expired', 'reused', 'wrong-email'])('rejects %s invitations', async (scenario) => {
    const { controller, tx, response, invite } = setup('ORGANIZATION_ADMIN');
    if (scenario === 'missing') tx.$queryRaw.mockResolvedValue([]);
    if (scenario === 'expired') invite.expiresAt = new Date(0);
    if (scenario === 'reused') invite.status = 'ACCEPTED';
    await expect(controller.claim('raw', { email: scenario === 'wrong-email' ? 'other@example.com' : invite.email, password: 'long-enough-password' }, { headers: {} } as never, response as never)).rejects.toThrow();
    expect(tx.user.create).not.toHaveBeenCalled();
    expect(response.cookie).not.toHaveBeenCalled();
  });
  it.each([true, false])('requires existing-account password verification: %s', async (valid) => {
    const { controller, tx, response, passwords } = setup('ORGANIZATION_ADMIN');
    tx.user.findFirst.mockResolvedValue({ id: 'u1', status: 'ACTIVE', passwordHash: 'stored-hash' });
    passwords.verify.mockResolvedValue(valid);
    const claim = controller.claim('raw', { email: 'staff@example.com', password: 'long-enough-password' }, { headers: {} } as never, response as never);
    if (valid) await expect(claim).resolves.toMatchObject({ status: 'ACCEPTED' });
    else await expect(claim).rejects.toThrow();
    expect(tx.user.create).not.toHaveBeenCalled();
    expect(passwords.verify).toHaveBeenCalledWith('stored-hash', 'long-enough-password');
  });
  it.each(['REHABILITATION_SPECIALIST', 'ORGANIZATION_ADMIN'])('creates a practitioner for %s', async (role) => {
    const { controller, tx, response } = setup(role);
    await controller.claim('raw', { email: 'staff@example.com', password: 'long-enough-password' }, { headers: {}, ip: '127.0.0.1' } as never, response as never);
    expect(tx.practitioner.create).toHaveBeenCalled();
    expect(response.cookie).toHaveBeenCalled();
  });

  it('does not create a practitioner for SYSTEM_ADMIN', async () => {
    const { controller, tx, response } = setup('SYSTEM_ADMIN');
    await controller.claim('raw', { email: 'staff@example.com', password: 'long-enough-password' }, { headers: {}, ip: '127.0.0.1' } as never, response as never);
    expect(tx.practitioner.create).not.toHaveBeenCalled();
  });
});
