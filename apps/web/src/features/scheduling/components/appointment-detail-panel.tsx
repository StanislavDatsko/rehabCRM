'use client';

import type { AppointmentDetailResponse, CurrentUserResponse } from '@repo/contracts';
import { Button } from '@repo/ui/button';
import { useActionState, useMemo, useState } from 'react';
import { t } from '../../../i18n/messages';
import {
  cancelAppointmentAction,
  confirmAndStartEncounterAction,
  rescheduleAppointmentAction,
  startEncounterAction,
  type SchedulingFormState,
} from '../actions/scheduling-actions';
import { appointmentTone } from '../appointment-tone';
import {
  canCancelAppointment,
  canChangeAppointmentStatus,
  canStartEncounter,
  canUpdateAppointment,
} from '../permissions';
import { formatPrice } from '../price';
import { formatSchedulingInstant, instantToLocalParts } from '../timezone';
import { AppointmentStatusBadge } from './appointment-status-badge';

const initialState: SchedulingFormState = { error: null };
const inputClass = 'field mt-1 block w-full bg-background text-sm';
const RESCHEDULABLE = ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN'] as const;
const CANCELLABLE = ['SCHEDULED', 'CONFIRMED'] as const;

function CommandForm({
  action,
  appointmentId,
  version,
  returnTo,
  label,
  variant = 'primary',
}: {
  action: (prev: SchedulingFormState, formData: FormData) => Promise<SchedulingFormState>;
  appointmentId: string;
  version: number;
  returnTo: string;
  label: string;
  variant?: 'primary' | 'secondary';
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <input type="hidden" name="version" value={version} />
      <input type="hidden" name="returnTo" value={returnTo} />
      {state.error ? <p className="cal-error">{state.error}</p> : null}
      <Button type="submit" variant={variant} disabled={pending} className="w-full">
        {label}
      </Button>
    </form>
  );
}

