'use client';

import type { EncounterResponse } from '@repo/contracts';
import type { CurrentUserResponse } from '@repo/contracts';
import { Button } from '@repo/ui/button';
import { useActionState } from 'react';
import { t } from '../../../i18n/messages';
import { completeEncounterAction, type SchedulingFormState } from '../actions/scheduling-actions';
import { encounterStatusLabel } from '../labels';
import { canCompleteEncounter } from '../permissions';
import { formatSchedulingInstant } from '../timezone';
import type { AssessmentListItem } from '@repo/contracts';
import { AssessmentHistorySection } from '../../assessments/components/assessment-history-section';
import type { RehabilitationPlanListItem } from '@repo/contracts';
import { RehabilitationPlansSection } from '../../rehabilitation/components/rehabilitation-plans-section';
import { canReadBodyMap } from '../../anatomy/permissions';

const initialState: SchedulingFormState = { error: null };

export function EncounterWorkspace({
  user,
  encounter,
  timezone,
  flashMessage,
  assessments,
  canCreateAssessment,
  rehabilitationPlans,
  canCreatePlan,
}: {
  user: CurrentUserResponse;
  encounter: EncounterResponse;
  timezone: string;
  flashMessage: string | null;
  assessments: AssessmentListItem[];
  canCreateAssessment: boolean;
  rehabilitationPlans: RehabilitationPlanListItem[];
  canCreatePlan: boolean;
}) {
  const [state, formAction, pending] = useActionState(completeEncounterAction, initialState);
  const canComplete = canCompleteEncounter(user) && encounter.status === 'IN_PROGRESS';

  return (
    <div className="space-y-8">
      {flashMessage ? (
        <div
          role="status"
          className="rounded-md border border-success/30 bg-success/5 px-4 py-3 text-sm text-success"
        >
          {flashMessage}
        </div>
      ) : null}

      <header className="border-b border-border pb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
          {t('encounterWorkspaceLabel')}
        </p>
        <h1 className="mt-1 font-serif text-3xl text-text-primary">{t('encounterTitle')}</h1>
        <p className="mt-2 max-w-2xl text-sm text-text-secondary">{t('encounterWorkspaceIntro')}</p>
      </header>

      <section className="rounded-md border border-border bg-surface p-5">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-text-secondary">{t('encounterFieldPatient')}</dt>
            <dd>
              <a href={`/app/patients/${encounter.patient.id}`} className="text-info underline">
                {encounter.patient.displayName}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-text-secondary">{t('encounterFieldPractitioner')}</dt>
            <dd>{encounter.practitioner.displayName}</dd>
          </div>
          <div>
            <dt className="text-text-secondary">{t('encounterFieldStartedAt')}</dt>
            <dd>{formatSchedulingInstant(encounter.startedAt, timezone)}</dd>
          </div>
          <div>
            <dt className="text-text-secondary">{t('encounterFieldStatus')}</dt>
            <dd>{encounterStatusLabel(encounter.status)}</dd>
          </div>
          {encounter.appointment ? (
            <div className="sm:col-span-2">
              <dt className="text-text-secondary">{t('appointmentDetailTitle')}</dt>
              <dd>
                <a
                  href={`/app/calendar?appointment=${encounter.appointment.id}`}
                  className="text-info underline"
                >
                  {formatSchedulingInstant(encounter.appointment.startsAt, timezone)}
                  {encounter.appointment.appointmentType
                    ? ` · ${encounter.appointment.appointmentType.name}`
                    : ''}
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <AssessmentHistorySection
        patientId={encounter.patient.id}
        assessments={assessments}
        canCreate={canCreateAssessment}
        encounterId={encounter.id}
      />

      <RehabilitationPlansSection
        patientId={encounter.patient.id}
        plans={rehabilitationPlans}
        canCreate={canCreatePlan}
      />

      {canReadBodyMap(user) ? (
        <section className="rounded-md border border-border bg-surface p-5">
          <h2 className="font-serif text-lg text-text-primary">Body annotations</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Open the patient body map in this encounter context. New annotations will be linked to
            this encounter.
          </p>
          <a
            href={`/app/patients/${encounter.patient.id}/body-map?encounterId=${encounter.id}`}
            className="mt-3 inline-block text-sm text-info underline"
          >
            Open encounter body map
          </a>
        </section>
      ) : null}

      {canComplete ? (
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="encounterId" value={encounter.id} />
          {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
          <Button type="submit" disabled={pending}>
            {t('encounterActionComplete')}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
