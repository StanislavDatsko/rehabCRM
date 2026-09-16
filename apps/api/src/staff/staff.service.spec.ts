import { ConflictException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { StaffService } from './staff.service';

const principal: AuthenticatedPrincipal = {
  subject: 'admin-subject',
  userId: 'admin-user',
  organizationId: 'org-a',
  membershipId: 'admin-membership',
  role: 'ORGANIZATION_ADMIN',
  permissions: [],
  email: 'admin@example.com',
  displayName: 'Admin User',
  organizationName: 'Org A',
};

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'membership-1',
    organizationId: 'org-a',
    userId: 'staff-user',
    role: 'RECEPTIONIST',
    status: 'ACTIVE',
    setupStatus: 'ACTIVE',
    identitySyncPending: false,
    version: 1,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    user: {
      id: 'staff-user',
      identityProvider: 'neon-auth',
      identityProviderSubject: 'staff-subject',
      email: 'staff@example.com',
      firstName: 'Staff',
      lastName: 'Member',
      displayName: 'Staff Member',
      status: 'ACTIVE',
      lastLoginAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      practitioners: [],
    },
    ...overrides,
  };
}

function createPrismaMock() {
  const prisma = {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    organizationMembership: {
      count: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    practitioner: { create: vi.fn(), upsert: vi.fn(), updateMany: vi.fn() },
    auditEvent: { create: vi.fn(), findMany: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation(async (operation: unknown) =>
    Array.isArray(operation)
      ? Promise.all(operation)
      : (operation as (tx: typeof prisma) => unknown)(prisma),
  );
  return prisma;
}

function createIdentityMock() {
  return {
    createStaffIdentity: vi.fn(),
    updateStaffIdentity: vi.fn(),
    setIdentityEnabled: vi.fn(),
    triggerRequiredActions: vi.fn(),
    terminateSessions: vi.fn(),
  };
}

describe('StaffService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let identities: ReturnType<typeof createIdentityMock>;
  let service: StaffService;

  beforeEach(() => {
    prisma = createPrismaMock();
    identities = createIdentityMock();
    service = new StaffService(prisma as never, identities);
  });

  it('conceals a cross-organization membership as 404', async () => {
    prisma.organizationMembership.findFirst.mockResolvedValue(null);
    await expect(service.getById(principal, 'foreign-membership')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.organizationMembership.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'foreign-membership', organizationId: 'org-a' },
      }),
    );
  });

  it('creates the identity before committing the local user and membership', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    identities.createStaffIdentity.mockResolvedValue({ subject: 'new-subject' });
    prisma.user.create.mockResolvedValue({ id: 'new-user' });
    prisma.organizationMembership.create.mockResolvedValue({ id: 'new-membership' });
    prisma.auditEvent.create.mockResolvedValue({ id: 'audit' });
    prisma.organizationMembership.findFirst.mockResolvedValue(
      row({ id: 'new-membership', userId: 'new-user' }),
    );

    await service.create(
      principal,
      {
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        role: 'RECEPTIONIST',
        professionalTitle: null,
      },
      'request-1',
    );

    expect(identities.createStaffIdentity).toHaveBeenCalledBefore(prisma.user.create);
    expect(prisma.organizationMembership.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ setupStatus: 'PENDING_SETUP', organizationId: 'org-a' }),
      }),
    );
    expect(identities.triggerRequiredActions).toHaveBeenCalledWith('new-subject', [
      'VERIFY_EMAIL',
      'UPDATE_PASSWORD',
    ]);
  });

  it('disables the external identity as compensation when the DB transaction fails', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    identities.createStaffIdentity.mockResolvedValue({ subject: 'orphan-subject' });
    prisma.user.create.mockRejectedValue(new Error('database unavailable'));

    await expect(
      service.create(
        principal,
        {
          email: 'new@example.com',
          firstName: 'New',
          lastName: 'User',
          role: 'RECEPTIONIST',
          professionalTitle: null,
        },
        'request-2',
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(identities.setIdentityEnabled).toHaveBeenCalledWith('orphan-subject', false);
  });

  it('rejects disabling the final active organization administrator', async () => {
    prisma.organizationMembership.findFirst.mockResolvedValue(
      row({ id: 'admin-target', role: 'ORGANIZATION_ADMIN', userId: 'other-admin' }),
    );
    prisma.organizationMembership.count.mockResolvedValue(0);

    await expect(service.disable(principal, 'admin-target', 1, 'request-3')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.organizationMembership.updateMany).not.toHaveBeenCalled();
    expect(identities.setIdentityEnabled).not.toHaveBeenCalled();
  });

  it('rejects changing the final active administrator to another role', async () => {
    prisma.organizationMembership.findFirst.mockResolvedValue(
      row({ id: 'admin-target', role: 'ORGANIZATION_ADMIN', userId: 'other-admin' }),
    );
    prisma.organizationMembership.count.mockResolvedValue(0);

    await expect(
      service.changeRole(
        principal,
        'admin-target',
        { role: 'RECEPTIONIST', version: 1 },
        'request-role',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$queryRaw).toHaveBeenCalledOnce();
  });

  it('keeps the staff record recoverable when required-action email fails', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    identities.createStaffIdentity.mockResolvedValue({ subject: 'new-subject' });
    identities.triggerRequiredActions.mockRejectedValue(new Error('SMTP unavailable'));
    prisma.user.create.mockResolvedValue({ id: 'new-user' });
    prisma.organizationMembership.create.mockResolvedValue({ id: 'new-membership' });
    prisma.auditEvent.create.mockResolvedValue({ id: 'audit' });
    prisma.organizationMembership.findFirst.mockResolvedValue(
      row({ id: 'new-membership', userId: 'new-user', setupStatus: 'SETUP_ACTION_FAILED' }),
    );

    const result = await service.create(
      principal,
      {
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        role: 'RECEPTIONIST',
        professionalTitle: null,
      },
      'request-email',
    );

    expect(prisma.organizationMembership.update).toHaveBeenCalledWith({
      where: { id: 'new-membership' },
      data: { setupStatus: 'SETUP_ACTION_FAILED' },
    });
    expect(result.setupStatus).toBe('SETUP_ACTION_FAILED');
  });

  it('retains and disables the practitioner when changing away from specialist', async () => {
    prisma.organizationMembership.findFirst
      .mockResolvedValueOnce(row({ role: 'REHABILITATION_SPECIALIST' }))
      .mockResolvedValueOnce(row({ role: 'RECEPTIONIST', version: 2 }));
    prisma.organizationMembership.updateMany.mockResolvedValue({ count: 1 });
    prisma.practitioner.updateMany.mockResolvedValue({ count: 1 });
    prisma.auditEvent.create.mockResolvedValue({ id: 'audit' });

    await service.changeRole(
      principal,
      'membership-1',
      { role: 'RECEPTIONIST', version: 1 },
      'request-4',
    );

    expect(prisma.practitioner.updateMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-a', userId: 'staff-user' },
      data: { status: 'DISABLED' },
    });
  });

  it('returns a version conflict rather than overwriting a concurrent update', async () => {
    prisma.organizationMembership.findFirst.mockResolvedValue(row());
    prisma.organizationMembership.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.changeRole(
        principal,
        'membership-1',
        { role: 'ORGANIZATION_ADMIN', version: 1 },
        'request-5',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
