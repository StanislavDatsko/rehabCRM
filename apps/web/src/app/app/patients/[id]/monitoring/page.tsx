import { serverApiFetch } from '../../../../../lib/api/server-api-client';

export const dynamic = 'force-dynamic';
type Report = {
  reportDate: string;
  painScore: number;
  fatigueLevel: number;
  overallWellbeing: number;
  comment: string | null;
  source: string;
};
type Monitoring = {
  missingReportDays: string[];
  exerciseSummary: { completedExerciseCount: number; recordedExerciseCount: number };
  dailyReports: Report[];
  exerciseCompletions: Array<{ executionDate: string; status: string; source: string }>;
};

export default async function PatientMonitoringPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await serverApiFetch<Monitoring>(`/api/v1/patients/${id}/monitoring?days=30`);
  return (
    <div className="space-y-6">
      <header className="rc-gradient-brand rounded-[1.25rem] p-6 text-white shadow-brand">
        <p className="rc-kicker text-white/75">Пацієнтський моніторинг</p>
        <h1 className="font-serif text-3xl">Дані, внесені пацієнтом</h1>
        <p className="mt-2 text-sm text-white/80">
          Фактичні звіти та виконання вправ без автоматичних висновків.
        </p>
      </header>
      <section className="rc-card rc-card-elevated p-4" aria-label="Підсумок моніторингу">
        <p>
          Виконано вправ: {data.exerciseSummary.completedExerciseCount} з{' '}
          {data.exerciseSummary.recordedExerciseCount} записаних.
        </p>
        <p className="text-sm text-text-secondary">
          Днів без щоденного звіту: {data.missingReportDays.length}.
        </p>
        {data.missingReportDays.length ? (
          <p className="mt-2 text-sm">Пропущені дні: {data.missingReportDays.join(', ')}</p>
        ) : null}
      </section>
      <section className="rc-card p-5">
        <h2 className="text-xl font-semibold">Динаміка симптомів</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Показники болю, втоми та самопочуття</caption>
            <thead>
              <tr className="border-b border-border">
                <th className="p-2">Дата</th>
                <th className="p-2">Біль /10</th>
                <th className="p-2">Втома /10</th>
                <th className="p-2">Самопочуття /10</th>
                <th className="p-2">Джерело</th>
              </tr>
            </thead>
            <tbody>
              {data.dailyReports.map((r) => (
                <tr key={r.reportDate} className="border-b border-border">
                  <td className="p-2">{r.reportDate}</td>
                  <td className="p-2">{r.painScore}</td>
                  <td className="p-2">{r.fatigueLevel}</td>
                  <td className="p-2">{r.overallWellbeing}</td>
                  <td className="p-2">{r.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data.dailyReports.length ? (
          <p className="mt-3 text-text-secondary">Даних поки немає.</p>
        ) : null}
      </section>
      <section className="rc-card p-5">
        <h2 className="text-xl font-semibold">Останні коментарі</h2>
        {data.dailyReports
          .filter((r) => r.comment)
          .map((r) => (
            <article
              key={`${r.reportDate}-comment`}
              className="mt-2 rounded-md border border-border p-4"
            >
              <p className="text-sm">
                {r.reportDate}: {r.comment}
              </p>
              <p className="mt-1 text-xs text-text-secondary">Джерело: {r.source}</p>
            </article>
          ))}
        {!data.dailyReports.some((r) => r.comment) ? (
          <p className="mt-3 text-text-secondary">Коментарів поки немає.</p>
        ) : null}
      </section>
      <section className="rc-card p-5">
        <h2 className="text-xl font-semibold">Виконання вправ</h2>
        {data.exerciseCompletions.length ? (
          <div className="mt-3 space-y-2">
            {data.exerciseCompletions.map((r, i) => (
              <p key={`${r.executionDate}-${i}`} className="rounded-md border border-border p-4">
                {r.executionDate} · {r.status} · джерело: {r.source}
              </p>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-text-secondary">Даних поки немає.</p>
        )}
      </section>
    </div>
  );
}
