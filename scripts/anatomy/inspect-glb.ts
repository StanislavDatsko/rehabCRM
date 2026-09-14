import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';

type Vec3 = [number, number, number];
type Mat4 = number[];
type Gltf = {
  scenes?: Array<{ nodes?: number[]; name?: string }>;
  scene?: number;
  nodes?: Array<{
    name?: string;
    mesh?: number;
    children?: number[];
    matrix?: number[];
    translation?: Vec3;
    rotation?: [number, number, number, number];
    scale?: Vec3;
  }>;
  meshes?: Array<{
    name?: string;
    primitives?: Array<{
      mode?: number;
      indices?: number;
      attributes?: Record<string, number>;
      material?: number;
    }>;
  }>;
  accessors?: Array<{ count?: number; min?: number[]; max?: number[] }>;
  materials?: unknown[];
  textures?: unknown[];
  images?: unknown[];
  animations?: unknown[];
};

type Bounds = { min: Vec3; max: Vec3; center: Vec3; size: Vec3 } | null;
type MeshInstance = {
  nodeName: string;
  meshName: string;
  meshIndex: number;
  primitiveCount: number;
  bounds: NonNullable<Bounds>;
};

type Inspection = {
  file: string;
  bytes: number;
  sha256: string;
  gltfVersion: number;
  scenes: number;
  nodes: number;
  meshes: number;
  primitives: number;
  materials: number;
  textures: number;
  images: number;
  animations: number;
  triangles: number;
  namedNodes: number;
  namedMeshes: number;
  duplicateNodeNames: string[];
  duplicateMeshNames: string[];
  nodeNames: string[];
  meshNames: string[];
  bounds: Bounds;
  meshInstances: MeshInstance[];
};

const identity = (): Mat4 => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Array<number>(16).fill(0);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      for (let index = 0; index < 4; index += 1)
        out[column * 4 + row] += a[index * 4 + row]! * b[column * 4 + index]!;
    }
  }
  return out;
}

function nodeMatrix(node: NonNullable<Gltf['nodes']>[number]): Mat4 {
  if (node.matrix?.length === 16) return [...node.matrix];
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  return [
    (1 - 2 * y * y - 2 * z * z) * sx,
    (2 * x * y + 2 * z * w) * sx,
    (2 * x * z - 2 * y * w) * sx,
    0,
    (2 * x * y - 2 * z * w) * sy,
    (1 - 2 * x * x - 2 * z * z) * sy,
    (2 * y * z + 2 * x * w) * sy,
    0,
    (2 * x * z + 2 * y * w) * sz,
    (2 * y * z - 2 * x * w) * sz,
    (1 - 2 * x * x - 2 * y * y) * sz,
    0,
    tx,
    ty,
    tz,
    1,
  ];
}

function point(matrix: Mat4, value: Vec3): Vec3 {
  const [x, y, z] = value;
  return [
    matrix[0]! * x + matrix[4]! * y + matrix[8]! * z + matrix[12]!,
    matrix[1]! * x + matrix[5]! * y + matrix[9]! * z + matrix[13]!,
    matrix[2]! * x + matrix[6]! * y + matrix[10]! * z + matrix[14]!,
  ];
}

function duplicates(values: string[]): string[] {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts]
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
    .sort();
}

function computeGeometry(gltf: Gltf): { bounds: Bounds; meshInstances: MeshInstance[] } {
  const nodes = gltf.nodes ?? [];
  const meshes = gltf.meshes ?? [];
  const accessors = gltf.accessors ?? [];
  const roots = gltf.scenes?.flatMap((scene) => scene.nodes ?? []) ?? [];
  const globalMin: Vec3 = [Infinity, Infinity, Infinity];
  const globalMax: Vec3 = [-Infinity, -Infinity, -Infinity];
  const meshInstances: MeshInstance[] = [];
  const visit = (nodeIndex: number, parent: Mat4) => {
    const node = nodes[nodeIndex];
    if (!node) return;
    const world = multiply(parent, nodeMatrix(node));
    const mesh = node.mesh === undefined ? undefined : meshes[node.mesh];
    const instanceMin: Vec3 = [Infinity, Infinity, Infinity];
    const instanceMax: Vec3 = [-Infinity, -Infinity, -Infinity];
    for (const primitive of mesh?.primitives ?? []) {
      const accessorIndex = primitive.attributes?.POSITION;
      const accessor = accessorIndex === undefined ? undefined : accessors[accessorIndex];
      if (!accessor?.min || !accessor.max || accessor.min.length < 3 || accessor.max.length < 3)
        continue;
      for (const x of [accessor.min[0]!, accessor.max[0]!])
        for (const y of [accessor.min[1]!, accessor.max[1]!])
          for (const z of [accessor.min[2]!, accessor.max[2]!]) {
            const transformed = point(world, [x, y, z]);
            for (let axis = 0; axis < 3; axis += 1) {
              globalMin[axis] = Math.min(globalMin[axis]!, transformed[axis]!);
              globalMax[axis] = Math.max(globalMax[axis]!, transformed[axis]!);
              instanceMin[axis] = Math.min(instanceMin[axis]!, transformed[axis]!);
              instanceMax[axis] = Math.max(instanceMax[axis]!, transformed[axis]!);
            }
          }
    }
    if (mesh && instanceMin.every(Number.isFinite) && instanceMax.every(Number.isFinite)) {
      meshInstances.push({
        nodeName: node.name ?? `node-${nodeIndex}`,
        meshName: mesh.name ?? `mesh-${node.mesh}`,
        meshIndex: node.mesh!,
        primitiveCount: mesh.primitives?.length ?? 0,
        bounds: {
          min: instanceMin,
          max: instanceMax,
          center: instanceMin.map((value, axis) => (value + instanceMax[axis]!) / 2) as Vec3,
          size: instanceMin.map((value, axis) => instanceMax[axis]! - value) as Vec3,
        },
      });
    }
    (node.children ?? []).forEach((child) => visit(child, world));
  };
  roots.forEach((root) => visit(root, identity()));
  if (!globalMin.every(Number.isFinite) || !globalMax.every(Number.isFinite))
    return { bounds: null, meshInstances };
  const center = globalMin.map((value, axis) => (value + globalMax[axis]!) / 2) as Vec3;
  const size = globalMin.map((value, axis) => globalMax[axis]! - value) as Vec3;
  return { bounds: { min: globalMin, max: globalMax, center, size }, meshInstances };
}

