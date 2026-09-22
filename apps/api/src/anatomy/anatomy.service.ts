import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AnatomicalMappingResponse,
  AnatomicalModelResponse,
  AnatomicalStructureResponse,
  BodyAnnotationResponse,
  BodyAnnotationStatus,
  PatientBodyMapResponse,
} from '@repo/contracts';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { writeAuditEvent } from '../common/audit/write-audit';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { StorageService } from '../infrastructure/storage/storage.service';
import { annotationInclude, mapAnnotation } from './anatomy.mapper';
import type {
  AnnotationListQuery,
  AnnotationStatusBody,
  CreateAnnotationBody,
  UpdateAnnotationBody,
  VoidAnnotationBody,
  StructureListQuery,
} from './anatomy.schemas';
import { canTransitionAnnotation } from './annotation-policy';

const structureSelect = {
  id: true,
  code: true,
  canonicalName: true,
  displayNameUk: true,
  displayNameEn: true,
  category: true,
  laterality: true,
  regionCode: true,
  parentId: true,
  active: true,
} as const;
const BODY_MAP_ANNOTATION_LIMIT = 200;

@Injectable()
export class AnatomyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async listStructures(query: StructureListQuery = {}): Promise<AnatomicalStructureResponse[]> {
    const rows = await this.prisma.anatomicalStructure.findMany({
      where: {
        active: true,
        category: query.category,
        regionCode: query.region,
        laterality: query.laterality,
        OR: query.search
          ? [
              { code: { contains: query.search, mode: 'insensitive' } },
              { canonicalName: { contains: query.search, mode: 'insensitive' } },
              { displayNameUk: { contains: query.search, mode: 'insensitive' } },
              { displayNameEn: { contains: query.search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      select: structureSelect,
      orderBy: [{ category: 'asc' }, { canonicalName: 'asc' }, { code: 'asc' }],
    });
    return rows.map((row) => this.mapStructure(row));
  }

  async getStructure(id: string): Promise<AnatomicalStructureResponse> {
    const row = await this.prisma.anatomicalStructure.findFirst({
      where: { id, active: true },
      select: structureSelect,
    });
    if (!row)
      throw new NotFoundException({
        code: 'ANATOMICAL_STRUCTURE_NOT_FOUND',
        message: 'Anatomical structure was not found.',
      });
    return this.mapStructure(row);
  }

  async listModels(): Promise<AnatomicalModelResponse[]> {
    const rows = await this.prisma.anatomicalModel.findMany({
      where: { active: true },
      include: { versions: { where: { status: 'ACTIVE' }, take: 1 } },
      orderBy: { code: 'asc' },
    });
    return Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        kind: row.kind,
        activeVersion: row.versions[0] ? await this.mapVersion(row.versions[0]) : null,
      })),
    );
  }

  async getModel(id: string): Promise<AnatomicalModelResponse> {
    const models = await this.prisma.anatomicalModel.findMany({
      where: { id, active: true },
      include: { versions: { where: { status: 'ACTIVE' }, take: 1 } },
    });
    const row = models[0];
    if (!row)
      throw new NotFoundException({
        code: 'ANATOMICAL_MODEL_NOT_FOUND',
        message: 'Anatomical model was not found.',
      });
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      kind: row.kind,
      activeVersion: row.versions[0] ? await this.mapVersion(row.versions[0]) : null,
    };
  }

  async getActiveVersion(modelId: string) {
    const row = await this.prisma.anatomicalModelVersion.findFirst({
      where: { modelId, status: 'ACTIVE', model: { active: true } },
    });
    if (!row)
      throw new NotFoundException({
        code: 'ANATOMICAL_MODEL_VERSION_NOT_FOUND',
        message: 'Active anatomical model version was not found.',
      });
    return this.mapVersion(row);
  }

  async listMappings(modelVersionId: string): Promise<AnatomicalMappingResponse[]> {
    const exists = await this.prisma.anatomicalModelVersion.findUnique({
      where: { id: modelVersionId },
      select: { id: true },
    });
    if (!exists)
      throw new NotFoundException({
        code: 'ANATOMICAL_MODEL_VERSION_NOT_FOUND',
        message: 'Anatomical model version was not found.',
      });
    return this.prisma.anatomicalModelStructureMapping.findMany({
      where: { modelVersionId, confidence: { in: ['EXACT', 'HIGH_CONFIDENCE'] } },
      select: {
        id: true,
        modelVersionId: true,
        structureId: true,
        nodeName: true,
        meshName: true,
        primitiveIndex: true,
        stableMeshKey: true,
        sourcePartId: true,
        confidence: true,
      },
      orderBy: [{ nodeName: 'asc' }, { primitiveIndex: 'asc' }],
    });
  }

  async listVersionAssets(modelVersionId: string) {
    const assets = await this.prisma.anatomicalModelAsset.findMany({
      where: { modelVersionId },
      orderBy: [{ kind: 'asc' }, { assetIndex: 'asc' }],
      select: { kind: true, assetIndex: true, storageKey: true, checksumSha256: true, bytes: true, contentEncoding: true, contentType: true },
    });
    if (!assets.length) throw new NotFoundException({ code: 'ANATOMICAL_MODEL_ASSETS_NOT_FOUND', message: 'Anatomical model assets were not found.' });
    return Promise.all(assets.map(async (asset) => ({ ...asset, url: (await this.storage.signModelRead(asset.storageKey)).url })));
  }

  async listAnnotations(
    principal: AuthenticatedPrincipal,
    patientId: string,
    query: AnnotationListQuery,
  ): Promise<BodyAnnotationResponse[]> {
    await this.requirePatient(principal.organizationId, patientId);
    const rows = await this.prisma.bodyAnnotation.findMany({
      where: {
        organizationId: principal.organizationId,
        patientId,
        status: query.status,
        type: query.annotationType,
        structureId: query.anatomicalStructureId,
        encounterId: query.encounterId,
        createdAt:
          query.from || query.to
            ? {
                gte: query.from ? new Date(query.from) : undefined,
                lte: query.to ? new Date(query.to) : undefined,
              }
            : undefined,
      },
      include: annotationInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return rows.map(mapAnnotation);
  }

  async listEncounterAnnotations(
    principal: AuthenticatedPrincipal,
    encounterId: string,
  ): Promise<BodyAnnotationResponse[]> {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, organizationId: principal.organizationId },
      select: { patientId: true },
    });
    if (!encounter)
      throw new NotFoundException({
        code: 'ENCOUNTER_NOT_FOUND',
        message: 'Encounter was not found.',
      });
    return this.listAnnotations(principal, encounter.patientId, { encounterId });
  }

  async create(
    principal: AuthenticatedPrincipal,
    patientId: string,
    body: CreateAnnotationBody,
    requestId: string,
  ): Promise<BodyAnnotationResponse> {
    await this.requirePatient(principal.organizationId, patientId);
    const practitioner = await this.requireCurrentPractitioner(principal);
    if (body.encounterId) {
      const encounter = await this.prisma.encounter.findFirst({
        where: { id: body.encounterId, organizationId: principal.organizationId },
        select: { id: true, patientId: true },
      });
      if (!encounter)
        throw new NotFoundException({
          code: 'ENCOUNTER_NOT_FOUND',
          message: 'Encounter was not found.',
        });
      if (encounter.patientId !== patientId)
        throw new BadRequestException({
          code: 'BODY_ANNOTATION_PATIENT_ENCOUNTER_MISMATCH',
          message: 'Annotation encounter does not belong to this patient.',
        });
    }
    const mapping = await this.prisma.anatomicalModelStructureMapping.findUnique({
      where: { id: body.mappingId },
      include: { modelVersion: true },
    });
    if (!mapping)
      throw new NotFoundException({
        code: 'ANATOMICAL_STRUCTURE_NOT_MAPPED',
        message: 'The selected model surface has no reviewed anatomical mapping.',
      });
    if (
      mapping.structureId !== body.structureId ||
      mapping.modelVersionId !== body.modelVersionId ||
      mapping.stableMeshKey !== body.anchor.stableMeshKey ||
      mapping.primitiveIndex !== body.anchor.primitiveIndex ||
      mapping.confidence === 'MANUAL_REQUIRED' ||
      mapping.modelVersion.status !== 'ACTIVE'
    ) {
      throw new BadRequestException({
        code: 'BODY_ANNOTATION_INVALID_ANCHOR',
        message: 'Surface anchor does not match an active reviewed anatomical mapping.',
      });
    }
    const id = await this.prisma.$transaction(async (tx) => {
      const row = await tx.bodyAnnotation.create({
        data: {
          organizationId: principal.organizationId,
          patientId,
          encounterId: body.encounterId ?? null,
          structureId: body.structureId,
          modelVersionId: body.modelVersionId,
          mappingId: body.mappingId,
          type: body.type,
          severity: body.severity ?? null,
          colorHex: body.colorHex ?? null,
          title: body.title,
          note: body.note ?? null,
          stableMeshKey: body.anchor.stableMeshKey,
          primitiveIndex: body.anchor.primitiveIndex,
          triangleIndex: body.anchor.triangleIndex,
          barycentricU: body.anchor.barycentric[0],
          barycentricV: body.anchor.barycentric[1],
          barycentricW: body.anchor.barycentric[2],
          localPositionX: body.anchor.localPosition[0],
          localPositionY: body.anchor.localPosition[1],
          localPositionZ: body.anchor.localPosition[2],
          localNormalX: body.anchor.localNormal?.[0] ?? null,
          localNormalY: body.anchor.localNormal?.[1] ?? null,
          localNormalZ: body.anchor.localNormal?.[2] ?? null,
          createdByPractitionerId: practitioner.id,
          createdByUserId: principal.userId,
          updatedByUserId: principal.userId,
        },
        select: { id: true },
      });
      await tx.bodyAnnotationStatusHistory.create({
        data: {
          organizationId: principal.organizationId,
          annotationId: row.id,
          fromStatus: null,
          toStatus: 'ACTIVE',
          changedByUserId: principal.userId,
        },
      });
      await writeAuditEvent(tx, {
        organizationId: principal.organizationId,
        actorUserId: principal.userId,
        action: 'BODY_ANNOTATION_CREATED',
        entityType: 'BodyAnnotation',
        entityId: row.id,
        requestId,
        metadata: {
          patientId,
          encounterId: body.encounterId ?? null,
          structureId: body.structureId,
          type: body.type,
          severity: body.severity ?? null,
          modelVersionId: body.modelVersionId,
        },
      });
      return row.id;
    });
    return this.requireAnnotation(principal.organizationId, id);
  }

  async update(
    principal: AuthenticatedPrincipal,
    id: string,
    body: UpdateAnnotationBody,
    requestId: string,
  ): Promise<BodyAnnotationResponse> {
    const current = await this.requireAnnotation(principal.organizationId, id);
    if (current.status !== 'ACTIVE')
      throw new ConflictException({
        code: 'BODY_ANNOTATION_INVALID_TRANSITION',
        message: 'Only active annotations can be edited.',
      });
    const result = await this.prisma.$transaction(async (tx) => {
      const update = await tx.bodyAnnotation.updateMany({
        where: {
          id,
          organizationId: principal.organizationId,
          version: body.version,
          status: 'ACTIVE',
        },
        data: {
          type: body.type,
          severity: body.severity,
          title: body.title,
          note: body.note,
          updatedByUserId: principal.userId,
          version: { increment: 1 },
        },
      });
      if (update.count !== 1)
        throw new ConflictException({
          code: 'BODY_ANNOTATION_UPDATE_CONFLICT',
          message: 'Annotation changed since it was loaded.',
        });
      await writeAuditEvent(tx, {
        organizationId: principal.organizationId,
        actorUserId: principal.userId,
        action: 'BODY_ANNOTATION_UPDATED',
        entityType: 'BodyAnnotation',
        entityId: id,
        requestId,
        metadata: {
          patientId: current.patientId,
          changedFields: ['type', 'severity', 'title', 'note'],
        },
      });
    });
    void result;
    return this.requireAnnotation(principal.organizationId, id);
  }

  getAnnotation(principal: AuthenticatedPrincipal, id: string): Promise<BodyAnnotationResponse> {
    return this.requireAnnotation(principal.organizationId, id);
  }

  resolve(
    principal: AuthenticatedPrincipal,
    id: string,
    body: AnnotationStatusBody,
    requestId: string,
  ) {
    return this.changeStatus(
      principal,
      id,
      'RESOLVED',
      body.version,
      body.reason ?? null,
      requestId,
    );
  }

  void(principal: AuthenticatedPrincipal, id: string, body: VoidAnnotationBody, requestId: string) {
    return this.changeStatus(principal, id, 'VOIDED', body.version, body.reason, requestId);
  }

  async getBodyMap(
    principal: AuthenticatedPrincipal,
    patientId: string,
  ): Promise<PatientBodyMapResponse> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, organizationId: principal.organizationId },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!patient)
      throw new NotFoundException({ code: 'PATIENT_NOT_FOUND', message: 'Patient was not found.' });
    const [structures, models, annotationRows, annotationFacts, measurements, plans] =
      await Promise.all([
        this.listStructures(),
        this.listModels(),
        this.prisma.bodyAnnotation.findMany({
          where: { organizationId: principal.organizationId, patientId },
          include: annotationInclude,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: BODY_MAP_ANNOTATION_LIMIT + 1,
        }),
        this.prisma.bodyAnnotation.findMany({
          where: { organizationId: principal.organizationId, patientId },
          select: { structureId: true, status: true, severity: true, updatedAt: true },
        }),
        this.prisma.measurement.findMany({
          where: {
            organizationId: principal.organizationId,
            patientId,
            assessment: { status: 'COMPLETED' },
          },
          select: {
            id: true,
            definitionName: true,
            numericValue: true,
            textValue: true,
            booleanValue: true,
            codedValue: true,
            unitCodeSnapshot: true,
            anatomicalRegionCode: true,
            laterality: true,
            performedAt: true,
          },
          orderBy: { performedAt: 'desc' },
          take: 50,
        }),
        this.prisma.rehabilitationPlan.findMany({
          where: {
            organizationId: principal.organizationId,
            patientId,
            currentRevisionId: { not: null },
            status: { in: ['ACTIVE', 'PAUSED'] },
          },
          select: {
            id: true,
            currentRevision: {
              select: {
                goals: {
                  select: {
                    id: true,
                    title: true,
                    status: true,
                    anatomicalRegionCode: true,
                    laterality: true,
                  },
                },
                prescriptions: {
                  select: {
                    id: true,
                    exerciseNameSnapshot: true,
                    anatomicalRegionCode: true,
                    laterality: true,
                    sets: true,
                    repetitions: true,
                    durationSeconds: true,
                  },
                },
              },
            },
          },
        }),
      ]);
    const annotations = annotationRows.slice(0, BODY_MAP_ANNOTATION_LIMIT).map(mapAnnotation);
    const versionIds = models.flatMap((model) =>
      model.activeVersion ? [model.activeVersion.id] : [],
    );
    const mappings = (await Promise.all(versionIds.map((id) => this.listMappings(id)))).flat();
    const clinicalContext = structures
      .filter((structure) => structure.regionCode)
      .map((structure) => ({
        structureId: structure.id,
        measurements: measurements
          .filter((item) => this.matches(structure, item.anatomicalRegionCode, item.laterality))
          .slice(0, 5)
          .map((item) => ({
            id: item.id,
            name: item.definitionName,
            value: this.measurementValue(item),
            performedAt: item.performedAt.toISOString(),
          })),
        goals: plans.flatMap(
          (plan) =>
            plan.currentRevision?.goals
              .filter((item) => this.matches(structure, item.anatomicalRegionCode, item.laterality))
              .map((item) => ({
                id: item.id,
                title: item.title,
                status: item.status,
                planId: plan.id,
              })) ?? [],
        ),
        exercises: plans.flatMap(
          (plan) =>
            plan.currentRevision?.prescriptions
              .filter((item) => this.matches(structure, item.anatomicalRegionCode, item.laterality))
              .map((item) => ({
                id: item.id,
                name: item.exerciseNameSnapshot,
                dosage: this.dosage(item),
                planId: plan.id,
              })) ?? [],
        ),
      }))
      .filter((item) => item.measurements.length || item.goals.length || item.exercises.length);
    const annotationSummaryByStructure = structures
      .map((structure) => {
        const relevant = annotationFacts.filter((item) => item.structureId === structure.id);
        const active = relevant.filter((item) => item.status === 'ACTIVE');
        return relevant.length
          ? {
              structureId: structure.id,
              activeCount: active.length,
              maximumSeverity: active.reduce<number | null>(
                (maximum, item) =>
                  item.severity === null
                    ? maximum
                    : maximum === null
                      ? item.severity
                      : Math.max(maximum, item.severity),
                null,
              ),
              lastAnnotatedAt: relevant
                .reduce((latest, item) => (item.updatedAt > latest.updatedAt ? item : latest))
                .updatedAt.toISOString(),
            }
          : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
    const latestRegions = [
      ...new Set(
        annotationFacts
          .filter((item) => item.status === 'ACTIVE')
          .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
          .map(
            (item) =>
              structures.find((structure) => structure.id === item.structureId)?.name ??
              item.structureId,
          ),
      ),
    ].slice(0, 3);
    return {
      patient: { id: patient.id, fullName: `${patient.lastName} ${patient.firstName}` },
      structures,
      models,
      mappings,
      annotations,
      annotationWindow: {
        limit: BODY_MAP_ANNOTATION_LIMIT,
        returned: annotations.length,
        total: annotationFacts.length,
        truncated: annotationRows.length > BODY_MAP_ANNOTATION_LIMIT,
      },
      clinicalContext,
      annotationSummaryByStructure,
      summary: {
        active: annotationFacts.filter((item) => item.status === 'ACTIVE').length,
        resolved: annotationFacts.filter((item) => item.status === 'RESOLVED').length,
        voided: annotationFacts.filter((item) => item.status === 'VOIDED').length,
        maximumSeverity: annotationFacts
          .filter((item) => item.status === 'ACTIVE' && item.severity !== null)
          .reduce<number | null>(
            (max, item) => (max === null ? item.severity : Math.max(max, item.severity!)),
            null,
          ),
        latestRegions,
        lastUpdatedAt:
          annotationFacts
            .reduce<Date | null>(
              (latest, item) => (!latest || item.updatedAt > latest ? item.updatedAt : latest),
              null,
            )
            ?.toISOString() ?? null,
      },
    };
  }

  private async changeStatus(
    principal: AuthenticatedPrincipal,
    id: string,
    toStatus: BodyAnnotationStatus,
    version: number,
    reason: string | null,
    requestId: string,
  ): Promise<BodyAnnotationResponse> {
    const current = await this.requireAnnotation(principal.organizationId, id);
    if (!canTransitionAnnotation(current.status, toStatus))
      throw new ConflictException({
        code: 'BODY_ANNOTATION_INVALID_TRANSITION',
        message: `Annotation cannot move from ${current.status} to ${toStatus}.`,
      });
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.bodyAnnotation.updateMany({
        where: { id, organizationId: principal.organizationId, version, status: current.status },
        data: {
          status: toStatus,
          version: { increment: 1 },
          updatedByUserId: principal.userId,
          resolvedAt: toStatus === 'RESOLVED' ? new Date() : undefined,
          voidedAt: toStatus === 'VOIDED' ? new Date() : undefined,
          voidReason: toStatus === 'VOIDED' ? reason : undefined,
        },
      });
      if (result.count !== 1)
        throw new ConflictException({
          code: 'BODY_ANNOTATION_UPDATE_CONFLICT',
          message: 'Annotation changed since it was loaded.',
        });
      await tx.bodyAnnotationStatusHistory.create({
        data: {
          organizationId: principal.organizationId,
          annotationId: id,
          fromStatus: current.status,
          toStatus,
          changedByUserId: principal.userId,
          reason,
        },
      });
      await writeAuditEvent(tx, {
        organizationId: principal.organizationId,
        actorUserId: principal.userId,
        action: `BODY_ANNOTATION_${toStatus}`,
        entityType: 'BodyAnnotation',
        entityId: id,
        requestId,
        metadata: { patientId: current.patientId, fromStatus: current.status, toStatus },
      });
    });
    return this.requireAnnotation(principal.organizationId, id);
  }

  private async mapVersion(row: {
    id: string;
    modelId: string;
    version: number;
    checksumSha256: string;
    bytes: number;
    format: string;
    storageKey: string;
    positionX: number;
    positionY: number;
    positionZ: number;
    rotationX: number;
    rotationY: number;
    rotationZ: number;
    scaleX: number;
    scaleY: number;
    scaleZ: number;
  }) {
    const signed = await this.storage.signModelRead(row.storageKey);
    return {
      id: row.id,
      modelId: row.modelId,
      version: row.version,
      checksumSha256: row.checksumSha256,
      bytes: row.bytes,
      format: row.format === 'ATLAS' ? ('ATLAS' as const) : ('GLB' as const),
      transform: {
        position: [row.positionX, row.positionY, row.positionZ] as [number, number, number],
        rotation: [row.rotationX, row.rotationY, row.rotationZ] as [number, number, number],
        scale: [row.scaleX, row.scaleY, row.scaleZ] as [number, number, number],
      },
      assetUrl: signed.url,
      assetUrlExpiresAt: signed.expiresAt.toISOString(),
    };
  }

  private async requirePatient(organizationId: string, id: string) {
    const row = await this.prisma.patient.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!row)
      throw new NotFoundException({ code: 'PATIENT_NOT_FOUND', message: 'Patient was not found.' });
    return row;
  }

  private async requireCurrentPractitioner(principal: AuthenticatedPrincipal) {
    const row = await this.prisma.practitioner.findFirst({
      where: {
        organizationId: principal.organizationId,
        userId: principal.userId,
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    if (!row)
      throw new ForbiddenException({
        code: 'PRACTITIONER_REQUIRED',
        message: 'An active practitioner profile is required.',
      });
    return row;
  }

  private async requireAnnotation(
    organizationId: string,
    id: string,
  ): Promise<BodyAnnotationResponse> {
    const row = await this.prisma.bodyAnnotation.findFirst({
      where: { id, organizationId },
      include: annotationInclude,
    });
    if (!row)
      throw new NotFoundException({
        code: 'BODY_ANNOTATION_NOT_FOUND',
        message: 'Body annotation was not found.',
      });
    return mapAnnotation(row);
  }

  private matches(
    structure: AnatomicalStructureResponse,
    region: string | null,
    laterality: string | null,
  ): boolean {
    return (
      structure.regionCode === region &&
      (!laterality ||
        laterality === 'BILATERAL' ||
        laterality === 'NOT_APPLICABLE' ||
        structure.laterality === laterality)
    );
  }

  private mapStructure(row: {
    id: string;
    code: string;
    canonicalName: string;
    displayNameUk: string | null;
    displayNameEn: string | null;
    category: AnatomicalStructureResponse['category'];
    laterality: AnatomicalStructureResponse['laterality'];
    regionCode: string | null;
    parentId: string | null;
    active: boolean;
  }): AnatomicalStructureResponse {
    return {
      ...row,
      name: row.displayNameUk ?? row.displayNameEn ?? row.canonicalName,
    };
  }

  private measurementValue(item: {
    numericValue: number | null;
    textValue: string | null;
    booleanValue: boolean | null;
    codedValue: string | null;
    unitCodeSnapshot: string | null;
  }): string {
    const value =
      item.numericValue ??
      item.textValue ??
      item.codedValue ??
      (item.booleanValue === null ? '—' : item.booleanValue ? 'Yes' : 'No');
    return `${String(value)}${item.unitCodeSnapshot ? ` ${item.unitCodeSnapshot}` : ''}`;
  }

  private dosage(item: {
    sets: number | null;
    repetitions: number | null;
    durationSeconds: number | null;
  }): string {
    if (item.sets && item.repetitions) return `${item.sets} × ${item.repetitions}`;
    if (item.durationSeconds) return `${item.durationSeconds} s`;
    return 'See plan';
  }
}
