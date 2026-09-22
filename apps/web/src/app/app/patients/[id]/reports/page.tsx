import type { CurrentUserResponse } from '@repo/contracts';
import { getPatient } from '../../../../../features/patients/api/patients-api';
import {
  downloadReportAction,
  generateReportAction,
  voidReportAction,
} from '../../../../../features/progress/actions/report-actions';
import { listClinicalReports } from '../../../../../features/progress/api/progress-api';
import {
  canCreateClinicalReport,
  canReadClinicalReports,
  canVoidClinicalReport,
} from '../../../../../features/progress/permissions';
import { serverApiFetch } from '../../../../../lib/api/server-api-client';
import { PageHeader, StatusPill } from '@repo/ui/workspace';

export const dynamic = 'force-dynamic';
const today = () => new Date().toISOString().slice(0, 10);
const ago = () => new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);
const statusLabel: Record<string, string> = {
  DRAFT: 'Чернетка',
  GENERATING: 'Формується',
  COMPLETED: 'Готовий',
  FAILED: 'Помилка',
  VOIDED: 'Анульований',
};

export default async function PatientReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; voided?: string; error?: string }>;
}) {
  const me = await serverApiFetch<CurrentUserResponse>('/api/v1/me');
  const { id } = await params;
  const flash = await searchParams;
  if (!canReadClinicalReports(me))
    return (
      <div className="rounded-md border border-danger/30 bg-danger/5 p-5">
        <h1 className="font-sans text-2xl">Звіти недоступні</h1>
        <p className="mt-2 text-sm">Недостатньо клінічних прав.</p>
      </div>
    );
  const [patient, reports] = await Promise.all([getPatient(id), listClinicalReports(id)]);
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Клінічні звіти" title={patient.fullName} description="Завершений PDF є незмінним знімком вибраних джерел." actions={<nav className="flex gap-3 text-sm"><a className="text-info underline" href={`/app/patients/${id}/progress`}>Динаміка</a><a className="text-info underline" href={`/app/patients/${id}`}>Профіль</a></nav>} />
      {flash.created ? (
        <p
          role="status"
          className="rounded border border-success/30 bg-success/5 p-3 text-sm text-success"
        >
          Звіт сформовано.
        </p>
      ) : null}
      {flash.voided ? (
        <p
          role="status"
          className="rounded border border-success/30 bg-success/5 p-3 text-sm text-success"
        >
          Звіт анульовано; файл збережено для аудиту.
        </p>
      ) : null}
      {flash.error ? (
        <p
          role="alert"
          className="rounded border border-danger/30 bg-danger/5 p-3 text-sm text-danger"
        >
          Не вдалося виконати дію: {flash.error}.
        </p>
      ) : null}
      {canCreateClinicalReport(me) ? (
        <section className="ui-filter-bar">
          <h2 className="font-sans text-xl">Сформувати звіт</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Оберіть джерела та напишіть професійне резюме власноруч. Система не генерує клінічних
            висновків.
          </p>
          <form action={generateReportAction} className="mt-4 grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="patientId" value={id} />
            <label className="text-sm">
              Від
              <input required type="date" name="from" defaultValue={ago()} className="field" />
            </label>
            <label className="text-sm">
              До
              <input required type="date" name="to" defaultValue={today()} className="field" />
            </label>
            <fieldset className="sm:col-span-2">
              <legend className="text-sm font-medium">Розділи</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {[
                  ['SUMMARY', 'Клінічне резюме'],
                  ['MEASUREMENT_TRENDS', 'Динаміка вимірювань'],
                  ['GOAL_PROGRESS', 'Прогрес цілей'],
                  ['PLAN_HISTORY', 'Історія плану'],
                  ['BODY_ANNOTATIONS', 'Позначки тіла'],
                ].map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="sections" value={value} defaultChecked />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="text-sm sm:col-span-2">
              Професійне резюме
              <textarea
                name="professionalSummary"
                maxLength={5000}
                rows={6}
                className="field"
                placeholder="Задокументуйте власну клінічну інтерпретацію…"
              />
            </label>
            <button className="rc-btn rc-btn-primary w-fit">Сформувати PDF</button>
          </form>
        </section>
      ) : null}
      <section className="ui-filter-bar">
        <h2 className="font-sans text-xl">Історія звітів</h2>
        <div className="mt-3 space-y-3">
          {reports.items.length ? (
            reports.items.map((report) => (
              <article key={report.id} className="rounded-md border border-border bg-surface p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <h3 className="font-medium">Звіт про динаміку</h3>
                    <p className="text-sm text-text-secondary">
                      {new Date(report.period.from).toLocaleDateString('uk-UA')} —{' '}
                      {new Date(report.period.to).toLocaleDateString('uk-UA')} ·{' '}
                      {report.generatedBy.displayName}
                    </p>
                  </div>
                  <StatusPill tone={report.status === 'COMPLETED' ? 'success' : report.status === 'FAILED' ? 'danger' : 'neutral'}>{statusLabel[report.status] ?? report.status}</StatusPill>
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  {report.status === 'COMPLETED' ? (
                    <form action={downloadReportAction}>
                      <input type="hidden" name="patientId" value={id} />
                      <input type="hidden" name="reportId" value={report.id} />
                      <button className="rc-btn rc-btn-secondary">Завантажити</button>
                    </form>
                  ) : null}
                  {canVoidClinicalReport(me) && report.status !== 'VOIDED' ? (
                    <form action={voidReportAction} className="flex flex-wrap gap-2">
                      <input type="hidden" name="patientId" value={id} />
                      <input type="hidden" name="reportId" value={report.id} />
                      <label className="sr-only" htmlFor={`reason-${report.id}`}>
                        Причина анулювання
                      </label>
                      <input
                        id={`reason-${report.id}`}
                        required
                        minLength={3}
                        name="reason"
                        placeholder="Причина анулювання"
                        className="field mt-0 w-56"
                      />
                      <button className="rc-btn rc-btn-ghost">Анулювати</button>
                    </form>
                  ) : null}
                </div>
                {report.voidReason ? (
                  <p className="mt-2 text-sm text-danger">Причина: {report.voidReason}</p>
                ) : null}
              </article>
            ))
          ) : (
            <p className="rounded-md border border-dashed border-border p-4 text-sm text-text-secondary">
              Звітів ще немає.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
