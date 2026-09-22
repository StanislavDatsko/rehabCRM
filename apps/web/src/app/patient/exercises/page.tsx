import { serverApiFetch } from '../../../lib/api/server-api-client';
import { completeExercise } from '../../../features/patient-portal/exercise-actions';
import { PageHeader } from '@repo/ui/workspace';
type Exercise = {
  id: string;
  exerciseNameSnapshot: string;
  laterality: string | null;
  sets: number | null;
  repetitions: number | null;
  frequencyType: string | null;
  sessionsPerDay: number | null;
  daysPerWeek: number | null;
  instructionsOverride: string | null;
  precautions: string | null;
};
export default async function PatientExercisesPage() {
  const exercises = await serverApiFetch<Exercise[]>('/api/v1/patient-portal/exercises/today');
  return (
    <>
      <PageHeader eyebrow="Мій план" title="Вправи на сьогодні" description="Невеликі послідовні кроки підтримують відновлення." />
      {exercises.length ? (
        <div className="mt-6 space-y-4">
          {exercises.map((e) => (
            <article key={e.id} className="ui-filter-bar">
              <h2 className="text-lg font-semibold">{e.exerciseNameSnapshot}</h2>
              <p className="mt-2 text-sm">
                {e.sets ?? '—'} підходи · {e.repetitions ?? '—'} повторень
                {e.laterality ? ` · ${e.laterality}` : ''}
              </p>
              {e.instructionsOverride ? (
                <p className="mt-3 text-sm">{e.instructionsOverride}</p>
              ) : null}
              {e.precautions ? (
                <p className="mt-2 text-sm text-text-secondary">Заходи безпеки: {e.precautions}</p>
              ) : null}
              <form action={completeExercise} className="mt-4">
                <input type="hidden" name="exercisePrescriptionId" value={e.id} />
                <button
                  type="submit"
                  className="rc-btn rc-btn-primary"
                >
                  Позначити виконаною
                </button>
              </form>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-text-secondary">На сьогодні призначених вправ немає.</p>
      )}
    </>
  );
}
