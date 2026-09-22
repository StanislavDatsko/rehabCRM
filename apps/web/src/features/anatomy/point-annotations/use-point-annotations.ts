'use client';

import type {
  AnatomicalMappingResponse,
  AnatomicalModelResponse,
  AnatomicalStructureResponse,
  BodyAnnotationResponse,
} from '@repo/contracts';
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import {
  createPointAnnotationAction,
  voidPointAnnotationAction,
} from '../actions/anatomy-actions';
import type { AtlasSelection } from '../human-atlas/scene';
import { validatePointAnnotationInput } from './input';
import { MarkerProjector } from './projection';
import { initialPointUiState, pointUiReducer } from './state';
import { toPointAnnotationView, type PointAnnotationView } from './types';
import { canCreatePointAt, NO_ISOLATION, visiblePointAnnotations, type IsolationState } from './visibility';

export type SurfaceTapOutcome = 'draft' | 'unmapped' | 'ignored';

/**
 * Owns the point-note domain state for one patient body map: the merged annotation list, the
 * isolation reported by the explorer, the visible subset, and the create/void round trips.
 */
export function usePointAnnotations(input: {
  patientId: string;
  encounterId?: string;
  serverAnnotations: BodyAnnotationResponse[];
  structures: readonly AnatomicalStructureResponse[];
  models: readonly AnatomicalModelResponse[];
  mappings: readonly AnatomicalMappingResponse[];
  canCreate: boolean;
  canDelete: boolean;
}) {
  const { patientId, encounterId, serverAnnotations, structures, models, mappings, canCreate, canDelete } = input;
  const projector = useMemo(() => new MarkerProjector(), []);
  const [annotations, setAnnotations] = useState(serverAnnotations);
  useEffect(() => setAnnotations(serverAnnotations), [serverAnnotations]);

  const atlasVersionId = useMemo(
    () => models.find((model) => model.activeVersion?.format === 'ATLAS')?.activeVersion?.id ?? null,
    [models],
  );
  const mappingByPart = useMemo(() => {
    const map = new Map<string, AnatomicalMappingResponse>();
    for (const mapping of mappings)
      if (mapping.modelVersionId === atlasVersionId && mapping.sourcePartId)
        map.set(mapping.sourcePartId, mapping);
    return map;
  }, [atlasVersionId, mappings]);
  const structureIdForPart = useCallback(
    (partId: string) => mappingByPart.get(partId)?.structureId,
    [mappingByPart],
  );

  const views = useMemo(
    () =>
      annotations
        .map(toPointAnnotationView)
        .filter((view): view is PointAnnotationView => view !== null),
    [annotations],
  );
  const [isolation, setIsolation] = useState<IsolationState>(NO_ISOLATION);
  const visible = useMemo(
    () => visiblePointAnnotations(views, isolation, structureIdForPart),
    [views, isolation, structureIdForPart],
  );

  const [ui, dispatch] = useReducer(pointUiReducer, initialPointUiState);
  const partIdOf = useCallback(
    (id: string) => views.find((view) => view.id === id)?.partId ?? null,
    [views],
  );
  useEffect(() => dispatch({ type: 'ISOLATION_CHANGED', isolation, partIdOf }), [isolation, partIdOf]);
  useEffect(
    () => dispatch({ type: 'ANNOTATIONS_CHANGED', ids: new Set(views.map((view) => view.id)) }),
    [views],
  );

  const onSurfaceTap = useCallback(
    (selection: AtlasSelection): SurfaceTapOutcome => {
      if (!canCreatePointAt({ isolation, partId: selection.sourcePartId, canCreate })) return 'ignored';
      const mapping = atlasVersionId ? mappingByPart.get(selection.sourcePartId) : undefined;
      if (!mapping || !atlasVersionId) return 'unmapped';
      const structure = structures.find((item) => item.id === mapping.structureId);
      dispatch({
        type: 'SURFACE_TAP',
        draft: {
          partId: selection.sourcePartId,
          structureId: mapping.structureId,
          structureName: structure?.name ?? mapping.meshName,
          mappingId: mapping.id,
          modelVersionId: atlasVersionId,
          anchor: { ...selection.anchor, stableMeshKey: mapping.stableMeshKey, primitiveIndex: mapping.primitiveIndex },
          comment: '',
          error: null,
          saving: false,
        },
      });
      return 'draft';
    },
    [atlasVersionId, canCreate, isolation, mappingByPart, structures],
  );

  const draft = ui.draft;
  const saveDraft = useCallback(async () => {
    if (!draft || draft.saving) return;
    const valid = validatePointAnnotationInput({
      patientId,
      encounterId: encounterId ?? null,
      structureId: draft.structureId,
      modelVersionId: draft.modelVersionId,
      mappingId: draft.mappingId,
      anchor: draft.anchor,
      comment: draft.comment,
    });
    if (!valid.ok) {
      dispatch({ type: 'DRAFT_FAILED', error: valid.error });
      return;
    }
    dispatch({ type: 'DRAFT_SAVING' });
    const result = await createPointAnnotationAction(valid.value);
    if (result.ok) {
      setAnnotations((previous) =>
        previous.some((item) => item.id === result.annotation.id)
          ? previous
          : [result.annotation, ...previous],
      );
      dispatch({ type: 'DRAFT_SAVED' });
    } else dispatch({ type: 'DRAFT_FAILED', error: result.error });
  }, [draft, encounterId, patientId]);

  const confirmDeleteId = ui.confirmDeleteId;
  const confirmDelete = useCallback(async () => {
    const view = views.find((item) => item.id === confirmDeleteId);
    if (!view || ui.deleting) return;
    dispatch({ type: 'DELETING' });
    const result = await voidPointAnnotationAction({
      patientId,
      annotationId: view.id,
      version: view.version,
    });
    if (result.ok) {
      setAnnotations((previous) =>
        previous.map((item) => (item.id === view.id ? result.annotation : item)),
      );
      dispatch({ type: 'DELETED', id: view.id, message: 'Точкову нотатку видалено' });
    } else dispatch({ type: 'DELETE_FAILED', message: result.error });
  }, [confirmDeleteId, patientId, ui.deleting, views]);

  return {
    projector,
    annotations,
    views,
    visible,
    isolation,
    setIsolation,
    ui,
    canCreate,
    canDelete,
    onSurfaceTap,
    saveDraft,
    confirmDelete,
    hover: useCallback((id: string | null) => dispatch({ type: 'HOVER', id }), []),
    openDetail: useCallback((id: string) => dispatch({ type: 'MARKER_CLICK', id }), []),
    closeDetail: useCallback(() => dispatch({ type: 'DETAIL_CLOSE' }), []),
    setDraftComment: useCallback((comment: string) => dispatch({ type: 'DRAFT_COMMENT', comment }), []),
    cancelDraft: useCallback(() => dispatch({ type: 'DRAFT_CANCEL' }), []),
    requestDelete: useCallback((id: string) => dispatch({ type: 'DELETE_REQUEST', id }), []),
    cancelDelete: useCallback(() => dispatch({ type: 'DELETE_CANCEL' }), []),
    clearToast: useCallback(() => dispatch({ type: 'TOAST_CLEAR' }), []),
  };
}

export type PointAnnotationsController = ReturnType<typeof usePointAnnotations>;
