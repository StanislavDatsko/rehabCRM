import type { PrismaClient } from '@prisma/client';

const MODELS = [
  {
    id: 'a7000000-0000-4000-8000-000000000001',
    versionId: 'a7100000-0000-4000-8000-000000000001',
    code: 'muscles',
    name: 'Muscular system',
    kind: 'MUSCULAR' as const,
    file: 'muscles.glb',
    bytes: 26483756,
    checksum: 'b64dc4fec543516b89d9eb9be76f624aeafce1fbedffd158ddf40f6b7ce4b27d',
  },
  {
    id: 'a7000000-0000-4000-8000-000000000002',
    versionId: 'a7100000-0000-4000-8000-000000000002',
    code: 'skeleton',
    name: 'Skeletal system',
    kind: 'SKELETAL' as const,
    file: 'skeleton.glb',
    bytes: 28347568,
    checksum: 'ea22db275eca4d88910aad7e181d2a397daee5845884ddf5d4b87b16396fd07e',
  },
  {
    id: 'a7000000-0000-4000-8000-000000000003',
    versionId: 'a7100000-0000-4000-8000-000000000003',
    code: 'joints',
    name: 'Joints and ligaments',
    kind: 'JOINTS' as const,
    file: 'joints.glb',
    bytes: 7534416,
    checksum: '2c0ffc399ceeabef79f226fab76ccda2e6619475a5555d84a80e573037ff3c9b',
  },
] as const;

type StructureSeed = {
  code: string;
  canonicalName: string;
  displayNameUk?: string;
  displayNameEn?: string;
  category: 'SYSTEM' | 'REGION' | 'BONE' | 'JOINT' | 'MUSCLE';
  laterality?: 'LEFT' | 'RIGHT' | 'MIDLINE' | 'NOT_APPLICABLE';
  regionCode?: string;
  parentCode?: string;
};

const paired = (
  base: Omit<StructureSeed, 'code' | 'laterality' | 'parentCode'> & {
    codeBase: string;
    parentRegion?: string;
  },
): StructureSeed[] =>
  (['LEFT', 'RIGHT'] as const).map((laterality) => ({
    ...base,
    code: `${base.codeBase}.${laterality.toLowerCase()}`,
    parentCode: base.parentRegion ? `${base.parentRegion}.${laterality.toLowerCase()}` : 'body',
    laterality,
  }));

const regionNames: Record<string, [string, string]> = {
  shoulder: ['Shoulder', 'Плече'],
  elbow: ['Elbow', 'Лікоть'],
  wrist: ['Wrist', 'Запʼясток'],
  hip: ['Hip', 'Кульшова ділянка'],
  knee: ['Knee', 'Коліно'],
  ankle: ['Ankle', 'Гомілковостопна ділянка'],
};

