import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

export { AUTH_SESSION_COOKIE } from './session-cookie';
import { sessionTtlSeconds } from './session-cookie';

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async create(userId: string, metadata?: { userAgent?: string; ipAddress?: string }) {
    const rawToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + sessionTtlSeconds() * 1000);
    await this.prisma.authSession.create({
      data: {
        userId,
        tokenHash: this.hash(rawToken),
        expiresAt,
        userAgent: metadata?.userAgent?.slice(0, 500),
        ipAddress: metadata?.ipAddress?.slice(0, 64),
      },
    });
    return { rawToken, expiresAt };
  }

  async resolve(rawToken: string) {
    const session = await this.prisma.authSession.findUnique({ where: { tokenHash: this.hash(rawToken) }, include: { user: true } });
    if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.status !== 'ACTIVE') return null;
    await this.prisma.authSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
    return session;
  }

  revoke(rawToken: string) {
    return this.prisma.authSession.updateMany({ where: { tokenHash: this.hash(rawToken), revokedAt: null }, data: { revokedAt: new Date() } });
  }
}
