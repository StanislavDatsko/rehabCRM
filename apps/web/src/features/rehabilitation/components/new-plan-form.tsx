'use client';

import { useActionState } from 'react';
import { createPlanAction, type RehabilitationFormState } from '../actions/rehabilitation-actions';

const initial: RehabilitationFormState = { error: null };
const today = new Date().toISOString().slice(0, 10);

export function NewPlanForm({
  patientId,
  patientName,
  baselineMeasurementId,
}: {
  patientId: string;
  patientName: string;
  baselineMeasurementId?: string;
}) {
  const [state, action, pending] = useActionState(createPlanAction, initial);
  return (
    <form action={action} className="mx-auto max-w-3xl space-y-6">
      <input type="hidden" name="patientId" value={patientId} />
      <input type="hidden" name="baselineMeasurementId" value={baselineMeasurementId ?? ''} />
      <header>
        <p className="text-xs uppercase tracking-wide text-text-secondary">{patientName}</p>
        <h1 className="mt-1 font-serif text-3xl">Новий план реабілітації</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Спочатку створюється чернетка. Додайте цілі або вправи перед активацією.
        </p>
      </header>
      <section className="grid gap-4 rounded-md border border-border bg-surface p-5 sm:grid-cols-2">
        <label className="sm:col-span-2 text-sm">
          Назва
          <input
            name="title"
            required
            maxLength={200}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2"
          />
        </label>
        <label className="sm:col-span-2 text-sm">
          Опис
          <textarea
            name="description"
            rows={4}
            maxLength={5000}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2"
          />
        </label>
        <label className="text-sm">
          Початок
          <input
            type="date"
            name="startDate"
            required
            defaultValue={today}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2"
          />
        </label>
        <label className="text-sm">
          Очікуване завершення
          <input
            type="date"
            name="expectedEndDate"
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2"
          />
        </label>
      </section>
      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <div className="flex gap-3">
        <button disabled={pending} className="rc-btn rc-btn-primary">
          {pending ? 'Створення…' : 'Створити чернетку'}
        </button>
        <a href={`/app/patients/${patientId}`} className="rc-btn rc-btn-ghost">
          Скасувати
        </a>
      </div>
    </form>
  );
}