const STRUCTURES: StructureSeed[] = [
  {
    code: 'body',
    canonicalName: 'Body',
    displayNameEn: 'Body',
    displayNameUk: 'Тіло',
    category: 'SYSTEM',
    laterality: 'NOT_APPLICABLE',
  },
  ...['shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle'].flatMap((regionCode) =>
    paired({
      codeBase: regionCode,
      canonicalName: regionNames[regionCode]![0],
      displayNameEn: regionNames[regionCode]![0],
      displayNameUk: regionNames[regionCode]![1],
      category: 'REGION',
      regionCode,
    }),
  ),
  ...['shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle'].flatMap((regionCode) =>
    paired({
      codeBase: `${regionCode}_joint`,
      canonicalName: `${regionNames[regionCode]![0]} joint`,
      displayNameEn: `${regionNames[regionCode]![0]} joint`,
      displayNameUk: `${regionNames[regionCode]![1]} — суглоб`,
      category: 'JOINT',
      regionCode,
      parentRegion: regionCode,
    }),
  ),
  ...['cervical_spine', 'thoracic_spine', 'lumbar_spine'].map((regionCode) => ({
    code: regionCode,
    canonicalName: regionCode.replace('_', ' '),
    displayNameEn: regionCode.replace('_', ' '),
    category: 'REGION' as const,
    laterality: 'MIDLINE' as const,
    regionCode,
    parentCode: 'body',
  })),
  ...['Femur', 'Tibia', 'Fibula', 'Patella'].flatMap((name) =>
    paired({
      codeBase: name.toLowerCase(),
      canonicalName: name,
      displayNameEn: name,
      category: 'BONE',
      regionCode: name === 'Femur' ? 'hip' : 'knee',
      parentRegion: name === 'Femur' ? 'hip' : 'knee',
    }),
  ),
  ...['Humerus', 'Radius', 'Ulna', 'Scapula', 'Clavicle'].flatMap((name) =>
    paired({
      codeBase: name.toLowerCase(),
      canonicalName: name,
      displayNameEn: name,
      category: 'BONE',
      regionCode: ['Humerus', 'Scapula', 'Clavicle'].includes(name) ? 'shoulder' : 'elbow',
      parentRegion: ['Humerus', 'Scapula', 'Clavicle'].includes(name) ? 'shoulder' : 'elbow',
    }),
  ),
  ...['Gluteus maximus', 'Biceps femoris', 'Gastrocnemius', 'Deltoid'].flatMap((name) =>
    paired({
      codeBase: name.toLowerCase().replaceAll(' ', '_'),
      canonicalName: name,
      displayNameEn: name,
      category: 'MUSCLE',
      regionCode: name === 'Gluteus maximus' ? 'hip' : name === 'Deltoid' ? 'shoulder' : 'knee',
      parentRegion: name === 'Gluteus maximus' ? 'hip' : name === 'Deltoid' ? 'shoulder' : 'knee',
    }),
  ),
];

const nodeMappings = [
  ['skeleton', 'Femur', 'BONE', 'hip', 2],
  ['skeleton', 'Tibia', 'BONE', 'knee', 2],
  ['skeleton', 'Fibula', 'BONE', 'knee', 2],
  ['skeleton', 'Patella', 'BONE', 'knee', 2],
  ['skeleton', 'Humerus', 'BONE', 'shoulder', 2],
  ['skeleton', 'Radius', 'BONE', 'elbow', 2],
  ['skeleton', 'Ulna', 'BONE', 'elbow', 2],
  ['skeleton', 'Scapula', 'BONE', 'shoulder', 2],
  ['skeleton', 'Clavicle', 'BONE', 'shoulder', 2],
  ['muscles', 'Gluteus maximus muscle', 'MUSCLE', 'hip', 1],
  ['muscles', 'Long head of biceps femoris', 'MUSCLE', 'knee', 2],
  ['muscles', 'Medial head of gastrocnemius', 'MUSCLE', 'knee', 2],
  ['muscles', 'Acromial part of deltoid muscle', 'MUSCLE', 'shoulder', 2],
  ['joints', 'Articular capsule of hip joint', 'JOINT', 'hip', 1],
  ['joints', 'Articular capsule of knee joint', 'JOINT', 'knee', 1],
  ['joints', 'Articular capsule of elbow joint', 'JOINT', 'elbow', 1],
  ['joints', 'Articular capsule of glenohumeral joint', 'JOINT', 'shoulder', 1],
  ['joints', 'Articular capsule of radiocarpal joint', 'JOINT', 'wrist', 1],
] as const;

const canonicalName: Record<string, string> = {
  'Gluteus maximus muscle': 'Gluteus maximus',
  'Long head of biceps femoris': 'Biceps femoris',
  'Medial head of gastrocnemius': 'Gastrocnemius',
  'Acromial part of deltoid muscle': 'Deltoid',
  'Articular capsule of hip joint': 'Hip',
  'Articular capsule of knee joint': 'Knee',
  'Articular capsule of elbow joint': 'Elbow',
  'Articular capsule of glenohumeral joint': 'Shoulder',
  'Articular capsule of radiocarpal joint': 'Wrist',
};

