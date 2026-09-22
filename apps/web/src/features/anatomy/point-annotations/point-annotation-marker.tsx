'use client';

import React from 'react';
import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import type { SurfaceAnchor } from '@repo/contracts';
import type { MarkerAnchor, MarkerProjector } from './projection';

export const MARKER_ARIA_LABEL = 'Нотатка до анатомічної точки';

export function PointAnnotationMarker({
  projector,
  id,
  partId,
  anchor,
  label,
  color,
  tone = 'active',
  active = false,
  onEnter,
  onLeave,
  onClick,
}: {
  projector: MarkerProjector;
  id: string;
  partId: string;
  anchor: SurfaceAnchor;
  label: string;
  color?: string | null;
  tone?: 'active' | 'resolved';
  active?: boolean;
  onEnter?: () => void;
  onLeave?: () => void;
  onClick?: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const markerAnchor = useMemo<MarkerAnchor>(() => ({ partId, anchor }), [partId, anchor]);
  useEffect(() => projector.register(id, markerAnchor, ref.current), [projector, id, markerAnchor]);
  const style = color ? ({ '--pa-color': color } as CSSProperties) : undefined;
  return (
    <button
      ref={ref}
      type="button"
      className={`pa-marker ${tone === 'resolved' ? 'pa-marker--resolved' : ''}`}
      data-testid="point-annotation-marker"
      data-annotation-id={id}
      data-visible="false"
      data-active={active ? 'true' : 'false'}
      aria-label={label}
      style={style}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
    >
      <span className="pa-marker-core" aria-hidden="true" />
    </button>
  );
}

/** Temporary marker shown while the composer is open. Not focusable; the composer carries the semantics. */
export function DraftMarker({ projector, id, partId, anchor }: { projector: MarkerProjector; id: string; partId: string; anchor: SurfaceAnchor }) {
  const ref = useRef<HTMLDivElement>(null);
  const markerAnchor = useMemo<MarkerAnchor>(() => ({ partId, anchor }), [partId, anchor]);
  useEffect(() => projector.register(id, markerAnchor, ref.current), [projector, id, markerAnchor]);
  return (
    <div
      ref={ref}
      className="pa-marker pa-marker--draft"
      data-testid="point-annotation-draft"
      data-visible="false"
      aria-hidden="true"
    >
      <span className="pa-marker-core" />
    </div>
  );
}
