import { BufferGeometry, Mesh, Triangle, Vector3 } from 'three';
import type { SurfaceAnchor } from '@repo/contracts';

export function primitiveIndexForFace(geometry: BufferGeometry, faceIndex: number): number {
  const offset = faceIndex * 3;
  const group = geometry.groups.findIndex(
    (item) => offset >= item.start && offset < item.start + item.count,
  );
  return group < 0 ? 0 : group;
}

export function triangleVertexIndices(
  geometry: BufferGeometry,
  triangleIndex: number,
): [number, number, number] | null {
  const offset = triangleIndex * 3;
  const index = geometry.getIndex();
  const count = index?.count ?? geometry.getAttribute('position')?.count ?? 0;
  if (offset < 0 || offset + 2 >= count) return null;
  return index
    ? [index.getX(offset), index.getX(offset + 1), index.getX(offset + 2)]
    : [offset, offset + 1, offset + 2];
}

export function anchorFromIntersection(
  mesh: Mesh,
  worldPoint: Vector3,
  faceIndex: number,
): SurfaceAnchor | null {
  const geometry = mesh.geometry;
  const indices = triangleVertexIndices(geometry, faceIndex);
  const position = geometry.getAttribute('position');
  if (!indices || !position) return null;
  const a = new Vector3().fromBufferAttribute(position, indices[0]);
  const b = new Vector3().fromBufferAttribute(position, indices[1]);
  const c = new Vector3().fromBufferAttribute(position, indices[2]);
  const localPoint = mesh.worldToLocal(worldPoint.clone());
  const barycentric = Triangle.getBarycoord(localPoint, a, b, c, new Vector3());
  if (!barycentric) return null;
  const normal = new Triangle(a, b, c).getNormal(new Vector3());
  return {
    stableMeshKey: mesh.name,
    primitiveIndex: primitiveIndexForFace(geometry, faceIndex),
    triangleIndex: faceIndex,
    barycentric: [barycentric.x, barycentric.y, barycentric.z],
    localPosition: [localPoint.x, localPoint.y, localPoint.z],
    localNormal: [normal.x, normal.y, normal.z],
  };
}

export function reconstructLocalPoint(
  geometry: BufferGeometry,
  anchor: SurfaceAnchor,
): Vector3 | null {
  const indices = triangleVertexIndices(geometry, anchor.triangleIndex);
  const position = geometry.getAttribute('position');
  if (!indices || !position) return null;
  const a = new Vector3().fromBufferAttribute(position, indices[0]);
  const b = new Vector3().fromBufferAttribute(position, indices[1]);
  const c = new Vector3().fromBufferAttribute(position, indices[2]);
  return new Vector3()
    .addScaledVector(a, anchor.barycentric[0])
    .addScaledVector(b, anchor.barycentric[1])
    .addScaledVector(c, anchor.barycentric[2]);
}
