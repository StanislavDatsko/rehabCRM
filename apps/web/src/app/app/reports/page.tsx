import { listPatients } from '../../../features/patients/api/patients-api';
import { Avatar, PageHeader } from '@repo/ui/workspace';
import { canReadPatients } from '../../../features/patients/permissions';
import type { CurrentUserResponse } from '@repo/contracts';
import { serverApiFetch } from '../../../lib/api/server-api-client';

export const dynamic = 'force-dynamic';

export default async function ReportsIndex() {
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
      <PageHeader eyebrow="Клінічна аналітика" title="Клінічні звіти" description="Оберіть пацієнта, щоб переглянути або сформувати звіт із фактичних даних." />
      <section className="ui-filter-bar">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="rc-kicker">Звітність</p><h2 className="mt-1 text-lg font-semibold tracking-tight">Пацієнти</h2></div>
          <span className="ui-count">{patients.items.length} доступно</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {patients.items.map((patient) => (
            <a
              key={patient.id}
              href={`/app/patients/${patient.id}/reports`}
              className="flex items-center gap-3 border-b border-border p-4 transition-colors last:border-b-0 hover:bg-surface-muted"
            >
              <Avatar name={patient.fullName} /><div><span className="font-medium">{patient.fullName}</span>
              <span className="mt-1 block text-sm text-text-secondary">
                Відкрити історію звітів
              </span>
              </div><span className="ml-auto text-text-secondary" aria-hidden="true">↗</span>
            </a>
          ))}
        </div>
        {!patients.items.length && <p className="py-8 text-sm text-text-secondary">Пацієнтів ще немає. Звіти стануть доступними після створення карток та клінічних записів.</p>}
      </section>
    </div>
  );
}