export function AppointmentDetailPanel({
  user,
  appointment,
  practitionerId,
  timezone,
  closeHref,
}: {
  user: CurrentUserResponse;
  appointment: AppointmentDetailResponse;
  practitionerId: string;
  timezone: string;
  closeHref: string;
}) {
  const [panel, setPanel] = useState<'none' | 'reschedule' | 'cancel'>('none');
  const [rescheduleState, rescheduleAction, reschedulePending] = useActionState(
    rescheduleAppointmentAction,
    initialState,
  );
  const [cancelState, cancelAction, cancelPending] = useActionState(
    cancelAppointmentAction,
    initialState,
  );

  const status = appointment.status;
  const tone = appointmentTone(appointment);
  const canStartFlow = canChangeAppointmentStatus(user) && canStartEncounter(user);
  const canReschedule =
    canUpdateAppointment(user) && (RESCHEDULABLE as readonly string[]).includes(status);
  const canCancel =
    canCancelAppointment(user) && (CANCELLABLE as readonly string[]).includes(status);

  const durationMinutes = useMemo(
    () =>
      Math.round(
        (new Date(appointment.endsAt).getTime() - new Date(appointment.startsAt).getTime()) / 60_000,
      ),
    [appointment.endsAt, appointment.startsAt],
  );
  const local = instantToLocalParts(appointment.startsAt, timezone);
  const price = formatPrice(appointment.priceAmount);

  return (
    <div className="cal-drawer-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) window.location.href = closeHref;
    }}>
      <aside role="dialog" aria-modal="true" aria-labelledby="appointment-detail-title" className="cal-drawer">
        <header className={`cal-drawer-header cal-tone-${tone}`}>
          <div>
            <p className="cal-eyebrow">{t('appointmentDetailTitle')}</p>
            <h2 id="appointment-detail-title">{appointment.patient.displayName}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <AppointmentStatusBadge status={status} />
              {appointment.rescheduledFromAt && tone === 'moved' ? (
                <span className="cal-chip cal-chip-moved">Запис перенесено</span>
              ) : null}
            </div>
          </div>
          <a href={closeHref} className="cal-modal-close" aria-label={t('appointmentClose')}>
            ✕
          </a>
        </header>

        <div className="cal-drawer-body">
          <dl className="cal-facts">
            <div>
              <dt>Дата і час</dt>
              <dd>{formatSchedulingInstant(appointment.startsAt, timezone)}</dd>
            </div>
            <div>
              <dt>{t('appointmentFieldDuration')}</dt>
              <dd>
                {durationMinutes} {t('appointmentMinutesShort')}
              </dd>
            </div>
            <div>
              <dt>{t('appointmentFieldPractitioner')}</dt>
              <dd>{appointment.practitioner.displayName}</dd>
            </div>
            {price ? (
              <div>
                <dt>Вартість</dt>
                <dd>{price}</dd>
              </div>
            ) : null}
            {appointment.appointmentType ? (
              <div>
                <dt>{t('appointmentFieldType')}</dt>
                <dd>{appointment.appointmentType.name}</dd>
              </div>
            ) : null}
            {appointment.administrativeNote ? (
              <div className="cal-facts-wide">
                <dt>{t('appointmentFieldNote')}</dt>
                <dd>{appointment.administrativeNote}</dd>
              </div>
            ) : null}
            {appointment.cancellationReason ? (
              <div className="cal-facts-wide">
                <dt>{t('appointmentFieldCancellationReason')}</dt>
                <dd>{appointment.cancellationReason}</dd>
              </div>
            ) : null}
            {appointment.rescheduledFromAt ? (
              <div className="cal-facts-wide">
                <dt>Перенесено з</dt>
                <dd>{formatSchedulingInstant(appointment.rescheduledFromAt, timezone)}</dd>
              </div>
            ) : null}
          </dl>

          <a href={`/app/patients/${appointment.patient.id}`} className="cal-link">
            Відкрити картку пацієнта →
          </a>

          <div className="cal-actions">
            {appointment.encounterId ? (
              <a href={`/app/encounters/${appointment.encounterId}`} className="block">
                <Button type="button" className="w-full">
                  {t('appointmentActionOpenEncounter')}
                </Button>
              </a>
            ) : status === 'SCHEDULED' && canStartFlow ? (
              <CommandForm
                action={confirmAndStartEncounterAction}
                appointmentId={appointment.id}
                version={appointment.version}
                returnTo={closeHref}
                label="Підтвердити і розпочати візит"
              />
            ) : (status === 'CONFIRMED' || status === 'CHECKED_IN') && canStartEncounter(user) ? (
              <CommandForm
                action={startEncounterAction}
                appointmentId={appointment.id}
                version={appointment.version}
                returnTo={closeHref}
                label={t('appointmentActionStartEncounter')}
              />
            ) : null}

            {canReschedule || canCancel ? (
              <div className="cal-action-row">
                {canReschedule ? (
                  <Button
                    type="button"
                    variant="secondary"
                    aria-expanded={panel === 'reschedule'}
                    onClick={() => setPanel(panel === 'reschedule' ? 'none' : 'reschedule')}
                    className="cal-btn-moved"
                  >
                    Запис перенесено
                  </Button>
                ) : null}
                {canCancel ? (
                  <Button
                    type="button"
                    variant="secondary"
                    aria-expanded={panel === 'cancel'}
                    onClick={() => setPanel(panel === 'cancel' ? 'none' : 'cancel')}
                    className="cal-btn-cancel"
                  >
                    Запис скасовано
                  </Button>
                ) : null}
              </div>
            ) : null}

            {panel === 'reschedule' && canReschedule ? (
              <form action={rescheduleAction} className="cal-subpanel">
                <p className="cal-label">Оберіть нову дату і час</p>
                <input type="hidden" name="appointmentId" value={appointment.id} />
                <input type="hidden" name="version" value={appointment.version} />
                <input type="hidden" name="timezone" value={timezone} />
                <input type="hidden" name="durationMinutes" value={durationMinutes} />
                <input type="hidden" name="practitionerId" value={practitionerId} />
                <input type="hidden" name="returnTo" value={closeHref} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="cal-label">
                    {t('appointmentFieldDate')}
                    <input name="date" type="date" defaultValue={local.date} required className={inputClass} />
                  </label>
                  <label className="cal-label">
                    {t('appointmentFieldStartTime')}
                    <input name="startTime" type="time" defaultValue={local.time} required className={inputClass} />
                  </label>
                </div>
                {rescheduleState.error ? <p className="cal-error">{rescheduleState.error}</p> : null}
                <Button type="submit" disabled={reschedulePending} className="w-full">
                  {reschedulePending ? 'Збереження…' : 'Перенести запис'}
                </Button>
              </form>
            ) : null}

            {panel === 'cancel' && canCancel ? (
              <form action={cancelAction} className="cal-subpanel">
                <input type="hidden" name="appointmentId" value={appointment.id} />
                <input type="hidden" name="version" value={appointment.version} />
                <input type="hidden" name="returnTo" value={closeHref} />
                <label className="cal-label">
                  {t('appointmentFieldCancellationReason')} (необов’язково)
                  <textarea name="cancellationReason" rows={2} className={inputClass} />
                </label>
                {cancelState.error ? <p className="cal-error">{cancelState.error}</p> : null}
                <Button type="submit" disabled={cancelPending} className="w-full cal-btn-cancel">
                  {cancelPending ? 'Збереження…' : 'Підтвердити скасування'}
                </Button>
              </form>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}
