import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';

type Part = { id: string; name: string; conceptId: string };
const root = resolve(process.cwd(), '../..');
const normalize = (value: string) => value.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();

async function main(): Promise<void> {
  const atlas = JSON.parse(await readFile(resolve(root, 'apps/web/public/models/human-atlas/atlas.json'), 'utf8')) as { parts: Part[] };
  const prisma = new PrismaClient();
  try {
    const structures = await prisma.anatomicalStructure.findMany({ where: { active: true }, select: { code: true, canonicalName: true, displayNameEn: true, laterality: true, category: true } });
    const mappings = atlas.parts.flatMap((part) => {
      const match = /^(left|right)\s+(.+)$/i.exec(part.name);
      const laterality = match?.[1]?.toUpperCase() ?? 'NOT_APPLICABLE';
      const bodyName = normalize(match?.[2] ?? part.name);
      const candidates = structures.filter((structure) =>
        structure.laterality === laterality && [structure.canonicalName, structure.displayNameEn].filter(Boolean).some((name) => normalize(name!) === bodyName),
      ).sort((a, b) => (a.category === 'SYSTEM' ? 1 : 0) - (b.category === 'SYSTEM' ? 1 : 0));
      const structure = candidates[0];
      return structure ? [{ sourcePartId: part.id, conceptId: part.conceptId, structureCode: structure.code, confidence: 'HIGH_CONFIDENCE' as const }] : [];
    });
    await writeFile(resolve(root, 'assets/anatomy/mappings/human-atlas-reviewed.json'), JSON.stringify({ source: 'BodyParts3D 4.0 / Human Atlas', upstreamCommit: '1c38bf35c254a891200d3cedecfd57abebe83d8d', status: 'REVIEWED_EXACT_NAME_MATCH', mappings }, null, 2) + '\n');
    console.log(`Generated ${mappings.length} exact reviewed candidates from ${atlas.parts.length} source parts.`);
  } finally { await prisma.$disconnect(); }
}
void main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
