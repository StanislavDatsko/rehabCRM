import { serverApiFetch } from '../../../lib/api/server-api-client';
export default async function PatientProgressPage() {
  const [data, monitoring] = await Promise.all([
    serverApiFetch<{
      measurements: Array<{ name: string; value: number | null; unit: string | null }>;
    }>('/api/v1/patient-portal/progress'),
    serverApiFetch<{
      dailyReports: Array<{
        reportDate: string;
        painScore: number;
        fatigueLevel: number;
        overallWellbeing: number;
        source: string;
      }>;
      exerciseCompletions: Array<{ executionDate: string; status: string; source: string }>;
    }>('/api/v1/patient-portal/monitoring?days=30'),
  ]);
  return (
    <div className="space-y-8">
      <header className="rc-gradient-brand rounded-[1.25rem] p-6 text-white shadow-brand">
        <p className="rc-kicker text-white/75">Відновлення</p>
        <h1 className="mt-1 text-3xl font-semibold">Мій прогрес</h1>
        <p className="mt-2 text-sm text-white/80">
          Спостерігайте за ключовими змінами у власному темпі.
        </p>
      </header>
      <section className="rc-card p-5">
        <h2 className="text-xl font-semibold">Вимірювання</h2>
        {data.measurements.length ? (
          <div className="mt-3" role="table">
            {data.measurements.map((m, i) => (
              <p key={`${m.name}-${i}`} className="border-b border-border py-3">
                {m.name}: {m.value} {m.unit ?? ''}
              </p>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-text-secondary">Вимірювань поки немає.</p>
        )}
      </section>
      <section className="rc-card p-5">
        <h2 className="text-xl font-semibold">Мої щоденні звіти</h2>
        {monitoring.dailyReports.length ? (
          <div className="mt-3 space-y-2">
            {monitoring.dailyReports.map((r) => (
              <p key={r.reportDate} className="rounded border border-border p-3">
                {r.reportDate}: самопочуття {r.overallWellbeing}/10, біль {r.painScore}/10, втома{' '}
                {r.fatigueLevel}/10{' '}
                <span className="text-xs text-text-secondary">
                  ({r.source === 'PATIENT_REPORTED' ? 'внесено пацієнтом' : r.source})
                </span>
              </p>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-text-secondary">Щоденних звітів поки немає.</p>
        )}
      </section>
      <section>
        <h2 className="text-xl font-semibold">Виконання вправ</h2>
        {monitoring.exerciseCompletions.length ? (
          <div className="mt-3 space-y-2">
            {monitoring.exerciseCompletions.map((r, i) => (
              <p key={`${r.executionDate}-${i}`} className="rounded border border-border p-3">
                {r.executionDate}:{' '}
                {r.status === 'COMPLETED'
                  ? 'виконано'
                  : r.status === 'PARTIAL'
                    ? 'частково'
                    : 'пропущено'}{' '}
                <span className="text-xs text-text-secondary">
                  ({r.source === 'PATIENT_REPORTED' ? 'внесено пацієнтом' : r.source})
                </span>
              </p>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-text-secondary">Записів про виконання вправ поки немає.</p>
        )}
      </section>
    </div>
  );
}
