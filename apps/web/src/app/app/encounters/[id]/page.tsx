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
        <h1 className="font-serif text-3xl text-text-primary">{t('encounterTitle')}</h1>
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
        <h1 className="font-serif text-3xl text-text-primary">{t('encounterTitle')}</h1>
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
    />
  );
}
