'use client';

import type { CalendarBlockKind } from '@repo/contracts';
import { Button } from '@repo/ui/button';
import { useActionState, useEffect } from 'react';
import {
  createCalendarBlockAction,
  type SchedulingFormState,
} from '../actions/scheduling-actions';

const initialState: SchedulingFormState = { error: null };
const inputClass = 'field mt-1 block w-full bg-background text-sm';

export function CalendarBlockDialog({
  kind,
  timezone,
  initialDate,
  onClose,
}: {
  kind: CalendarBlockKind;
  timezone: string;
  initialDate: string;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(createCalendarBlockAction, initialState);
  const isDayOff = kind === 'DAY_OFF';

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="block-dialog-title"
      className="cal-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="cal-modal cal-modal-sm">
        <header className="cal-modal-header">
          <h2 id="block-dialog-title">{isDayOff ? 'Вихідний день' : 'Перерва'}</h2>
          <button type="button" className="cal-modal-close" onClick={onClose} aria-label="Закрити">
            ✕
          </button>
        </header>
        <form action={formAction} className="cal-modal-body">
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="timezone" value={timezone} />
          <p className="cal-hint">
            {isDayOff
              ? 'Обраний день (або кілька днів) буде закритий для записів.'
              : 'Цей проміжок часу буде закритий для записів.'}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="cal-label">
              {isDayOff ? 'З дати' : 'Дата'}
              <input name="date" type="date" required defaultValue={initialDate} className={inputClass} />
            </label>
            {isDayOff ? (
              <label className="cal-label">
                По дату (включно)
                <input name="dateTo" type="date" defaultValue={initialDate} className={inputClass} />
              </label>
            ) : (
              <span aria-hidden="true" />
            )}
            {!isDayOff ? (
              <>
                <label className="cal-label">
                  З
                  <input name="startTime" type="time" required defaultValue="13:00" className={inputClass} />
                </label>
                <label className="cal-label">
                  До
                  <input name="endTime" type="time" required defaultValue="14:00" className={inputClass} />
                </label>
              </>
            ) : null}
          </div>
          <label className="cal-label">
            Примітка (необов’язково)
            <input name="note" maxLength={200} placeholder={isDayOff ? 'Наприклад: відпустка' : 'Наприклад: обід'} className={inputClass} />
          </label>
          {state.error ? (
            <p role="alert" className="cal-error">
              {state.error}
            </p>
          ) : null}
          <div className="cal-modal-actions">
            <Button type="button" variant="secondary" onClick={onClose}>
              Скасувати
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Збереження…' : 'Закрити для записів'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
