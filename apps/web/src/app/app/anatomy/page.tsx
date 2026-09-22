import { listPatients } from '../../../features/patients/api/patients-api';
import { HumanAtlasExplorer } from '../../../features/anatomy/human-atlas/human-atlas-explorer';
import { serverApiFetch } from '../../../lib/api/server-api-client';
import { PERMISSIONS, type CurrentUserResponse, hasPermission } from '@repo/contracts';
import { PageHeader, Avatar } from '@repo/ui/workspace';

export const dynamic = 'force-dynamic';

export default async function AnatomyIndex() {
  const me = await serverApiFetch<CurrentUserResponse>('/api/v1/me');
  const canReadPatients = hasPermission(me.permissions, PERMISSIONS.PATIENT_READ_ADMIN) || hasPermission(me.permissions, PERMISSIONS.PATIENT_READ_CLINICAL);
  const patients = canReadPatients ? await listPatients({
    page: 1,
    pageSize: 50,
    sort: 'updatedAt',
    sortDir: 'desc',
    search: '',
    status: '',
    responsiblePractitionerId: '',
  }) : null;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Клінічний explorer" title="3D анатомія" description="Досліджуйте структури та відкривайте versioned body-map annotations." />
      <HumanAtlasExplorer />
      <section className="ui-filter-bar">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="rc-kicker">Персоналізована анатомія</p><h2 className="mt-1 text-lg font-semibold tracking-tight">Пацієнтський body map</h2></div><span className="ui-count">{patients?.items.length ?? 0}</span></div>
        {patients ? <div className="mt-4 grid gap-3 md:grid-cols-2">
          {patients.items.map((patient) => (
            <a
              key={patient.id}
              href={`/app/patients/${patient.id}/body-map`}
              className="flex items-center gap-3 border-b border-border p-4 transition-colors last:border-b-0 hover:bg-surface-muted"
            >
              <Avatar name={patient.fullName} />
              <span className="min-w-0">
              <span className="font-medium">{patient.fullName}</span>
              <span className="mt-1 block text-sm text-text-secondary">Відкрити 3D карту</span>
              </span>
            </a>
          ))}
        </div> : <p className="mt-3 text-sm text-text-secondary">Доступ до карт пацієнтів для цієї ролі недоступний.</p>}
      </section>
    </div>
  );
}
