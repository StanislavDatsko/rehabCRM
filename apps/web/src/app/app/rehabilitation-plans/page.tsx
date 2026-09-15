import { listPatients } from '../../../features/patients/api/patients-api';

export const dynamic = 'force-dynamic';

export default async function RehabilitationPlansIndex() {
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
      <header className="rc-gradient-brand rounded-[1.25rem] p-6 text-white shadow-brand">
        <p className="rc-kicker text-white/75">Clinical programs</p>
        <h1 className="mt-1 font-serif text-3xl">Реабілітаційні плани</h1>
        <p className="mt-2 text-sm text-white/80">
          Оберіть пацієнта, щоб переглянути його активні плани та прогрес.
        </p>
      </header>
      <section className="rc-card p-5">
        <h2 className="font-serif text-xl">Пацієнти</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {patients.items.map((patient) => (
            <a
              key={patient.id}
              href={`/app/patients/${patient.id}`}
              className="rounded-xl border border-border p-4 hover:border-brand/40 hover:bg-brand/5"
            >
              <span className="font-medium">{patient.fullName}</span>
              <span className="mt-1 block text-sm text-text-secondary">
                Відкрити картку та плани
              </span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
