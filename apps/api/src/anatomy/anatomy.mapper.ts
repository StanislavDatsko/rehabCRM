import type { BodyAnnotationResponse } from '@repo/contracts';
import type { Prisma } from '@prisma/client';

export const annotationInclude = {
  structure: true,
  createdBy: { select: { id: true, displayName: true } },
  history: {
    include: { changedBy: { select: { id: true, displayName: true } } },
    orderBy: { changedAt: 'asc' as const },
  },
} satisfies Prisma.BodyAnnotationInclude;

type AnnotationRow = Prisma.BodyAnnotationGetPayload<{ include: typeof annotationInclude }>;

export function mapAnnotation(row: AnnotationRow): BodyAnnotationResponse {
  return {
    id: row.id,
    patientId: row.patientId,
    encounterId: row.encounterId,
    structure: {
      id: row.structure.id,
      code: row.structure.code,
      canonicalName: row.structure.canonicalName,
      name:
        row.structure.displayNameUk ?? row.structure.displayNameEn ?? row.structure.canonicalName,
      displayNameUk: row.structure.displayNameUk,
      displayNameEn: row.structure.displayNameEn,
      category: row.structure.category,
      laterality: row.structure.laterality,
      regionCode: row.structure.regionCode,
      parentId: row.structure.parentId,
      active: row.structure.active,
    },
    modelVersionId: row.modelVersionId,
    mappingId: row.mappingId,
    type: row.type,
    severity: row.severity,
    colorHex: row.colorHex,
    title: row.title,
    note: row.note,
    status: row.status,
    anchor: {
      stableMeshKey: row.stableMeshKey,
      primitiveIndex: row.primitiveIndex,
      triangleIndex: row.triangleIndex,
      barycentric: [row.barycentricU, row.barycentricV, row.barycentricW],
      localPosition: [row.localPositionX, row.localPositionY, row.localPositionZ],
      localNormal:
        row.localNormalX === null ? null : [row.localNormalX, row.localNormalY!, row.localNormalZ!],
    },
    version: row.version,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    voidedAt: row.voidedAt?.toISOString() ?? null,
    voidReason: row.voidReason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdBy: {
      id: row.createdBy.id,
      practitionerId: row.createdByPractitionerId,
      displayName: row.createdBy.displayName,
    },
    history: row.history.map((item) => ({
      id: item.id,
      fromStatus: item.fromStatus,
      toStatus: item.toStatus,
      reason: item.reason,
      changedAt: item.changedAt.toISOString(),
      changedBy: { id: item.changedBy.id, displayName: item.changedBy.displayName },
    })),
  };
}
