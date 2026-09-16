'use client';

import { OrbitControls, useGLTF } from '@react-three/drei';
import { Canvas, type ThreeEvent, useThree } from '@react-three/fiber';
import type {
  AnatomicalMappingResponse,
  AnatomicalModelResponse,
  BodyAnnotationResponse,
  SurfaceAnchor,
} from '@repo/contracts';
import { Suspense, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  Box3,
  BufferGeometry,
  Group,
  Material,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  Vector3,
} from 'three';
import {
  anchorFromIntersection,
  primitiveIndexForFace,
  reconstructLocalPoint,
} from '../surface-anchor';
import { maximumActiveSeverityByStructure } from '../annotation-heatmap';
import { findGltfSourceNode, gltfSourceNodeName } from '../scene-node-identity';
import { AnnotationMarker } from './annotation-marker';

export type SurfaceSelection = {
  anchor: SurfaceAnchor;
  mapping: AnatomicalMappingResponse;
  modelVersionId: string;
};
export type UnmappedSurfaceSelection = {
  modelVersionId: string;
  meshName: string;
  meshKey: string;
  primitiveIndex: number;
  mappingStatus: 'UNMAPPED';
};
type LayerState = Record<string, { visible: boolean; opacity: number }>;

function meshesUnder(node: Object3D): Mesh[] {
  const result: Mesh[] = [];
  node.traverse((item) => {
    if ((item as Mesh).isMesh) result.push(item as Mesh);
  });
  return result;
}

function mappedNode(
  object: Object3D,
  byNode: Map<string, AnatomicalMappingResponse[]>,
): { node: Object3D; mappings: AnatomicalMappingResponse[] } | null {
  let current: Object3D | null = object;
  while (current) {
    const mappings = byNode.get(gltfSourceNodeName(current));
    if (mappings) return { node: current, mappings };
    current = current.parent;
  }
  return null;
}

function markerPoint(scene: Group, annotation: BodyAnnotationResponse): Vector3 | null {
  const node = findGltfSourceNode(scene, annotation.anchor.stableMeshKey);
  const meshes = node ? meshesUnder(node) : [];
  const mesh = meshes.length === 1 ? meshes[0] : meshes[annotation.anchor.primitiveIndex];
  if (!mesh || !(mesh.geometry instanceof BufferGeometry)) return null;
  const local = reconstructLocalPoint(mesh.geometry, annotation.anchor);
  if (!local) return null;
  if (annotation.anchor.localNormal) {
    local.add(new Vector3(...annotation.anchor.localNormal).normalize().multiplyScalar(0.006));
  }
  mesh.updateWorldMatrix(true, false);
  return mesh.localToWorld(local);
}

function CameraRig({
  preset,
  selectedStructureId,
  selectedMeshKey,
  mappings,
}: {
  preset: string;
  selectedStructureId: string | null;
  selectedMeshKey: string | null;
  mappings: AnatomicalMappingResponse[];
}) {
  const { camera, scene } = useThree();
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  useEffect(() => {
    if (preset.startsWith('fit') && camera instanceof PerspectiveCamera) {
      const bounds = new Box3();
      if (preset.startsWith('fit:') && selectedStructureId)
        mappings
          .filter((mapping) => mapping.structureId === selectedStructureId)
          .forEach((mapping) => {
            const object = findGltfSourceNode(scene, mapping.nodeName);
            if (object) bounds.expandByObject(object);
          });
      if (preset.startsWith('fit-mesh:') && selectedMeshKey) {
        const object = findGltfSourceNode(scene, selectedMeshKey);
        if (object) bounds.expandByObject(object);
      }
      if (!bounds.isEmpty()) {
        const center = bounds.getCenter(new Vector3());
        const size = bounds.getSize(new Vector3());
        const distance =
          (Math.max(size.x, size.y, size.z) / (2 * Math.tan((camera.fov * Math.PI) / 360))) * 1.5;
        const direction = camera.position.clone().sub(center).normalize();
        if (direction.lengthSq() === 0) direction.set(0, 0, 1);
        camera.position.copy(
          center.clone().add(direction.multiplyScalar(Math.max(distance, 0.25))),
        );
        controls.current?.target.copy(center);
        controls.current?.update();
        camera.updateProjectionMatrix();
        return;
      }
    }
    const view = preset.split('-')[0];
    const position =
      view === 'posterior'
        ? [0, 0.9, -2.3]
        : view === 'left'
          ? [2.3, 0.9, 0]
          : view === 'right'
            ? [-2.3, 0.9, 0]
            : [0, 0.9, 2.3];
    camera.position.set(position[0]!, position[1]!, position[2]!);
    camera.lookAt(0, 0.85, 0);
    controls.current?.target.set(0, 0.85, 0);
    controls.current?.update();
    camera.updateProjectionMatrix();
  }, [camera, mappings, preset, scene, selectedStructureId]);
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={[0, 0.85, 0]}
      minDistance={0.15}
      maxDistance={5}
    />
  );
}

