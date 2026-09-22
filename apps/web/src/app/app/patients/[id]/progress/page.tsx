import { CLINICAL_TIMELINE_CATEGORIES, PROGRESS_PERIODS, type ClinicalTimelineCategory, type CurrentUserResponse, type ProgressPeriod } from '@repo/contracts';
import { getPatient } from '../../../../../features/patients/api/patients-api';
import { getBodyAnnotationProgress, getClinicalTimeline, getGoalProgress, getMeasurementTrends, getPlanHistory, getProgressSummary, type ProgressFilters } from '../../../../../features/progress/api/progress-api';
import { ProgressDashboard } from '../../../../../features/progress/components/progress-dashboard';
import { canReadClinicalTimeline, canReadProgress } from '../../../../../features/progress/permissions';
import { ServerApiError, serverApiFetch } from '../../../../../lib/api/server-api-client';

export const dynamic = 'force-dynamic';
const dateIso = (value: string | undefined, end = false) => /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') ? `${value}T${end ? '23:59:59.999' : '00:00:00.000'}Z` : undefined;

export default async function PatientProgressPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ period?: string; from?: string; to?: string; timelineCategory?: string; timelineCursor?: string }> }) {
  const me = await serverApiFetch<CurrentUserResponse>('/api/v1/me');
  if (!canReadProgress(me) || !canReadClinicalTimeline(me)) return <div className="rounded-md border border-danger/30 bg-danger/5 p-5"><h1 className="font-sans text-2xl">Динаміка недоступна</h1><p className="mt-2 text-sm">Недостатньо клінічних прав для перегляду.</p></div>;
  const { id } = await params;
  const input = await searchParams;
  const period: ProgressPeriod = PROGRESS_PERIODS.includes(input.period as ProgressPeriod) ? input.period as ProgressPeriod : '90d';
  const timelineCategory = CLINICAL_TIMELINE_CATEGORIES.includes(input.timelineCategory as ClinicalTimelineCategory) ? input.timelineCategory as ClinicalTimelineCategory : undefined;
  const filters: ProgressFilters = { period, ...(period === 'custom' ? { from: dateIso(input.from), to: dateIso(input.to, true) } : {}) };
  try {
    const [patient, summary] = await Promise.all([getPatient(id), getProgressSummary(id, filters)]);
    const range = { from: summary.period.from, to: summary.period.to };
    const [measurements, goals, history, annotations, timeline] = await Promise.all([getMeasurementTrends(id, filters), getGoalProgress(id, filters), getPlanHistory(id, filters), getBodyAnnotationProgress(id, filters), getClinicalTimeline(id, { ...range, category: timelineCategory, cursor: input.timelineCursor })]);
    const next = timeline.nextCursor ? new URLSearchParams({ period, ...(input.from ? { from: input.from } : {}), ...(input.to ? { to: input.to } : {}), ...(timelineCategory ? { timelineCategory } : {}), timelineCursor: timeline.nextCursor }) : null;
    return <div className="space-y-6"><header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5"><div><p className="text-xs uppercase tracking-wide text-text-secondary">Динаміка пацієнта</p><h1 className="font-sans text-3xl">{patient.fullName}</h1><p className="mt-1 text-sm text-text-secondary">Фактичні клінічні дані без автоматичних висновків або рекомендацій.</p></div><nav className="flex gap-3 text-sm"><a className="text-info underline" href={`/app/patients/${id}/reports`}>Звіти</a><a className="text-info underline" href={`/app/patients/${id}`}>Профіль</a></nav></header>
      <form method="get" className="grid gap-3 rounded-md border border-border bg-surface p-4 sm:grid-cols-2 xl:grid-cols-[180px_1fr_1fr_220px_auto]" aria-label="Період динаміки"><label className="text-sm">Період<select name="period" defaultValue={period} className="field"><option value="30d">30 днів</option><option value="90d">90 днів</option><option value="current-plan">Поточний план</option><option value="custom">Власний період</option><option value="all">Увесь запис</option></select></label><label className="text-sm">Від<input type="date" name="from" defaultValue={input.from} className="field" /></label><label className="text-sm">До<input type="date" name="to" defaultValue={input.to} className="field" /></label><label className="text-sm">Події хронології<select name="timelineCategory" defaultValue={timelineCategory ?? ''} className="field"><option value="">Усі категорії</option>{CLINICAL_TIMELINE_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label><button className="rc-btn rc-btn-secondary self-end">Застосувати</button></form>
      <p className="text-sm text-text-secondary">Період даних: {new Date(summary.period.from).toLocaleDateString('uk-UA')} — {new Date(summary.period.to).toLocaleDateString('uk-UA')}</p>
      <ProgressDashboard patientId={id} summary={summary} measurements={measurements} goals={goals} history={history} annotations={annotations} timeline={timeline} timelineNextHref={next ? `?${next}` : null} />
    </div>;
  } catch (error) {
    const code = error instanceof ServerApiError ? error.body?.code : undefined;
    return <div className="space-y-4"><h1 className="font-sans text-3xl">Динаміка пацієнта</h1><div role="alert" className="rounded-md border border-danger/30 bg-danger/5 p-5"><p className="font-medium">Не вдалося завантажити динаміку.</p><p className="mt-1 text-sm">{code === 'PROGRESS_NOT_FOUND' ? 'Для вибраного періоду або поточного плану даних немає.' : code === 'PROGRESS_INVALID_DATE_RANGE' ? 'Перевірте межі вибраного періоду.' : 'Спробуйте оновити сторінку.'}</p></div><a href={`/app/patients/${id}`} className="text-sm text-info underline">Повернутися до профілю</a></div>;
  }
}
