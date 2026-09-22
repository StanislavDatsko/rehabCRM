import type { IsolationState } from './visibility';
import type { PointDraft } from './types';

export type PointUiState = {
  draft: PointDraft | null;
  hoveredId: string | null;
  detailId: string | null;
  confirmDeleteId: string | null;
  deleting: boolean;
  toast: { key: number; message: string } | null;
};

export const initialPointUiState: PointUiState = {
  draft: null,
  hoveredId: null,
  detailId: null,
  confirmDeleteId: null,
  deleting: false,
  toast: null,
};

export type PointUiAction =
  | { type: 'SURFACE_TAP'; draft: PointDraft }
  | { type: 'DRAFT_COMMENT'; comment: string }
  | { type: 'DRAFT_CANCEL' }
  | { type: 'DRAFT_SAVING' }
  | { type: 'DRAFT_SAVED' }
  | { type: 'DRAFT_FAILED'; error: string }
  | { type: 'HOVER'; id: string | null }
  | { type: 'MARKER_CLICK'; id: string }
  | { type: 'DETAIL_CLOSE' }
  | { type: 'DELETE_REQUEST'; id: string }
  | { type: 'DELETE_CANCEL' }
  | { type: 'DELETING' }
  | { type: 'DELETED'; id: string; message: string }
  | { type: 'DELETE_FAILED'; message: string }
  | { type: 'TOAST_CLEAR' }
  | { type: 'ISOLATION_CHANGED'; isolation: IsolationState; partIdOf: (id: string) => string | null }
  | { type: 'ANNOTATIONS_CHANGED'; ids: ReadonlySet<string> };

const keepIf = (id: string | null, predicate: (id: string) => boolean) =>
  id !== null && predicate(id) ? id : null;

export function pointUiReducer(state: PointUiState, action: PointUiAction): PointUiState {
  switch (action.type) {
    case 'SURFACE_TAP':
      // A saving draft is never replaced; a fresh tap while composing moves the draft.
      if (state.draft?.saving || state.detailId || state.confirmDeleteId) return state;
      return { ...state, draft: action.draft, hoveredId: null };
    case 'DRAFT_COMMENT':
      return state.draft
        ? { ...state, draft: { ...state.draft, comment: action.comment, error: null } }
        : state;
    case 'DRAFT_CANCEL':
      return state.draft?.saving ? state : { ...state, draft: null };
    case 'DRAFT_SAVING':
      return state.draft ? { ...state, draft: { ...state.draft, saving: true, error: null } } : state;
    case 'DRAFT_SAVED':
      return { ...state, draft: null };
    case 'DRAFT_FAILED':
      // Keep the temporary marker and the typed text so the user can retry.
      return state.draft
        ? { ...state, draft: { ...state.draft, saving: false, error: action.error } }
        : state;
    case 'HOVER':
      return state.hoveredId === action.id ? state : { ...state, hoveredId: action.id };
    case 'MARKER_CLICK':
      return { ...state, detailId: action.id, hoveredId: null, draft: state.draft?.saving ? state.draft : null };
    case 'DETAIL_CLOSE':
      return { ...state, detailId: null, confirmDeleteId: null };
    case 'DELETE_REQUEST':
      return { ...state, confirmDeleteId: action.id, hoveredId: null };
    case 'DELETE_CANCEL':
      return { ...state, confirmDeleteId: null };
    case 'DELETING':
      return { ...state, deleting: true };
    case 'DELETED':
      return {
        ...state,
        deleting: false,
        confirmDeleteId: null,
        detailId: state.detailId === action.id ? null : state.detailId,
        hoveredId: state.hoveredId === action.id ? null : state.hoveredId,
        toast: { key: (state.toast?.key ?? 0) + 1, message: action.message },
      };
    case 'DELETE_FAILED':
      return { ...state, deleting: false, toast: { key: (state.toast?.key ?? 0) + 1, message: action.message } };
    case 'TOAST_CLEAR':
      return state.toast ? { ...state, toast: null } : state;
    case 'ISOLATION_CHANGED': {
      const stillIsolated = (partId: string | null) =>
        action.isolation.isolate && partId !== null && action.isolation.partIds.includes(partId);
      const draft = state.draft && stillIsolated(state.draft.partId) ? state.draft : null;
      const keep = (id: string) => stillIsolated(action.partIdOf(id));
      return {
        ...state,
        draft,
        hoveredId: null,
        detailId: keepIf(state.detailId, keep),
        confirmDeleteId: keepIf(state.confirmDeleteId, keep),
      };
    }
    case 'ANNOTATIONS_CHANGED': {
      const exists = (id: string) => action.ids.has(id);
      return {
        ...state,
        hoveredId: keepIf(state.hoveredId, exists),
        detailId: keepIf(state.detailId, exists),
        confirmDeleteId: keepIf(state.confirmDeleteId, exists),
      };
    }
    default:
      return state;
  }
}
