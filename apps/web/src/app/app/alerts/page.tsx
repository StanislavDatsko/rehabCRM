import { serverApiFetch } from '../../../lib/api/server-api-client';
import { acknowledgeAlert, resolveAlert } from '../../../features/notifications/clinician-actions';
type Alert = {
  id: string;
  patientId: string;
  type: string;
  severity: string;
  status: string;
  title: string;
  summary: string;
  version: number;
  createdAt: string;
};
export const dynamic = 'force-dynamic';
export default async function AlertsPage() {
  const alerts = await serverApiFetch<Alert[]>('/api/v1/clinical-alerts');
  return (
    <div className="space-y-6">
      <header className="rc-gradient-brand rounded-[1.25rem] p-6 text-white shadow-brand">
        <p className="rc-kicker text-white/75">Клінічний контроль</p>
        <h1 className="font-serif text-3xl">Пацієнти, що потребують уваги</h1>
        <p className="mt-2 text-sm text-white/80">
          Детерміновані сигнали для клінічного перегляду, не діагнози.
        </p>
      </header>
      {alerts.length ? (
        <div className="space-y-3">
          {alerts.map((a) => (
            <article key={a.id} className="rc-card p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <p className="font-medium">{a.title}</p>
                <span className="text-sm">
                  {a.severity} · {a.status}
                </span>
              </div>
              <p className="mt-2 text-sm">{a.summary}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <a
                  className="text-sm text-info underline"
                  href={`/app/patients/${a.patientId}/monitoring`}
                >
                  Відкрити моніторинг пацієнта
                </a>
                {a.status === 'OPEN' ? (
                  <form action={acknowledgeAlert}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="version" value={a.version} />
                    <button className="text-sm text-info underline">Підтвердити увагу</button>
                  </form>
                ) : null}
                {a.status !== 'RESOLVED' ? (
                  <form action={resolveAlert}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="version" value={a.version} />
                    <button className="text-sm text-info underline">Позначити вирішеним</button>
                  </form>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-text-secondary">Активних сигналів немає.</p>
      )}
    </div>
  );
}
