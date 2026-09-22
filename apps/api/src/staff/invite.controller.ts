import { createHash } from 'node:crypto';
import { Body, ConflictException, Controller, Get, NotFoundException, Param, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { Public } from '../common/auth/public.decorator';
import { PasswordService } from '../identity/password.service';
import { AUTH_SESSION_COOKIE, SessionService } from '../identity/session.service';
import { writeAuditEvent } from '../common/audit/write-audit';
import { sessionCookieOptions } from '../identity/session-cookie';
import { z } from 'zod';

type InviteRequest = Request;

@Controller('invite')
export class InviteController {
  constructor(private readonly prisma: PrismaService, private readonly passwords: PasswordService, private readonly sessions: SessionService) {}
  private hash(token: string) { return createHash('sha256').update(token).digest('hex'); }

  @Get(':token')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async validate(@Param('token') token: string) {
    const invite = await this.prisma.staffInvitation.findUnique({ where: { tokenHash: this.hash(token) }, include: { organization: { select: { name: true } } } });
    if (!invite) throw new NotFoundException('Invalid invitation.');
    if (invite.status !== 'PENDING' || invite.expiresAt <= new Date()) {
      if (invite.status === 'PENDING') { await this.prisma.staffInvitation.update({ where: { id: invite.id }, data: { status: 'EXPIRED' } }); return { status: 'EXPIRED' as const, email: invite.email, organizationName: invite.organization.name, expiresAt: invite.expiresAt.toISOString() }; }
      return { status: invite.status, email: invite.email, organizationName: invite.organization.name, expiresAt: invite.expiresAt.toISOString() };
    }
    return { email: invite.email, firstName: invite.firstName, lastName: invite.lastName, organizationName: invite.organization.name, role: invite.role, expiresAt: invite.expiresAt.toISOString(), status: invite.status };
  }

  @Post(':token/claim')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async claim(@Param('token') token: string, @Body() body: { email?: string; password?: string }, @Req() request: InviteRequest, @Res({ passthrough: true }) response: Response) {
    const parsed = z.object({ email: z.string().trim().email().max(254).transform(value => value.toLowerCase()), password: z.string().min(10).max(128) }).safeParse(body);
    if (!parsed.success) throw new ConflictException('Invalid invitation credentials.');
    const { email, password } = parsed.data;
    const hash = this.hash(token);
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(721963102)`;
      const locked = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "staff_invitations" WHERE "tokenHash" = ${hash} FOR UPDATE`;
      const invite = locked[0] ? await tx.staffInvitation.findUnique({ where: { id: locked[0].id } }) : null;
      if (!invite) throw new ConflictException('This invitation is no longer valid.');
      if (invite.status !== 'PENDING') throw new ConflictException('This invitation is no longer valid.');
      if (invite.expiresAt <= new Date()) {
        await tx.staffInvitation.update({ where: { id: invite.id }, data: { status: 'EXPIRED' } });
        return { expired: true as const };
      }
      if (email !== invite.email.trim().toLowerCase()) throw new ConflictException('This invitation belongs to another email address.');
      const existing = await tx.user.findFirst({ where: { email } });
      if (existing && (existing.status !== 'ACTIVE' || !existing.passwordHash || !(await this.passwords.verify(existing.passwordHash, password)))) throw new ConflictException('Invalid invitation credentials.');
      if (existing && await tx.organizationMembership.findFirst({ where: { userId: existing.id, organizationId: invite.organizationId } })) throw new ConflictException('This account is already a member of this organization.');
      const user = existing ?? await tx.user.create({ data: { identityProvider: 'local', identityProviderSubject: `local:${createHash('sha256').update(`${email}:${invite.id}`).digest('hex')}`, passwordHash: await this.passwords.hash(password), email, firstName: invite.firstName, lastName: invite.lastName, displayName: `${invite.firstName} ${invite.lastName}` } });
      const membership = await tx.organizationMembership.create({ data: { organizationId: invite.organizationId, userId: user.id, role: invite.role, setupStatus: 'ACTIVE' } });
      if (invite.role === 'REHABILITATION_SPECIALIST' || invite.role === 'ORGANIZATION_ADMIN') await tx.practitioner.create({ data: { organizationId: invite.organizationId, userId: user.id, professionalTitle: invite.professionalTitle } });
      await tx.staffInvitation.update({ where: { id: invite.id }, data: { status: 'ACCEPTED', acceptedByUserId: user.id } });
      await writeAuditEvent(tx, { organizationId: invite.organizationId, actorUserId: user.id, action: 'STAFF_CREATED', entityType: 'StaffInvitation', entityId: invite.id, requestId: String(request.headers['x-request-id'] ?? 'unknown'), metadata: { changedFields: ['status', 'acceptedByUserId'] } });
      return { userId: user.id, membershipId: membership.id, status: 'ACCEPTED' as const };
    }).then(async (result) => { if ('expired' in result) throw new ConflictException('This invitation is no longer valid.'); const session = await this.sessions.create(result.userId, { userAgent: request.headers['user-agent'], ipAddress: request.ip }); response.cookie(AUTH_SESSION_COOKIE, session.rawToken, sessionCookieOptions()); return result; });
  }
}