export async function seedAnatomy(prisma: PrismaClient): Promise<void> {
  for (const model of MODELS) {
    await prisma.anatomicalModel.upsert({
      where: { code: model.code },
      update: { name: model.name, active: true },
      create: {
        id: model.id,
        code: model.code,
        name: model.name,
        kind: model.kind,
        description:
          'Z-Anatomy-derived source asset; licensing must be cleared before production use.',
      },
    });
    await prisma.anatomicalModelVersion.upsert({
      where: { modelId_version: { modelId: model.id, version: 1 } },
      update: { checksumSha256: model.checksum, bytes: model.bytes },
      create: {
        id: model.versionId,
        modelId: model.id,
        version: 1,
        status: 'ACTIVE',
        storageKey: `anatomy/v1/${model.file}`,
        checksumSha256: model.checksum,
        bytes: model.bytes,
        sourceName: 'Z-Anatomy',
        activatedAt: new Date('2026-09-03T00:00:00.000Z'),
        attribution:
          'Source attribution and license clearance pending; see assets/anatomy/README.md.',
      },
    });
  }

  const ids = new Map<string, string>();
  for (const structure of STRUCTURES) {
    const parentId = structure.parentCode ? ids.get(structure.parentCode) : undefined;
    const row = await prisma.anatomicalStructure.upsert({
      where: { code: structure.code },
      update: {
        canonicalName: structure.canonicalName,
        displayNameEn: structure.displayNameEn,
        displayNameUk: structure.displayNameUk,
        active: true,
        parentId,
      },
      create: {
        code: structure.code,
        canonicalName: structure.canonicalName,
        displayNameEn: structure.displayNameEn,
        displayNameUk: structure.displayNameUk,
        category: structure.category,
        laterality: structure.laterality ?? 'NOT_APPLICABLE',
        regionCode: structure.regionCode,
        parentId,
      },
    });
    ids.set(structure.code, row.id);
  }

  for (const [modelCode, nodeBase, category, regionCode, primitiveCount] of nodeMappings) {
    const model = MODELS.find((item) => item.code === modelCode)!;
    const name = canonicalName[nodeBase] ?? nodeBase;
    for (const [suffix, laterality] of [
      ['l', 'LEFT'],
      ['r', 'RIGHT'],
    ] as const) {
      const structureCode =
        category === 'JOINT'
          ? `${regionCode}_joint.${laterality.toLowerCase()}`
          : `${name.toLowerCase().replaceAll(' ', '_')}.${laterality.toLowerCase()}`;
      const structureId = ids.get(structureCode);
      if (!structureId) continue;
      const nodeName = `${nodeBase}.${suffix}`;
      const meshName =
        modelCode === 'skeleton'
          ? `${nodeBase}.003`
          : modelCode === 'muscles'
            ? `${nodeBase}.001`
            : `${nodeBase}.${suffix === 'l' ? '006' : '005'}`;
      for (let primitiveIndex = 0; primitiveIndex < primitiveCount; primitiveIndex += 1) {
        await prisma.anatomicalModelStructureMapping.upsert({
          where: {
            modelVersionId_stableMeshKey_primitiveIndex: {
              modelVersionId: model.versionId,
              stableMeshKey: nodeName,
              primitiveIndex,
            },
          },
          update: { structureId, confidence: 'HIGH_CONFIDENCE' },
          create: {
            modelVersionId: model.versionId,
            structureId,
            nodeName,
            meshName,
            primitiveIndex,
            stableMeshKey: nodeName,
            confidence: 'HIGH_CONFIDENCE',
            reviewerNote:
              'English node name and explicit .l/.r node laterality agree with inspected world-space X side. Primitive presence is verified from the source GLB report.',
          },
        });
      }
    }
  }
}

