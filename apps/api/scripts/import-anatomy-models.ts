import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  CreateBucketCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { parseApiEnv } from '@repo/config/api-env';
import { ANATOMY_MODELS, seedAnatomy } from '../prisma/anatomy-seed';

async function checksum(path: string): Promise<string> {
  return createHash('sha256')
    .update(await readFile(path))
    .digest('hex');
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const root = resolve(process.cwd(), '../..');
  const files = await Promise.all(
    ANATOMY_MODELS.map(async (model) => {
      const path = resolve(root, 'assets/anatomy/source', model.file);
      const metadata = await stat(path);
      const actualChecksum = await checksum(path);
      if (metadata.size !== model.bytes || actualChecksum !== model.checksum)
        throw new Error(`${model.file}: source does not match the reviewed size/checksum`);
      return { model, path };
    }),
  );
  if (!apply) {
    files.forEach(({ model }) => console.log(`verified ${model.file} -> anatomy/v1/${model.file}`));
    console.log('Dry run only. Re-run with --apply to upload and upsert model metadata.');
    return;
  }

  const env = parseApiEnv();
  const client = new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
  });
  try {
    await client.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET_MODELS }));
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: env.S3_BUCKET_MODELS }));
  }
  for (const { model, path } of files) {
    const key = `anatomy/v1/${model.file}`;
    let currentChecksum: string | undefined;
    try {
      currentChecksum = (
        await client.send(new HeadObjectCommand({ Bucket: env.S3_BUCKET_MODELS, Key: key }))
      ).Metadata?.sha256;
    } catch {
      currentChecksum = undefined;
    }
    if (currentChecksum !== model.checksum) {
      await client.send(
        new PutObjectCommand({
          Bucket: env.S3_BUCKET_MODELS,
          Key: key,
          Body: createReadStream(path),
          ContentType: 'model/gltf-binary',
          Metadata: { sha256: model.checksum, source: 'z-anatomy' },
        }),
      );
      console.log(`uploaded ${model.file}`);
    } else console.log(`unchanged ${model.file}`);
  }
  const prisma = new PrismaClient();
  try {
    await seedAnatomy(prisma);
  } finally {
    await prisma.$disconnect();
  }
  console.log('Anatomy model metadata and reviewed mappings are up to date.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
