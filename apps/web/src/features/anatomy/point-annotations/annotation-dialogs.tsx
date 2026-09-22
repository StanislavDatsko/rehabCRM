'use client';

import React from 'react';
import { useId } from 'react';
import { formatAnnotationDate } from './annotation-hover-card';
import { Portal } from './portal';
import type { PointAnnotationView } from './types';
import { useDialog } from './use-dialog';

export function AnnotationDetailDialog({
  annotation,
  canDelete,
  onDelete,
  onClose,
}: {
  annotation: PointAnnotationView;
  canDelete: boolean;
  onDelete: () => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const { ref, onKeyDown } = useDialog(true, onClose);
  return (
    <Portal>
      <div className="pa-backdrop" onClick={onClose} onPointerDown={(event) => event.stopPropagation()}>
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          data-testid="point-annotation-detail"
          className="pa-dialog"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={onKeyDown}
        >
          <p className="pa-card-eyebrow">{annotation.status === 'RESOLVED' ? 'Вирішена' : 'Активна'}</p>
          <h2 id={titleId}>Нотатка до анатомічної точки</h2>
          <p className="pa-dialog-body">{annotation.comment}</p>
          <dl>
            <dt>Структура</dt>
            <dd>{annotation.structureName}</dd>
            <dt>Створено</dt>
            <dd>
              {formatAnnotationDate(annotation.createdAt)} · {annotation.createdBy}
            </dd>
          </dl>
          <div className="pa-actions">
            {canDelete ? (
              <button type="button" className="rc-btn rc-btn-secondary text-danger" onClick={onDelete}>
                Видалити
              </button>
            ) : null}
            <button type="button" className="rc-btn rc-btn-primary" data-autofocus onClick={onClose}>
              Закрити
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

export function DeleteConfirmDialog({
  busy,
  onConfirm,
  onCancel,
}: {
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const { ref, onKeyDown } = useDialog(true, () => {
    if (!busy) onCancel();
  });
  return (
    <Portal>
      <div className="pa-backdrop" onClick={busy ? undefined : onCancel} onPointerDown={(event) => event.stopPropagation()}>
        <div
          ref={ref}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          data-testid="point-annotation-confirm"
          className="pa-dialog pa-dialog--danger"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={onKeyDown}
        >
          <h2 id={titleId}>Видалити цю точкову нотатку?</h2>
          <p id={descriptionId} className="pa-dialog-body text-text-secondary">
            Маркер зникне з моделі. Запис буде позначено як видалений, а історія змін збережеться.
          </p>
          <div className="pa-actions">
            <button type="button" className="rc-btn rc-btn-ghost" data-autofocus onClick={onCancel} disabled={busy}>
              Скасувати
            </button>
            <button type="button" className="rc-btn rc-btn-danger" onClick={onConfirm} disabled={busy} aria-busy={busy}>
              {busy ? 'Видалення…' : 'Видалити'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
