import { listPatients } from '../../../features/patients/api/patients-api';
import { canReadPatients } from '../../../features/patients/permissions';
import type { CurrentUserResponse } from '@repo/contracts';
import { serverApiFetch } from '../../../lib/api/server-api-client';
import { PageHeader, Avatar } from '@repo/ui/workspace';

export const dynamic = 'force-dynamic';

export default async function RehabilitationPlansIndex({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const me = await serverApiFetch<CurrentUserResponse>('/api/v1/me');
  if (!canReadPatients(me)) return <p className="ui-surface p-6 text-sm text-text-secondary">Доступ до пацієнтів для цієї ролі недоступний.</p>;
  const { search = '' } = await searchParams;
  const patients = await listPatients({
    tab: 'patients',
    page: 1,
    pageSize: 50,
    sort: 'updatedAt',
    sortDir: 'desc',
    search: search.trim(),
    status: '',
    responsiblePractitionerId: '',
  });
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Клінічні програми"
        title="Реабілітація"
        description="Оберіть пацієнта, щоб побачити лише його реабілітаційні плани, клінічну динаміку та звіти."
        metadata={<span className="ui-count">{patients.items.length}</span>}
      />
      <form method="get" className="ui-filter-bar flex flex-wrap items-end gap-3">
        <label className="grow text-xs text-text-secondary">
          Пошук пацієнта
          <input name="search" defaultValue={search} placeholder="Прізвище, ім’я або телефон" className="field mt-1 w-full" autoFocus />
        </label>
        <button className="rc-btn rc-btn-primary">Знайти</button>
        {search ? (
          <a className="rc-btn rc-btn-secondary" href="/app/rehabilitation-plans">
            Скинути
          </a>
        ) : null}
      </form>
      <section className="ui-filter-bar">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="rc-kicker">Робочий список</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">Пацієнти</h2>
          </div>
        </div>
        {patients.items.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {patients.items.map((patient) => (
              <a
                key={patient.id}
                href={`/app/patients/${patient.id}/rehabilitation`}
                className="flex items-center gap-3 border-b border-border p-4 transition-colors last:border-b-0 hover:bg-surface-muted"
              >
                <Avatar name={patient.fullName} />
                <span className="min-w-0">
                  <span className="font-medium">{patient.fullName}</span>
                  <span className="mt-1 block text-sm text-text-secondary">Плани · динаміка · звіти</span>
                </span>
              </a>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-text-secondary">Нікого не знайдено. Змініть запит.</p>
        )}
      </section>
    </div>
  );
}
