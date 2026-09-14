import type {
  AssessmentResponse,
  AssessmentTemplateItemResponse,
  AnatomicalRegionCode,
  Laterality,
  MeasurementHistoryPoint,
  MeasurementResponse,
} from '@repo/contracts';
import {
  completeAssessmentAction,
  saveAssessmentAction,
  voidAssessmentAction,
} from '../actions/assessment-actions';
import {
  assessmentErrorMessage,
  assessmentStatusLabel,
  formatClinicalDate,
  lateralityLabel,
  unitLabel,
} from '../labels';

const regions: { code: AnatomicalRegionCode; label: string }[] = [
  { code: 'shoulder', label: 'Плечовий суглоб' },
  { code: 'elbow', label: 'Ліктьовий суглоб' },
  { code: 'wrist', label: 'Зап’ясток' },
  { code: 'hip', label: 'Кульшовий суглоб' },
  { code: 'knee', label: 'Колінний суглоб' },
  { code: 'ankle', label: 'Гомілковостопний суглоб' },
  { code: 'cervical_spine', label: 'Шийний відділ' },
  { code: 'thoracic_spine', label: 'Грудний відділ' },
  { code: 'lumbar_spine', label: 'Поперековий відділ' },
];
const lateralities: Laterality[] = ['LEFT', 'RIGHT', 'BILATERAL', 'MIDLINE', 'NOT_APPLICABLE'];
const categoryLabels: Record<string, string> = {
  PAIN: 'Біль',
  RANGE_OF_MOTION: 'Обсяг руху',
  STRENGTH: 'Сила',
  MOBILITY: 'Мобільність',
  BALANCE: 'Баланс',
  ENDURANCE: 'Витривалість',
  FUNCTIONAL_TEST: 'Функціональні тести',
  OTHER: 'Інше',
};

function inputValue(measurement: MeasurementResponse | undefined): string {
  if (!measurement) return '';
  return String(measurement.value);
}

