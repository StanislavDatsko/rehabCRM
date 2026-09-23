export type EncounterExerciseLog = {
  id: string;
  createdAt: string;
  encounter?: { startedAt: string } | null;
  exercise?: { id: string; name: string } | null;
  exerciseName: string | null;
  sets: number | null;
  repetitions: number | null;
  weightKg: number | null;
  durationMinutes: number | null;
  specialistNote: string | null;
};