async function inspect(path: string): Promise<Inspection> {
  const data = await readFile(path);
  if (data.length < 20 || data.toString('ascii', 0, 4) !== 'glTF')
    throw new Error(`${path}: not a GLB file`);
  const gltfVersion = data.readUInt32LE(4);
  const declaredLength = data.readUInt32LE(8);
  if (gltfVersion !== 2 || declaredLength !== data.length)
    throw new Error(`${path}: invalid GLB header or length`);
  const jsonLength = data.readUInt32LE(12);
  const jsonType = data.toString('ascii', 16, 20);
  if (jsonType !== 'JSON') throw new Error(`${path}: first GLB chunk is not JSON`);
  const gltf = JSON.parse(
    data
      .toString('utf8', 20, 20 + jsonLength)
      .replace(/\0+$/u, '')
      .trim(),
  ) as Gltf;
  const nodeNames = (gltf.nodes ?? [])
    .map((node) => node.name)
    .filter((name): name is string => Boolean(name));
  const meshNames = (gltf.meshes ?? [])
    .map((mesh) => mesh.name)
    .filter((name): name is string => Boolean(name));
  let primitives = 0;
  let triangles = 0;
  for (const mesh of gltf.meshes ?? [])
    for (const primitive of mesh.primitives ?? []) {
      primitives += 1;
      if ((primitive.mode ?? 4) !== 4) continue;
      const count =
        primitive.indices === undefined
          ? gltf.accessors?.[primitive.attributes?.POSITION ?? -1]?.count
          : gltf.accessors?.[primitive.indices]?.count;
      triangles += Math.floor((count ?? 0) / 3);
    }
  const geometry = computeGeometry(gltf);
  return {
    file: basename(path),
    bytes: data.length,
    sha256: createHash('sha256').update(data).digest('hex'),
    gltfVersion,
    scenes: gltf.scenes?.length ?? 0,
    nodes: gltf.nodes?.length ?? 0,
    meshes: gltf.meshes?.length ?? 0,
    primitives,
    materials: gltf.materials?.length ?? 0,
    textures: gltf.textures?.length ?? 0,
    images: gltf.images?.length ?? 0,
    animations: gltf.animations?.length ?? 0,
    triangles,
    namedNodes: nodeNames.length,
    namedMeshes: meshNames.length,
    duplicateNodeNames: duplicates(nodeNames),
    duplicateMeshNames: duplicates(meshNames),
    nodeNames,
    meshNames,
    bounds: geometry.bounds,
    meshInstances: geometry.meshInstances,
  };
}

function alignment(reports: Inspection[]) {
  return reports
    .map((left, index) =>
      reports.slice(index + 1).map((right) => ({
        files: [left.file, right.file],
        comparable: Boolean(left.bounds && right.bounds),
        centerDelta:
          left.bounds && right.bounds
            ? left.bounds.center.map((value, axis) => value - right.bounds!.center[axis]!)
            : null,
        sizeRatio:
          left.bounds && right.bounds
            ? left.bounds.size.map((value, axis) =>
                right.bounds!.size[axis] === 0 ? null : value / right.bounds!.size[axis]!,
              )
            : null,
      })),
    )
    .flat();
}

async function main() {
  const root = resolve(process.cwd(), 'assets/anatomy');
  const input = process.argv.slice(2);
  const paths = input.length
    ? input.map((path) => resolve(path))
    : ['muscles.glb', 'skeleton.glb', 'joints.glb'].map((file) => resolve(root, 'source', file));
  const output = resolve(root, 'inspection');
  await mkdir(output, { recursive: true });
  const reports = [] as Inspection[];
  for (const path of paths) {
    const report = await inspect(path);
    reports.push(report);
    await writeFile(
      resolve(output, `${report.file.replace(/\.glb$/u, '')}.json`),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    console.log(
      `${report.file}: ${report.bytes} bytes, ${report.nodes} nodes, ${report.meshes} meshes, ${report.primitives} primitives, ${report.triangles} triangles`,
    );
    console.log(
      `  names: nodes ${report.namedNodes}/${report.nodes}, meshes ${report.namedMeshes}/${report.meshes}; duplicate node names ${report.duplicateNodeNames.length}, duplicate mesh names ${report.duplicateMeshNames.length}`,
    );
    console.log(`  bounds: ${report.bounds ? JSON.stringify(report.bounds) : 'unavailable'}`);
  }
  const alignmentReport = { generatedAt: new Date().toISOString(), pairs: alignment(reports) };
  await writeFile(
    resolve(output, 'alignment.json'),
    `${JSON.stringify(alignmentReport, null, 2)}\n`,
  );
  console.log(`Inspection reports written to ${dirname(resolve(output, 'alignment.json'))}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
