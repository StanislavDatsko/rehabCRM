import type { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

export async function writeAuditEvent(
  tx: Tx,
  input: {
    organizationId: string;
    actorUserId: string;
    action: string;
    entityType: string;
    entityId: string;
    requestId: string;
    metadata: Prisma.InputJsonValue;
  },
): Promise<void> {
  await tx.auditEvent.create({
    data: {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      requestId: input.requestId.slice(0, 100),
      metadata: input.metadata,
    },
  });
}

export function isPractitionerOverlapError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const maybe = error as { code?: string; message?: string };
  if (maybe.code === '23P01') {
    return true;
  }
  const message = maybe.message ?? '';
  return message.includes('appointments_no_practitioner_overlap') || message.includes('conflicting key');
}

export function isPostgresDeadlockError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const maybe = error as { code?: string; message?: string };
  return maybe.code === '40P01' || (maybe.message ?? '').includes('deadlock detected');
}
