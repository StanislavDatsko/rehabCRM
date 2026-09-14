import type { CurrentUserResponse } from '@repo/contracts';
import { getExercise } from '../../../../features/rehabilitation/api/rehabilitation-api';
import { canReadExercises } from '../../../../features/rehabilitation/permissions';
import { serverApiFetch } from '../../../../lib/api/server-api-client';

export const dynamic = 'force-dynamic';

export default async function ExercisePage({ params }: { params: Promise<{ id: string }> }) {
  const me = await serverApiFetch<CurrentUserResponse>('/api/v1/me');
  if (!canReadExercises(me)) return <p className="text-danger">Немає доступу.</p>;
  const exercise = await getExercise((await params).id);
  return (
    <article className="mx-auto max-w-4xl space-y-6">
      <a href="/app/exercises" className="text-sm text-info underline">
        ← До бібліотеки
      </a>
      <header>
        <p className="text-xs uppercase tracking-wide text-text-secondary">
          {exercise.code} · {exercise.category}
        </p>
        <h1 className="mt-1 font-serif text-3xl">{exercise.name}</h1>
        <p className="mt-3 text-text-secondary">{exercise.description}</p>
      </header>
      <section className="rounded-md border border-border bg-surface p-5">
        <h2 className="font-serif text-xl">Інструкція</h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-6">{exercise.instructions}</p>
      </section>
      <dl className="grid gap-4 rounded-md border border-border bg-surface p-5 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-text-secondary">Ділянки</dt>
          <dd>{exercise.anatomicalRegions.join(', ') || '—'}</dd>
        </div>
        <div>
          <dt className="text-text-secondary">Цільові групи мʼязів</dt>
          <dd>{exercise.targetMuscleGroups.join(', ') || '—'}</dd>
        </div>
        <div>
          <dt className="text-text-secondary">Обладнання</dt>
          <dd>{exercise.equipment.join(', ') || 'Без обладнання'}</dd>
        </div>
        <div>
          <dt className="text-text-secondary">Підтримане дозування</dt>
          <dd>{exercise.supportedDosageKinds.join(', ')}</dd>
        </div>
      </dl>
      {exercise.safetyNotes || exercise.contraindicationNotes ? (
        <section className="rounded-md border border-warning/30 bg-warning/5 p-5 text-sm">
          <h2 className="font-medium">Безпека</h2>
          {exercise.safetyNotes ? <p className="mt-2">{exercise.safetyNotes}</p> : null}
          {exercise.contraindicationNotes ? (
            <p className="mt-2">{exercise.contraindicationNotes}</p>
          ) : null}
        </section>
      ) : null}
      <p className="text-xs text-text-secondary">
        Матеріал є довідковим і не замінює клінічне рішення фахівця.
      </p>
    </article>
  );
}
