import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');
type NeonUser = { id: string; email: string };
type Summary = { matched: number; unmatched: number; ambiguous: number; alreadyMigrated: number; updated: number };

async function main() {
  const legacy = await prisma.user.findMany({
    where: { identityProvider: 'keycloak' },
    select: { id: true, email: true, identityProviderSubject: true },
  });
  const alreadyMigrated = await prisma.user.count({ where: { identityProvider: 'neon-auth' } });
  const tableRows = await prisma.$queryRaw<{ table_name: string | null }[]>`
    SELECT COALESCE(to_regclass('neon_auth."user"')::text, to_regclass('neon_auth.users_sync')::text) AS table_name
  `;
  const table = tableRows[0]?.table_name;
  if (!table) throw new Error('No supported Neon Auth table found');
  const neonUsers = await prisma.$queryRawUnsafe<NeonUser[]>(`SELECT id, email FROM ${table}`);
  const byEmail = new Map<string, NeonUser[]>();
  for (const neonUser of neonUsers) {
    const key = neonUser.email.trim().toLowerCase();
    byEmail.set(key, [...(byEmail.get(key) ?? []), neonUser]);
  }
  const summary: Summary = { matched: 0, unmatched: 0, ambiguous: 0, alreadyMigrated, updated: 0 };
  const changes: { id: string; subject: string }[] = [];

  for (const user of legacy) {
    const matches = byEmail.get(user.email.trim().toLowerCase()) ?? [];
    if (!matches.length) { summary.unmatched++; continue; }
    if (matches.length > 1) { summary.ambiguous++; continue; }
    summary.matched++; changes.push({ id: user.id, subject: matches[0].id });
  }
  if (summary.ambiguous) throw new Error(`ABORT: ${summary.ambiguous} ambiguous email match(es)`);
  if (apply) await prisma.$transaction(async (tx) => {
    for (const change of changes) await tx.user.update({ where: { id: change.id }, data: { identityProvider: 'neon-auth', identityProviderSubject: change.subject } });
  });
  summary.updated = apply ? changes.length : 0;
  console.log(JSON.stringify({ table, dryRun: !apply, ...summary }, null, 2));
}

main().finally(() => prisma.$disconnect());
