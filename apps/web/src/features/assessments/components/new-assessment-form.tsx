import type { AssessmentTemplateResponse, PatientAdministrativeResponse } from '@repo/contracts';
import { createAssessmentAction } from '../actions/assessment-actions';
import { assessmentErrorMessage } from '../labels';

export function NewAssessmentForm({
  patient,
  templates,
  encounterId,
  errorCode,
}: {
  patient: PatientAdministrativeResponse;
  templates: AssessmentTemplateResponse[];
  encounterId: string | null;
  errorCode?: string;
}) {
  const error = assessmentErrorMessage(errorCode);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="border-b border-border pb-5">
        <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
          {patient.fullName}
        </p>
        <h1 className="mt-1 font-serif text-3xl">Нове оцінювання</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Оберіть конфігурований шаблон. Це не автоматична діагностика і не призначення лікування.
        </p>
      </header>
      {error ? (
        <div
          role="alert"
          className="rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger"
        >
          {error}
        </div>
      ) : null}
      <form
        action={createAssessmentAction}
        className="space-y-5 rounded-md border border-border bg-surface p-5"
      >
        <input type="hidden" name="patientId" value={patient.id} />
        {encounterId ? <input type="hidden" name="encounterId" value={encounterId} /> : null}
        <label className="block text-sm font-medium">
          Шаблон оцінювання
          <select
            name="templateId"
            required
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2"
          >
            <option value="">Оберіть шаблон</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} · редакція {template.revision}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Назва (необов’язково)
          <input
            name="title"
            maxLength={200}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2"
            placeholder="За замовчуванням — назва шаблону"
          />
        </label>
        {!encounterId ? (
          <label className="block text-sm font-medium">
            Дата і час виконання
            <input
              name="performedAt"
              type="datetime-local"
              max={new Date().toISOString().slice(0, 16)}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2"
            />
            <span className="mt-1 block text-xs font-normal text-text-secondary">
              Залиште порожнім для поточного часу. Майбутня дата не дозволена.
            </span>
          </label>
        ) : (
          <p className="text-sm text-text-secondary">
            Дата виконання за замовчуванням відповідає початку пов’язаного візиту.
          </p>
        )}
        <div className="rounded-md bg-surface-muted p-3 text-xs text-text-secondary">
          Демонстраційні шаблони є конфігурованими прикладами та потребують затвердження клінікою.
        </div>
        <div className="flex gap-3">
          <button className="rc-btn rc-btn-primary" type="submit">
            Створити чернетку
          </button>
          <a className="rc-btn rc-btn-secondary" href={`/app/patients/${patient.id}`}>
            Скасувати
          </a>
        </div>
      </form>
    </div>
  );
}
