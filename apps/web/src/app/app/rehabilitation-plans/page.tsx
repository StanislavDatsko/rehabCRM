import { listPatients } from '../../../features/patients/api/patients-api';
import { canReadPatients } from '../../../features/patients/permissions';
import type { CurrentUserResponse } from '@repo/contracts';
import { serverApiFetch } from '../../../lib/api/server-api-client';
import { PageHeader, Avatar } from '@repo/ui/workspace';

export const dynamic = 'force-dynamic';

export default async function RehabilitationPlansIndex() {
  const me = await serverApiFetch<CurrentUserResponse>('/api/v1/me');
  if (!canReadPatients(me)) return <p className="ui-surface p-6 text-sm text-text-secondary">Доступ до пацієнтів для цієї ролі недоступний.</p>;
  const patients = await listPatients({
    page: 1,
    pageSize: 50,
    sort: 'updatedAt',
    sortDir: 'desc',
    search: '',
    status: '',
    responsiblePractitionerId: '',
  });
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Клінічні програми" title="Реабілітаційні плани" description="Оберіть пацієнта, щоб переглянути активні плани та прогрес." metadata={<span className="ui-count">{patients.items.length} пацієнтів</span>} />
      <section className="ui-filter-bar">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="rc-kicker">Робочий список</p><h2 className="mt-1 text-lg font-semibold tracking-tight">Пацієнти</h2></div><span className="text-xs text-text-secondary">Останні оновлення</span></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {patients.items.map((patient) => (
            <a
              key={patient.id}
              href={`/app/patients/${patient.id}`}
              className="flex items-center gap-3 border-b border-border p-4 transition-colors last:border-b-0 hover:bg-surface-muted"
            >
              <Avatar name={patient.fullName} />
              <span className="min-w-0">
              <span className="font-medium">{patient.fullName}</span>
              <span className="mt-1 block text-sm text-text-secondary">
                Відкрити картку та плани
              </span>
              </span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
