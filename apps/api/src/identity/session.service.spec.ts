import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SessionService } from './session.service';
import { readSessionCookie, sessionCookieOptions, sessionTtlSeconds } from './session-cookie';

afterEach(() => vi.unstubAllEnvs());
describe('opaque sessions', () => {
  const setup = () => {
    const authSession = { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() };
    return { authSession, service: new SessionService({ authSession } as never) };
  };
  it('stores only SHA-256, with fresh 256-bit tokens on each login', async () => {
    const { authSession, service } = setup();
    const a = await service.create('u1'); const b = await service.create('u1');
    expect(a.rawToken).not.toBe(b.rawToken);
    expect(Buffer.from(a.rawToken, 'base64url')).toHaveLength(32);
    expect(authSession.create.mock.calls[0]?.[0].data.tokenHash).toBe(createHash('sha256').update(a.rawToken).digest('hex'));
    expect(JSON.stringify(authSession.create.mock.calls)).not.toContain(a.rawToken);
  });
  it.each(['expired', 'revoked', 'disabled', 'missing'])('rejects %s sessions', async (state) => {
    const { authSession, service } = setup();
    authSession.findUnique.mockResolvedValue(state === 'missing' ? null : { expiresAt: new Date(Date.now() + (state === 'expired' ? -1000 : 10000)), revokedAt: state === 'revoked' ? new Date() : null, user: { status: state === 'disabled' ? 'DISABLED' : 'ACTIVE' } });
    expect(await service.resolve('token')).toBeNull();
    expect(authSession.update).not.toHaveBeenCalled();
  });
  it('accepts active sessions and revokes only the matching token hash', async () => {
    const { authSession, service } = setup();
    authSession.findUnique.mockResolvedValue({ id: 's1', expiresAt: new Date(Date.now() + 10000), user: { status: 'ACTIVE' } });
    expect(await service.resolve('token')).toMatchObject({ id: 's1' });
    await service.revoke('token');
    expect(authSession.updateMany).toHaveBeenCalledWith({ where: { tokenHash: createHash('sha256').update('token').digest('hex'), revokedAt: null }, data: { revokedAt: expect.any(Date) } });
  });
  it('uses bounded secure httpOnly cookies and tolerates malformed cookie encoding', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(sessionCookieOptions()).toMatchObject({ secure: true, httpOnly: true, sameSite: 'lax', path: '/' });
    expect(readSessionCookie('rehabmis_session=%broken')).toBeUndefined();
    vi.stubEnv('AUTH_SESSION_TTL_SECONDS', '99999999');
    expect(sessionTtlSeconds).toThrow();
  });
});
