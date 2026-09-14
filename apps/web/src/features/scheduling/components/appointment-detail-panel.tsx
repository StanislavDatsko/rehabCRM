'use client';

import type {
  AppointmentDetailResponse,
  ResponsiblePractitionerResponse,
} from '@repo/contracts';
import type { CurrentUserResponse } from '@repo/contracts';
import { Button } from '@repo/ui/button';
import { useActionState, useMemo, useState } from 'react';
import { t } from '../../../i18n/messages';
import {
  cancelAppointmentAction,
  checkInAppointmentAction,
  confirmAppointmentAction,
  noShowAppointmentAction,
  rescheduleAppointmentAction,
  startEncounterAction,
  type SchedulingFormState,
} from '../actions/scheduling-actions';
import { appointmentActionLabel } from '../labels';
import {
  canUpdateAppointment,
  visibleAppointmentActions,
} from '../permissions';
import { formatSchedulingInstant } from '../timezone';
import { AppointmentStatusBadge } from './appointment-status-badge';

const initialState: SchedulingFormState = { error: null };

function StatusActionForm({
  action,
  appointmentId,
  version,
  command,
  variant = 'secondary',
  requiresReason = false,
}: {
  action: typeof confirmAppointmentAction;
  appointmentId: string;
  version: number;
  command: string;
  variant?: 'primary' | 'secondary';
  requiresReason?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [showReason, setShowReason] = useState(false);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <input type="hidden" name="version" value={version} />
      {requiresReason && showReason ? (
        <label className="block text-xs text-text-secondary">
          {t('appointmentFieldCancellationReason')}
          <textarea
            name="cancellationReason"
            rows={2}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
      ) : null}
      {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
      <Button
        type="submit"
        variant={variant}
        disabled={pending}
        onClick={(event) => {
          if (requiresReason && !showReason) {
            event.preventDefault();
            setShowReason(true);
          }
        }}
      >
        {appointmentActionLabel(command)}
      </Button>
    </form>
  );
}

export function AppointmentDetailPanel({
  user,
  appointment,
  practitioners,
  timezone,
  closeHref,
}: {
  user: CurrentUserResponse;
  appointment: AppointmentDetailResponse;
  practitioners: ResponsiblePractitionerResponse[];
  timezone: string;
  closeHref: string;
}) {
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleState, rescheduleAction, reschedulePending] = useActionState(
    rescheduleAppointmentAction,
    initialState,
  );

  const actions = visibleAppointmentActions(appointment.status, user);
  const canReschedule = canUpdateAppointment(user) && appointment.status !== 'CANCELLED';

  const durationMinutes = useMemo(() => {
    const start = new Date(appointment.startsAt).getTime();
    const end = new Date(appointment.endsAt).getTime();
    return Math.round((end - start) / 60_000);
  }, [appointment.endsAt, appointment.startsAt]);

  const startLocal = new Date(appointment.startsAt);
  const dateValue = `${startLocal.getFullYear()}-${String(startLocal.getMonth() + 1).padStart(2, '0')}-${String(startLocal.getDate()).padStart(2, '0')}`;
  const startTimeValue = `${String(startLocal.getHours()).padStart(2, '0')}:${String(startLocal.getMinutes()).padStart(2, '0')}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="appointment-detail-title"
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-lg flex-col border-l border-border bg-surface shadow-sm"
    >
      <div className="flex items-start justify-between border-b border-border px-5 py-4">
        <div>
          <h2 id="appointment-detail-title" className="font-serif text-xl text-text-primary">
            {t('appointmentDetailTitle')}
          </h2>
          <div className="mt-2">
            <AppointmentStatusBadge status={appointment.status} />
          </div>
        </div>
        <a href={closeHref} className="text-sm text-text-secondary underline">
          {t('appointmentClose')}
        </a>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 text-sm">
        <dl className="space-y-3">
          <div>
            <dt className="text-text-secondary">{t('appointmentFieldPatient')}</dt>
            <dd>
              <a href={`/app/patients/${appointment.patient.id}`} className="text-info underline">
                {appointment.patient.displayName}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-text-secondary">{t('appointmentFieldPractitioner')}</dt>
            <dd>{appointment.practitioner.displayName}</dd>
          </div>
          <div>
            <dt className="text-text-secondary">{t('appointmentFieldDate')}</dt>
            <dd>{formatSchedulingInstant(appointment.startsAt, timezone)}</dd>
          </div>
          <div>
            <dt className="text-text-secondary">{t('appointmentFieldDuration')}</dt>
            <dd>
              {durationMinutes} {t('appointmentMinutesShort')}
            </dd>
          </div>
          {appointment.appointmentType ? (
            <div>
              <dt className="text-text-secondary">{t('appointmentFieldType')}</dt>
              <dd>{appointment.appointmentType.name}</dd>
            </div>
          ) : null}
          {appointment.location ? (
            <div>
              <dt className="text-text-secondary">{t('appointmentFieldLocation')}</dt>
              <dd>{appointment.location.name}</dd>
            </div>
          ) : null}
          {appointment.room ? (
            <div>
              <dt className="text-text-secondary">{t('appointmentFieldRoom')}</dt>
              <dd>{appointment.room.name}</dd>
            </div>
          ) : null}
          {appointment.reason ? (
            <div>
              <dt className="text-text-secondary">{t('appointmentFieldReason')}</dt>
              <dd>{appointment.reason}</dd>
            </div>
          ) : null}
          {appointment.administrativeNote ? (
            <div>
              <dt className="text-text-secondary">{t('appointmentFieldNote')}</dt>
              <dd>{appointment.administrativeNote}</dd>
            </div>
          ) : null}
          {appointment.cancellationReason ? (
            <div>
              <dt className="text-text-secondary">{t('appointmentFieldCancellationReason')}</dt>
              <dd>{appointment.cancellationReason}</dd>
            </div>
          ) : null}
        </dl>

        {appointment.encounterId ? (
          <a href={`/app/encounters/${appointment.encounterId}`}>
            <Button type="button">{t('appointmentActionOpenEncounter')}</Button>
          </a>
        ) : null}

        {canReschedule ? (
          <div className="rounded-md border border-border p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-medium text-text-primary">{t('appointmentRescheduleTitle')}</h3>
              <Button type="button" variant="secondary" onClick={() => setShowReschedule((v) => !v)}>
                {showReschedule ? t('appointmentRescheduleHide') : t('appointmentRescheduleShow')}
              </Button>
            </div>
            {showReschedule ? (
              <form action={rescheduleAction} className="mt-4 space-y-3">
                <input type="hidden" name="appointmentId" value={appointment.id} />
                <input type="hidden" name="version" value={appointment.version} />
                <input type="hidden" name="timezone" value={timezone} />
                <label className="block text-xs text-text-secondary">
                  {t('appointmentFieldDate')}
                  <input
                    name="date"
                    type="date"
                    defaultValue={dateValue}
                    required
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs text-text-secondary">
                  {t('appointmentFieldStartTime')}
                  <input
                    name="startTime"
                    type="time"
                    defaultValue={startTimeValue}
                    required
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs text-text-secondary">
                  {t('appointmentFieldDuration')}
                  <input
                    name="durationMinutes"
                    type="number"
                    min={10}
                    max={480}
                    defaultValue={durationMinutes}
                    required
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs text-text-secondary">
                  {t('appointmentFieldPractitioner')}
                  <select
                    name="practitionerId"
                    defaultValue={appointment.practitioner.id}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    {practitioners.map((practitioner) => (
                      <option key={practitioner.id} value={practitioner.id}>
                        {practitioner.displayName}
                      </option>
                    ))}
                  </select>
                </label>
                {rescheduleState.error ? (
                  <p className="text-xs text-danger">{rescheduleState.error}</p>
                ) : null}
                <Button type="submit" disabled={reschedulePending}>
                  {t('appointmentRescheduleSave')}
                </Button>
              </form>
            ) : null}
          </div>
        ) : null}

        {actions.length > 0 ? (
          <div className="space-y-3 border-t border-border pt-4">
            <h3 className="font-medium text-text-primary">{t('appointmentActionsTitle')}</h3>
            <div className="flex flex-wrap gap-2">
              {actions.includes('confirm') ? (
                <StatusActionForm
                  action={confirmAppointmentAction}
                  appointmentId={appointment.id}
                  version={appointment.version}
                  command="confirm"
                  variant="primary"
                />
              ) : null}
              {actions.includes('check-in') ? (
                <StatusActionForm
                  action={checkInAppointmentAction}
                  appointmentId={appointment.id}
                  version={appointment.version}
                  command="check-in"
                />
              ) : null}
              {actions.includes('start-encounter') ? (
                <StatusActionForm
                  action={startEncounterAction}
                  appointmentId={appointment.id}
                  version={appointment.version}
                  command="start-encounter"
                  variant="primary"
                />
              ) : null}
              {actions.includes('no-show') ? (
                <StatusActionForm
                  action={noShowAppointmentAction}
                  appointmentId={appointment.id}
                  version={appointment.version}
                  command="no-show"
                />
              ) : null}
              {actions.includes('cancel') ? (
                <StatusActionForm
                  action={cancelAppointmentAction}
                  appointmentId={appointment.id}
                  version={appointment.version}
                  command="cancel"
                  requiresReason
                />
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
