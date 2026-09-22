'use client';

import React from 'react';
import { useEffect, useId, useRef } from 'react';
import { BODY_ANNOTATION_NOTE_MAX_LENGTH } from '@repo/contracts';
import { FloatingCard } from './floating-card';
import type { MarkerProjector } from './projection';
import { DRAFT_MARKER_ID, type PointDraft } from './types';

export const COMPOSER_PLACEHOLDER = 'Додайте коментар до цієї ділянки...';

export function AnnotationComposer({
  projector,
  draft,
  onComment,
  onSave,
  onCancel,
}: {
  projector: MarkerProjector;
  draft: PointDraft;
  onComment: (comment: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const textarea = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    textarea.current?.focus({ preventScroll: true });
  }, []);
  const empty = draft.comment.trim().length === 0;
  return (
    <FloatingCard
      projector={projector}
      markerId={DRAFT_MARKER_ID}
      role="dialog"
      labelledBy={titleId}
      testId="point-annotation-composer"
      className="pa-card--composer"
    >
      <p className="pa-card-eyebrow">{draft.structureName}</p>
      <h3 id={titleId} className="text-sm font-semibold">
        Нова клінічна нотатка
      </h3>
      <textarea
        ref={textarea}
        className="pa-textarea"
        data-autofocus
        aria-label="Коментар до ділянки"
        placeholder={COMPOSER_PLACEHOLDER}
        maxLength={BODY_ANNOTATION_NOTE_MAX_LENGTH}
        rows={3}
        value={draft.comment}
        disabled={draft.saving}
        onChange={(event) => onComment(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onCancel();
          } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !empty) {
            event.preventDefault();
            onSave();
          }
        }}
      />
      {draft.error ? (
        <p role="alert" className="pa-error">
          {draft.error} Текст збережено — натисніть «Зберегти», щоб повторити.
        </p>
      ) : (
        <p className="pa-hint">Точка закріплюється за цим місцем поверхні. Esc — скасувати, ⌘/Ctrl+Enter — зберегти.</p>
      )}
      <div className="pa-actions">
        <button type="button" className="rc-btn rc-btn-ghost" onClick={onCancel} disabled={draft.saving}>
          Скасувати
        </button>
        <button
          type="button"
          className="rc-btn rc-btn-primary"
          onClick={onSave}
          disabled={empty || draft.saving}
          aria-busy={draft.saving}
        >
          {draft.saving ? 'Збереження…' : draft.error ? 'Спробувати ще раз' : 'Зберегти'}
        </button>
      </div>
    </FloatingCard>
  );
}
