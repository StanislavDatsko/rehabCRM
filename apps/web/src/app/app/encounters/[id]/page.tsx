import type { CurrentUserResponse } from '@repo/contracts';
import { EncounterWorkspace } from '../../../../features/scheduling/components/encounter-workspace';
import {
  SchedulingErrorState,
  SchedulingForbiddenState,
} from '../../../../features/scheduling/components/scheduling-states';
import {
  getEncounter,
  getSchedulingCatalog,
} from '../../../../features/scheduling/api/scheduling-api';
import { mapSchedulingErrorToMessage } from '../../../../features/scheduling/labels';
import { canReadEncounter } from '../../../../features/scheduling/permissions';
import { DEFAULT_TIMEZONE, resolveDisplayTimezone } from '../../../../features/scheduling/timezone';
import { t } from '../../../../i18n/messages';
import { ServerApiError, serverApiFetch } from '../../../../lib/api/server-api-client';
import { listPatientAssessments } from '../../../../features/assessments/api/assessments-api';
import {
  canCreateAssessment,
  canReadAssessments,
} from '../../../../features/assessments/permissions';
import { listPatientPlans } from '../../../../features/rehabilitation/api/rehabilitation-api';
import { canCreatePlan, canReadPlans } from '../../../../features/rehabilitation/permissions';
import { listPatientExerciseLogs } from '../../../../features/scheduling/api/scheduling-api';
import { listExercises } from '../../../../features/rehabilitation/api/rehabilitation-api';
import { canReadExercises } from '../../../../features/rehabilitation/permissions';
import { hasPermission, PERMISSIONS } from '@repo/contracts';

export const dynamic = 'force-dynamic';

export default async function EncounterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ completed?: string }>;
}) {
  const me = await serverApiFetch<CurrentUserResponse>('/api/v1/me');
  if (!canReadEncounter(me)) {
    return (
      <div className="space-y-4">
        <h1 className="font-sans text-3xl text-text-primary">{t('encounterTitle')}</h1>
        <SchedulingForbiddenState />
      </div>
    );
  }

  const { id } = await params;
  const flash = await searchParams;

  let encounter: Awaited<ReturnType<typeof getEncounter>>;
  try {
    encounter = await getEncounter(id);
  } catch (error) {
    const message =
      error instanceof ServerApiError
        ? mapSchedulingErrorToMessage(error.body?.code)
        : mapSchedulingErrorToMessage(undefined);
    return (
      <div className="space-y-4">
        <h1 className="font-sans text-3xl text-text-primary">{t('encounterTitle')}</h1>
        <SchedulingErrorState message={message} />
      </div>
    );
  }

  let timezone = DEFAULT_TIMEZONE;
  try {
    const catalog = await getSchedulingCatalog();
    timezone = resolveDisplayTimezone(catalog.locations[0]?.timezone);
  } catch {
    timezone = DEFAULT_TIMEZONE;
  }

  const flashMessage = flash.completed ? t('encounterCompletedFlash') : null;
  let assessments: Awaited<ReturnType<typeof listPatientAssessments>> = [];
  let rehabilitationPlans: Awaited<ReturnType<typeof listPatientPlans>> = [];
  let exerciseLogs: any[] = [];
  let exercises: Awaited<ReturnType<typeof listExercises>>['items'] = [];
  let encounterMedia: any = { items: [], total: 0 };
  if (canReadAssessments(me)) {
    try {
      assessments = (await listPatientAssessments(encounter.patient.id)).filter(
        (item) => item.encounter?.id === encounter.id,
      );
    } catch {
      assessments = [];
    }
  }
  if (canReadPlans(me)) {
    try {
      rehabilitationPlans = await listPatientPlans(encounter.patient.id);
    } catch {
      rehabilitationPlans = [];
    }
  }
  if (canReadExercises(me)) {
    try { exercises = (await listExercises({ page: 1, pageSize: 50 })).items; } catch { exercises = []; }
  }
  try { exerciseLogs = await listPatientExerciseLogs(encounter.patient.id); } catch { exerciseLogs = []; }
  if (hasPermission(me.permissions, PERMISSIONS.PATIENT_MEDIA_READ)) {
    try { encounterMedia = await serverApiFetch(`/api/v1/patients/${encounter.patient.id}/media?page=1&pageSize=100&encounterId=${encounter.id}`); } catch { encounterMedia = { items: [], total: 0 }; }
  }

  return (
    <EncounterWorkspace
      user={me}
      encounter={encounter}
      timezone={timezone}
      flashMessage={flashMessage}
      assessments={assessments}
      canCreateAssessment={canCreateAssessment(me)}
      rehabilitationPlans={rehabilitationPlans}
      canCreatePlan={canCreatePlan(me)}
      exerciseLogs={exerciseLogs}
      exercises={exercises}
      canCreateExerciseLog={hasPermission(me.permissions, PERMISSIONS.EXERCISE_PRESCRIPTION_WRITE) && encounter.status === 'IN_PROGRESS'}
      encounterMedia={encounterMedia}
    />
  );
}
