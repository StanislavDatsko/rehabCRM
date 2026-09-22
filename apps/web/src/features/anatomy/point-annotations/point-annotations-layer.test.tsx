import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { PointAnnotationsLayer, type PointAnnotationsLayerProps } from './point-annotations-layer';
import { MarkerProjector } from './projection';
import { initialPointUiState } from './state';
import type { PointAnnotationView } from './types';
import { NO_ISOLATION, visiblePointAnnotations } from './visibility';

const anchor = {
  stableMeshKey: 'FJ2000',
  primitiveIndex: 0,
  triangleIndex: 4,
  barycentric: [0.2, 0.3, 0.5] as [number, number, number],
  localPosition: [0.1, 1.2, 0.05] as [number, number, number],
  localNormal: [0, 0, 1] as [number, number, number],
};

const biceps: PointAnnotationView = {
  id: 'a1',
  patientId: 'p1',
  structureId: 'biceps',
  structureName: 'Biceps brachii',
  partId: 'FJ2000',
  anchor,
  comment: 'Біль при максимальному згинанні плеча',
  status: 'ACTIVE',
  version: 1,
  color: null,
  createdAt: '2026-09-22T09:00:00.000Z',
  createdBy: 'Specialist',
};
const triceps: PointAnnotationView = {
  ...biceps,
  id: 'a2',
  structureId: 'triceps',
  structureName: 'Triceps brachii',
  partId: 'FJ3000',
  anchor: { ...anchor, stableMeshKey: 'FJ3000' },
  comment: 'Напруження трицепса',
};
const structureOf = (partId: string) => ({ FJ2000: 'biceps', FJ3000: 'triceps' })[partId];

function render(overrides: Partial<PointAnnotationsLayerProps> = {}) {
  const isolation = overrides.isolation ?? { isolate: true, partIds: ['FJ2000'] };
  const props: PointAnnotationsLayerProps = {
    projector: new MarkerProjector(),
    annotations: visiblePointAnnotations([biceps, triceps], isolation, structureOf),
    isolation,
    ui: initialPointUiState,
    canCreate: true,
    canDelete: true,
    onHover: vi.fn(),
    onMarkerClick: vi.fn(),
    onDraftComment: vi.fn(),
    onDraftSave: vi.fn(),
    onDraftCancel: vi.fn(),
    onDetailClose: vi.fn(),
    onDeleteRequest: vi.fn(),
    onDeleteConfirm: vi.fn(),
    onDeleteCancel: vi.fn(),
    onToastDone: vi.fn(),
    ...overrides,
  };
  return renderToStaticMarkup(<PointAnnotationsLayer {...props} />);
}

const markerCount = (html: string) => html.split('data-testid="point-annotation-marker"').length - 1;

describe('PointAnnotationsLayer', () => {
  it('renders no markers on the full-body view', () => {
    expect(markerCount(render({ isolation: NO_ISOLATION }))).toBe(0);
  });

  it('renders the isolated structure marker with an accessible label and hides other structures', () => {
    const html = render();
    expect(markerCount(html)).toBe(1);
    expect(html).toContain('aria-label="Нотатка до анатомічної точки: Біль при максимальному згинанні плеча"');
    expect(html).not.toContain('Напруження трицепса');
    expect(html).toContain('data-annotation-id="a1"');
  });

  it('switches to the other structure when it gets isolated', () => {
    const html = render({ isolation: { isolate: true, partIds: ['FJ3000'] } });
    expect(markerCount(html)).toBe(1);
    expect(html).toContain('data-annotation-id="a2"');
    expect(html).not.toContain('data-annotation-id="a1"');
  });

  it('shows the temporary marker and composer for a draft', () => {
    const html = render({
      ui: {
        ...initialPointUiState,
        draft: {
          partId: 'FJ2000',
          structureId: 'biceps',
          structureName: 'Biceps brachii',
          mappingId: 'm1',
          modelVersionId: 'v1',
          anchor,
          comment: '',
          error: null,
          saving: false,
        },
      },
    });
    expect(html).toContain('data-testid="point-annotation-draft"');
    expect(html).toContain('data-testid="point-annotation-composer"');
    expect(html).toContain('placeholder="Додайте коментар до цієї ділянки..."');
    expect(html).toContain('Нова клінічна нотатка');
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Зберегти<\/button>/);
  });

  it('keeps the typed text and offers a retry after a failed save', () => {
    const html = render({
      ui: {
        ...initialPointUiState,
        draft: {
          partId: 'FJ2000',
          structureId: 'biceps',
          structureName: 'Biceps brachii',
          mappingId: 'm1',
          modelVersionId: 'v1',
          anchor,
          comment: 'Біль',
          error: 'Не вдалося зберегти нотатку.',
          saving: false,
        },
      },
    });
    expect(html).toContain('role="alert"');
    expect(html).toContain('Спробувати ще раз');
    expect(html).toContain('>Біль</textarea>');
  });

  it('shows the hover comment card without a dialog', () => {
    const html = render({ ui: { ...initialPointUiState, hoveredId: 'a1' } });
    expect(html).toContain('data-testid="point-annotation-hover-card"');
    expect(html).toContain('role="tooltip"');
    expect(html).toContain('Біль при максимальному згинанні плеча');
    expect(html).not.toContain('role="dialog"');
  });

  it('opens the detail dialog on marker click with delete and close actions', () => {
    const html = render({ ui: { ...initialPointUiState, detailId: 'a1' } });
    expect(html).toContain('data-testid="point-annotation-detail"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('Нотатка до анатомічної точки');
    expect(html).toContain('Biceps brachii');
    expect(html).toContain('>Видалити</button>');
    expect(html).toContain('>Закрити</button>');
  });

  it('hides the delete action without the void permission', () => {
    const html = render({ ui: { ...initialPointUiState, detailId: 'a1' }, canDelete: false });
    expect(html).not.toContain('>Видалити</button>');
  });

  it('asks for confirmation before deleting and shows a toast afterwards', () => {
    const confirm = render({ ui: { ...initialPointUiState, detailId: 'a1', confirmDeleteId: 'a1' } });
    expect(confirm).toContain('Видалити цю точкову нотатку?');
    expect(confirm).toContain('role="alertdialog"');
    const done = render({
      annotations: [],
      ui: { ...initialPointUiState, toast: { key: 1, message: 'Точкову нотатку видалено' } },
    });
    expect(markerCount(done)).toBe(0);
    expect(done).toContain('data-testid="point-annotation-toast"');
  });

  it('nudges the user to tap the surface when the isolated structure has no notes yet', () => {
    const html = render({ annotations: [] });
    expect(html).toContain('data-testid="point-annotation-hint"');
    expect(render({ annotations: [], canCreate: false })).not.toContain('point-annotation-hint');
  });
});
