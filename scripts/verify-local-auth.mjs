// Isolated local integration smoke; never resets the application's database.
import 'reflect-metadata';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { PrismaClient } = require('@prisma/client');
const { AuthController } = require('./dist/identity/auth.controller.js');
const { PasswordService } = require('./dist/identity/password.service.js');
const { SessionService } = require('./dist/identity/session.service.js');
const root = fileURLToPath(new URL('../', import.meta.url));
const url = new URL(process.env.DATABASE_URL ?? '');
assert(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Local DATABASE_URL required');
assert(!['production', 'staging'].includes(process.env.DEPLOYMENT_ENV), 'Local deployment required');
const database = `auth_smoke_${randomBytes(8).toString('hex')}`;
const admin = new PrismaClient({ datasourceUrl: url.href });
url.pathname = `/${database}`;
url.searchParams.set('schema', 'public');
const localEnv = { ...process.env, DATABASE_URL: url.href, AUTH_ALLOW_REGISTRATION: 'true', NODE_ENV: 'development' };
process.env.AUTH_ALLOW_REGISTRATION = 'true';
const prisma = new PrismaClient({ datasourceUrl: url.href });
function command(args) {
  const result = spawnSync('pnpm', ['--filter', '@rehabcrm/api', ...args], { cwd: root, env: localEnv, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Local verification command failed: ${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
}
await admin.$executeRawUnsafe(`CREATE DATABASE "${database}"`);
try {
  command(['exec', 'prisma', 'migrate', 'deploy']);
  const passwords = new PasswordService();
  const sessions = new SessionService(prisma);
  const controller = new AuthController(prisma, passwords, sessions);
  const cookies = [];
  const response = { cookie: (name, value, options) => cookies.push({ name, value, options }), clearCookie: () => {} };
  const request = { headers: {}, ip: '127.0.0.1' };
  const input = { firstName: 'Local', lastName: 'Verification', email: 'auth-smoke@example.invalid', password: 'LocalSmokeOnly123!', organizationName: 'Disposable local verification' };
  const results = await Promise.allSettled([
    controller.register(input, request, response),
    controller.register({ ...input, email: 'second@example.invalid' }, request, response),
  ]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(await prisma.organization.count(), 1);
  assert.equal(await prisma.practitioner.count({ where: { status: 'ACTIVE' } }), 1);
  const user = await prisma.user.findFirstOrThrow();
  assert(user.passwordHash.startsWith('$argon2id$'));
  const cookie = cookies[0];
  assert.equal(cookie.options.httpOnly, true);
  assert.equal((await sessions.resolve(cookie.value)).userId, user.id);
  const stored = await prisma.authSession.findFirstOrThrow();
  assert.notEqual(stored.tokenHash, cookie.value);
  await controller.logout({ headers: { cookie: `${cookie.name}=${cookie.value}` } }, response);
  assert.equal(await sessions.resolve(cookie.value), null);
  await controller.login({ email: user.email, password: input.password }, request, response);
  assert.equal((await sessions.resolve(cookies.at(-1).value)).userId, user.id);
  console.log('PASS: concurrent first registration, Argon2id, active admin/practitioner, hashed session, logout, login');
  command(['prisma:bootstrap-reference']);
  async function snapshot() {
    return Promise.all(['measurementDefinition', 'assessmentTemplate', 'assessmentTemplateItem', 'exerciseDefinition'].map(model => prisma[model].findMany({ select: { id: true }, orderBy: { id: 'asc' } })));
  }
  const before = await snapshot();
  command(['prisma:bootstrap-reference']);
  assert.deepEqual(await snapshot(), before);
  assert.equal(await prisma.user.count(), 1);
  assert.equal(await prisma.organization.count(), 1);
  console.log('PASS: bootstrap twice; reference IDs/counts unchanged; existing user/organization preserved');
} finally {
  // Only the exact random database created above is ever removed.
  assert(/^auth_smoke_[a-f0-9]{16}$/.test(database));
  await prisma.$disconnect();
  await admin.$executeRawUnsafe(`DROP DATABASE "${database}"`);
  await admin.$disconnect();
  console.log('Disposable local verification database removed. Application data unchanged.');
}