function ModelLayer({
  model,
  state,
  mappings,
  annotations,
  selectedStructureId,
  selectedAnnotationId,
  selectedMeshKey,
  isolate,
  hiddenStructureIds,
  hiddenMeshKeys,
  heatmap,
  hoveredStructureId,
  onSelect,
  onAnnotationSelect,
  onHover,
  onUnmapped,
}: {
  model: AnatomicalModelResponse;
  state: { visible: boolean; opacity: number };
  mappings: AnatomicalMappingResponse[];
  annotations: BodyAnnotationResponse[];
  selectedStructureId: string | null;
  selectedAnnotationId: string | null;
  selectedMeshKey: string | null;
  isolate: boolean;
  hiddenStructureIds: Set<string>;
  hiddenMeshKeys: Set<string>;
  heatmap: boolean;
  hoveredStructureId: string | null;
  onSelect: (selection: SurfaceSelection) => void;
  onAnnotationSelect: (annotationId: string) => void;
  onHover: (structureId: string | null) => void;
  onUnmapped: (selection: UnmappedSurfaceSelection) => void;
}) {
  const version = model.activeVersion!;
  const gltf = useGLTF(version.assetUrl);
  const scene = useMemo(() => {
    const cloned = gltf.scene.clone(true) as Group;
    cloned.traverse((item) => {
      const mesh = item as Mesh;
      if (!mesh.isMesh) return;
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((material) => material.clone())
        : mesh.material.clone();
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((material) => {
        if (material instanceof MeshStandardMaterial)
          material.userData.baseColor = material.color.getHex();
      });
    });
    return cloned;
  }, [gltf.scene]);
  const byNode = useMemo(() => {
    const map = new Map<string, AnatomicalMappingResponse[]>();
    mappings
      .filter((item) => item.modelVersionId === version.id)
      .forEach((item) => map.set(item.nodeName, [...(map.get(item.nodeName) ?? []), item]));
    return map;
  }, [mappings, version.id]);
  const severity = useMemo(() => maximumActiveSeverityByStructure(annotations), [annotations]);

  useEffect(() => {
    scene.traverse((item) => {
      const mesh = item as Mesh;
      if (!mesh.isMesh) return;
      const found = mappedNode(mesh, byNode);
      const structureId = found?.mappings[0]?.structureId;
      const meshKey = gltfSourceNodeName(mesh);
      mesh.visible = !structureId
        ? !hiddenMeshKeys.has(meshKey) && (!isolate || meshKey === selectedMeshKey)
        : !hiddenStructureIds.has(structureId) && (!isolate || structureId === selectedStructureId);
      const materials = (
        Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      ) as Material[];
      materials.forEach((material) => {
        material.transparent = state.opacity < 1;
        material.opacity = state.opacity;
        material.depthWrite = state.opacity >= 1;
        if (material instanceof MeshStandardMaterial) {
          material.color.setHex(Number(material.userData.baseColor));
          const highlighted =
            structureId === selectedStructureId ||
            structureId === hoveredStructureId ||
            gltfSourceNodeName(mesh) === selectedMeshKey;
          material.emissive.set(highlighted ? '#0ea5e9' : '#000000');
          material.emissiveIntensity =
            structureId === selectedStructureId || gltfSourceNodeName(mesh) === selectedMeshKey
              ? 0.7
              : highlighted
                ? 0.3
                : 0;
          if (heatmap && structureId && severity.has(structureId)) {
            const score = severity.get(structureId)!;
            material.color.set(score >= 7 ? '#dc2626' : score >= 4 ? '#f59e0b' : '#22c55e');
          }
        }
        material.needsUpdate = true;
      });
    });
  }, [
    byNode,
    heatmap,
    hiddenStructureIds,
    hiddenMeshKeys,
    hoveredStructureId,
    isolate,
    scene,
    selectedStructureId,
    selectedMeshKey,
    selectedMeshKey,
    selectedMeshKey,
    severity,
    state.opacity,
  ]);

  const click = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (event.faceIndex == null || !(event.object instanceof Mesh)) return;
    const found = mappedNode(event.object, byNode);
    if (!found) {
      const primitiveIndex = primitiveIndexForFace(event.object.geometry, event.faceIndex);
      const meshKey = gltfSourceNodeName(event.object);
      onUnmapped({
        modelVersionId: version.id,
        meshName: event.object.name || meshKey,
        meshKey,
        primitiveIndex,
        mappingStatus: 'UNMAPPED',
      });
      return;
    }
    const nodeMeshes = meshesUnder(found.node);
    const primitiveIndex =
      nodeMeshes.length === 1
        ? primitiveIndexForFace(event.object.geometry, event.faceIndex)
        : nodeMeshes.indexOf(event.object);
    const mapping = found.mappings.find(
      (item) => item.primitiveIndex === Math.max(0, primitiveIndex),
    );
    if (!mapping) return;
    const anchor = anchorFromIntersection(event.object, event.point, event.faceIndex);
    if (!anchor) return;
    onSelect({
      mapping,
      modelVersionId: version.id,
      anchor: {
        ...anchor,
        stableMeshKey: mapping.stableMeshKey,
        primitiveIndex: mapping.primitiveIndex,
      },
    });
  };

  const hover = (event: ThreeEvent<PointerEvent>) => {
    if (!(event.object instanceof Mesh)) return;
    const found = mappedNode(event.object, byNode);
    onHover(found?.mappings[0]?.structureId ?? null);
    document.body.style.cursor = found ? 'pointer' : 'not-allowed';
  };

  return (
    <group
      visible={state.visible}
      position={version.transform.position}
      rotation={version.transform.rotation}
      scale={version.transform.scale}
      onPointerDown={click}
      onPointerMove={hover}
      onPointerOut={() => {
        onHover(null);
        document.body.style.cursor = 'default';
      }}
    >
      <primitive object={scene} />
      {annotations
        .filter((item) => item.modelVersionId === version.id && item.status !== 'VOIDED')
        .map((annotation) => {
          const point = markerPoint(scene, annotation);
          return point ? (
            <AnnotationMarker
              key={annotation.id}
              annotation={annotation}
              position={point}
              selected={annotation.id === selectedAnnotationId}
              onSelect={onAnnotationSelect}
            />
          ) : null;
        })}
    </group>
  );
}

