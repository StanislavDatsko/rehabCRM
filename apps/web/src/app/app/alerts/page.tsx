import { serverApiFetch } from '../../../lib/api/server-api-client';
import { acknowledgeAlert, resolveAlert } from '../../../features/notifications/clinician-actions';
import { PageHeader, StatusPill } from '@repo/ui/workspace';
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
      <PageHeader eyebrow="Клінічний контроль" title="Черга уваги" description="Детерміновані сигнали для клінічного перегляду, не діагнози." metadata={<span className="ui-count">{alerts.filter((item) => item.status !== 'RESOLVED').length} відкрито</span>} />
      {alerts.length ? (
        <div className="space-y-3">
          {alerts.map((a) => (
            <article key={a.id} className="ui-surface p-5 transition-colors hover:border-border-strong">
              <div className="flex flex-wrap justify-between gap-2">
                <p className="font-medium">{a.title}</p>
                <div className="flex flex-wrap gap-2"><StatusPill tone={a.severity === 'HIGH' ? 'danger' : a.severity === 'MEDIUM' ? 'warning' : 'neutral'}>{a.severity}</StatusPill><StatusPill tone={a.status === 'RESOLVED' ? 'success' : 'neutral'}>{a.status}</StatusPill></div>
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
