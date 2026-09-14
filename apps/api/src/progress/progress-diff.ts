import type { PlanRevisionDiff } from '@repo/contracts';

export type DiffableRevision = {
  goals: Array<{ title: string; status: string; target: string }>;
  phases: Array<{ name: string; criteria: string | null; dates: string }>;
  exercises: Array<{ code: string; name: string; dosage: string }>;
};

const keyed = <T>(items: T[], key: (item: T) => string) => new Map(items.map((item) => [key(item), item]));

export function diffPlanRevisions(previous: DiffableRevision, current: DiffableRevision): PlanRevisionDiff {
  const previousGoals = keyed(previous.goals, (item) => item.title);
  const currentGoals = keyed(current.goals, (item) => item.title);
  const previousPhases = keyed(previous.phases, (item) => item.name);
  const currentPhases = keyed(current.phases, (item) => item.name);
  const previousExercises = keyed(previous.exercises, (item) => item.code);
  const currentExercises = keyed(current.exercises, (item) => item.code);
  const added = <T>(before: Map<string, T>, after: Map<string, T>) => [...after.keys()].filter((key) => !before.has(key));
  const changed = <T>(before: Map<string, T>, after: Map<string, T>) =>
    [...after.entries()].filter(([key, value]) => before.has(key) && JSON.stringify(before.get(key)) !== JSON.stringify(value)).map(([key]) => key);
  return {
    goals: { added: added(previousGoals, currentGoals), removed: added(currentGoals, previousGoals), changed: changed(previousGoals, currentGoals) },
    exercises: { added: added(previousExercises, currentExercises), removed: added(currentExercises, previousExercises), dosageChanged: changed(previousExercises, currentExercises) },
    phases: { added: added(previousPhases, currentPhases), removed: added(currentPhases, previousPhases), changed: changed(previousPhases, currentPhases) },
  };
}