export async function seedDemoBodyAnnotations(
  prisma: PrismaClient,
  input: {
    organizationId: string;
    patientId: string;
    practitionerId: string;
    userId: string;
  },
): Promise<void> {
  const leftKnee = await prisma.anatomicalStructure.findUniqueOrThrow({
    where: { code: 'knee_joint.left' },
  });
  const mapping = await prisma.anatomicalModelStructureMapping.findUniqueOrThrow({
    where: {
      modelVersionId_stableMeshKey_primitiveIndex: {
        modelVersionId: MODELS[2].versionId,
        stableMeshKey: 'Articular capsule of knee joint.l',
        primitiveIndex: 0,
      },
    },
  });
  const encounter = await prisma.encounter.findFirst({
    where: { organizationId: input.organizationId, patientId: input.patientId },
    orderBy: { startedAt: 'desc' },
    select: { id: true },
  });
  const records = [
    {
      id: 'a7300000-0000-4000-8000-000000000001',
      status: 'ACTIVE' as const,
      type: 'PAIN' as const,
      severity: 7,
      title: 'Біль у лівому коліні',
      note: 'Демонстраційне клінічне спостереження — не діагноз.',
      createdAt: new Date('2026-09-02T09:15:00.000Z'),
      resolvedAt: null,
    },
    {
      id: 'a7300000-0000-4000-8000-000000000002',
      status: 'RESOLVED' as const,
      type: 'MOBILITY_LIMITATION' as const,
      severity: 4,
      title: 'Попереднє обмеження рухливості',
      note: 'Демонстраційний історичний запис.',
      createdAt: new Date('2026-08-20T10:00:00.000Z'),
      resolvedAt: new Date('2026-08-27T10:00:00.000Z'),
    },
  ];
  for (const record of records) {
    await prisma.bodyAnnotation.upsert({
      where: { id: record.id },
      update: {
        status: record.status,
        severity: record.severity,
        resolvedAt: record.resolvedAt,
      },
      create: {
        ...record,
        organizationId: input.organizationId,
        patientId: input.patientId,
        encounterId: encounter?.id ?? null,
        structureId: leftKnee.id,
        modelVersionId: MODELS[2].versionId,
        mappingId: mapping.id,
        stableMeshKey: mapping.stableMeshKey,
        primitiveIndex: mapping.primitiveIndex,
        triangleIndex: 0,
        barycentricU: 0.34,
        barycentricV: 0.33,
        barycentricW: 0.33,
        localPositionX: 0,
        localPositionY: 0,
        localPositionZ: 0,
        localNormalX: 0,
        localNormalY: 0,
        localNormalZ: 1,
        createdByPractitionerId: input.practitionerId,
        createdByUserId: input.userId,
        updatedByUserId: input.userId,
      },
    });
    await prisma.bodyAnnotationStatusHistory.upsert({
      where: { id: `${record.id.slice(0, -1)}${record.id.endsWith('1') ? '3' : '4'}` },
      update: {},
      create: {
        id: `${record.id.slice(0, -1)}${record.id.endsWith('1') ? '3' : '4'}`,
        organizationId: input.organizationId,
        annotationId: record.id,
        fromStatus: null,
        toStatus: 'ACTIVE',
        changedByUserId: input.userId,
        changedAt: record.createdAt,
      },
    });
    if (record.status === 'RESOLVED') {
      await prisma.bodyAnnotationStatusHistory.upsert({
        where: { id: 'a7400000-0000-4000-8000-000000000002' },
        update: {},
        create: {
          id: 'a7400000-0000-4000-8000-000000000002',
          organizationId: input.organizationId,
          annotationId: record.id,
          fromStatus: 'ACTIVE',
          toStatus: 'RESOLVED',
          changedByUserId: input.userId,
          reason: 'Стан покращився за демонстраційним сценарієм.',
          changedAt: record.resolvedAt!,
        },
      });
    }
  }
}

export { MODELS as ANATOMY_MODELS, STRUCTURES as ANATOMY_STRUCTURES };
