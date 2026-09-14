import type {
  AssessmentListItem,
  AssessmentStatus,
  AssessmentTemplateResponse,
} from '@repo/contracts';
import { assessmentStatusLabel, formatClinicalDate } from '../labels';

export function AssessmentHistorySection({
  patientId,
  assessments,
  canCreate,
  encounterId,
  templates,
  filters,
}: {
  patientId: string;
  assessments: AssessmentListItem[];
  canCreate: boolean;
  encounterId?: string;
  templates?: AssessmentTemplateResponse[];
  filters?: {
    status?: AssessmentStatus;
    templateId?: string;
    from?: string;
    to?: string;
  };
}) {
  return (
    <section className="rounded-md border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl text-text-primary">Оцінювання</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Структуровані спостереження фахівця. Система не формує діагнозів.
          </p>
        </div>
        {canCreate ? (
          <a
            href={`/app/patients/${patientId}/assessments/new${encounterId ? `?encounterId=${encounterId}` : ''}`}
            className="rc-btn rc-btn-primary"
          >
            Створити оцінювання
          </a>
        ) : null}
      </div>

      {templates ? (
        <form
          method="get"
          className="mt-5 grid gap-3 rounded-md bg-surface-muted p-4 md:grid-cols-5"
        >
          <label className="text-xs text-text-secondary">
            Статус
            <select
              name="assessmentStatus"
              defaultValue={filters?.status ?? ''}
              className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-2 text-sm"
            >
              <option value="">Усі</option>
              <option value="DRAFT">Чернетка</option>
              <option value="COMPLETED">Завершено</option>
              <option value="VOIDED">Анульовано</option>
            </select>
          </label>
          <label className="text-xs text-text-secondary md:col-span-2">
            Шаблон
            <select
              name="assessmentTemplate"
              defaultValue={filters?.templateId ?? ''}
              className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-2 text-sm"
            >
              <option value="">Усі шаблони</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} · редакція {template.revision}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-text-secondary">
            Від
            <input
              type="date"
              name="assessmentFrom"
              defaultValue={filters?.from ?? ''}
              className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-text-secondary">
            До
            <input
              type="date"
              name="assessmentTo"
              defaultValue={filters?.to ?? ''}
              className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-2 text-sm"
            />
          </label>
          <div className="flex gap-2 md:col-span-5">
            <button type="submit" className="rc-btn rc-btn-secondary">
              Застосувати
            </button>
            <a href={`/app/patients/${patientId}`} className="rc-btn rc-btn-ghost">
              Скинути
            </a>
          </div>
        </form>
      ) : null}

      {assessments.length === 0 ? (
        <div className="mt-5 rounded-md border border-dashed border-border p-6 text-sm text-text-secondary">
          Оцінювань ще немає. Вони не створюються автоматично під час початку візиту.
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="border-b border-border text-text-secondary">
              <tr>
                <th className="pb-2 pr-4 font-medium">Оцінювання</th>
                <th className="pb-2 pr-4 font-medium">Дата виконання</th>
                <th className="pb-2 pr-4 font-medium">Статус</th>
                <th className="pb-2 pr-4 font-medium">Показники</th>
                <th className="pb-2 font-medium">
                  <span className="sr-only">Дія</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {assessments.map((assessment) => (
                <tr key={assessment.id} className="border-b border-border/60 last:border-0">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-text-primary">{assessment.title}</div>
                    <div className="text-xs text-text-secondary">
                      {assessment.template
                        ? `${assessment.template.name} · редакція ${assessment.template.revision}`
                        : 'Без шаблону'}
                    </div>
                  </td>
                  <td className="py-3 pr-4">{formatClinicalDate(assessment.performedAt)}</td>
                  <td className="py-3 pr-4">
                    <span className="rounded-full bg-surface-muted px-2 py-1 text-xs">
                      {assessmentStatusLabel(assessment.status)}
                    </span>
                  </td>
                  <td className="py-3 pr-4">{assessment.measurementCount}</td>
                  <td className="py-3 text-right">
                    <a className="text-info underline" href={`/app/assessments/${assessment.id}`}>
                      {assessment.status === 'DRAFT' ? 'Продовжити' : 'Відкрити'}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
