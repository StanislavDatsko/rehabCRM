import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ANATOMY_STRUCTURES } from '../../apps/api/prisma/anatomy-seed';

type Instance = {
  nodeName: string;
  meshName: string;
  primitiveCount: number;
  bounds: { center: [number, number, number] };
};
type Report = { file: string; meshInstances: Instance[] };
const rules = [
  ['skeleton', 'Femur', 'hip', 'bone', 'femur'],
  ['skeleton', 'Tibia', 'knee', 'bone', 'tibia'],
  ['skeleton', 'Fibula', 'knee', 'bone', 'fibula'],
  ['skeleton', 'Patella', 'knee', 'bone', 'patella'],
  ['skeleton', 'Humerus', 'shoulder', 'bone', 'humerus'],
  ['skeleton', 'Radius', 'elbow', 'bone', 'radius'],
  ['skeleton', 'Ulna', 'elbow', 'bone', 'ulna'],
  ['skeleton', 'Scapula', 'shoulder', 'bone', 'scapula'],
  ['skeleton', 'Clavicle', 'shoulder', 'bone', 'clavicle'],
  ['muscles', 'Gluteus maximus muscle', 'hip', 'muscle', 'gluteus_maximus'],
  ['muscles', 'Long head of biceps femoris', 'knee', 'muscle', 'biceps_femoris'],
  ['muscles', 'Medial head of gastrocnemius', 'knee', 'muscle', 'gastrocnemius'],
  ['muscles', 'Acromial part of deltoid muscle', 'shoulder', 'muscle', 'deltoid'],
  ['joints', 'Articular capsule of hip joint', 'hip', 'joint', 'hip'],
  ['joints', 'Articular capsule of knee joint', 'knee', 'joint', 'knee'],
  ['joints', 'Articular capsule of elbow joint', 'elbow', 'joint', 'elbow'],
  ['joints', 'Articular capsule of glenohumeral joint', 'shoulder', 'joint', 'shoulder'],
  ['joints', 'Articular capsule of radiocarpal joint', 'wrist', 'joint', 'wrist'],
] as const;

async function main(): Promise<void> {
  const root = resolve(process.cwd(), 'assets/anatomy');
  const reports = new Map<string, Report>();
  for (const layer of ['muscles', 'skeleton', 'joints'])
    reports.set(
      layer,
      JSON.parse(await readFile(resolve(root, 'inspection', `${layer}.json`), 'utf8')) as Report,
    );
  const candidates = [] as Array<Record<string, unknown>>;
  const claimed = new Set<string>();
  for (const [layer, base, region, category, canonical] of rules) {
    for (const side of ['l', 'r'] as const) {
      const nodeName = `${base}.${side}`;
      const instance = reports.get(layer)!.meshInstances.find((item) => item.nodeName === nodeName);
      if (!instance) {
        candidates.push({
          layer,
          nodeName,
          confidence: 'MANUAL_REQUIRED',
          reason: 'Expected reviewed node is absent',
        });
        continue;
      }
      const geometricSide = instance.bounds.center[0] > 0 ? 'l' : 'r';
      const confidence = geometricSide === side ? 'HIGH_CONFIDENCE' : 'MANUAL_REQUIRED';
      claimed.add(`${layer}:${nodeName}`);
      for (let primitiveIndex = 0; primitiveIndex < instance.primitiveCount; primitiveIndex += 1)
        candidates.push({
          layer,
          structureCode:
            category === 'joint'
              ? `${region}_joint.${side === 'l' ? 'left' : 'right'}`
              : `${canonical}.${side === 'l' ? 'left' : 'right'}`,
          nodeName,
          meshName: instance.meshName,
          stableMeshKey: nodeName,
          primitiveIndex,
          confidence,
          evidence: {
            explicitNodeLaterality: side,
            worldCenterX: instance.bounds.center[0],
            geometricSide,
          },
        });
    }
  }
  const manual = [...reports.entries()].flatMap(([layer, report]) =>
    report.meshInstances
      .filter((item) => !claimed.has(`${layer}:${item.nodeName}`))
      .map((item) => ({
        layer,
        nodeName: item.nodeName,
        meshName: item.meshName,
        reason: 'No canonical Phase 7 rule; requires anatomy review',
      })),
  );
  const output = resolve(root, 'mappings');
  const reviewed = candidates.filter((item) => item.confidence !== 'MANUAL_REQUIRED');
  const mappedStructureCodes = new Set(
    reviewed.flatMap((item) =>
      typeof item.structureCode === 'string' ? [item.structureCode] : [],
    ),
  );
  const ambiguousMappings = candidates.filter(
    (item) => item.confidence === 'MANUAL_REQUIRED',
  ).length;
  const unmappedCanonicalStructures = ANATOMY_STRUCTURES.map((item) => item.code).filter(
    (code) => !mappedStructureCodes.has(code),
  );
  await mkdir(output, { recursive: true });
  await writeFile(
    resolve(output, 'v1-candidates.json'),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), candidates }, null, 2)}\n`,
  );
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
  await writeFile(
    resolve(output, 'manual-review.csv'),
    `layer,nodeName,meshName,reason\n${manual.map((item) => [item.layer, item.nodeName, item.meshName, item.reason].map(quote).join(',')).join('\n')}\n`,
  );
  await writeFile(
    resolve(output, 'report.json'),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalMeshInstances: [...reports.values()].reduce(
          (sum, item) => sum + item.meshInstances.length,
          0,
        ),
        mappedMeshInstances: claimed.size,
        mappedPrimitives: reviewed.length,
        mappedStructures: mappedStructureCodes.size,
        manualReviewMeshInstances: manual.length,
        ambiguousMappings,
        unmappedCanonicalStructures,
        policy:
          'Only explicit .l/.r node names whose world-space X side agrees are promoted. Everything else remains unmapped.',
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    `mapping candidates: ${candidates.length}; manual-review mesh instances: ${manual.length}`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
