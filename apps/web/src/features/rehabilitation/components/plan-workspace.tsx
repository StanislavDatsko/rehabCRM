'use client';

import {
  ANATOMICAL_REGION_CODES,
  LATERALITIES,
  type ExerciseLibraryItem,
  type MeasurementHistoryPoint,
  type RehabilitationPlanResponse,
  type RehabilitationPlanRevisionResponse,
} from '@repo/contracts';
import { useActionState } from 'react';
import { PageHeader, StatusPill } from '@repo/ui/workspace';
import {
  planLifecycleAction,
  savePlanAction,
  type RehabilitationFormState,
} from '../actions/rehabilitation-actions';
import { planStatusLabel } from '../labels';

const initial: RehabilitationFormState = { error: null };
const dateOnly = (value: string | null) => value?.slice(0, 10) ?? '';
const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('uk-UA', { dateStyle: 'medium', timeZone: 'UTC' }).format(
        new Date(value),
      )
    : '—';
const valueLabel = (point: MeasurementHistoryPoint) =>
  `${point.definitionName}: ${String(point.value)}${point.unit ? ` ${point.unit}` : ''} · ${formatDate(point.performedAt)}`;

export type PlanCapabilities = {
  edit: boolean;
  pause: boolean;
  complete: boolean;
  cancel: boolean;
};

