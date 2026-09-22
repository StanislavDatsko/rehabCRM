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

  it('accepts a Human Atlas source part only through its verified mapping and anchor', async () => {
    const prisma = commandPrisma();
    const atlasAnchor = { ...anchor, stableMeshKey: 'FJ3259', triangleIndex: 12 };
    prisma.anatomicalModelStructureMapping.findUnique.mockResolvedValue({
      ...activeMapping,
      modelVersionId: 'a7100000-0000-4000-8000-000000000010',
      structureId: 'structure-1',
      stableMeshKey: 'FJ3259',
      sourcePartId: 'FJ3259',
    });
    prisma.bodyAnnotation.create.mockResolvedValue({ id: 'annotation-1' });
    prisma.bodyAnnotation.findFirst.mockResolvedValue(annotationRow({ modelVersionId: 'a7100000-0000-4000-8000-000000000010', stableMeshKey: 'FJ3259', triangleIndex: 12 }));
    const service = new AnatomyService(prisma as never, {} as never);
    await expect(service.create(principal, 'patient-1', { structureId: 'structure-1', modelVersionId: 'a7100000-0000-4000-8000-000000000010', mappingId: 'mapping-1', type: 'PAIN', severity: 5, title: 'Atlas finding', note: null, anchor: atlasAnchor }, 'req')).resolves.toMatchObject({ id: 'annotation-1' });
    expect(prisma.bodyAnnotation.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ stableMeshKey: 'FJ3259', triangleIndex: 12 }) }));
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

describe('AnatomyService point notes', () => {
  const pointNote = {
    structureId: 'structure-1',
    modelVersionId: 'version-1',
    mappingId: 'mapping-1',
    type: 'OTHER' as const,
    severity: null,
    colorHex: null,
    title: null,
    note: 'Біль при максимальному згинанні плеча',
    anchor,
  };

  it('creates a point note on the isolated surface and keeps the comment out of audit', async () => {
    const prisma = commandPrisma();
    prisma.anatomicalModelStructureMapping.findUnique.mockResolvedValue(activeMapping);
    prisma.bodyAnnotation.create.mockResolvedValue({ id: 'annotation-9' });
    prisma.bodyAnnotation.findFirst.mockResolvedValue(
      annotationRow({ id: 'annotation-9', type: 'OTHER', severity: null, title: null, note: pointNote.note }),
    );
    const service = new AnatomyService(prisma as never, {} as never);
    await expect(service.create(principal, 'patient-1', pointNote, 'req')).resolves.toMatchObject({
      id: 'annotation-9',
      type: 'OTHER',
      note: pointNote.note,
      anchor: { stableMeshKey: anchor.stableMeshKey, localPosition: anchor.localPosition },
    });
    expect(prisma.bodyAnnotation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: 'org-1',
          patientId: 'patient-1',
          structureId: 'structure-1',
          note: pointNote.note,
          localPositionX: 0.1,
          localPositionY: 0.2,
          localPositionZ: 0.3,
          localNormalZ: 1,
        }),
      }),
    );
    const audit = prisma.auditEvent.create.mock.calls[0]?.[0].data;
    expect(audit).toMatchObject({ action: 'BODY_ANNOTATION_CREATED', entityType: 'BodyAnnotation' });
    expect(audit.metadata).not.toHaveProperty('note');
    expect(audit.metadata).not.toHaveProperty('title');
  });

  it('refuses to create a point note for a patient of another organization', async () => {
    const prisma = commandPrisma();
    prisma.patient.findFirst.mockResolvedValue(null);
    const service = new AnatomyService(prisma as never, {} as never);
    await expect(
      service.create(principal, 'foreign-patient', pointNote, 'req'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.patient.findFirst).toHaveBeenCalledWith({
      where: { id: 'foreign-patient', organizationId: 'org-1' },
      select: { id: true },
    });
    expect(prisma.bodyAnnotation.create).not.toHaveBeenCalled();
    expect(prisma.auditEvent.create).not.toHaveBeenCalled();
  });

  it('never trusts an organization supplied by the client', async () => {
    const prisma = commandPrisma();
    prisma.anatomicalModelStructureMapping.findUnique.mockResolvedValue(activeMapping);
    prisma.bodyAnnotation.create.mockResolvedValue({ id: 'annotation-9' });
    prisma.bodyAnnotation.findFirst.mockResolvedValue(annotationRow({ id: 'annotation-9' }));
    const service = new AnatomyService(prisma as never, {} as never);
    await service.create(
      { ...principal, organizationId: 'org-1' },
      'patient-1',
      { ...pointNote, organizationId: 'org-2' } as never,
      'req',
    );
    expect(prisma.bodyAnnotation.create.mock.calls[0]?.[0].data.organizationId).toBe('org-1');
  });

  it('conceals another organization patient annotation on read and void', async () => {
    const prisma = commandPrisma();
    prisma.bodyAnnotation.findFirst.mockResolvedValue(null);
    const service = new AnatomyService(prisma as never, {} as never);
    await expect(service.getAnnotation(principal, 'annotation-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      service.void(principal, 'annotation-1', { version: 1, reason: 'Видалено з body map' }, 'req'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.bodyAnnotation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'annotation-1', organizationId: 'org-1' } }),
    );
    expect(prisma.bodyAnnotation.updateMany).not.toHaveBeenCalled();
  });

  it('voids a point note through the shared lifecycle and audits the transition only', async () => {
    const prisma = commandPrisma();
    prisma.bodyAnnotation.findFirst
      .mockResolvedValueOnce(annotationRow({ type: 'OTHER', note: 'Коментар' }))
      .mockResolvedValueOnce(
        annotationRow({
          type: 'OTHER',
          note: 'Коментар',
          status: 'VOIDED',
          version: 2,
          voidedAt: new Date('2026-09-22T09:00:00.000Z'),
          voidReason: 'Видалено з body map',
        }),
      );
    prisma.bodyAnnotation.updateMany.mockResolvedValue({ count: 1 });
    const service = new AnatomyService(prisma as never, {} as never);
    await expect(
      service.void(principal, 'annotation-1', { version: 1, reason: 'Видалено з body map' }, 'req'),
    ).resolves.toMatchObject({ status: 'VOIDED', version: 2 });
    expect(prisma.bodyAnnotation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'annotation-1', organizationId: 'org-1', version: 1, status: 'ACTIVE' },
      }),
    );
    const audit = prisma.auditEvent.create.mock.calls[0]?.[0].data;
    expect(audit).toMatchObject({
      action: 'BODY_ANNOTATION_VOIDED',
      entityId: 'annotation-1',
      metadata: { patientId: 'patient-1', fromStatus: 'ACTIVE', toStatus: 'VOIDED' },
    });
    expect(audit.metadata).not.toHaveProperty('note');
  });

  it('lists only the isolated structure when the client filters by structure', async () => {
    const prisma = {
      patient: { findFirst: vi.fn().mockResolvedValue({ id: 'patient-1' }) },
      bodyAnnotation: { findMany: vi.fn().mockResolvedValue([annotationRow()]) },
    };
    const service = new AnatomyService(prisma as never, {} as never);
    await expect(
      service.listAnnotations(principal, 'patient-1', {
        anatomicalStructureId: 'structure-1',
        status: 'ACTIVE',
      }),
    ).resolves.toHaveLength(1);
    expect(prisma.bodyAnnotation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org-1',
          patientId: 'patient-1',
          structureId: 'structure-1',
          status: 'ACTIVE',
        }),
      }),
    );
  });
});
