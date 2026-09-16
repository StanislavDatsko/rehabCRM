import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const UPSTREAM_COMMIT = '1c38bf35c254a891200d3cedecfd57abebe83d8d';
const BASE = `https://raw.githubusercontent.com/ashemag/human-atlas/${UPSTREAM_COMMIT}/public/models`;
const root = resolve(process.cwd());
const destination = resolve(root, 'apps/web/public/models/human-atlas');

async function checksum(path: string): Promise<string> {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  await mkdir(destination, { recursive: true });
  const names = ['atlas.json', ...Array.from({ length: 15 }, (_, index) => `body-${index}.bin.gz`)];
  if (apply) {
    for (const name of names) {
      const response = await fetch(`${BASE}/${name}`);
      if (!response.ok) throw new Error(`Unable to download ${name}: ${response.status}`);
      await writeFile(resolve(destination, name), Buffer.from(await response.arrayBuffer()));
    }
  }
  const files = await Promise.all(names.map(async (name) => {
    const path = resolve(destination, name);
    const metadata = await stat(path);
    return { name, bytes: metadata.size, sha256: await checksum(path) };
  }));
  await writeFile(
    resolve(destination, 'checksums.json'),
    JSON.stringify({ upstream: 'ashemag/human-atlas', commit: UPSTREAM_COMMIT, files }, null, 2) + '\n',
  );
  const atlas = JSON.parse(await readFile(resolve(destination, 'atlas.json'), 'utf8')) as { parts: unknown[]; concepts: unknown[] };
  if (atlas.parts.length !== 2234 || atlas.concepts.length !== 3432)
    throw new Error(`Unexpected Human Atlas counts: ${atlas.parts.length} parts, ${atlas.concepts.length} concepts`);
  console.log(`verified Human Atlas ${UPSTREAM_COMMIT}: ${atlas.parts.length} parts, ${atlas.concepts.length} concepts`);
  console.log(files.map((file) => `${file.sha256}  ${file.name}`).join('\n'));
}

void main();
