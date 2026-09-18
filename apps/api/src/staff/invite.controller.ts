import { createHash } from 'node:crypto';
import { CanActivate, ConflictException, Controller, ExecutionContext, Get, Inject, Injectable, NotFoundException, Param, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { Public } from '../common/auth/public.decorator';
import { TOKEN_VERIFIER, type TokenVerifier, type VerifiedAccessToken } from '../identity/token-verifier';
import { writeAuditEvent } from '../common/audit/write-audit';

type InviteRequest = Request & { neonClaims?: VerifiedAccessToken };

@Injectable()
export class InviteJwtGuard implements CanActivate {
  constructor(@Inject(TOKEN_VERIFIER) private readonly verifier: TokenVerifier) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<InviteRequest>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('A valid Neon Auth token is required.');
    try { request.neonClaims = await this.verifier.verify(header.slice(7).trim()); return true; }
    catch { throw new UnauthorizedException('A valid Neon Auth token is required.'); }
  }
}

@Controller('invite')
export class InviteController {
  constructor(private readonly prisma: PrismaService) {}
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
  @UseGuards(InviteJwtGuard)
  async claim(@Param('token') token: string, @Req() request: InviteRequest) {
    const claims = request.neonClaims;
    if (!claims?.subject || !claims.email) throw new UnauthorizedException('Neon Auth email is required.');
    const hash = this.hash(token);
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "staff_invitations" WHERE "tokenHash" = ${hash} FOR UPDATE`;
      const invite = locked[0] ? await tx.staffInvitation.findUnique({ where: { id: locked[0].id } }) : null;
      if (!invite) throw new ConflictException('This invitation is no longer valid.');
      if (invite.status !== 'PENDING') throw new ConflictException('This invitation is no longer valid.');
      if (invite.expiresAt <= new Date()) {
        await tx.staffInvitation.update({ where: { id: invite.id }, data: { status: 'EXPIRED' } });
        return { expired: true as const };
      }
      if (claims.email!.trim().toLowerCase() !== invite.email.trim().toLowerCase()) throw new ConflictException('This invitation belongs to another email address.');
      const existing = await tx.user.findFirst({ where: { OR: [{ identityProvider: 'neon-auth', identityProviderSubject: claims.subject }, { identityProvider: 'neon-auth', email: invite.email }] } });
      if (existing) throw new ConflictException('This Neon Auth identity is already linked.');
      const user = await tx.user.create({ data: { identityProvider: 'neon-auth', identityProviderSubject: claims.subject, email: invite.email, firstName: invite.firstName, lastName: invite.lastName, displayName: `${invite.firstName} ${invite.lastName}` } });
      const membership = await tx.organizationMembership.create({ data: { organizationId: invite.organizationId, userId: user.id, role: invite.role, setupStatus: 'ACTIVE' } });
      if (invite.role === 'REHABILITATION_SPECIALIST' || invite.role === 'ORGANIZATION_ADMIN') await tx.practitioner.create({ data: { organizationId: invite.organizationId, userId: user.id, professionalTitle: invite.professionalTitle } });
      await tx.staffInvitation.update({ where: { id: invite.id }, data: { status: 'ACCEPTED', acceptedByUserId: user.id } });
      await writeAuditEvent(tx, { organizationId: invite.organizationId, actorUserId: user.id, action: 'STAFF_CREATED', entityType: 'StaffInvitation', entityId: invite.id, requestId: String(request.headers['x-request-id'] ?? 'unknown'), metadata: { changedFields: ['status', 'acceptedByUserId'] } });
      return { userId: user.id, membershipId: membership.id, status: 'ACCEPTED' as const };
    }).then((result) => { if ('expired' in result) throw new ConflictException('This invitation is no longer valid.'); return result; });
  }
}
