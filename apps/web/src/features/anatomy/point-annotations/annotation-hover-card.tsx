'use client';

import React from 'react';
import { FloatingCard } from './floating-card';
import type { MarkerProjector } from './projection';
import type { PointAnnotationView } from './types';
import { excerpt } from './visibility';

export function formatAnnotationDate(iso: string): string {
  return new Date(iso).toLocaleString('uk-UA', { dateStyle: 'medium', timeStyle: 'short' });
}

export function AnnotationHoverCard({
  projector,
  annotation,
  state,
  onPointerEnter,
  onPointerLeave,
}: {
  projector: MarkerProjector;
  annotation: PointAnnotationView;
  state: 'open' | 'closing';
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}) {
  return (
    <FloatingCard
      projector={projector}
      markerId={annotation.id}
      state={state}
      role="tooltip"
      testId="point-annotation-hover-card"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <p className="pa-card-eyebrow">{annotation.status === 'RESOLVED' ? 'Вирішена нотатка' : 'Нотатка'}</p>
      <p className="pa-card-comment">{excerpt(annotation.comment, 240)}</p>
      <p className="pa-card-meta">
        {annotation.structureName} · {formatAnnotationDate(annotation.createdAt)} · {annotation.createdBy}
      </p>
    </FloatingCard>
  );
}