function MeasurementInput({
  item,
  measurement,
  disabled,
}: {
  item: AssessmentTemplateItemResponse;
  measurement?: MeasurementResponse;
  disabled: boolean;
}) {
  const definition = item.definition;
  const name = `value.${item.id}`;
  const value = inputValue(measurement);
  if (definition.code === 'pain.nrs') {
    return (
      <fieldset disabled={disabled}>
        <legend className="sr-only">Інтенсивність болю від 0 до 10</legend>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">
          {Array.from({ length: 11 }, (_, number) => (
            <label key={number} className="cursor-pointer">
              <input
                className="peer sr-only"
                type="radio"
                name={name}
                value={number}
                defaultChecked={value === String(number)}
              />
              <span className="flex min-h-10 items-center justify-center rounded-md border border-border peer-checked:border-info peer-checked:bg-info/10 peer-focus-visible:ring-2 peer-focus-visible:ring-info">
                {number}
              </span>
            </label>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-xs text-text-secondary">
          <span>0 — немає болю</span>
          <span>10 — максимально сильний біль</span>
        </div>
      </fieldset>
    );
  }
  if (definition.code === 'strength.mrc' || definition.valueType === 'SCALE') {
    return (
      <fieldset disabled={disabled}>
        <legend className="sr-only">Значення шкали</legend>
        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: 6 }, (_, number) => (
            <label key={number} className="cursor-pointer">
              <input
                className="peer sr-only"
                type="radio"
                name={name}
                value={number}
                defaultChecked={value === String(number)}
              />
              <span className="flex min-h-10 items-center justify-center rounded-md border border-border peer-checked:border-info peer-checked:bg-info/10">
                {number}
              </span>
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-text-secondary">
          Шкала 0–5. Клінічне трактування залишається за фахівцем.
        </p>
      </fieldset>
    );
  }
  if (definition.valueType === 'BOOLEAN') {
    return (
      <select
        disabled={disabled}
        name={name}
        defaultValue={value}
        className="w-full rounded-md border border-border bg-surface px-3 py-2"
      >
        <option value="">Не вказано</option>
        <option value="true">Так</option>
        <option value="false">Ні</option>
      </select>
    );
  }
  if (definition.valueType === 'CODED') {
    return (
      <select
        disabled={disabled}
        name={name}
        defaultValue={value}
        className="w-full rounded-md border border-border bg-surface px-3 py-2"
      >
        <option value="">Не вказано</option>
        {definition.allowedCodedValues.map((choice) => (
          <option key={choice.code} value={choice.code}>
            {choice.label}
          </option>
        ))}
      </select>
    );
  }
  if (definition.valueType === 'TEXT') {
    return (
      <textarea
        disabled={disabled}
        name={name}
        defaultValue={value}
        maxLength={2000}
        className="min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2"
      />
    );
  }
  return (
    <div className="flex items-center gap-2">
      <input
        disabled={disabled}
        name={name}
        defaultValue={value}
        type="number"
        step={definition.valueType === 'NUMBER' ? 'any' : '1'}
        min={definition.minimumValue ?? undefined}
        max={definition.maximumValue ?? undefined}
        inputMode="decimal"
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-lg"
      />
      <span className="min-w-8 font-medium text-text-secondary">{unitLabel(definition.unit)}</span>
    </div>
  );
}

function PreviousValue({
  history,
  assessmentId,
  item,
  measurement,
}: {
  history: MeasurementHistoryPoint[];
  assessmentId: string;
  item: AssessmentTemplateItemResponse;
  measurement?: MeasurementResponse;
}) {
  const region = measurement?.anatomicalRegion ?? item.defaultRegion;
  const laterality = measurement?.laterality ?? item.defaultLaterality;
  const previous = [...history]
    .reverse()
    .find(
      (point) =>
        point.assessmentId !== assessmentId &&
        point.definitionCode === item.definition.code &&
        point.anatomicalRegion === region &&
        point.laterality === laterality,
    );
  if (!previous)
    return (
      <p className="mt-2 text-xs text-text-secondary">Попереднього порівнюваного значення немає.</p>
    );
  return (
    <p className="mt-2 text-xs text-text-secondary">
      Попереднє:{' '}
      <strong className="text-text-primary">
        {String(previous.value)}
        {unitLabel(previous.unit)}
      </strong>{' '}
      — {formatClinicalDate(previous.performedAt)}
    </p>
  );
}

function TrendSummary({ history }: { history: MeasurementHistoryPoint[] }) {
  const groups = new Map<string, MeasurementHistoryPoint[]>();
  history
    .filter((point) => typeof point.value === 'number')
    .forEach((point) => {
      const key = `${point.definitionCode}|${point.anatomicalRegion ?? ''}|${point.laterality ?? ''}`;
      groups.set(key, [...(groups.get(key) ?? []), point]);
    });
  const trends = [...groups.values()].filter((points) => points.length >= 2).slice(0, 3);
  if (trends.length === 0) return null;
  return (
    <section className="rounded-md border border-border bg-surface p-5">
      <h2 className="font-serif text-xl">Динаміка вимірювань</h2>
      <p className="mt-1 text-sm text-text-secondary">
        Фактичні значення за датою виконання, без згладжування та автоматичної оцінки покращення.
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {trends.map((points) => {
          const values = points.map((point) => Number(point.value));
          const min = Math.min(...values);
          const max = Math.max(...values);
          const span = max - min || 1;
          const coordinates = points
            .map(
              (point, index) =>
                `${10 + (index * 180) / Math.max(points.length - 1, 1)},${90 - ((Number(point.value) - min) / span) * 70}`,
            )
            .join(' ');
          const first = points[0];
          return (
            <div
              key={`${first?.definitionCode}-${first?.anatomicalRegion}-${first?.laterality}`}
              className="rounded-md bg-surface-muted p-3"
            >
              <h3 className="text-sm font-medium">{first?.definitionName}</h3>
              <svg
                role="img"
                aria-label={`Графік ${first?.definitionName}`}
                viewBox="0 0 200 100"
                className="mt-2 h-28 w-full"
              >
                <polyline
                  points={coordinates}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-info"
                />
                {coordinates.split(' ').map((pair, index) => {
                  const [cx, cy] = pair.split(',');
                  return <circle key={index} cx={cx} cy={cy} r="4" className="fill-info" />;
                })}
              </svg>
              <ul className="space-y-1 text-xs text-text-secondary">
                {points.slice(-4).map((point) => (
                  <li key={point.measurementId}>
                    {formatClinicalDate(point.performedAt)} — {String(point.value)}
                    {unitLabel(point.unit)}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function AssessmentWorkspace({
  assessment,
  history,
  canUpdate,
  canComplete,
  canVoid,
  canCreatePlan,
  notice,
  errorCode,
}: {
  assessment: AssessmentResponse;
  history: MeasurementHistoryPoint[];
  canUpdate: boolean;
  canComplete: boolean;
  canVoid: boolean;
  canCreatePlan: boolean;
  notice?: string;
  errorCode?: string;
}) {
  const editable = assessment.status === 'DRAFT' && canUpdate;
  const measurementByItem = new Map(
    assessment.measurements
      .filter((m) => m.templateItemId)
      .map((m) => [m.templateItemId as string, m]),
  );
  const items = assessment.template?.items ?? [];
  const categories = [...new Set(items.map((item) => item.definition.category))];
  const error = assessmentErrorMessage(errorCode);

  return (
    <div className="space-y-6">
      {notice ? (
        <div
          role="status"
          className="rounded-md border border-success/30 bg-success/5 p-3 text-sm text-success"
        >
          {notice}
        </div>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger"
        >
          {error}
        </div>
      ) : null}
      <header className="border-b border-border pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
              {assessment.patient.displayName}
            </p>
            <h1 className="mt-1 font-serif text-3xl">{assessment.title}</h1>
            <p className="mt-2 text-sm text-text-secondary">
              {formatClinicalDate(assessment.performedAt)} · {assessment.practitioner.displayName}
            </p>
          </div>
          <span className="rounded-full bg-surface-muted px-3 py-1 text-sm">
            {assessmentStatusLabel(assessment.status)}
          </span>
        </div>
        {assessment.template ? (
          <p className="mt-3 text-xs text-text-secondary">
            {assessment.template.name} · незмінна редакція {assessment.template.revision}
            {assessment.template.configurableSample
              ? ' · демонстраційний конфігурований шаблон'
              : ''}
          </p>
        ) : null}
      </header>

      <form action={saveAssessmentAction} className="space-y-6">
        <input type="hidden" name="assessmentId" value={assessment.id} />
        <input type="hidden" name="version" value={assessment.version} />
        <section className="grid gap-4 rounded-md border border-border bg-surface p-5 md:grid-cols-2">
          <label className="text-sm font-medium">
            Назва
            <input
              disabled={!editable}
              name="title"
              defaultValue={assessment.title}
              maxLength={200}
              required
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium">
            Дата і час виконання
            <input
              disabled={!editable}
              name="performedAt"
              type="datetime-local"
              defaultValue={assessment.performedAt.slice(0, 16)}
              max={new Date().toISOString().slice(0, 16)}
              required
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2"
            />
          </label>
        </section>
        {categories.map((category) => (
          <section key={category} className="rounded-md border border-border bg-surface p-5">
            <h2 className="font-serif text-xl">{categoryLabels[category]}</h2>
            <div className="mt-4 space-y-6">
              {items
                .filter((item) => item.definition.category === category)
                .map((item) => {
                  const measurement = measurementByItem.get(item.id);
                  const definition = item.definition;
                  const selectedRegion = measurement?.anatomicalRegion ?? item.defaultRegion ?? '';
                  const selectedLaterality =
                    measurement?.laterality ?? item.defaultLaterality ?? '';
                  return (
                    <div key={item.id} className="rounded-md border border-border/70 p-4">
                      <input type="hidden" name={`definition.${item.id}`} value={definition.id} />
                      <input
                        type="hidden"
                        name={`valueType.${item.id}`}
                        value={definition.valueType}
                      />
                      {definition.unit ? (
                        <input type="hidden" name={`unit.${item.id}`} value={definition.unit} />
                      ) : null}
                      <div className="mb-3">
                        <h3 className="font-medium">
                          {definition.name}
                          {item.required ? (
                            <span className="ml-1 text-danger" aria-label="обов’язковий">
                              *
                            </span>
                          ) : null}
                        </h3>
                        {definition.description ? (
                          <p className="mt-1 text-xs text-text-secondary">
                            {definition.description}
                          </p>
                        ) : null}
                      </div>
                      {definition.anatomicalApplicability !== 'NOT_APPLICABLE' ? (
                        <div className="mb-3 grid gap-3 sm:grid-cols-2">
                          <label className="text-xs text-text-secondary">
                            Ділянка
                            <select
                              disabled={!editable}
                              name={`region.${item.id}`}
                              defaultValue={selectedRegion}
                              required={definition.anatomicalApplicability === 'REQUIRED'}
                              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                            >
                              <option value="">Не вказано</option>
                              {regions.map((region) => (
                                <option key={region.code} value={region.code}>
                                  {region.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-xs text-text-secondary">
                            Сторона
                            <select
                              disabled={!editable}
                              name={`laterality.${item.id}`}
                              defaultValue={selectedLaterality}
                              required={definition.anatomicalApplicability === 'REQUIRED'}
                              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                            >
                              <option value="">Не вказано</option>
                              {lateralities.map((laterality) => (
                                <option key={laterality} value={laterality}>
                                  {lateralityLabel(laterality)}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      ) : (
                        <input
                          type="hidden"
                          name={`laterality.${item.id}`}
                          value="NOT_APPLICABLE"
                        />
                      )}
                      <MeasurementInput
                        item={item}
                        measurement={measurement}
                        disabled={!editable}
                      />
                      <PreviousValue
                        history={history}
                        assessmentId={assessment.id}
                        item={item}
                        measurement={measurement}
                      />
                      {assessment.status === 'COMPLETED' &&
                      canCreatePlan &&
                      measurement &&
                      typeof measurement.value === 'number' ? (
                        <a
                          href={`/app/patients/${assessment.patient.id}/rehabilitation/new?baseline=${encodeURIComponent(measurement.id)}`}
                          className="mt-3 inline-block text-xs text-info underline"
                        >
                          Створити ціль плану з цього вимірювання
                        </a>
                      ) : null}
                      <details className="mt-3">
                        <summary className="cursor-pointer text-xs text-text-secondary">
                          Примітка до показника
                        </summary>
                        <textarea
                          disabled={!editable}
                          name={`note.${item.id}`}
                          defaultValue={measurement?.note ?? ''}
                          maxLength={2000}
                          className="mt-2 min-h-20 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                        />
                      </details>
                    </div>
                  );
                })}
            </div>
          </section>
        ))}
        <section className="rounded-md border border-border bg-surface p-5">
          <label className="block font-serif text-xl">
            Професійний підсумок
            <textarea
              disabled={!editable}
              name="summary"
              defaultValue={assessment.summary ?? ''}
              maxLength={5000}
              className="mt-3 min-h-32 w-full rounded-md border border-border bg-surface px-3 py-2 font-sans text-sm"
              placeholder="Не замінює структуровані показники"
            />
          </label>
        </section>
        {editable ? (
          <div className="flex flex-wrap gap-3">
            <button type="submit" className="rc-btn rc-btn-primary">
              Зберегти чернетку
            </button>
            <span className="self-center text-xs text-text-secondary">
              Обов’язкові поля потрібні для завершення, але не для збереження чернетки.
            </span>
          </div>
        ) : null}
      </form>

      {assessment.status === 'DRAFT' && canComplete ? (
        <form
          action={completeAssessmentAction}
          className="rounded-md border border-border bg-surface p-5"
        >
          <input type="hidden" name="assessmentId" value={assessment.id} />
          <input type="hidden" name="version" value={assessment.version} />
          <h2 className="font-serif text-lg">Завершення оцінювання</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Спочатку збережіть усі зміни. Після завершення звичайне редагування буде заблоковано.
          </p>
          <button className="rc-btn rc-btn-primary mt-3" type="submit">
            Завершити оцінювання
          </button>
        </form>
      ) : null}
      {assessment.status !== 'VOIDED' && canVoid ? (
        <form
          action={voidAssessmentAction}
          className="rounded-md border border-danger/20 bg-surface p-5"
        >
          <input type="hidden" name="assessmentId" value={assessment.id} />
          <input type="hidden" name="version" value={assessment.version} />
          <label className="block text-sm font-medium">
            Причина анулювання
            <input
              name="reason"
              required
              minLength={3}
              maxLength={1000}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2"
            />
          </label>
          <p className="mt-2 text-xs text-text-secondary">
            Запис і вимірювання залишаться в історії. Для виправлення створіть нове оцінювання.
          </p>
          <button className="rc-btn rc-btn-secondary mt-3" type="submit">
            Анулювати запис
          </button>
        </form>
      ) : null}
      <TrendSummary history={history} />
      <p>
        <a href={`/app/patients/${assessment.patient.id}`} className="text-sm text-info underline">
          Повернутися до картки пацієнта
        </a>
      </p>
    </div>
  );
}
