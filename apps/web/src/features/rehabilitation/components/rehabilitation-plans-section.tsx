import type { RehabilitationPlanListItem } from '@repo/contracts';
import React from 'react';
import { planStatusLabel } from '../labels';

const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('uk-UA', { dateStyle: 'medium', timeZone: 'UTC' }).format(
        new Date(value),
      )
    : '—';

export function RehabilitationPlansSection({
  patientId,
  plans,
  canCreate,
}: {
  patientId: string;
  plans: RehabilitationPlanListItem[];
  canCreate: boolean;
}) {
  const open = plans.filter((plan) => ['DRAFT', 'ACTIVE', 'PAUSED'].includes(plan.status));
  const previous = plans.filter((plan) => ['COMPLETED', 'CANCELLED'].includes(plan.status));
  return (
    <section className="rounded-md border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl text-text-primary">Плани реабілітації</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Цілі, етапи та індивідуальні призначення вправ.
          </p>
        </div>
        {canCreate ? (
          <a
            className="rc-btn rc-btn-primary"
            href={`/app/patients/${patientId}/rehabilitation/new`}
          >
            Новий план
          </a>
        ) : null}
      </div>
      {plans.length === 0 ? (
        <p className="mt-5 rounded-md border border-dashed border-border p-6 text-sm text-text-secondary">
          Планів ще немає.
        </p>
      ) : (
        <div className="mt-5 space-y-5">
          <PlanGroup title="Поточні" items={open} />
          {previous.length ? <PlanGroup title="Попередні" items={previous} /> : null}
        </div>
      )}
    </section>
  );
}

function PlanGroup({ title, items }: { title: string; items: RehabilitationPlanListItem[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{title}</h3>
      <div className="mt-2 grid gap-3 lg:grid-cols-2">
        {items.map((plan) => (
          <a
            key={plan.id}
            href={`/app/rehabilitation-plans/${plan.id}`}
            className="rounded-md border border-border p-4 transition hover:border-info/50 hover:bg-surface-muted"
          >
            <div className="flex items-start justify-between gap-3">
              <strong className="text-text-primary">{plan.title}</strong>
              <span className="rounded-full bg-surface-muted px-2 py-1 text-xs">
                {planStatusLabel(plan.status)}
              </span>
            </div>
            <p className="mt-2 text-xs text-text-secondary">
              {date(plan.startDate)} — {date(plan.expectedEndDate)} · цілей: {plan.goalCount} ·
              вправ: {plan.prescriptionCount}
            </p>
            {plan.hasDraftRevision ? (
              <p className="mt-2 text-xs text-warning">Є неопублікована редакція</p>
            ) : null}
          </a>
        ))}
      </div>
    </div>
  );
}
