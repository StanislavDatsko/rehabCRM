import { BufferAttribute, BufferGeometry, Mesh, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  anchorFromIntersection,
  reconstructLocalPoint,
  triangleVertexIndices,
} from './surface-anchor';

function triangle() {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3),
  );
  return geometry;
}

describe('surface anchors', () => {
  it('supports non-indexed triangles and rejects missing faces', () => {
    expect(triangleVertexIndices(triangle(), 0)).toEqual([0, 1, 2]);
    expect(triangleVertexIndices(triangle(), 1)).toBeNull();
  });

  it('round trips a point using triangle+barycentric coordinates', () => {
    const mesh = new Mesh(triangle());
    mesh.name = 'sample.l';
    mesh.updateMatrixWorld(true);
    const anchor = anchorFromIntersection(mesh, new Vector3(0.25, 0.25, 0), 0)!;
    const reconstructed = reconstructLocalPoint(mesh.geometry, anchor)!;
    expect(anchor.barycentric.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1);
    expect(reconstructed.toArray()).toEqual(
      expect.arrayContaining([expect.closeTo(0.25), expect.closeTo(0.25), expect.closeTo(0)]),
    );
  });
});
