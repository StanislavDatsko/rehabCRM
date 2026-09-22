import { describe, expect, it } from 'vitest';
import { initialPointUiState, pointUiReducer, type PointUiAction } from './state';
import type { PointDraft } from './types';

const draft: PointDraft = {
  partId: 'FJ2000',
  structureId: 'biceps',
  structureName: 'Biceps brachii',
  mappingId: 'mapping-1',
  modelVersionId: 'version-1',
  anchor: {
    stableMeshKey: 'FJ2000',
    primitiveIndex: 0,
    triangleIndex: 4,
    barycentric: [0.2, 0.3, 0.5],
    localPosition: [0.1, 1.2, 0.05],
    localNormal: [0, 0, 1],
  },
  comment: '',
  error: null,
  saving: false,
};

const run = (...actions: PointUiAction[]) => actions.reduce(pointUiReducer, initialPointUiState);

describe('pointUiReducer', () => {
  it('opens the composer with a temporary marker on a surface tap', () => {
    const state = run({ type: 'SURFACE_TAP', draft });
    expect(state.draft).toEqual(draft);
    expect(state.hoveredId).toBeNull();
  });

  it('removes the temporary marker completely on cancel', () => {
    const state = run(
      { type: 'SURFACE_TAP', draft },
      { type: 'DRAFT_COMMENT', comment: 'Біль' },
      { type: 'DRAFT_CANCEL' },
    );
    expect(state.draft).toBeNull();
  });

  it('keeps the marker and the typed text when saving fails, then clears on success', () => {
    const failed = run(
      { type: 'SURFACE_TAP', draft },
      { type: 'DRAFT_COMMENT', comment: 'Біль при максимальному згинанні плеча' },
      { type: 'DRAFT_SAVING' },
      { type: 'DRAFT_FAILED', error: 'Не вдалося зберегти' },
    );
    expect(failed.draft).toMatchObject({
      comment: 'Біль при максимальному згинанні плеча',
      error: 'Не вдалося зберегти',
      saving: false,
    });
    expect(pointUiReducer(failed, { type: 'DRAFT_SAVED' }).draft).toBeNull();
  });

  it('never replaces or cancels a draft that is being saved', () => {
    const saving = run({ type: 'SURFACE_TAP', draft }, { type: 'DRAFT_SAVING' });
    expect(pointUiReducer(saving, { type: 'SURFACE_TAP', draft: { ...draft, partId: 'x' } })).toBe(saving);
    expect(pointUiReducer(saving, { type: 'DRAFT_CANCEL' })).toBe(saving);
  });

  it('shows the hover preview without opening a dialog and opens the detail dialog on click', () => {
    const hovered = run({ type: 'HOVER', id: 'a1' });
    expect(hovered).toMatchObject({ hoveredId: 'a1', detailId: null });
    const clicked = pointUiReducer(hovered, { type: 'MARKER_CLICK', id: 'a1' });
    expect(clicked).toMatchObject({ hoveredId: null, detailId: 'a1' });
    expect(pointUiReducer(clicked, { type: 'DETAIL_CLOSE' }).detailId).toBeNull();
  });

  it('requires confirmation before deleting and toasts after success', () => {
    const confirming = run({ type: 'MARKER_CLICK', id: 'a1' }, { type: 'DELETE_REQUEST', id: 'a1' });
    expect(confirming.confirmDeleteId).toBe('a1');
    expect(pointUiReducer(confirming, { type: 'DELETE_CANCEL' }).confirmDeleteId).toBeNull();
    const deleted = pointUiReducer(
      pointUiReducer(confirming, { type: 'DELETING' }),
      { type: 'DELETED', id: 'a1', message: 'Нотатку видалено' },
    );
    expect(deleted).toMatchObject({
      deleting: false,
      confirmDeleteId: null,
      detailId: null,
      toast: { message: 'Нотатку видалено' },
    });
  });

  it('closes a hover preview and dialogs when the annotation disappears', () => {
    const state = run(
      { type: 'HOVER', id: 'a1' },
      { type: 'DELETE_REQUEST', id: 'a1' },
      { type: 'ANNOTATIONS_CHANGED', ids: new Set(['a2']) },
    );
    expect(state).toMatchObject({ hoveredId: null, confirmDeleteId: null, detailId: null });
  });

  it('drops the draft and dialogs when a different structure gets isolated', () => {
    const partIdOf = (id: string) => (id === 'a1' ? 'FJ2000' : null);
    const state = run(
      { type: 'SURFACE_TAP', draft },
      { type: 'MARKER_CLICK', id: 'a1' },
      { type: 'SURFACE_TAP', draft },
    );
    const switched = pointUiReducer(
      { ...state, draft },
      { type: 'ISOLATION_CHANGED', isolation: { isolate: true, partIds: ['FJ3000'] }, partIdOf },
    );
    expect(switched.draft).toBeNull();
    expect(switched.detailId).toBeNull();
    const same = pointUiReducer(
      { ...state, draft },
      { type: 'ISOLATION_CHANGED', isolation: { isolate: true, partIds: ['FJ2000'] }, partIdOf },
    );
    expect(same.draft).toEqual(draft);
    expect(same.detailId).toBe('a1');
    const fullBody = pointUiReducer(
      { ...state, draft },
      { type: 'ISOLATION_CHANGED', isolation: { isolate: false, partIds: ['FJ2000'] }, partIdOf },
    );
    expect(fullBody.draft).toBeNull();
  });
});