export function PlanWorkspace({
  plan,
  history,
  exercises,
  capabilities,
  prefillBaselineId,
  flash,
}: {
  plan: RehabilitationPlanResponse;
  history: MeasurementHistoryPoint[];
  exercises: ExerciseLibraryItem[];
  capabilities: PlanCapabilities;
  prefillBaselineId?: string;
  flash?: string;
}) {
  const draft = plan.draftRevision;
  return (
    <div className="space-y-8">
      {flash ? (
        <div
          role="status"
          className="ui-inline-notice ui-inline-notice-success"
        >
          Зміни збережено.
        </div>
      ) : null}
      <PageHeader eyebrow={`${plan.patient.displayName} · реабілітація`} title={draft?.title ?? plan.currentRevision?.title ?? 'План'} description={`Відповідальний фахівець: ${plan.responsiblePractitioner.displayName}`} metadata={<StatusPill tone={plan.status === 'ACTIVE' ? 'success' : plan.status === 'DRAFT' ? 'warning' : 'neutral'}>{planStatusLabel(plan.status)}</StatusPill>} actions={<a className="rc-btn rc-btn-secondary" href={`/app/patients/${plan.patient.id}`}>Картка пацієнта ↗</a>} />
      <nav className="patient-section-nav" aria-label="Розділи плану">
        {plan.currentRevision && plan.status !== 'DRAFT' && <a href="#published-plan">Опублікований план</a>}
        {draft && capabilities.edit && <a href="#plan-draft">Редагування</a>}
        <a href="#plan-history">Історія редакцій</a>
      </nav>

      <Lifecycle plan={plan} capabilities={capabilities} />

      {plan.currentRevision && plan.status !== 'DRAFT' ? (
        <PublishedRevision revision={plan.currentRevision} />
      ) : null}

      {draft && capabilities.edit ? (
        <DraftEditor
          plan={plan}
          revision={draft}
          history={history}
          exercises={exercises}
          prefillBaselineId={prefillBaselineId}
        />
      ) : draft ? (
        <p className="ui-empty-state p-5 text-sm text-text-secondary">
          Чернетка доступна лише для перегляду користувачам без права редагування.
        </p>
      ) : null}

      <section id="plan-history" className="patient-workspace-section ui-filter-bar">
        <h2 className="text-lg font-semibold tracking-tight">Історія редакцій</h2>
        {plan.revisionHistory.length ? (
          <ol className="mt-4 space-y-3">
            {plan.revisionHistory.map((revision) => (
              <li key={revision.id} className="border-l-2 border-border pl-4 text-sm">
                <strong>Редакція {revision.revisionNumber}</strong>
                <span className="ml-2 text-text-secondary">
                  {formatDate(revision.effectiveFrom)}
                </span>
                <p className="text-text-secondary">
                  {revision.changeSummary || 'Без опису змін'} · {revision.createdBy.displayName}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-text-secondary">Опублікованих редакцій ще немає.</p>
        )}
      </section>
    </div>
  );
}

function Lifecycle({
  plan,
  capabilities,
}: {
  plan: RehabilitationPlanResponse;
  capabilities: PlanCapabilities;
}) {
  const [state, action, pending] = useActionState(planLifecycleAction, initial);
  const command =
    plan.status === 'ACTIVE' && capabilities.pause
      ? 'pause'
      : plan.status === 'PAUSED' && capabilities.pause
        ? 'resume'
        : null;
  return (
    <section className="ui-form-actions static flex-wrap items-end border-y-0 py-4">
      {command ? (
        <form action={action}>
          <input type="hidden" name="planId" value={plan.id} />
          <input type="hidden" name="version" value={plan.version} />
          <input type="hidden" name="command" value={command} />
          <button disabled={pending} className="rc-btn rc-btn-secondary">
            {command === 'pause'
              ? 'Призупинити'
              : 'Відновити'}
          </button>
        </form>
      ) : null}
      {!plan.draftRevision && ['ACTIVE', 'PAUSED'].includes(plan.status) && capabilities.edit ? (
        <form action={action}>
          <input type="hidden" name="planId" value={plan.id} />
          <input type="hidden" name="version" value={plan.version} />
          <input type="hidden" name="command" value="create-revision" />
          <button disabled={pending} className="rc-btn rc-btn-secondary">
            Створити нову редакцію
          </button>
        </form>
      ) : null}
      {plan.draftRevision && ['ACTIVE', 'PAUSED'].includes(plan.status) && capabilities.edit ? (
        <form action={action}>
          <input type="hidden" name="planId" value={plan.id} />
          <input type="hidden" name="version" value={plan.version} />
          <input type="hidden" name="revisionId" value={plan.draftRevision.id} />
          <input type="hidden" name="command" value="publish" />
          <button disabled={pending} className="rc-btn rc-btn-primary">
            Опублікувати редакцію {plan.draftRevision.revisionNumber}
          </button>
        </form>
      ) : null}
      {['ACTIVE', 'PAUSED'].includes(plan.status) &&
      !plan.draftRevision &&
      capabilities.complete ? (
        <form action={action}>
          <input type="hidden" name="planId" value={plan.id} />
          <input type="hidden" name="version" value={plan.version} />
          <input type="hidden" name="command" value="complete" />
          <button disabled={pending} className="rc-btn rc-btn-secondary">
            Завершити план
          </button>
        </form>
      ) : null}
      {['DRAFT', 'ACTIVE', 'PAUSED'].includes(plan.status) && capabilities.cancel ? (
        <form action={action} className="flex gap-2">
          <input type="hidden" name="planId" value={plan.id} />
          <input type="hidden" name="version" value={plan.version} />
          <input type="hidden" name="command" value="cancel" />
          <input
            required
            minLength={3}
            name="reason"
            placeholder="Причина скасування"
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
          />
          <button disabled={pending} className="rc-btn rc-btn-ghost">
            Скасувати план
          </button>
        </form>
      ) : null}
      {state.error ? (
        <p role="alert" className="w-full text-sm text-danger">
          {state.error}
        </p>
      ) : null}
    </section>
  );
}

function PublishedRevision({ revision }: { revision: RehabilitationPlanRevisionResponse }) {
  return (
    <section id="published-plan" className="patient-workspace-section ui-filter-bar space-y-5">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-text-secondary">
            Опублікована редакція {revision.revisionNumber}
          </p>
          <h2 className="text-lg font-semibold tracking-tight">{revision.title}</h2>
        </div>
        <p className="text-sm text-text-secondary">
          {formatDate(revision.startDate)} — {formatDate(revision.expectedEndDate)}
        </p>
      </div>
    </section>
  );
}

function DraftEditor({
  plan,
  revision,
  history,
  exercises,
  prefillBaselineId,
}: {
  plan: RehabilitationPlanResponse;
  revision: RehabilitationPlanRevisionResponse;
  history: MeasurementHistoryPoint[];
  exercises: ExerciseLibraryItem[];
  prefillBaselineId?: string;
}) {
  const [state, action, pending] = useActionState(savePlanAction, initial);
  const prefill = prefillBaselineId
    ? history.find((point) => point.measurementId === prefillBaselineId)
    : undefined;
  const prefilledGoal: RehabilitationPlanRevisionResponse['goals'][number] | null =
    prefill &&
    typeof prefill.value === 'number' &&
    !revision.goals.some((goal) => goal.baseline?.measurementId === prefill.measurementId)
      ? {
          id: '',
          title: `Ціль для показника «${prefill.definitionName}»`,
          description: null,
          category: null,
          anatomicalRegion: prefill.anatomicalRegion,
          laterality: prefill.laterality,
          status: 'PLANNED',
          targetDate: null,
          measurementDefinition: {
            id: prefill.definitionId,
            code: prefill.definitionCode,
            name: prefill.definitionName,
          },
          targetOperator: null,
          targetValue: null,
          targetValueUpper: null,
          targetUnit: prefill.unit,
          baseline: {
            measurementId: prefill.measurementId,
            value: prefill.value as number,
            unit: prefill.unit,
            performedAt: prefill.performedAt,
          },
          current: null,
          targetAppearsReached: null,
          displayOrder: revision.goals.length,
        }
      : null;
  const goals = [
    ...revision.goals,
    ...(prefilledGoal ? [prefilledGoal] : []),
    ...Array.from({ length: 3 }, () => null),
  ];
  const phases = [...revision.phases, ...Array.from({ length: 2 }, () => null)];
  const prescriptions = [
    ...revision.exercisePrescriptions,
    ...Array.from({ length: 3 }, () => null),
  ];
  const phaseKeyById = new Map(
    revision.phases.map((phase, index) => [phase.id, `phase-${index + 1}`]),
  );
  return (
    <form id="plan-draft" action={action} className="patient-workspace-section plan-editor ui-filter-bar space-y-6">
      <input type="hidden" name="planId" value={plan.id} />
      <input type="hidden" name="revisionId" value={revision.id} />
      <input type="hidden" name="version" value={plan.version} />
      <div>
        <p className="text-xs uppercase tracking-wide text-info">
          Редагована чернетка · редакція {revision.revisionNumber}
        </p>
        <h2 className="text-lg font-semibold tracking-tight">Зміст плану</h2>
        <p className="mt-1 text-xs text-text-secondary">
          Збереження не публікує зміни. Опубліковані редакції залишаються незмінними.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Назва">
          <input required name="title" defaultValue={revision.title} className="field" />
        </Field>
        <Field label="Опис">
          <textarea
            name="description"
            defaultValue={revision.description ?? ''}
            className="field"
            rows={2}
          />
        </Field>
        <Field label="Початок">
          <input
            required
            type="date"
            name="startDate"
            defaultValue={dateOnly(revision.startDate)}
            className="field"
          />
        </Field>
        <Field label="Очікуване завершення">
          <input
            type="date"
            name="expectedEndDate"
            defaultValue={dateOnly(revision.expectedEndDate)}
            className="field"
          />
        </Field>
        <Field label="Що змінено">
          <input
            name="changeSummary"
            defaultValue={revision.changeSummary ?? ''}
            className="field"
          />
        </Field>
      </div>

      <EditorSection
        title="Цілі"
        intro="Оберіть фактичне завершене вимірювання як вихідне або залиште ціль описовою."
        hidden
      >
        {goals.map((goal, index) => (
          <details
            key={goal?.id ?? `goal-${index}`}
            open={Boolean(goal)}
            className="rounded-md border border-border p-4"
          >
            <summary className="cursor-pointer font-medium">
              {goal?.title ?? `Додати ціль ${index + 1}`}
            </summary>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <input type="hidden" name={`goal.${index}.id`} value={goal?.id ?? ''} />
              <Field label="Назва">
                <input
                  name={`goal.${index}.title`}
                  defaultValue={goal?.title ?? ''}
                  className="field"
                />
              </Field>
              <Field label="Статус">
                <select
                  name={`goal.${index}.status`}
                  defaultValue={goal?.status ?? 'PLANNED'}
                  className="field"
                >
                  <option value="PLANNED">Заплановано</option>
                  <option value="IN_PROGRESS">В роботі</option>
                  <option value="ACHIEVED">Досягнуто</option>
                  <option value="NOT_ACHIEVED">Не досягнуто</option>
                  <option value="CANCELLED">Скасовано</option>
                </select>
              </Field>
              <Field label="Дата цілі">
                <input
                  type="date"
                  name={`goal.${index}.targetDate`}
                  defaultValue={dateOnly(goal?.targetDate ?? null)}
                  className="field"
                />
              </Field>
              <Field label="Вихідне вимірювання">
                <select
                  name={`goal.${index}.baseline`}
                  defaultValue={
                    goal?.baseline && goal.measurementDefinition
                      ? `${goal.baseline.measurementId}|${goal.measurementDefinition.id}`
                      : ''
                  }
                  className="field"
                >
                  <option value="">Описова ціль</option>
                  {history
                    .filter((point) => typeof point.value === 'number')
                    .map((point) => (
                      <option
                        key={point.measurementId}
                        value={`${point.measurementId}|${point.definitionId}`}
                      >
                        {valueLabel(point)}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Оператор">
                <select
                  name={`goal.${index}.targetOperator`}
                  defaultValue={goal?.targetOperator ?? ''}
                  className="field"
                >
                  <option value="">Без числової цілі</option>
                  <option value="LESS_THAN_OR_EQUAL">≤ не більше</option>
                  <option value="GREATER_THAN_OR_EQUAL">≥ не менше</option>
                  <option value="EQUAL">= дорівнює</option>
                  <option value="BETWEEN">у діапазоні</option>
                </select>
              </Field>
              <Field label="Цільове значення">
                <input
                  type="number"
                  step="any"
                  name={`goal.${index}.targetValue`}
                  defaultValue={goal?.targetValue ?? ''}
                  className="field"
                />
              </Field>
              <Field label="Верхня межа">
                <input
                  type="number"
                  step="any"
                  name={`goal.${index}.targetValueUpper`}
                  defaultValue={goal?.targetValueUpper ?? ''}
                  className="field"
                />
              </Field>
              <Field label="Одиниця">
                <select
                  name={`goal.${index}.targetUnit`}
                  defaultValue={goal?.targetUnit ?? ''}
                  className="field"
                >
                  <option value="">Без одиниці</option>
                  <option value="deg">°</option>
                  <option value="s">с</option>
                  <option value="m">м</option>
                  <option value="cm">см</option>
                  <option value="kg">кг</option>
                </select>
              </Field>
              <Field label="Категорія">
                <input
                  name={`goal.${index}.category`}
                  defaultValue={goal?.category ?? ''}
                  className="field"
                />
              </Field>
              <Field label="Ділянка">
                <RegionSelect
                  name={`goal.${index}.anatomicalRegion`}
                  value={goal?.anatomicalRegion}
                />
              </Field>
              <Field label="Сторона">
                <LateralitySelect name={`goal.${index}.laterality`} value={goal?.laterality} />
              </Field>
              <Field label="Опис">
                <textarea
                  name={`goal.${index}.description`}
                  defaultValue={goal?.description ?? ''}
                  className="field"
                />
              </Field>
            </div>
          </details>
        ))}
      </EditorSection>

      <EditorSection
        title="Етапи"
        intro="Етапи необовʼязкові та допомагають групувати призначення."
        hidden
      >
        {phases.map((phase, index) => (
          <details
            key={phase?.id ?? `phase-${index}`}
            open={Boolean(phase)}
            className="rounded-md border border-border p-4"
          >
            <summary className="cursor-pointer font-medium">
              {phase?.name ?? `Додати етап ${index + 1}`}
            </summary>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <input type="hidden" name={`phase.${index}.id`} value={phase?.id ?? ''} />
              <input type="hidden" name={`phase.${index}.key`} value={`phase-${index + 1}`} />
              <Field label="Назва">
                <input
                  name={`phase.${index}.name`}
                  defaultValue={phase?.name ?? ''}
                  className="field"
                />
              </Field>
              <Field label="Початок">
                <input
                  type="date"
                  name={`phase.${index}.expectedStart`}
                  defaultValue={dateOnly(phase?.expectedStart ?? null)}
                  className="field"
                />
              </Field>
              <Field label="Завершення">
                <input
                  type="date"
                  name={`phase.${index}.expectedEnd`}
                  defaultValue={dateOnly(phase?.expectedEnd ?? null)}
                  className="field"
                />
              </Field>
              <Field label="Опис">
                <textarea
                  name={`phase.${index}.description`}
                  defaultValue={phase?.description ?? ''}
                  className="field"
                />
              </Field>
              <Field label="Критерії переходу">
                <textarea
                  name={`phase.${index}.criteria`}
                  defaultValue={phase?.criteria ?? ''}
                  className="field"
                />
              </Field>
            </div>
          </details>
        ))}
      </EditorSection>

      <EditorSection
        title="Призначення вправ"
        intro="Виберіть вправу та вкажіть щонайменше один параметр дозування."
        hidden
      >
        {prescriptions.map((item, index) => (
          <details
            key={item?.id ?? `rx-${index}`}
            open={Boolean(item)}
            className="rounded-md border border-border p-4"
          >
            <summary className="cursor-pointer font-medium">
              {item?.exercise.name ?? `Додати вправу ${index + 1}`}
            </summary>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <input type="hidden" name={`prescription.${index}.id`} value={item?.id ?? ''} />
              <Field label="Вправа">
                <select
                  name={`prescription.${index}.exerciseDefinitionId`}
                  defaultValue={item?.exercise.id ?? ''}
                  className="field"
                >
                  <option value="">Не вибрано</option>
                  {exercises.map((exercise) => (
                    <option key={exercise.id} value={exercise.id}>
                      {exercise.name} · {exercise.category}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Етап">
                <select
                  name={`prescription.${index}.phaseKey`}
                  defaultValue={item?.phaseId ? (phaseKeyById.get(item.phaseId) ?? '') : ''}
                  className="field"
                >
                  <option value="">Без етапу</option>
                  {phases.map((phase, phaseIndex) =>
                    phase ? (
                      <option key={phase.id} value={`phase-${phaseIndex + 1}`}>
                        {phase.name}
                      </option>
                    ) : null,
                  )}
                </select>
              </Field>
              <Field label="Сторона">
                <LateralitySelect
                  name={`prescription.${index}.laterality`}
                  value={item?.laterality}
                />
              </Field>
              <Field label="Ділянка">
                <RegionSelect
                  name={`prescription.${index}.anatomicalRegion`}
                  value={item?.anatomicalRegion}
                />
              </Field>
              {(
                [
                  ['sets', 'Підходи'],
                  ['repetitions', 'Повторення'],
                  ['trials', 'Спроби'],
                  ['durationSeconds', 'Тривалість, с'],
                  ['holdSeconds', 'Утримання, с'],
                  ['distanceMeters', 'Відстань, м'],
                  ['loadKg', 'Навантаження, кг'],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label}>
                  <input
                    type="number"
                    min="0"
                    step={key === 'distanceMeters' || key === 'loadKg' ? 'any' : '1'}
                    name={`prescription.${index}.${key}`}
                    defaultValue={(item?.[key as keyof typeof item] as number) ?? ''}
                    className="field"
                  />
                </Field>
              ))}
              <Field label="Частота">
                <select
                  name={`prescription.${index}.frequencyType`}
                  defaultValue={item?.frequencyType ?? ''}
                  className="field"
                >
                  <option value="">Не вказано</option>
                  <option value="DAILY">Щодня</option>
                  <option value="WEEKLY">Щотижня</option>
                  <option value="ALTERNATE_DAYS">Через день</option>
                  <option value="SUPERVISED_ONLY">Лише під наглядом</option>
                </select>
              </Field>
              <Field label="Сеансів/день">
                <input
                  type="number"
                  min="1"
                  name={`prescription.${index}.sessionsPerDay`}
                  defaultValue={item?.sessionsPerDay ?? ''}
                  className="field"
                />
              </Field>
              <Field label="Днів/тиждень">
                <input
                  type="number"
                  min="1"
                  max="7"
                  name={`prescription.${index}.daysPerWeek`}
                  defaultValue={item?.daysPerWeek ?? ''}
                  className="field"
                />
              </Field>
              {(
                [
                  ['specialistNote', 'Нотатка фахівця'],
                  ['precautions', 'Застереження'],
                  ['progressionCriteria', 'Критерії прогресії'],
                  ['regressionCriteria', 'Критерії регресії'],
                  ['instructionsOverride', 'Індивідуальні інструкції'],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label}>
                  <textarea
                    name={`prescription.${index}.${key}`}
                    defaultValue={(item?.[key as keyof typeof item] as string | null) ?? ''}
                    className="field"
                  />
                </Field>
              ))}
            </div>
          </details>
        ))}
      </EditorSection>
      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <button disabled={pending} className="rc-btn rc-btn-primary">
        {pending ? 'Збереження…' : 'Зберегти чернетку'}
      </button>
    </form>
  );
}

function EditorSection({
  title,
  intro,
  children,
  hidden = false,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
  hidden?: boolean;
}) {
  return (
    <section className={`plan-editor-section${hidden ? ' hidden' : ''}`}>
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      <p className="mb-3 text-xs text-text-secondary">{intro}</p>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-xs text-text-secondary">
      {label}
      {children}
    </label>
  );
}
function RegionSelect({ name, value }: { name: string; value?: string | null }) {
  return (
    <select name={name} defaultValue={value ?? ''} className="field">
      <option value="">Не вказано</option>
      {ANATOMICAL_REGION_CODES.map((region) => (
        <option key={region} value={region}>
          {region.replaceAll('_', ' ')}
        </option>
      ))}
    </select>
  );
}
function LateralitySelect({ name, value }: { name: string; value?: string | null }) {
  return (
    <select name={name} defaultValue={value ?? ''} className="field">
      <option value="">Не вказано</option>
      {LATERALITIES.map((side) => (
        <option key={side} value={side}>
          {side}
        </option>
      ))}
    </select>
  );
}
