import { listPatients } from '../../../features/patients/api/patients-api';
import { HumanAtlasExplorer } from '../../../features/anatomy/human-atlas/human-atlas-explorer';

export const dynamic = 'force-dynamic';

export default async function AnatomyIndex() {
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
        <p className="rc-kicker text-white/75">3D clinical explorer</p>
        <h1 className="mt-1 font-serif text-3xl">3D анатомія</h1>
        <p className="mt-2 text-sm text-white/80">
          Оберіть пацієнта для body-map workspace та versioned annotations.
        </p>
      </header>
      <HumanAtlasExplorer />
      <section className="rc-card p-5">
        <h2 className="font-serif text-xl">Пацієнтський body map</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {patients.items.map((patient) => (
            <a
              key={patient.id}
              href={`/app/patients/${patient.id}/body-map`}
              className="rounded-xl border border-border p-4 hover:border-brand/40 hover:bg-brand/5"
            >
              <span className="font-medium">{patient.fullName}</span>
              <span className="mt-1 block text-sm text-text-secondary">Відкрити 3D карту</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
