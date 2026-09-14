import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma, type StaffRole } from '@prisma/client';
import {
  API_ERROR_CODES,
  defaultPagination,
  type StaffHistoryItem,
  type StaffListResponse,
  type StaffResponse,
} from '@repo/contracts';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { writeAuditEvent } from '../common/audit/write-audit';
import { IDENTITY_PROVIDER } from '../identity/dev-seed-ids';
import {
  IDENTITY_PROVIDER_ADMIN,
  IdentityProviderAdminError,
  STAFF_REQUIRED_ACTIONS,
  type IdentityProviderAdminPort,
} from '../identity/identity-provider-admin.port';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import type {
  ChangeStaffRoleBody,
  CreateStaffBody,
  ListStaffQuery,
  UpdateStaffBody,
} from './staff.schemas';

const staffInclude = Prisma.validator<Prisma.OrganizationMembershipInclude>()({
  user: { include: { practitioners: true } },
});

type StaffRow = Prisma.OrganizationMembershipGetPayload<{ include: typeof staffInclude }>;

const STAFF_AUDIT_ACTIONS = [
  'STAFF_CREATED',
  'STAFF_PROFILE_UPDATED',
  'STAFF_ROLE_CHANGED',
  'STAFF_DISABLED',
  'STAFF_ENABLED',
  'STAFF_SESSIONS_REVOKED',
  'STAFF_SETUP_ACTIONS_RESENT',
] as const;

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(IDENTITY_PROVIDER_ADMIN)
    private readonly identities: IdentityProviderAdminPort,
  ) {}

  async list(principal: AuthenticatedPrincipal, query: ListStaffQuery): Promise<StaffListResponse> {
    const { page, pageSize } = defaultPagination(query.page, query.pageSize);
    const search = query.search?.trim();
    const where: Prisma.OrganizationMembershipWhereInput = {
      organizationId: principal.organizationId,
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            user: {
              OR: [
                { email: { contains: search, mode: 'insensitive' } },
                { displayName: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.organizationMembership.count({ where }),
      this.prisma.organizationMembership.findMany({
        where,
        include: staffInclude,
        orderBy: [{ user: { displayName: 'asc' } }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      items: rows.map((row) => this.map(row)),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getById(principal: AuthenticatedPrincipal, membershipId: string): Promise<StaffResponse> {
    return this.map(await this.getRow(principal.organizationId, membershipId));
  }

  async create(
    principal: AuthenticatedPrincipal,
    body: CreateStaffBody,
    requestId: string,
  ): Promise<StaffResponse> {
    const duplicate = await this.prisma.user.findUnique({
      where: {
        identityProvider_email: {
          identityProvider: IDENTITY_PROVIDER,
          email: body.email,
        },
      },
      select: { id: true },
    });
    if (duplicate) this.throwEmailConflict();

    let subject: string;
    try {
      ({ subject } = await this.identities.createStaffIdentity(body));
    } catch (error) {
      this.handleIdentityError(error, 'Unable to provision the staff identity.');
    }

    let membershipId: string;
    try {
      membershipId = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            identityProvider: IDENTITY_PROVIDER,
            identityProviderSubject: subject,
            email: body.email,
            firstName: body.firstName,
            lastName: body.lastName,
            displayName: `${body.firstName} ${body.lastName}`,
          },
        });
        const membership = await tx.organizationMembership.create({
          data: {
            organizationId: principal.organizationId,
            userId: user.id,
            role: body.role,
            setupStatus: 'PENDING_SETUP',
          },
        });
        if (body.role === 'REHABILITATION_SPECIALIST') {
          await tx.practitioner.create({
            data: {
              organizationId: principal.organizationId,
              userId: user.id,
              professionalTitle: body.professionalTitle ?? null,
            },
          });
        }
        await writeAuditEvent(tx, {
          organizationId: principal.organizationId,
          actorUserId: principal.userId,
          action: 'STAFF_CREATED',
          entityType: 'OrganizationMembership',
          entityId: membership.id,
          requestId,
          metadata: { changedFields: ['email', 'firstName', 'lastName', 'role'] },
        });
        return membership.id;
      });
    } catch (error) {
      try {
        await this.identities.setIdentityEnabled(subject, false);
      } catch {
        this.logger.error({ operation: 'compensate_staff_provisioning', outcome: 'failed' });
      }
      if (this.isUniqueConstraint(error)) this.throwEmailConflict();
      throw new ServiceUnavailableException({
        code: API_ERROR_CODES.STAFF_PROVISIONING_FAILED,
        message: 'Staff provisioning did not complete. The external identity was disabled.',
      });
    }

    try {
      await this.identities.triggerRequiredActions(subject, STAFF_REQUIRED_ACTIONS);
    } catch {
      await this.prisma.organizationMembership.update({
        where: { id: membershipId },
        data: { setupStatus: 'SETUP_ACTION_FAILED' },
      });
    }
    return this.getById(principal, membershipId);
  }

  async update(
    principal: AuthenticatedPrincipal,
    membershipId: string,
    body: UpdateStaffBody,
    requestId: string,
  ): Promise<StaffResponse> {
    const current = await this.getRow(principal.organizationId, membershipId);
    const firstName = body.firstName ?? current.user.firstName ?? current.user.displayName;
    const lastName = body.lastName ?? current.user.lastName ?? '';
    const changedFields = [
      ...(body.firstName !== undefined && body.firstName !== current.user.firstName
        ? ['firstName']
        : []),
      ...(body.lastName !== undefined && body.lastName !== current.user.lastName
        ? ['lastName']
        : []),
      ...(body.professionalTitle !== undefined ? ['professionalTitle'] : []),
    ];
    await this.prisma.$transaction(async (tx) => {
      await this.assertVersion(tx, principal.organizationId, membershipId, body.version);
      await tx.user.update({
        where: { id: current.userId },
        data: { firstName, lastName, displayName: `${firstName} ${lastName}`.trim() },
      });
      if (body.professionalTitle !== undefined) {
        await tx.practitioner.updateMany({
          where: { organizationId: principal.organizationId, userId: current.userId },
          data: { professionalTitle: body.professionalTitle },
        });
      }
      await writeAuditEvent(tx, {
        organizationId: principal.organizationId,
        actorUserId: principal.userId,
        action: 'STAFF_PROFILE_UPDATED',
        entityType: 'OrganizationMembership',
        entityId: membershipId,
        requestId,
        metadata: { changedFields },
      });
    });

    try {
      await this.identities.updateStaffIdentity(current.user.identityProviderSubject, {
        email: current.user.email,
        firstName,
        lastName,
      });
      await this.setIdentitySyncPending(membershipId, false);
    } catch {
      await this.setIdentitySyncPending(membershipId, true);
    }
    return this.getById(principal, membershipId);
  }

  async changeRole(
    principal: AuthenticatedPrincipal,
    membershipId: string,
    body: ChangeStaffRoleBody,
    requestId: string,
  ): Promise<StaffResponse> {
    const current = await this.getRow(principal.organizationId, membershipId);
    if (current.role === body.role) return this.map(current);
    await this.prisma.$transaction(async (tx) => {
      if (current.role === 'ORGANIZATION_ADMIN' && body.role !== 'ORGANIZATION_ADMIN') {
        await this.lockOrganizationAdminInvariant(tx, principal.organizationId);
        await this.assertAnotherActiveAdmin(tx, principal.organizationId, membershipId);
      }
      await this.assertVersion(tx, principal.organizationId, membershipId, body.version, {
        role: body.role,
      });
      if (body.role === 'REHABILITATION_SPECIALIST') {
        await tx.practitioner.upsert({
          where: {
            organizationId_userId: {
              organizationId: principal.organizationId,
              userId: current.userId,
            },
          },
          create: { organizationId: principal.organizationId, userId: current.userId },
          update: { status: 'ACTIVE' },
        });
      } else if (current.role === 'REHABILITATION_SPECIALIST') {
        await tx.practitioner.updateMany({
          where: { organizationId: principal.organizationId, userId: current.userId },
          data: { status: 'DISABLED' },
        });
      }
      await writeAuditEvent(tx, {
        organizationId: principal.organizationId,
        actorUserId: principal.userId,
        action: 'STAFF_ROLE_CHANGED',
        entityType: 'OrganizationMembership',
        entityId: membershipId,
        requestId,
        metadata: { changedFields: ['role'], from: current.role, to: body.role },
      });
    });
    return this.getById(principal, membershipId);
  }

  async disable(
    principal: AuthenticatedPrincipal,
    membershipId: string,
    version: number,
    requestId: string,
  ): Promise<StaffResponse> {
    const current = await this.getRow(principal.organizationId, membershipId);
    if (current.userId === principal.userId) {
      throw new ConflictException({
        code: API_ERROR_CODES.STAFF_SELF_DISABLE_FORBIDDEN,
        message: 'Administrators cannot disable their own staff account.',
      });
    }
    if (current.status === 'DISABLED' && !current.identitySyncPending) return this.map(current);
    if (current.status !== 'DISABLED') {
      await this.changeStatus(principal, current, 'DISABLED', version, requestId);
    }
    try {
      await this.identities.setIdentityEnabled(current.user.identityProviderSubject, false);
      await this.identities.terminateSessions(current.user.identityProviderSubject);
      await this.setIdentitySyncPending(membershipId, false);
    } catch {
      await this.setIdentitySyncPending(membershipId, true);
    }
    return this.getById(principal, membershipId);
  }

  async enable(
    principal: AuthenticatedPrincipal,
    membershipId: string,
    version: number,
    requestId: string,
  ): Promise<StaffResponse> {
    const current = await this.getRow(principal.organizationId, membershipId);
    if (current.status === 'ACTIVE' && !current.identitySyncPending) return this.map(current);
    if (current.status !== 'ACTIVE') {
      await this.changeStatus(principal, current, 'ACTIVE', version, requestId);
    }
    try {
      await this.identities.setIdentityEnabled(current.user.identityProviderSubject, true);
      await this.setIdentitySyncPending(membershipId, false);
    } catch {
      await this.setIdentitySyncPending(membershipId, true);
    }
    return this.getById(principal, membershipId);
  }

  async revokeSessions(
    principal: AuthenticatedPrincipal,
    membershipId: string,
    requestId: string,
  ): Promise<void> {
    const current = await this.getRow(principal.organizationId, membershipId);
    try {
      await this.identities.terminateSessions(current.user.identityProviderSubject);
    } catch (error) {
      this.handleIdentityError(error, 'Unable to revoke staff sessions.');
    }
    await this.prisma.$transaction(async (tx) => {
      await writeAuditEvent(tx, {
        organizationId: principal.organizationId,
        actorUserId: principal.userId,
        action: 'STAFF_SESSIONS_REVOKED',
        entityType: 'OrganizationMembership',
        entityId: membershipId,
        requestId,
        metadata: { changedFields: [] },
      });
    });
  }

  async resendSetupActions(
    principal: AuthenticatedPrincipal,
    membershipId: string,
    requestId: string,
  ): Promise<StaffResponse> {
    const current = await this.getRow(principal.organizationId, membershipId);
    try {
      await this.identities.triggerRequiredActions(
        current.user.identityProviderSubject,
        STAFF_REQUIRED_ACTIONS,
      );
    } catch (error) {
      await this.prisma.organizationMembership.update({
        where: { id: membershipId },
        data: { setupStatus: 'SETUP_ACTION_FAILED' },
      });
      this.handleIdentityError(error, 'Unable to send account setup actions.');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.organizationMembership.update({
        where: { id: membershipId },
        data: { setupStatus: 'PENDING_SETUP' },
      });
      await writeAuditEvent(tx, {
        organizationId: principal.organizationId,
        actorUserId: principal.userId,
        action: 'STAFF_SETUP_ACTIONS_RESENT',
        entityType: 'OrganizationMembership',
        entityId: membershipId,
        requestId,
        metadata: { changedFields: ['setupStatus'] },
      });
    });
    return this.getById(principal, membershipId);
  }

  async history(
    principal: AuthenticatedPrincipal,
    membershipId: string,
  ): Promise<StaffHistoryItem[]> {
    await this.getRow(principal.organizationId, membershipId);
    const events = await this.prisma.auditEvent.findMany({
      where: {
        organizationId: principal.organizationId,
        entityType: 'OrganizationMembership',
        entityId: membershipId,
        action: { in: [...STAFF_AUDIT_ACTIONS] },
      },
      include: { actor: { select: { id: true, displayName: true } } },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });
    return events.map((event) => {
      const metadata = this.objectMetadata(event.metadata);
      return {
        id: event.id,
        action: event.action as StaffHistoryItem['action'],
        occurredAt: event.occurredAt.toISOString(),
        actor: event.actor,
        changedFields: Array.isArray(metadata.changedFields)
          ? metadata.changedFields.filter((value): value is string => typeof value === 'string')
          : [],
        ...(typeof metadata.from === 'string' && typeof metadata.to === 'string'
          ? event.action === 'STAFF_ROLE_CHANGED'
            ? { roleChange: { from: metadata.from as StaffRole, to: metadata.to as StaffRole } }
            : {
                statusChange: {
                  from: metadata.from as 'ACTIVE' | 'DISABLED',
                  to: metadata.to as 'ACTIVE' | 'DISABLED',
                },
              }
          : {}),
      };
    });
  }

  private async changeStatus(
    principal: AuthenticatedPrincipal,
    current: StaffRow,
    status: 'ACTIVE' | 'DISABLED',
    version: number,
    requestId: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      if (current.role === 'ORGANIZATION_ADMIN' && status === 'DISABLED') {
        await this.lockOrganizationAdminInvariant(tx, principal.organizationId);
        await this.assertAnotherActiveAdmin(tx, principal.organizationId, current.id);
      }
      await this.assertVersion(tx, principal.organizationId, current.id, version, { status });
      await writeAuditEvent(tx, {
        organizationId: principal.organizationId,
        actorUserId: principal.userId,
        action: status === 'ACTIVE' ? 'STAFF_ENABLED' : 'STAFF_DISABLED',
        entityType: 'OrganizationMembership',
        entityId: current.id,
        requestId,
        metadata: { changedFields: ['status'], from: current.status, to: status },
      });
    });
  }

  private async assertVersion(
    tx: Prisma.TransactionClient,
    organizationId: string,
    membershipId: string,
    version: number,
    data: Prisma.OrganizationMembershipUpdateManyMutationInput = {},
  ): Promise<void> {
    const result = await tx.organizationMembership.updateMany({
      where: { id: membershipId, organizationId, version },
      data: { ...data, version: { increment: 1 } },
    });
    if (result.count !== 1) {
      throw new ConflictException({
        code: API_ERROR_CODES.STAFF_UPDATE_CONFLICT,
        message: 'The staff account changed. Refresh and try again.',
      });
    }
  }

  private async assertAnotherActiveAdmin(
    tx: Prisma.TransactionClient,
    organizationId: string,
    membershipId: string,
  ): Promise<void> {
    const count = await tx.organizationMembership.count({
      where: {
        organizationId,
        status: 'ACTIVE',
        role: 'ORGANIZATION_ADMIN',
        id: { not: membershipId },
      },
    });
    if (count === 0) {
      throw new ConflictException({
        code: API_ERROR_CODES.STAFF_LAST_ADMIN_REQUIRED,
        message: 'The organization must keep at least one active administrator.',
      });
    }
  }

  private async lockOrganizationAdminInvariant(
    tx: Prisma.TransactionClient,
    organizationId: string,
  ): Promise<void> {
    // Cast PostgreSQL's void return value so Prisma can deserialize the lock query.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${organizationId}, 0))::text AS "lock"`;
  }

  private async getRow(organizationId: string, membershipId: string): Promise<StaffRow> {
    const row = await this.prisma.organizationMembership.findFirst({
      where: { id: membershipId, organizationId },
      include: staffInclude,
    });
    if (!row) {
      throw new NotFoundException({
        code: API_ERROR_CODES.STAFF_NOT_FOUND,
        message: 'Staff account was not found.',
      });
    }
    return row;
  }

  private map(row: StaffRow): StaffResponse {
    const practitioner = row.user.practitioners.find(
      (candidate) => candidate.organizationId === row.organizationId,
    );
    const firstName = row.user.firstName ?? row.user.displayName.split(' ')[0] ?? '';
    const lastName = row.user.lastName ?? row.user.displayName.split(' ').slice(1).join(' ');
    return {
      id: row.id,
      userId: row.userId,
      firstName,
      lastName,
      displayName: row.user.displayName,
      email: row.user.email,
      role: row.role,
      status: row.status,
      setupStatus: row.setupStatus,
      identitySyncPending: row.identitySyncPending,
      professionalTitle: practitioner?.professionalTitle ?? null,
      lastLoginAt: row.user.lastLoginAt?.toISOString() ?? null,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private setIdentitySyncPending(membershipId: string, value: boolean): Promise<unknown> {
    return this.prisma.organizationMembership.update({
      where: { id: membershipId },
      data: { identitySyncPending: value },
    });
  }

  private objectMetadata(value: Prisma.JsonValue): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private isUniqueConstraint(error: unknown): boolean {
    return Boolean(
      error && typeof error === 'object' && (error as { code?: string }).code === 'P2002',
    );
  }

  private throwEmailConflict(): never {
    throw new ConflictException({
      code: API_ERROR_CODES.STAFF_EMAIL_CONFLICT,
      message: 'A staff identity already exists for this email address.',
    });
  }

  private handleIdentityError(error: unknown, message: string): never {
    if (error instanceof IdentityProviderAdminError && error.kind === 'conflict') {
      this.throwEmailConflict();
    }
    throw new ServiceUnavailableException({
      code: API_ERROR_CODES.STAFF_IDENTITY_UNAVAILABLE,
      message,
    });
  }
}
