'use client';

import { annotationStatusLabel } from '../anatomy-ui';
import type {
  AnatomicalStructureResponse,
  BodyAnnotationResponse,
  BodyMapClinicalContext,
} from '@repo/contracts';
import React, { useState } from 'react';
import { BODY_ANNOTATION_TYPE_LABELS } from '../anatomy-ui';
import type { UnmappedSurfaceSelection } from './selection-types';

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
  unmappedSelection,
}: {
  structure: AnatomicalStructureResponse | null;
  context?: BodyMapClinicalContext;
  annotations: readonly BodyAnnotationResponse[];
  unmappedSelection?: UnmappedSurfaceSelection | null;
}) {
  const [tab, setTab] = useState<Tab>('overview');
  const related = structure
    ? annotations.filter((item) => item.structure.id === structure.id && item.status !== 'VOIDED')
    : [];
  return (
    <section className="ui-surface p-4">
      <h2 className="font-medium">Інспектор структури</h2>
      {!structure ? (
        unmappedSelection ? (
          <div className="mt-3 space-y-3 text-sm">
            <span className="inline-flex rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning">
              Не зіставлено
            </span>
            <p className="text-text-secondary">
              Цю геометрію можна переглядати та виділяти, але вона ще не має підтвердженого
              анатомічного зіставлення. Створення клінічної анотації недоступне.
            </p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <dt className="text-text-secondary">Деталь моделі</dt>
              <dd className="break-all">{unmappedSelection.meshName}</dd>
              <dt className="text-text-secondary">Стабільний ключ</dt>
              <dd className="break-all font-mono text-xs">{unmappedSelection.meshKey}</dd>
              <dt className="text-text-secondary">Примітив</dt>
              <dd>{unmappedSelection.primitiveIndex}</dd>
              <dt className="text-text-secondary">Версія моделі</dt>
              <dd className="break-all font-mono text-xs">{unmappedSelection.modelVersionId}</dd>
            </dl>
          </div>
        ) : (
          <p className="mt-2 text-sm text-text-secondary">Оберіть зіставлену поверхню або структуру.</p>
        )
      ) : (
        <>
          <div
            className="mt-3 flex gap-1 overflow-x-auto"
            role="tablist"
            aria-label="Контекст структури"
          >
            {tabs.map((item) => (
              <button
                key={item.id}
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={`rounded-md px-2 py-1 text-xs transition-colors ${tab === item.id ? 'bg-info text-white' : 'bg-surface-muted text-text-secondary hover:text-text-primary'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="mt-3 space-y-2 text-sm" role="tabpanel">
            {tab === 'overview' ? (
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                <dt className="text-text-secondary">Назва</dt>
                <dd>{structure.name}</dd>
                <dt className="text-text-secondary">Канонічна назва</dt>
                <dd>{structure.canonicalName}</dd>
                <dt className="text-text-secondary">Категорія</dt>
                <dd>{structure.category.toLowerCase()}</dd>
                <dt className="text-text-secondary">Сторона</dt>
                <dd>{structure.laterality.toLowerCase()}</dd>
                <dt className="text-text-secondary">Код</dt>
                <dd className="break-all font-mono text-xs">{structure.code}</dd>
              </dl>
            ) : null}
            {tab === 'annotations' ? (
              related.length ? (
                related.map((item) => (
                  <p key={item.id}>
                    {item.title ?? BODY_ANNOTATION_TYPE_LABELS[item.type]} ·{' '}
                    {annotationStatusLabel(item.status).toLowerCase()}
                    {item.severity === null ? '' : ` · ${item.severity}/10`}
                  </p>
                ))
              ) : (
                <p className="text-text-secondary">Для цієї структури позначок немає.</p>
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
                <p className="text-text-secondary">Немає відповідних завершених вимірювань.</p>
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
                    {item.title} · {annotationStatusLabel(item.status).toLowerCase()}
                  </a>
                ))
              ) : (
                <p className="text-text-secondary">Немає відповідних поточних цілей.</p>
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
                <p className="text-text-secondary">Немає відповідних поточних призначень.</p>
              )
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
