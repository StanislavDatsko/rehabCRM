import type { Prisma } from '@prisma/client';

export function schedulingLockScope(organizationId: string, practitionerId: string): string {
  return `${organizationId}:${practitionerId}`;
}

export async function acquireSchedulingLock(tx: Prisma.TransactionClient, organizationId: string, practitionerId: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${schedulingLockScope(organizationId, practitionerId)}, 0))`;
}
