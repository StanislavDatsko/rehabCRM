import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

type NeonUser = { id: string; email: string };

async function main() {
  const legacy = await prisma.user.findMany({
    where: { identityProvider: 'keycloak' },
    select: { id: true, email: true, identityProviderSubject: true },
  });
  const neonUsers = await prisma.$queryRaw<NeonUser[]>`
    SELECT id, email FROM neon_auth.users_sync WHERE deleted_at IS NULL
  `;
  const byEmail = new Map(neonUsers.map((user) => [user.email.toLowerCase(), user]));

  for (const user of legacy) {
    const match = byEmail.get(user.email.toLowerCase());
    if (!match) {
      console.log(`UNMATCHED ${user.email}`);
      continue;
    }
    console.log(`${apply ? 'UPDATE' : 'WOULD UPDATE'} ${user.email}: ${user.identityProviderSubject} -> ${match.id}`);
    if (apply) {
      await prisma.user.update({
        where: { id: user.id },
        data: { identityProvider: 'neon-auth', identityProviderSubject: match.id },
      });
    }
  }
}

main().finally(() => prisma.$disconnect());
