import { Body, Controller, Get, Post, Req, Res, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { Public } from '../common/auth/public.decorator';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { PasswordService } from './password.service';
import { AUTH_SESSION_COOKIE, SessionService } from './session.service';
import { CurrentPrincipal } from '../common/auth/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { z } from 'zod';
import { Throttle } from '@nestjs/throttler';
import { readSessionCookie, sessionCookieOptions } from './session-cookie';
import { writeAuditEvent } from '../common/audit/write-audit';

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const credentials = z.object({ email: z.string().trim().email().max(254).transform(normalizeEmail), password: z.string().min(10).max(128) });
const registration = credentials.extend({ firstName: z.string().trim().min(1).max(100), lastName: z.string().trim().min(1).max(100), organizationName: z.string().trim().min(1).max(200), role: z.enum(['ORGANIZATION_ADMIN', 'REHABILITATION_SPECIALIST']).default('ORGANIZATION_ADMIN') });
const invalidCredentials = () => new UnauthorizedException('Невірна електронна пошта або пароль.');

@Controller('auth')
export class AuthController {
  constructor(private readonly prisma: PrismaService, private readonly passwords: PasswordService, private readonly sessions: SessionService) {}

  @Get('me')
  async me(@CurrentPrincipal() principal: AuthenticatedPrincipal) {
    const profile = await this.prisma.user.findUnique({ where: { id: principal.userId }, select: { firstName: true, lastName: true } });
    return { id: principal.userId, email: principal.email, firstName: profile?.firstName, lastName: profile?.lastName, displayName: principal.displayName, role: principal.role, membershipStatus: 'ACTIVE', organization: { id: principal.organizationId, name: principal.organizationName } };
  }

  @Post('register')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async register(@Body() body: { firstName?: string; lastName?: string; email?: string; password?: string; organizationName?: string; role?: 'ORGANIZATION_ADMIN' | 'REHABILITATION_SPECIALIST' }, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const registrationAllowed = process.env.AUTH_ALLOW_REGISTRATION === 'true' || (process.env.NODE_ENV !== 'production' && process.env.AUTH_ALLOW_REGISTRATION !== 'false');
    if (!registrationAllowed) throw new UnauthorizedException('Registration is disabled.');
    const parsed = registration.safeParse(body);
    if (!parsed.success) throw new BadRequestException('Invalid registration details.');
    const { firstName, lastName, email, password, organizationName, role } = parsed.data;
    const passwordHash = await this.passwords.hash(password);
    const result = await this.prisma.$transaction(async (tx) => {
      // Serialize the empty-database bootstrap across simultaneous requests.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(721963102)`;
      if (await tx.user.findFirst({ where: { email } })) throw new BadRequestException('An account with this email already exists.');
      const user = await tx.user.create({ data: { identityProvider: 'local', identityProviderSubject: `local:${randomUUID()}`, passwordHash, email, firstName, lastName, displayName: `${firstName} ${lastName}` } });
      const organization = await tx.organization.create({ data: { name: organizationName, slug: `clinic-${randomUUID()}` } });
      await tx.organizationMembership.create({ data: { organizationId: organization.id, userId: user.id, role, status: 'ACTIVE', setupStatus: 'ACTIVE' } });
      await tx.practitioner.create({ data: { organizationId: organization.id, userId: user.id, status: 'ACTIVE' } });
      await writeAuditEvent(tx, { organizationId: organization.id, actorUserId: user.id, action: 'AUTH_REGISTERED', entityType: 'User', entityId: user.id, requestId: String(request.headers['x-request-id'] ?? 'unknown'), metadata: {} });
      return user;
    });
    const session = await this.sessions.create(result.id, { userAgent: request.headers['user-agent'], ipAddress: request.ip });
    response.cookie(AUTH_SESSION_COOKIE, session.rawToken, sessionCookieOptions());
    return { id: result.id, email: result.email, firstName: result.firstName, lastName: result.lastName };
  }

  @Post('login')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(@Body() body: { email?: string; password?: string }, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const parsed = credentials.safeParse(body);
    if (!parsed.success) throw invalidCredentials();
    const user = await this.prisma.user.findFirst({ where: { email: parsed.data.email } });
    if (!user?.passwordHash || user.status !== 'ACTIVE' || !(await this.passwords.verify(user.passwordHash, parsed.data.password))) throw invalidCredentials();
    const membership = await this.prisma.organizationMembership.findFirst({ where: { userId: user.id, status: 'ACTIVE' } });
    if (!membership) throw invalidCredentials();
    await writeAuditEvent(this.prisma, { organizationId: membership.organizationId, actorUserId: user.id, action: 'AUTH_LOGIN_SUCCESS', entityType: 'User', entityId: user.id, requestId: String(request.headers['x-request-id'] ?? 'unknown'), metadata: {} });
    const session = await this.sessions.create(user.id, { userAgent: request.headers['user-agent'], ipAddress: request.ip });
    response.cookie(AUTH_SESSION_COOKIE, session.rawToken, sessionCookieOptions());
    return { id: user.id, email: user.email, displayName: user.displayName };
  }

  @Post('logout')
  @Public()
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const raw = readSessionCookie(request.headers.cookie);
    if (raw) {
      const session = await this.sessions.resolve(raw);
      await this.sessions.revoke(raw);
      if (session) {
        const membership = await this.prisma.organizationMembership.findFirst({ where: { userId: session.userId, status: 'ACTIVE' } });
        if (membership) await writeAuditEvent(this.prisma, { organizationId: membership.organizationId, actorUserId: session.userId, action: 'AUTH_LOGOUT', entityType: 'User', entityId: session.userId, requestId: String(request.headers['x-request-id'] ?? 'unknown'), metadata: {} });
      }
    }
    response.clearCookie(AUTH_SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
    return { ok: true };
  }
}
