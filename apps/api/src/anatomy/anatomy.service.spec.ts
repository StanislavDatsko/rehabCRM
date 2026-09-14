import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { AnatomyService } from './anatomy.service';

const principal: AuthenticatedPrincipal = {
  subject: 'sub',
  userId: 'user-1',
  organizationId: 'org-1',
  membershipId: 'membership-1',
  role: 'REHABILITATION_SPECIALIST',
  permissions: [],
  email: 'specialist@example.invalid',
  displayName: 'Specialist',
  organizationName: 'Clinic',
};

const anchor = {
  stableMeshKey: 'Articular capsule of knee joint.l',
  primitiveIndex: 0,
  triangleIndex: 10,
  barycentric: [0.2, 0.3, 0.5] as [number, number, number],
  localPosition: [0.1, 0.2, 0.3] as [number, number, number],
  localNormal: [0, 0, 1] as [number, number, number],
};

const activeMapping = {
  id: 'mapping-1',
  structureId: 'structure-1',
  modelVersionId: 'version-1',
  stableMeshKey: anchor.stableMeshKey,
  primitiveIndex: 0,
  confidence: 'HIGH_CONFIDENCE',
  modelVersion: { status: 'ACTIVE' },
};

function annotationRow(overrides: Record<string, unknown> = {}) {
  const date = new Date('2026-09-03T09:00:00.000Z');
  return {
    id: 'annotation-1',
    organizationId: 'org-1',
    patientId: 'patient-1',
    encounterId: null,
    structureId: 'structure-1',
    modelVersionId: 'version-1',
    mappingId: 'mapping-1',
    type: 'PAIN',
    severity: 7,
    title: 'Knee pain',
    note: 'Private note',
    status: 'ACTIVE',
    stableMeshKey: anchor.stableMeshKey,
    primitiveIndex: 0,
    triangleIndex: 10,
    barycentricU: 0.2,
    barycentricV: 0.3,
    barycentricW: 0.5,
    localPositionX: 0.1,
    localPositionY: 0.2,
    localPositionZ: 0.3,
    localNormalX: 0,
    localNormalY: 0,
    localNormalZ: 1,
    version: 1,
    createdByPractitionerId: 'practitioner-1',
    createdByUserId: 'user-1',
    updatedByUserId: 'user-1',
    resolvedAt: null,
    voidedAt: null,
    voidReason: null,
    createdAt: date,
    updatedAt: date,
    structure: {
      id: 'structure-1',
      code: 'knee_joint.left',
      canonicalName: 'Knee joint',
      displayNameUk: 'Ліве коліно',
      displayNameEn: 'Left knee',
      category: 'JOINT',
      laterality: 'LEFT',
      regionCode: 'knee',
      parentId: null,
      active: true,
      createdAt: date,
      updatedAt: date,
    },
    createdBy: { id: 'user-1', displayName: 'Specialist' },
    history: [],
    ...overrides,
  };
}

function commandPrisma() {
  const prisma = {
    patient: { findFirst: vi.fn().mockResolvedValue({ id: 'patient-1' }) },
    practitioner: { findFirst: vi.fn().mockResolvedValue({ id: 'practitioner-1' }) },
    encounter: { findFirst: vi.fn() },
    anatomicalModelStructureMapping: { findUnique: vi.fn() },
    bodyAnnotation: { create: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() },
    bodyAnnotationStatusHistory: { create: vi.fn() },
    auditEvent: { create: vi.fn() },
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) => fn(prisma));
  return prisma;
}

