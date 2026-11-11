'use client';

import type { CalendarBlockItem, CalendarBlockKind } from '@repo/contracts';
import { Button } from '@repo/ui/button';
import { useActionState, useEffect, useState, useTransition } from 'react';
import {
  createCalendarBlockAction,
  deleteCalendarBlockAction,
  updateCalendarBlockAction,
  type SchedulingFormState,
} from '../actions/scheduling-actions';

const initialState: SchedulingFormState = { error: null };
const inputClass = 'field mt-1 block w-full bg-background text-sm';

/** Local calendar date (YYYY-MM-DD) and time (HH:mm) of an instant in the given timezone. */
function localParts(iso: string, timezone: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}

export function CalendarBlockDialog({
  kind,
  block,
  timezone,
  initialDate,
  onClose,
}: {
  kind: CalendarBlockKind;
  /** When set, the dialog edits this existing break / day off instead of creating one. */
  block?: CalendarBlockItem;
  timezone: string;
  initialDate: string;
  onClose: () => void;
}) {
  const isEdit = Boolean(block);
  const [state, formAction, pending] = useActionState(
    isEdit ? updateCalendarBlockAction : createCalendarBlockAction,
    initialState,
  );
  const isDayOff = kind === 'DAY_OFF';
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const [removing, startRemoval] = useTransition();
  const removeBlock = () => {
    if (!block) return;
    startRemoval(async () => {
      const data = new FormData();
      data.set('blockId', block.id);
      await deleteCalendarBlockAction(data);
      onClose();
    });
  };
  const start = block ? localParts(block.startsAt, timezone) : null;
  // A day off ends at midnight of the next day; show its last included day.
  const lastDay = block ? localParts(new Date(new Date(block.endsAt).getTime() - 1).toISOString(), timezone).date : null;
  const end = block ? localParts(block.endsAt, timezone) : null;

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
          <h2 id="block-dialog-title">
            {isEdit ? (isDayOff ? 'Змінити вихідний день' : 'Змінити перерву') : isDayOff ? 'Вихідний день' : 'Перерва'}
          </h2>
          <button type="button" className="cal-modal-close" onClick={onClose} aria-label="Закрити">
            ✕
          </button>
        </header>
        <form action={formAction} className="cal-modal-body">
          <input type="hidden" name="kind" value={kind} />
          {block ? <input type="hidden" name="blockId" value={block.id} /> : null}
          <input type="hidden" name="timezone" value={timezone} />
          <p className="cal-hint">
            {isDayOff
              ? 'Обраний день (або кілька днів) буде закритий для записів.'
              : 'Цей проміжок часу буде закритий для записів.'}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="cal-label">
              {isDayOff ? 'З дати' : 'Дата'}
              <input name="date" type="date" required defaultValue={start?.date ?? initialDate} className={inputClass} />
            </label>
            {isDayOff ? (
              <label className="cal-label">
                По дату (включно)
                <input name="dateTo" type="date" defaultValue={lastDay ?? initialDate} className={inputClass} />
              </label>
            ) : (
              <span aria-hidden="true" />
            )}
            {!isDayOff ? (
              <>
                <label className="cal-label">
                  З
                  <input name="startTime" type="time" required defaultValue={start?.time ?? '13:00'} className={inputClass} />
                </label>
                <label className="cal-label">
                  До
                  <input name="endTime" type="time" required defaultValue={end?.time ?? '14:00'} className={inputClass} />
                </label>
              </>
            ) : null}
          </div>
          <label className="cal-label">
            Примітка (необов’язково)
            <input name="note" maxLength={200} defaultValue={block?.note ?? ''} placeholder={isDayOff ? 'Наприклад: відпустка' : 'Наприклад: обід'} className={inputClass} />
          </label>
          {state.error ? (
            <p role="alert" className="cal-error">
              {state.error}
            </p>
          ) : null}
          {isEdit && confirmingRemoval ? (
            <p role="alert" className="cal-error">
              {isDayOff
                ? 'Скасувати вихідний? Цей період знову відкриється для записів.'
                : 'Скасувати перерву? Цей час знову відкриється для записів.'}
            </p>
          ) : null}
          <div className="cal-modal-actions">
            {isEdit ? (
              confirmingRemoval ? (
                <>
                  <Button type="button" variant="secondary" onClick={() => setConfirmingRemoval(false)} disabled={removing}>
                    Ні, залишити
                  </Button>
                  <Button type="button" className="cal-btn-cancel" variant="secondary" onClick={removeBlock} disabled={removing}>
                    {removing ? 'Скасування…' : 'Так, скасувати'}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    className="cal-btn-cancel mr-auto"
                    variant="secondary"
                    onClick={() => setConfirmingRemoval(true)}
                  >
                    {isDayOff ? 'Скасувати вихідний' : 'Скасувати перерву'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={onClose}>
                    Закрити
                  </Button>
                  <Button type="submit" disabled={pending}>
                    {pending ? 'Збереження…' : 'Зберегти зміни'}
                  </Button>
                </>
              )
            ) : (
              <>
                <Button type="button" variant="secondary" onClick={onClose}>
                  Скасувати
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? 'Збереження…' : 'Закрити для записів'}
                </Button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
