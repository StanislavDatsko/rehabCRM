'use client';

import { Html } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import type { BodyAnnotationResponse } from '@repo/contracts';
import React, { useState } from 'react';
import type { Vector3 } from 'three';
import {
  ANNOTATION_TYPE_ICONS,
  annotationMarkerColor,
  annotationMarkerLabel,
} from '../annotation-marker';

export function AnnotationMarker({
  annotation,
  position,
  selected,
  onSelect,
}: {
  annotation: BodyAnnotationResponse;
  position: Vector3;
  selected: boolean;
  onSelect: (annotationId: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const label = annotationMarkerLabel(annotation);
  const color = annotationMarkerColor(annotation);
  const selectMesh = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect(annotation.id);
  };
  return (
    <group position={position}>
      <mesh
        scale={selected || hovered ? 1.35 : 1}
        onClick={selectMesh}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'default';
        }}
      >
        <sphereGeometry args={[0.012, 12, 12]} />
        <meshStandardMaterial color={color} emissive="#ffffff" emissiveIntensity={0.15} />
      </mesh>
      <Html center distanceFactor={7} zIndexRange={[20, 0]}>
        <button
          type="button"
          aria-label={label}
          title={label}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(annotation.id);
          }}
          className={`flex h-7 min-w-7 items-center justify-center rounded-full border-2 px-1 text-[10px] font-bold text-white shadow ${selected ? 'border-white ring-2 ring-info' : 'border-slate-100/80'}`}
          style={{ backgroundColor: color }}
        >
          <span aria-hidden="true">{ANNOTATION_TYPE_ICONS[annotation.type]}</span>
          {annotation.severity === null ? null : (
            <span aria-hidden="true" className="ml-0.5">
              {annotation.severity}
            </span>
          )}
        </button>
      </Html>
    </group>
  );
}
