import { ForbiddenException, Injectable } from '@nestjs/common';
import type { StaffRole } from '@repo/contracts';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { permissionsForRole } from '../common/auth/role-permissions';
import { IDENTITY_PROVIDER } from './dev-seed-ids';
import type { SecurityEventReason } from '../common/auth/security-events';

export class IdentityResolutionError extends Error {
  constructor(readonly reason: SecurityEventReason) {
    super(reason);
  }
}

@Injectable()
export class IdentityService {
  constructor(private readonly prisma: PrismaService) {}

  async resolvePrincipal(subject: string): Promise<AuthenticatedPrincipal> {
    const user = await this.prisma.user.findUnique({
      where: {
        identityProvider_identityProviderSubject: {
          identityProvider: IDENTITY_PROVIDER,
          identityProviderSubject: subject,
        },
      },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
          include: { organization: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!user) {
      throw new IdentityResolutionError('unknown_subject');
    }
    if (user.status !== 'ACTIVE') {
      throw new IdentityResolutionError('user_disabled');
    }

    const membership = user.memberships[0];
    if (!membership) {
      const anyMembership = await this.prisma.organizationMembership.findFirst({
        where: { userId: user.id },
      });
      if (anyMembership && anyMembership.status !== 'ACTIVE') {
        throw new IdentityResolutionError('membership_disabled');
      }
      throw new IdentityResolutionError('no_active_membership');
    }

    return {
      subject,
      userId: user.id,
      organizationId: membership.organizationId,
      membershipId: membership.id,
      role: membership.role as StaffRole,
      permissions: permissionsForRole(membership.role as StaffRole),
      email: user.email,
      displayName: user.displayName,
      organizationName: membership.organization.name,
    };
  }

  async markLogin(userId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { lastLoginAt: new Date() },
      }),
      this.prisma.organizationMembership.updateMany({
        where: { userId, status: 'ACTIVE', setupStatus: { not: 'ACTIVE' } },
        data: { setupStatus: 'ACTIVE' },
      }),
    ]);
  }

  denyApplicationAccess(): never {
    throw new ForbiddenException('This account does not have access to RehabCRM.');
  }
}
