import { BufferAttribute, BufferGeometry, Group, Mesh, PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { SurfaceAnchor } from '@repo/contracts';
import { MarkerProjector, SURFACE_OFFSET, type MarkerElement } from './projection';

/** A single upward-facing triangle at y = 0 with vertices at 0, 1 m on x and z. */
function triangleMesh(): Mesh {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 0, 1]), 3),
  );
  geometry.setIndex([0, 1, 2]);
  return new Mesh(geometry);
}

const anchor: SurfaceAnchor = {
  stableMeshKey: 'FJ2000',
  primitiveIndex: 0,
  triangleIndex: 0,
  barycentric: [0.5, 0.25, 0.25],
  localPosition: [0.25, 0, 0.25],
  localNormal: [0, 1, 0],
};

function fakeElement(): MarkerElement {
  return { style: { transform: '' }, dataset: {} };
}

function setup(cameraPosition: Vector3, mesh = triangleMesh()) {
  const camera = new PerspectiveCamera(40, 800 / 600, 0.01, 100);
  camera.position.copy(cameraPosition);
  camera.lookAt(0.25, 0, 0.25);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  mesh.updateMatrixWorld(true);
  let renders = 0;
  const projector = new MarkerProjector();
  projector.attach({
    camera,
    resolveMesh: (partId) => (partId === 'FJ2000' ? mesh : null),
    viewport: () => ({ width: 800, height: 600 }),
    requestRender: () => {
      renders += 1;
    },
  });
  return { camera, mesh, projector, renders: () => renders };
}

describe('MarkerProjector', () => {
  it('reconstructs the anchored triangle point in mesh local space and lifts it along the normal', () => {
    const { projector } = setup(new Vector3(0.25, 3, 0.25));
    const world = new Vector3();
    expect(projector.worldPosition({ partId: 'FJ2000', anchor }, world)).toBe(true);
    expect(world.x).toBeCloseTo(0.25, 6);
    expect(world.z).toBeCloseTo(0.25, 6);
    expect(world.y).toBeCloseTo(SURFACE_OFFSET, 6);
  });

  it('follows nested transforms and non-unit scale of the owning mesh', () => {
    const mesh = triangleMesh();
    const parent = new Group();
    parent.position.set(10, 0, 0);
    parent.scale.setScalar(2);
    parent.add(mesh);
    mesh.position.set(0, 1, 0);
    parent.updateMatrixWorld(true);
    const { projector } = setup(new Vector3(10.5, 6, 0.5), mesh);
    const world = new Vector3();
    projector.worldPosition({ partId: 'FJ2000', anchor }, world);
    expect(world.x).toBeCloseTo(10 + 0.5, 6);
    expect(world.y).toBeCloseTo(2 * (1 + SURFACE_OFFSET), 6);
    expect(world.z).toBeCloseTo(0.5, 6);
  });

  it('projects a marker to the same viewer pixel as the camera does and writes the DOM transform', () => {
    const { projector, camera } = setup(new Vector3(0.25, 3, 0.25));
    const element = fakeElement();
    projector.register('a1', { partId: 'FJ2000', anchor }, element);
    projector.update();
    const screen = projector.screenOf('a1')!;
    const expected = new Vector3(0.25, SURFACE_OFFSET, 0.25).project(camera);
    expect(screen.x).toBeCloseTo(((expected.x + 1) * 800) / 2, 3);
    expect(screen.y).toBeCloseTo(((1 - expected.y) * 600) / 2, 3);
    expect(screen.visible).toBe(true);
    expect(screen.facing).toBe(true);
    expect(element.style.transform).toBe(`translate3d(${screen.x.toFixed(1)}px, ${screen.y.toFixed(1)}px, 0)`);
    expect(element.dataset.visible).toBe('true');
  });

  it('keeps the marker on the surface point while the camera orbits 180° and zooms', () => {
    const { projector, camera } = setup(new Vector3(2, 2, 2));
    projector.register('a1', { partId: 'FJ2000', anchor }, fakeElement());
    const world = new Vector3();
    projector.worldPosition({ partId: 'FJ2000', anchor }, world);
    for (const position of [new Vector3(2, 2, 2), new Vector3(-1.5, 2, -1.5), new Vector3(0.6, 0.8, 0.6)]) {
      camera.position.copy(position);
      camera.lookAt(0.25, 0, 0.25);
      camera.updateMatrixWorld(true);
      projector.update();
      const screen = projector.screenOf('a1')!;
      const expected = world.clone().project(camera);
      expect(screen.x).toBeCloseTo(((expected.x + 1) * 800) / 2, 3);
      expect(screen.y).toBeCloseTo(((1 - expected.y) * 600) / 2, 3);
    }
  });

  it('marks a point behind the camera as not visible and a back-facing point as not facing', () => {
    const { projector, camera } = setup(new Vector3(0.25, 3, 0.25));
    projector.register('a1', { partId: 'FJ2000', anchor }, fakeElement());
    camera.position.set(0.25, -3, 0.25);
    camera.lookAt(0.25, -10, 0.25);
    camera.updateMatrixWorld(true);
    projector.update();
    expect(projector.screenOf('a1')!.visible).toBe(false);
    camera.lookAt(0.25, 0, 0.25);
    camera.updateMatrixWorld(true);
    projector.update();
    expect(projector.screenOf('a1')!.facing).toBe(false);
  });

  it('hides markers whose mesh is not mounted and requests a render on registration changes', () => {
    const { projector, renders } = setup(new Vector3(0.25, 3, 0.25));
    const before = renders();
    const unregister = projector.register('ghost', { partId: 'missing', anchor }, fakeElement());
    projector.update();
    expect(projector.screenOf('ghost')!.visible).toBe(false);
    unregister();
    expect(projector.screenOf('ghost')).toBeNull();
    expect(renders()).toBeGreaterThan(before);
  });
});
