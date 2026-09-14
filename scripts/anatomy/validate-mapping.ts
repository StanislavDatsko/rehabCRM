import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ANATOMY_STRUCTURES } from '../../apps/api/prisma/anatomy-seed';

type Candidate = {
  layer: string;
  structureCode?: string;
  nodeName: string;
  meshName?: string;
  stableMeshKey?: string;
  primitiveIndex?: number;
  confidence: string;
};
type Instance = { nodeName: string; meshName: string; primitiveCount: number };

async function main(): Promise<void> {
  const root = resolve(process.cwd(), 'assets/anatomy');
  const proposals = JSON.parse(
    await readFile(resolve(root, 'mappings/v1-candidates.json'), 'utf8'),
  ) as { candidates: Candidate[] };
  const structures = new Set(ANATOMY_STRUCTURES.map((item) => item.code));
  const reports = new Map<string, Instance[]>();
  for (const layer of ['muscles', 'skeleton', 'joints']) {
    const report = JSON.parse(
      await readFile(resolve(root, 'inspection', `${layer}.json`), 'utf8'),
    ) as { meshInstances: Instance[] };
    reports.set(layer, report.meshInstances);
  }
  const errors: string[] = [];
  const identities = new Set<string>();
  const reviewed = proposals.candidates.filter(
    (candidate) => candidate.confidence !== 'MANUAL_REQUIRED',
  );
  for (const candidate of reviewed) {
    const instance = reports
      .get(candidate.layer)
      ?.find(
        (item) => item.nodeName === candidate.nodeName && item.meshName === candidate.meshName,
      );
    if (!instance) errors.push(`${candidate.layer}:${candidate.nodeName}: node/mesh not found`);
    if (
      candidate.primitiveIndex === undefined ||
      candidate.primitiveIndex < 0 ||
      candidate.primitiveIndex >= (instance?.primitiveCount ?? 0)
    )
      errors.push(`${candidate.layer}:${candidate.nodeName}: primitive out of range`);
    if (!candidate.structureCode || !structures.has(candidate.structureCode))
      errors.push(`${candidate.layer}:${candidate.nodeName}: canonical structure is absent`);
    const identity = `${candidate.layer}:${candidate.stableMeshKey}:${candidate.primitiveIndex}`;
    if (identities.has(identity)) errors.push(`${identity}: duplicate render mapping`);
    identities.add(identity);
  }
  if (errors.length) throw new Error(`Mapping validation failed:\n${errors.join('\n')}`);
  console.log(
    `validated ${reviewed.length} mapped primitives against real GLB reports and ${structures.size} canonical structures; no duplicate render mappings`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
