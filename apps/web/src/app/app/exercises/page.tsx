import type { CurrentUserResponse, ExerciseCategory, AnatomicalRegionCode } from '@repo/contracts';
import { ExerciseLibrary } from '../../../features/rehabilitation/components/exercise-library';
import { listExercises } from '../../../features/rehabilitation/api/rehabilitation-api';
import { canReadExercises } from '../../../features/rehabilitation/permissions';
import { serverApiFetch } from '../../../lib/api/server-api-client';

export const dynamic = 'force-dynamic';

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    category?: ExerciseCategory;
    anatomicalRegion?: AnatomicalRegionCode;
    equipment?: string;
    page?: string;
  }>;
}) {
  const me = await serverApiFetch<CurrentUserResponse>('/api/v1/me');
  if (!canReadExercises(me))
    return (
      <p className="rounded-md border border-danger/30 p-5 text-danger">
        Немає доступу до бібліотеки вправ.
      </p>
    );
  const filters = await searchParams;
  const result = await listExercises({
    search: filters.search,
    category: filters.category,
    anatomicalRegion: filters.anatomicalRegion,
    equipment: filters.equipment,
    page: Number(filters.page) || 1,
    pageSize: 12,
  });
  return <ExerciseLibrary result={result} filters={filters} />;
}
