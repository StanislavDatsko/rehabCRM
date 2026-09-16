import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CreateBucketCommand, HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { parseApiEnv } from '@repo/config/api-env';

const COMMIT = '1c38bf35c254a891200d3cedecfd57abebe83d8d';
const MODEL_ID = 'a7000000-0000-4000-8000-000000000010';
const VERSION_ID = 'a7100000-0000-4000-8000-000000000010';
const root = resolve(process.cwd(), '../..');
const dir = resolve(root, 'apps/web/public/models/human-atlas');
const sha256 = (data: Buffer) => createHash('sha256').update(data).digest('hex');

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const manifestPath = resolve(dir, 'atlas.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
    parts: Array<{ id: string; name: string; conceptId: string; system: string; chunk: number }>;
  };
  const reviewed = JSON.parse(await readFile(resolve(root, 'assets/anatomy/mappings/human-atlas-reviewed.json'), 'utf8')) as { mappings: Array<{ sourcePartId: string; conceptId: string; structureCode: string; confidence: 'EXACT' | 'HIGH_CONFIDENCE' }> };
  if (manifest.parts.length !== 2234) throw new Error(`Expected 2234 parts, got ${manifest.parts.length}`);
  const assets = ['atlas.json', ...Array.from({ length: 15 }, (_, i) => `body-${i}.bin.gz`)];
  const files = await Promise.all(assets.map(async (name) => {
    const path = resolve(dir, name);
    return { name, path, bytes: (await stat(path)).size, checksum: sha256(await readFile(path)) };
  }));
  if (!apply) {
    files.forEach((file) => console.log(`${file.checksum}  ${file.name}`));
    console.log(`Verified Human Atlas ${COMMIT}; use --apply to upload and activate metadata.`);
    return;
  }
  const env = parseApiEnv();
  const client = new S3Client({ endpoint: env.S3_ENDPOINT, region: env.S3_REGION, forcePathStyle: env.S3_FORCE_PATH_STYLE, credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY } });
  try { await client.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET_MODELS })); }
  catch { await client.send(new CreateBucketCommand({ Bucket: env.S3_BUCKET_MODELS })); }
  for (const file of files) {
    await client.send(new PutObjectCommand({
      Bucket: env.S3_BUCKET_MODELS,
      Key: `anatomy/human-atlas/${COMMIT}/${file.name}`,
      Body: createReadStream(file.path),
      ContentType: file.name === 'atlas.json' ? 'application/json' : 'application/octet-stream',
      ContentEncoding: file.name.endsWith('.gz') ? 'gzip' : undefined,
      Metadata: { sha256: file.checksum, source: 'BodyParts3D-4.0', upstreamCommit: COMMIT },
    }));
  }
  const prisma = new PrismaClient();
  try {
    const model = await prisma.anatomicalModel.upsert({ where: { code: 'bodyparts3d-human-atlas' }, update: { active: true }, create: { id: MODEL_ID, code: 'bodyparts3d-human-atlas', name: 'Human Atlas / BodyParts3D 4.0', kind: 'COMBINED', description: 'Combined Human Atlas source with 15 logical systems and 2,234 source parts.' } });
    const manifestFile = files[0]!;
    const version = await prisma.anatomicalModelVersion.upsert({ where: { modelId_version: { modelId: model.id, version: 1 } }, update: { status: 'ACTIVE', storageKey: `anatomy/human-atlas/${COMMIT}/atlas.json`, checksumSha256: manifestFile.checksum, bytes: manifestFile.bytes, format: 'ATLAS', sourceName: 'BodyParts3D 4.0 / Human Atlas', sourceUrl: `https://github.com/ashemag/human-atlas/tree/${COMMIT}`, author: 'The Database Center for Life Science', licenseName: 'CC BY 4.0', attribution: 'BodyParts3D © The Database Center for Life Science; Human Atlas application MIT', activatedAt: new Date() }, create: { id: VERSION_ID, modelId: model.id, version: 1, status: 'ACTIVE', storageKey: `anatomy/human-atlas/${COMMIT}/atlas.json`, checksumSha256: manifestFile.checksum, bytes: manifestFile.bytes, format: 'ATLAS', sourceName: 'BodyParts3D 4.0 / Human Atlas', sourceUrl: `https://github.com/ashemag/human-atlas/tree/${COMMIT}`, author: 'The Database Center for Life Science', licenseName: 'CC BY 4.0', attribution: 'BodyParts3D © The Database Center for Life Science; Human Atlas application MIT', activatedAt: new Date() } });
    await prisma.anatomicalModelStructureMapping.deleteMany({ where: { modelVersionId: version.id, sourcePartId: { not: null } } });
    await prisma.anatomicalModelAsset.deleteMany({ where: { modelVersionId: version.id } });
    await prisma.anatomicalModelAsset.createMany({ data: files.map((file, index) => ({ modelVersionId: version.id, kind: index === 0 ? 'MANIFEST' : 'GEOMETRY_CHUNK', assetIndex: index === 0 ? 0 : index - 1, storageKey: `anatomy/human-atlas/${COMMIT}/${file.name}`, checksumSha256: file.checksum, bytes: file.bytes, contentEncoding: file.name.endsWith('.gz') ? 'gzip' : null, contentType: index === 0 ? 'application/json' : 'application/octet-stream' })) });
    await prisma.anatomicalSourcePart.deleteMany({ where: { modelVersionId: version.id } });
    await prisma.anatomicalSourcePart.createMany({ data: manifest.parts.map((part) => ({ modelVersionId: version.id, sourcePartId: part.id, conceptId: part.conceptId, name: part.name, system: part.system, chunkIndex: part.chunk })) });
    const structures = await prisma.anatomicalStructure.findMany({ where: { code: { in: reviewed.mappings.map((item) => item.structureCode) }, active: true }, select: { id: true, code: true } });
    const structureByCode = new Map(structures.map((item) => [item.code, item.id]));
    const partById = new Map(manifest.parts.map((part) => [part.id, part]));
    const clinicalMappings = reviewed.mappings.map((item) => {
      const part = partById.get(item.sourcePartId);
      const structureId = structureByCode.get(item.structureCode);
      if (!part || part.conceptId !== item.conceptId || !structureId) throw new Error(`Unresolvable reviewed mapping ${item.sourcePartId} -> ${item.structureCode}`);
      return { modelVersionId: version.id, structureId, sourcePartId: part.id, nodeName: part.id, meshName: part.name, primitiveIndex: 0, stableMeshKey: part.id, confidence: item.confidence };
    });
    await prisma.anatomicalModelStructureMapping.createMany({ data: clinicalMappings });
    console.log(`Activated ${model.code} v${version.version}: ${manifest.parts.length} source parts.`);
  } finally { await prisma.$disconnect(); }
}
void main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