describe('AnatomyService organization isolation', () => {
  it('conceals a cross-organization patient annotation list', async () => {
    const prisma = {
      patient: { findFirst: vi.fn().mockResolvedValue(null) },
      bodyAnnotation: { findMany: vi.fn() },
    };
    const service = new AnatomyService(prisma as never, {} as never);
    await expect(service.listAnnotations(principal, 'foreign-patient', {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.patient.findFirst).toHaveBeenCalledWith({
      where: { id: 'foreign-patient', organizationId: 'org-1' },
      select: { id: true },
    });
    expect(prisma.bodyAnnotation.findMany).not.toHaveBeenCalled();
  });

  it('always scopes the annotation query to the authenticated organization', async () => {
    const prisma = {
      patient: { findFirst: vi.fn().mockResolvedValue({ id: 'patient-1' }) },
      bodyAnnotation: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const service = new AnatomyService(prisma as never, {} as never);
    await expect(service.listAnnotations(principal, 'patient-1', {})).resolves.toEqual([]);
    expect(prisma.bodyAnnotation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'org-1', patientId: 'patient-1' }),
      }),
    );
  });
});

describe('AnatomyService annotation commands', () => {
  it('requires practitioner identity derived from the authenticated user', async () => {
    const prisma = commandPrisma();
    prisma.practitioner.findFirst.mockResolvedValue(null);
    const service = new AnatomyService(prisma as never, {} as never);
    await expect(
      service.create(
        principal,
        'patient-1',
        {
          structureId: 'structure-1',
          modelVersionId: 'version-1',
          mappingId: 'mapping-1',
          type: 'PAIN',
          title: null,
          anchor,
        },
        'req',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('conceals a cross-org encounter and rejects a same-org patient mismatch', async () => {
    const prisma = commandPrisma();
    const service = new AnatomyService(prisma as never, {} as never);
    prisma.encounter.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'encounter-2', patientId: 'patient-2' });
    const body = {
      encounterId: '00000000-0000-4000-8000-000000000001',
      structureId: 'structure-1',
      modelVersionId: 'version-1',
      mappingId: 'mapping-1',
      type: 'PAIN' as const,
      title: null,
      anchor,
    };
    await expect(service.create(principal, 'patient-1', body, 'req')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.create(principal, 'patient-1', body, 'req')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('creates through a reviewed active mapping and keeps note out of audit', async () => {
    const prisma = commandPrisma();
    prisma.encounter.findFirst.mockResolvedValue({ id: 'encounter-1', patientId: 'patient-1' });
    prisma.anatomicalModelStructureMapping.findUnique.mockResolvedValue(activeMapping);
    prisma.bodyAnnotation.create.mockResolvedValue({ id: 'annotation-1' });
    prisma.bodyAnnotation.findFirst.mockResolvedValue(annotationRow());
    const service = new AnatomyService(prisma as never, {} as never);
    await expect(
      service.create(
        principal,
        'patient-1',
        {
          encounterId: '00000000-0000-4000-8000-000000000001',
          structureId: 'structure-1',
          modelVersionId: 'version-1',
          mappingId: 'mapping-1',
          type: 'PAIN',
          severity: 7,
          title: 'Knee pain',
          note: 'Private note',
          anchor,
        },
        'req',
      ),
    ).resolves.toMatchObject({ id: 'annotation-1', status: 'ACTIVE' });
    expect(prisma.bodyAnnotation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          createdByPractitionerId: 'practitioner-1',
          createdByUserId: 'user-1',
        }),
      }),
    );
    const auditCall = prisma.auditEvent.create.mock.calls[0]?.[0];
    expect(auditCall.data.metadata).not.toHaveProperty('note');
  });

  it('rejects a structure mismatch and a retired model version', async () => {
    const prisma = commandPrisma();
    const service = new AnatomyService(prisma as never, {} as never);
    const body = {
      structureId: 'structure-1',
      modelVersionId: 'version-1',
      mappingId: 'mapping-1',
      type: 'PAIN' as const,
      title: null,
      anchor,
    };
    prisma.anatomicalModelStructureMapping.findUnique.mockResolvedValueOnce({
      ...activeMapping,
      structureId: 'another-structure',
    });
    await expect(service.create(principal, 'patient-1', body, 'req')).rejects.toMatchObject({
      response: { code: 'BODY_ANNOTATION_INVALID_ANCHOR' },
    });
    prisma.anatomicalModelStructureMapping.findUnique.mockResolvedValueOnce({
      ...activeMapping,
      modelVersion: { status: 'RETIRED' },
    });
    await expect(service.create(principal, 'patient-1', body, 'req')).rejects.toMatchObject({
      response: { code: 'BODY_ANNOTATION_INVALID_ANCHOR' },
    });
  });

  it('rejects an unknown mapping and a stale concurrent edit', async () => {
    const prisma = commandPrisma();
    prisma.anatomicalModelStructureMapping.findUnique.mockResolvedValue(null);
    const service = new AnatomyService(prisma as never, {} as never);
    await expect(
      service.create(
        principal,
        'patient-1',
        {
          structureId: 'structure-1',
          modelVersionId: 'version-1',
          mappingId: 'mapping-1',
          type: 'PAIN',
          title: null,
          anchor,
        },
        'req',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    prisma.bodyAnnotation.findFirst.mockResolvedValue(annotationRow());
    prisma.bodyAnnotation.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.update(
        principal,
        'annotation-1',
        { version: 1, type: 'PAIN', severity: 5, title: null, note: null },
        'req',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('keeps a resolved historical annotation readable without active-version checks', async () => {
    const prisma = commandPrisma();
    prisma.bodyAnnotation.findFirst.mockResolvedValue(
      annotationRow({
        status: 'RESOLVED',
        resolvedAt: new Date('2026-09-04T09:00:00.000Z'),
      }),
    );
    const service = new AnatomyService(prisma as never, {} as never);
    await expect(service.getAnnotation(principal, 'annotation-1')).resolves.toMatchObject({
      status: 'RESOLVED',
      modelVersionId: 'version-1',
    });
    expect(prisma.anatomicalModelStructureMapping.findUnique).not.toHaveBeenCalled();
  });

  it('accepts the first optimistic edit and rejects a second edit at the same version', async () => {
    const prisma = commandPrisma();
    prisma.bodyAnnotation.findFirst
      .mockResolvedValueOnce(annotationRow({ version: 1 }))
      .mockResolvedValueOnce(annotationRow({ version: 2 }))
      .mockResolvedValueOnce(annotationRow({ version: 2 }));
    prisma.bodyAnnotation.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const service = new AnatomyService(prisma as never, {} as never);
    const body = { version: 1, type: 'PAIN' as const, severity: 5, title: null, note: null };

    await expect(service.update(principal, 'annotation-1', body, 'req-1')).resolves.toMatchObject({
      version: 2,
    });
    await expect(service.update(principal, 'annotation-1', body, 'req-2')).rejects.toMatchObject({
      response: { code: 'BODY_ANNOTATION_UPDATE_CONFLICT' },
    });
  });

  it('stores a status reason in history but excludes it from generic audit metadata', async () => {
    const prisma = commandPrisma();
    prisma.bodyAnnotation.findFirst.mockResolvedValueOnce(annotationRow()).mockResolvedValueOnce(
      annotationRow({
        status: 'RESOLVED',
        version: 2,
        resolvedAt: new Date('2026-09-04T09:00:00.000Z'),
      }),
    );
    prisma.bodyAnnotation.updateMany.mockResolvedValue({ count: 1 });
    const service = new AnatomyService(prisma as never, {} as never);

    await expect(
      service.resolve(
        principal,
        'annotation-1',
        { version: 1, reason: 'Symptoms improved' },
        'req',
      ),
    ).resolves.toMatchObject({ status: 'RESOLVED', version: 2 });
    expect(prisma.bodyAnnotationStatusHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ reason: 'Symptoms improved' }) }),
    );
    expect(prisma.auditEvent.create.mock.calls[0]?.[0].data.metadata).not.toHaveProperty('reason');
  });
});
