import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthController } from './auth.controller';

const body = { firstName: 'Anna', lastName: 'Test', email: ' ANNA@example.com ', password: 'long-password!', organizationName: 'Local clinic', role: 'REHABILITATION_SPECIALIST' as const };
const request = { headers: {}, ip: '127.0.0.1' };
function setup() {
  const db = {
    $executeRaw: vi.fn(),
    user: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: 'u1', email: 'anna@example.com' }) },
    organization: { count: vi.fn().mockResolvedValue(0), create: vi.fn().mockResolvedValue({ id: 'o1' }) },
    organizationMembership: { create: vi.fn(), findFirst: vi.fn().mockResolvedValue({ organizationId: 'o1' }) },
    practitioner: { create: vi.fn() }, auditEvent: { create: vi.fn() },
  };
  const prisma = { ...db, $transaction: vi.fn((fn: (tx: typeof db) => unknown) => fn(db)) };
  const passwords = { hash: vi.fn().mockResolvedValue('argon-hash'), verify: vi.fn().mockResolvedValue(true) };
  const sessions = { create: vi.fn().mockResolvedValue({ rawToken: 'opaque' }), revoke: vi.fn(), resolve: vi.fn().mockResolvedValue({ userId: 'u1' }) };
  const response = { cookie: vi.fn(), clearCookie: vi.fn() };
  return { db, passwords, sessions, response, controller: new AuthController(prisma as never, passwords as never, sessions as never) };
}
afterEach(() => vi.unstubAllEnvs());
describe('first-party authentication', () => {
  it('bootstraps the first rehabilitation specialist, organization and active practitioner atomically', async () => {
    vi.stubEnv('AUTH_ALLOW_REGISTRATION', 'true');
    const { controller, db, response } = setup();
    await controller.register(body, request as never, response as never);
    expect(db.$executeRaw).toHaveBeenCalled();
    expect(db.organizationMembership.create).toHaveBeenCalledWith({ data: { organizationId: 'o1', userId: 'u1', role: 'REHABILITATION_SPECIALIST', status: 'ACTIVE', setupStatus: 'ACTIVE' } });
    expect(db.practitioner.create).toHaveBeenCalledWith({ data: { organizationId: 'o1', userId: 'u1', status: 'ACTIVE' } });
    expect(db.user.create.mock.calls[0]?.[0].data).toMatchObject({ email: 'anna@example.com', passwordHash: 'argon-hash' });
    expect(response.cookie).toHaveBeenCalled();
  });
  it('defaults registration to organization administrator when role is omitted', async () => {
    vi.stubEnv('AUTH_ALLOW_REGISTRATION', 'true');
    const { controller, db, response } = setup();
    const { role: _role, ...adminBody } = body;
    await controller.register(adminBody, request as never, response as never);
    expect(db.organizationMembership.create).toHaveBeenCalledWith({ data: { organizationId: 'o1', userId: 'u1', role: 'ORGANIZATION_ADMIN', status: 'ACTIVE', setupStatus: 'ACTIVE' } });
  });
  it.each(['disabled', 'duplicate', 'short-password', 'invalid-email'])('rejects registration: %s', async (scenario) => {
    vi.stubEnv('AUTH_ALLOW_REGISTRATION', scenario === 'disabled' ? 'false' : 'true');
    const { controller, db, response, sessions } = setup();
    if (scenario === 'duplicate') db.user.findFirst.mockResolvedValue({ id: 'u2' });
    await expect(controller.register({ ...body, ...(scenario === 'short-password' ? { password: 'short' } : {}), ...(scenario === 'invalid-email' ? { email: 'invalid' } : {}) }, request as never, response as never)).rejects.toThrow();
    expect(sessions.create).not.toHaveBeenCalled();
    expect(db.user.create).not.toHaveBeenCalled();
  });
  it('allows a rehabilitation specialist to create a separate organization after another organization exists', async () => {
    vi.stubEnv('AUTH_ALLOW_REGISTRATION', 'true');
    const { controller, db, response } = setup();
    db.organization.count.mockResolvedValue(1);
    await controller.register(body, request as never, response as never);
    expect(db.organizationMembership.create).toHaveBeenCalledWith({ data: { organizationId: 'o1', userId: 'u1', role: 'REHABILITATION_SPECIALIST', status: 'ACTIVE', setupStatus: 'ACTIVE' } });
  });
  it('logs in an active member without exposing session data in the body', async () => {
    const { controller, db, response } = setup();
    db.user.findFirst.mockResolvedValue({ id: 'u1', status: 'ACTIVE', passwordHash: 'hash' });
    expect(await controller.login(body, request as never, response as never)).toEqual({ id: 'u1' });
    expect(response.cookie).toHaveBeenCalledWith('rehabmis_session', 'opaque', expect.objectContaining({ httpOnly: true, sameSite: 'lax' }));
  });
  it.each(['wrong-password', 'missing', 'legacy', 'disabled', 'no-membership'])('returns generic login failure: %s', async (scenario) => {
    const { controller, db, passwords, response, sessions } = setup();
    db.user.findFirst.mockResolvedValue(scenario === 'missing' ? null : { id: 'u1', status: scenario === 'disabled' ? 'DISABLED' : 'ACTIVE', passwordHash: scenario === 'legacy' ? null : 'hash' });
    passwords.verify.mockResolvedValue(scenario !== 'wrong-password');
    if (scenario === 'no-membership') db.organizationMembership.findFirst.mockResolvedValue(null);
    await expect(controller.login(body, request as never, response as never)).rejects.toThrow('Невірна електронна пошта або пароль.');
    expect(sessions.create).not.toHaveBeenCalled();
  });
  it('revokes the cookie session and clears the browser cookie', async () => {
    const { controller, sessions, response } = setup();
    await controller.logout({ headers: { cookie: 'rehabmis_session=opaque' } } as never, response as never);
    expect(sessions.revoke).toHaveBeenCalledWith('opaque');
    expect(response.clearCookie).toHaveBeenCalledWith('rehabmis_session', expect.objectContaining({ path: '/' }));
  });
});
