'use client';

import React from 'react';
import { useEffect, useRef, useState } from 'react';
import { AnnotationComposer } from './annotation-composer';
import { AnnotationDetailDialog, DeleteConfirmDialog } from './annotation-dialogs';
import { AnnotationHoverCard } from './annotation-hover-card';
import { DraftMarker, MARKER_ARIA_LABEL, PointAnnotationMarker } from './point-annotation-marker';
import type { MarkerProjector } from './projection';
import type { PointUiState } from './state';
import { DRAFT_MARKER_ID, type PointAnnotationView } from './types';
import { excerpt, type IsolationState } from './visibility';

const HOVER_HIDE_DELAY_MS = 140;
const CARD_CLOSE_MS = 160;
const TOAST_MS = 2600;

/** Keeps the last hovered annotation mounted long enough to play the closing animation. */
function usePresence<T>(value: T | null, ms: number): { item: T | null; state: 'open' | 'closing' } {
  const [current, setCurrent] = useState<{ item: T | null; state: 'open' | 'closing' }>({ item: value, state: 'open' });
  useEffect(() => {
    if (value) {
      setCurrent({ item: value, state: 'open' });
      return;
    }
    setCurrent((previous) => (previous.item ? { item: previous.item, state: 'closing' } : previous));
    const timer = setTimeout(() => setCurrent({ item: null, state: 'open' }), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return current;
}

export type PointAnnotationsLayerProps = {
  projector: MarkerProjector;
  /** Already filtered to the isolated structure. */
  annotations: readonly PointAnnotationView[];
  isolation: IsolationState;
  ui: PointUiState;
  canCreate: boolean;
  canDelete: boolean;
  highlightId?: string | null;
  onHover: (id: string | null) => void;
  onMarkerClick: (id: string) => void;
  onDraftComment: (comment: string) => void;
  onDraftSave: () => void;
  onDraftCancel: () => void;
  onDetailClose: () => void;
  onDeleteRequest: (id: string) => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  onToastDone: () => void;
};

export function PointAnnotationsLayer({
  projector,
  annotations,
  isolation,
  ui,
  canCreate,
  canDelete,
  highlightId = null,
  onHover,
  onMarkerClick,
  onDraftComment,
  onDraftSave,
  onDraftCancel,
  onDetailClose,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
  onToastDone,
}: PointAnnotationsLayerProps) {
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearLeave = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = null;
  };
  const enter = (id: string) => {
    clearLeave();
    onHover(id);
  };
  const leave = () => {
    clearLeave();
    leaveTimer.current = setTimeout(() => onHover(null), HOVER_HIDE_DELAY_MS);
  };
  useEffect(() => clearLeave, []);

  const dialogOpen = ui.detailId !== null || ui.confirmDeleteId !== null;
  const hoverTarget =
    !dialogOpen && !ui.draft ? annotations.find((item) => item.id === ui.hoveredId) ?? null : null;
  const hover = usePresence(hoverTarget, CARD_CLOSE_MS);
  const detail = annotations.find((item) => item.id === ui.detailId) ?? null;

  useEffect(() => {
    if (!ui.toast) return;
    const timer = setTimeout(onToastDone, TOAST_MS);
    return () => clearTimeout(timer);
  }, [ui.toast, onToastDone]);

  const showHint =
    isolation.isolate && canCreate && !ui.draft && !dialogOpen && annotations.length === 0;

  return (
    <>
      <div
        className="pa-layer"
        data-testid="point-annotations-layer"
        data-count={annotations.length}
        data-isolated={isolation.isolate ? 'true' : 'false'}
      >
        {annotations.map((annotation) => (
          <PointAnnotationMarker
            key={annotation.id}
            projector={projector}
            id={annotation.id}
            partId={annotation.partId}
            anchor={annotation.anchor}
            label={`${MARKER_ARIA_LABEL}: ${excerpt(annotation.comment, 80)}`}
            color={annotation.color}
            tone={annotation.status === 'RESOLVED' ? 'resolved' : 'active'}
            active={annotation.id === ui.detailId || annotation.id === highlightId}
            onEnter={() => enter(annotation.id)}
            onLeave={leave}
            onClick={() => {
              clearLeave();
              onMarkerClick(annotation.id);
            }}
          />
        ))}
        {ui.draft ? (
          <DraftMarker
            projector={projector}
            id={DRAFT_MARKER_ID}
            partId={ui.draft.partId}
            anchor={ui.draft.anchor}
          />
        ) : null}
        {hover.item ? (
          <AnnotationHoverCard
            projector={projector}
            annotation={hover.item}
            state={hover.state}
            onPointerEnter={clearLeave}
            onPointerLeave={leave}
          />
        ) : null}
        {ui.draft ? (
          <AnnotationComposer
            projector={projector}
            draft={ui.draft}
            onComment={onDraftComment}
            onSave={onDraftSave}
            onCancel={onDraftCancel}
          />
        ) : null}
        {showHint ? (
          <p className="pa-hint-badge" data-testid="point-annotation-hint">
            Натисніть на поверхню структури, щоб додати нотатку
          </p>
        ) : null}
        {ui.toast ? (
          <p role="status" className="pa-toast" data-testid="point-annotation-toast" key={ui.toast.key}>
            {ui.toast.message}
          </p>
        ) : null}
      </div>
      {detail && ui.confirmDeleteId === null ? (
        <AnnotationDetailDialog
          annotation={detail}
          canDelete={canDelete}
          onDelete={() => onDeleteRequest(detail.id)}
          onClose={onDetailClose}
        />
      ) : null}
      {ui.confirmDeleteId ? (
        <DeleteConfirmDialog busy={ui.deleting} onConfirm={onDeleteConfirm} onCancel={onDeleteCancel} />
      ) : null}
    </>
  );
}
