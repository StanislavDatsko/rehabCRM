import { listPatients } from '../../../features/patients/api/patients-api';
import { canReadPatients } from '../../../features/patients/permissions';
import type { CurrentUserResponse } from '@repo/contracts';
import { serverApiFetch } from '../../../lib/api/server-api-client';

export const dynamic = 'force-dynamic';

export default async function ReportsIndex() {
  const me = await serverApiFetch<CurrentUserResponse>('/api/v1/me');
  if (!canReadPatients(me)) return <p className="rc-card p-6 text-sm text-text-secondary">Доступ до пацієнтів для цієї ролі недоступний.</p>;
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
      <header className="rc-atmosphere rounded-3xl p-6 text-white shadow-brand">
        <p className="rc-kicker text-white/75">Clinical intelligence</p>
        <h1 className="mt-1 font-serif text-3xl">Клінічні звіти</h1>
        <p className="mt-2 text-sm text-white/80">
          Оберіть пацієнта, щоб переглянути або сформувати звіт із фактичних даних.
        </p>
      </header>
      <section className="rc-card p-5">
        <h2 className="font-serif text-xl">Пацієнти</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {patients.items.map((patient) => (
            <a
              key={patient.id}
              href={`/app/patients/${patient.id}/reports`}
              className="rounded-xl border border-border p-4 hover:border-brand/40 hover:bg-brand/5"
            >
              <span className="font-medium">{patient.fullName}</span>
              <span className="mt-1 block text-sm text-text-secondary">
                Відкрити історію звітів
              </span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
