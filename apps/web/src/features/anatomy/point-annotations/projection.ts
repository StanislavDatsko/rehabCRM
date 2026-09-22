import { Vector3, type Camera, type Mesh, type Object3D } from 'three';
import type { SurfaceAnchor } from '@repo/contracts';
import { reconstructLocalPoint } from '../surface-anchor';

/**
 * Lift the marker off the surface along the normal. The atlas is metric (≈1.8 m body), so two
 * millimetres keeps the point visually on the mesh while never sinking into it.
 */
export const SURFACE_OFFSET = 0.002;

export type ProjectedMarker = {
  x: number;
  y: number;
  /** In front of the camera and inside the viewer. */
  visible: boolean;
  /** Surface normal points towards the camera. */
  facing: boolean;
};

export type MarkerAnchor = { partId: string; anchor: SurfaceAnchor };

/** Minimal DOM surface written on every projection pass; kept small so it can be faked in tests. */
export type MarkerElement = {
  style: { transform: string };
  dataset: { facing?: string; visible?: string };
};

export type SceneBridge = {
  camera: Camera;
  /** Object whose local space the anchor was captured in (the part picker mesh). */
  resolveMesh: (partId: string) => Object3D | null;
  viewport: () => { width: number; height: number };
  requestRender: () => void;
};

type Entry = { anchor: MarkerAnchor; element: MarkerElement | null; screen: ProjectedMarker };

const NOT_VISIBLE: ProjectedMarker = { x: 0, y: 0, visible: false, facing: false };
const scratch = { local: new Vector3(), world: new Vector3(), normal: new Vector3(), eye: new Vector3(), ndc: new Vector3() };

/**
 * Keeps HTML markers glued to their mesh anchors. The scene calls `update()` on every rendered frame;
 * React registers elements once and never re-renders on camera motion.
 */
export class MarkerProjector {
  private bridge: SceneBridge | null = null;
  private readonly entries = new Map<string, Entry>();
  private readonly listeners = new Set<() => void>();

  attach(bridge: SceneBridge): void {
    this.bridge = bridge;
    bridge.requestRender();
  }

  detach(): void {
    this.bridge = null;
    this.entries.forEach((entry) => {
      entry.screen = NOT_VISIBLE;
    });
  }

  register(id: string, anchor: MarkerAnchor, element: MarkerElement | null): () => void {
    this.entries.set(id, { anchor, element, screen: NOT_VISIBLE });
    this.bridge?.requestRender();
    return () => {
      if (this.entries.get(id)?.anchor === anchor) this.entries.delete(id);
      this.bridge?.requestRender();
    };
  }

  screenOf(id: string): ProjectedMarker | null {
    return this.entries.get(id)?.screen ?? null;
  }

  onUpdate(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Anchor → mesh local space (triangle + barycentric, falling back to stored localPosition) → world. */
  worldPosition(anchor: MarkerAnchor, target: Vector3, normalTarget?: Vector3): boolean {
    const mesh = this.bridge?.resolveMesh(anchor.partId);
    if (!mesh) return false;
    const geometry = (mesh as Mesh).geometry;
    const local =
      (geometry ? reconstructLocalPoint(geometry, anchor.anchor) : null) ??
      scratch.local.fromArray(anchor.anchor.localPosition);
    const normal = anchor.anchor.localNormal;
    if (normal) {
      scratch.normal.fromArray(normal).normalize();
      local.addScaledVector(scratch.normal, SURFACE_OFFSET);
      normalTarget?.copy(scratch.normal).transformDirection(mesh.matrixWorld);
    } else normalTarget?.set(0, 0, 0);
    mesh.localToWorld(target.copy(local));
    return true;
  }

  update(): void {
    const bridge = this.bridge;
    if (!bridge || this.entries.size === 0) return;
    const { width, height } = bridge.viewport();
    bridge.camera.getWorldPosition(scratch.eye);
    this.entries.forEach((entry) => {
      const screen = this.project(entry.anchor, width, height);
      entry.screen = screen;
      const element = entry.element;
      if (!element) return;
      element.style.transform = `translate3d(${screen.x.toFixed(1)}px, ${screen.y.toFixed(1)}px, 0)`;
      element.dataset.visible = screen.visible ? 'true' : 'false';
      element.dataset.facing = screen.facing ? 'true' : 'false';
    });
    this.listeners.forEach((listener) => listener());
  }

  private project(anchor: MarkerAnchor, width: number, height: number): ProjectedMarker {
    const bridge = this.bridge!;
    if (!this.worldPosition(anchor, scratch.world, scratch.normal)) return NOT_VISIBLE;
    const toEye = scratch.eye.clone().sub(scratch.world);
    const facing = scratch.normal.lengthSq() === 0 || scratch.normal.dot(toEye) > -0.05;
    scratch.ndc.copy(scratch.world).project(bridge.camera);
    const behind = scratch.ndc.z > 1 || scratch.ndc.z < -1;
    const x = ((scratch.ndc.x + 1) * width) / 2;
    const y = ((1 - scratch.ndc.y) * height) / 2;
    const inside = x >= -24 && x <= width + 24 && y >= -24 && y <= height + 24;
    return { x, y, visible: !behind && inside, facing };
  }
}
