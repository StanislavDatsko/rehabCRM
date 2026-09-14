'use client';

import type { BodyAnnotationResponse } from '@repo/contracts';
import { useActionState } from 'react';
import {
  transitionBodyAnnotationAction,
  updateBodyAnnotationAction,
  type AnatomyActionState,
} from '../actions/anatomy-actions';
import { BODY_ANNOTATION_TYPE_LABELS, BODY_ANNOTATION_TYPES } from '../anatomy-ui';

const initial: AnatomyActionState = { error: null, ok: false };

export function AnnotationEditor({
  annotation,
  patientId,
  canEdit,
  canResolve,
  canVoid,
}: {
  annotation: BodyAnnotationResponse;
  patientId: string;
  canEdit: boolean;
  canResolve: boolean;
  canVoid: boolean;
}) {
  const [updateState, updateAction, updating] = useActionState(updateBodyAnnotationAction, initial);
  const [transitionState, transitionAction, transitioning] = useActionState(
    transitionBodyAnnotationAction,
    initial,
  );
  return (
    <div className="space-y-4 rounded-md border border-border bg-surface p-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-text-secondary">Selected annotation</p>
        <h3 className="font-medium text-text-primary">
          {annotation.title ?? BODY_ANNOTATION_TYPE_LABELS[annotation.type]}
        </h3>
        <p className="text-sm text-text-secondary">
          {annotation.structure.name} · {annotation.status.toLowerCase()} ·{' '}
          {new Date(annotation.createdAt).toLocaleString()}
        </p>
      </div>
      {canEdit && annotation.status === 'ACTIVE' ? (
        <form action={updateAction} className="grid gap-3">
          <input type="hidden" name="annotationId" value={annotation.id} />
          <input type="hidden" name="patientId" value={patientId} />
          <input type="hidden" name="version" value={annotation.version} />
          <label className="text-sm">
            Title
            <input
              name="title"
              defaultValue={annotation.title ?? ''}
              maxLength={200}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Type
              <select
                name="type"
                defaultValue={annotation.type}
                className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
              >
                {BODY_ANNOTATION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {BODY_ANNOTATION_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Severity (0–10)
              <input
                name="severity"
                type="number"
                min={0}
                max={10}
                defaultValue={annotation.severity ?? ''}
                className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
              />
            </label>
          </div>
          <label className="text-sm">
            Clinical note
            <textarea
              name="note"
              defaultValue={annotation.note ?? ''}
              maxLength={3000}
              rows={3}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
            />
          </label>
          {updateState.error ? (
            <p role="alert" className="text-sm text-danger">
              {updateState.error}
            </p>
          ) : null}
          <button disabled={updating} className="rounded bg-info px-3 py-2 text-sm text-white">
            Save annotation
          </button>
        </form>
      ) : (
        <p className="text-sm text-text-secondary">Historical annotations are read-only.</p>
      )}
      {annotation.status !== 'VOIDED' && (canResolve || canVoid) ? (
        <form action={transitionAction} className="grid gap-2 border-t border-border pt-3">
          <input type="hidden" name="annotationId" value={annotation.id} />
          <input type="hidden" name="patientId" value={patientId} />
          <input type="hidden" name="version" value={annotation.version} />
          <label className="text-sm">
            Status reason
            <input
              name="reason"
              minLength={3}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
            />
          </label>
          <div className="flex gap-2">
            {canResolve && annotation.status === 'ACTIVE' ? (
              <button
                name="action"
                value="resolve"
                disabled={transitioning}
                className="rounded border border-success px-3 py-2 text-sm text-success"
              >
                Resolve
              </button>
            ) : null}
            {canVoid ? (
              <button
                name="action"
                value="void"
                disabled={transitioning}
                className="rounded border border-danger px-3 py-2 text-sm text-danger"
              >
                Void
              </button>
            ) : null}
          </div>
          {transitionState.error ? (
            <p role="alert" className="text-sm text-danger">
              {transitionState.error}
            </p>
          ) : null}
        </form>
      ) : null}
      <details>
        <summary className="cursor-pointer text-sm text-info">Status history</summary>
        <ol className="mt-2 space-y-1 text-xs text-text-secondary">
          {annotation.history.map((item) => (
            <li key={item.id}>
              {new Date(item.changedAt).toLocaleString()} · {item.fromStatus ?? 'CREATED'} →{' '}
              {item.toStatus} · {item.changedBy.displayName}
              {item.reason ? ` · ${item.reason}` : ''}
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
