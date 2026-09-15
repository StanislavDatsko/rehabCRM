'use client';

import type {
  AnatomicalStructureResponse,
  BodyAnnotationResponse,
  BodyMapClinicalContext,
} from '@repo/contracts';
import React, { useState } from 'react';
import { BODY_ANNOTATION_TYPE_LABELS } from '../anatomy-ui';

type Tab = 'overview' | 'annotations' | 'measurements' | 'goals' | 'exercises';
const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Огляд' },
  { id: 'annotations', label: 'Позначки' },
  { id: 'measurements', label: 'Вимірювання' },
  { id: 'goals', label: 'Цілі' },
  { id: 'exercises', label: 'Вправи' },
];

export function StructureInspector({
  structure,
  context,
  annotations,
}: {
  structure: AnatomicalStructureResponse | null;
  context?: BodyMapClinicalContext;
  annotations: readonly BodyAnnotationResponse[];
}) {
  const [tab, setTab] = useState<Tab>('overview');
  const related = structure
    ? annotations.filter((item) => item.structure.id === structure.id && item.status !== 'VOIDED')
    : [];
  return (
    <section className="rc-card rc-card-elevated p-4">
      <h2 className="font-medium">Structure inspector</h2>
      {!structure ? (
        <p className="mt-2 text-sm text-text-secondary">Select a mapped surface or structure.</p>
      ) : (
        <>
          <div
            className="mt-3 flex gap-1 overflow-x-auto"
            role="tablist"
            aria-label="Structure context"
          >
            {tabs.map((item) => (
              <button
                key={item.id}
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={`rounded px-2 py-1 text-xs ${tab === item.id ? 'bg-info text-white' : 'bg-background text-text-secondary'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="mt-3 space-y-2 text-sm" role="tabpanel">
            {tab === 'overview' ? (
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                <dt className="text-text-secondary">Name</dt>
                <dd>{structure.name}</dd>
                <dt className="text-text-secondary">Canonical</dt>
                <dd>{structure.canonicalName}</dd>
                <dt className="text-text-secondary">Category</dt>
                <dd>{structure.category.toLowerCase()}</dd>
                <dt className="text-text-secondary">Laterality</dt>
                <dd>{structure.laterality.toLowerCase()}</dd>
                <dt className="text-text-secondary">Code</dt>
                <dd className="break-all font-mono text-xs">{structure.code}</dd>
              </dl>
            ) : null}
            {tab === 'annotations' ? (
              related.length ? (
                related.map((item) => (
                  <p key={item.id}>
                    {item.title ?? BODY_ANNOTATION_TYPE_LABELS[item.type]} ·{' '}
                    {item.status.toLowerCase()}
                    {item.severity === null ? '' : ` · ${item.severity}/10`}
                  </p>
                ))
              ) : (
                <p className="text-text-secondary">No annotations for this structure.</p>
              )
            ) : null}
            {tab === 'measurements' ? (
              context?.measurements.length ? (
                context.measurements.map((item) => (
                  <p key={item.id}>
                    {item.name}: {item.value}
                  </p>
                ))
              ) : (
                <p className="text-text-secondary">No matching completed measurements.</p>
              )
            ) : null}
            {tab === 'goals' ? (
              context?.goals.length ? (
                context.goals.map((item) => (
                  <a
                    key={item.id}
                    className="block text-info underline"
                    href={`/app/rehabilitation-plans/${item.planId}`}
                  >
                    {item.title} · {item.status.toLowerCase()}
                  </a>
                ))
              ) : (
                <p className="text-text-secondary">No matching current goals.</p>
              )
            ) : null}
            {tab === 'exercises' ? (
              context?.exercises.length ? (
                context.exercises.map((item) => (
                  <a
                    key={item.id}
                    className="block text-info underline"
                    href={`/app/rehabilitation-plans/${item.planId}`}
                  >
                    {item.name} · {item.dosage}
                  </a>
                ))
              ) : (
                <p className="text-text-secondary">No matching current prescriptions.</p>
              )
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