export function AnatomyViewer({
  models,
  mappings,
  annotations,
  layers,
  selectedStructureId,
  selectedMeshKey,
  selectedAnnotationId,
  isolate,
  hiddenStructureIds,
  hiddenMeshKeys,
  heatmap,
  preset,
  onSelect,
  onAnnotationSelect,
  onUnmapped,
}: {
  models: AnatomicalModelResponse[];
  mappings: AnatomicalMappingResponse[];
  annotations: BodyAnnotationResponse[];
  layers: LayerState;
  selectedStructureId: string | null;
  selectedMeshKey: string | null;
  selectedAnnotationId: string | null;
  isolate: boolean;
  hiddenStructureIds: Set<string>;
  hiddenMeshKeys: Set<string>;
  heatmap: boolean;
  preset: string;
  onSelect: (selection: SurfaceSelection) => void;
  onAnnotationSelect: (annotationId: string) => void;
  onUnmapped: (selection: UnmappedSurfaceSelection) => void;
}) {
  // ATLAS versions are rendered by HumanAtlasExplorer; this historical viewer
  // must only attempt GLB assets so legacy annotations remain readable.
  const available = models.filter((model) => model.activeVersion?.format === 'GLB');
  const [hoveredStructureId, setHoveredStructureId] = useState<string | null>(null);
  return (
    <div
      className="h-[620px] overflow-hidden rounded-md border border-border bg-slate-950"
      aria-label="Interactive three-dimensional anatomy viewer"
    >
      <Canvas
        camera={{ position: [0, 0.9, 2.3], fov: 35 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#07101f']} />
        <ambientLight intensity={1.5} />
        <directionalLight position={[2, 3, 2]} intensity={2} />
        <Suspense
          fallback={
            <mesh position={[0, 0.85, 0]}>
              <sphereGeometry args={[0.08, 16, 16]} />
              <meshBasicMaterial color="#9acd32" />
            </mesh>
          }
        >
          {available.map((model) => (
            <ModelLayer
              key={model.id}
              model={model}
              state={layers[model.kind] ?? { visible: true, opacity: 1 }}
              mappings={mappings}
              annotations={annotations}
              selectedStructureId={selectedStructureId}
              selectedMeshKey={selectedMeshKey}
              selectedAnnotationId={selectedAnnotationId}
              isolate={isolate}
              hiddenStructureIds={hiddenStructureIds}
              hiddenMeshKeys={hiddenMeshKeys}
              heatmap={heatmap}
              hoveredStructureId={hoveredStructureId}
              onSelect={onSelect}
              onAnnotationSelect={onAnnotationSelect}
              onHover={setHoveredStructureId}
              onUnmapped={onUnmapped}
            />
          ))}
        </Suspense>
        <CameraRig
          preset={preset}
          selectedStructureId={selectedStructureId}
          selectedMeshKey={selectedMeshKey}
          mappings={mappings}
        />
      </Canvas>
    </div>
  );
}
