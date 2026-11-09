'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ServerApiError } from '../../../lib/api/server-api-client';
import { loadCurrentUser } from '../../../lib/app/load-current-user';
import { createDraftPatient, listPatients } from '../../patients/api/patients-api';
import {
  cancelAppointment,
  checkInAppointment,
  completeEncounter,
  confirmAppointment,
  createAppointment,
  createCalendarBlock,
  deleteCalendarBlock,
  markAppointmentNoShow,
  startEncounterForAppointment,
  updateAppointment,
  type CreateAppointmentBody,
} from '../api/scheduling-api';
import { mapSchedulingErrorToMessage } from '../labels';
import {
  canCancelAppointment,
  canChangeAppointmentStatus,
  canCompleteEncounter,
  canCreateAppointment,
  canStartEncounter,
  canUpdateAppointment,
} from '../permissions';
import { addMinutesToIso, combineDateAndTimeToIso } from '../timezone';

export type SchedulingFormState = {
  error: string | null;
  /** Set after a successful save so the dialog can close without navigating away. */
  ok?: boolean;
  /** A draft patient that was created before the appointment failed; reuse it on retry. */
  draftPatientId?: string;
  draftPatientName?: string;
};

/** Only same-site calendar paths are accepted as a post-action destination. */
function safeReturnTo(formData: FormData): string {
  const value = emptyToNull(formData.get('returnTo'));
  return value && value.startsWith('/app/calendar') ? value : '/app/calendar';
}

function parsePrice(formData: FormData): number | null | undefined {
  const raw = emptyToNull(formData.get('priceAmount'));
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function emptyToNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function errorState(error: unknown): SchedulingFormState {
  if (error instanceof ServerApiError) {
    return { error: mapSchedulingErrorToMessage(error.body?.code) };
  }
  return { error: mapSchedulingErrorToMessage(undefined) };
}

function revalidateSchedulingPaths(appointmentId?: string, encounterId?: string, patientId?: string) {
  revalidatePath('/app/calendar');
  if (appointmentId) {
    revalidatePath(`/app/calendar?appointment=${appointmentId}`);
  }
  if (encounterId) {
    revalidatePath(`/app/encounters/${encounterId}`);
  }
  if (patientId) {
    revalidatePath(`/app/patients/${patientId}`);
  }
}

function createBodyFromFormData(formData: FormData, timezone: string): CreateAppointmentBody {
  const patientId = emptyToNull(formData.get('patientId')) ?? '';
  const practitionerId = emptyToNull(formData.get('practitionerId')) ?? '';
  const date = emptyToNull(formData.get('date')) ?? '';
  const startTime = emptyToNull(formData.get('startTime')) ?? '';
  const durationRaw = emptyToNull(formData.get('durationMinutes'));
  const durationMinutes = durationRaw ? Number(durationRaw) : NaN;

  const startsAt = combineDateAndTimeToIso(date, startTime, timezone);
  const endsAt = Number.isFinite(durationMinutes)
    ? addMinutesToIso(startsAt, durationMinutes)
    : combineDateAndTimeToIso(date, emptyToNull(formData.get('endTime')) ?? '00:00', timezone);

  return {
    patientId,
    practitionerId,
    appointmentTypeId: emptyToNull(formData.get('appointmentTypeId')),
    locationId: emptyToNull(formData.get('locationId')),
    roomId: emptyToNull(formData.get('roomId')),
    startsAt,
    endsAt,
    reason: emptyToNull(formData.get('reason')),
    administrativeNote: emptyToNull(formData.get('administrativeNote')),
    priceAmount: parsePrice(formData),
  };
}

export async function searchPatientsForSchedulingAction(
  query: string,
): Promise<{ id: string; displayName: string }[]> {
  const me = await loadCurrentUser();
  if (me === 'unauthenticated') {
    redirect('/login?reason=expired');
  }
  if (me === 'denied') {
    return [];
  }

  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  try {
    const result = await listPatients({
      tab: 'all',
      page: 1,
      pageSize: 10,
      search: trimmed,
      status: '',
      responsiblePractitionerId: '',
      sort: 'lastName',
      sortDir: 'asc',
    });
    return result.items.map((patient) => ({
      id: patient.id,
      displayName: patient.fullName,
    }));
  } catch {
    return [];
  }
}

export async function createAppointmentAction(
  _prev: SchedulingFormState,
  formData: FormData,
): Promise<SchedulingFormState> {
  const me = await loadCurrentUser();
  if (me === 'unauthenticated') {
    redirect('/login?reason=expired');
  }
  if (me === 'denied' || !canCreateAppointment(me)) {
    return { error: mapSchedulingErrorToMessage('FORBIDDEN') };
  }

  const timezone = emptyToNull(formData.get('timezone')) ?? 'Europe/Kyiv';
  const body = createBodyFromFormData(formData, timezone);

  // New patient: register a draft (full name + phone) so the slot can be booked now
  // and the card is completed when the patient arrives.
  let draftPatientId: string | undefined;
  let draftPatientName: string | undefined;
  if (formData.get('newPatient') === '1') {
    const fullName = emptyToNull(formData.get('newPatientName'));
    if (!fullName || fullName.split(/\s+/).length < 2) {
      return { error: 'Вкажіть прізвище та ім’я пацієнта.' };
    }
    if (!body.practitionerId || !body.startsAt || !body.endsAt) {
      return { error: mapSchedulingErrorToMessage('VALIDATION_FAILED') };
    }
    try {
      const draft = await createDraftPatient({
        fullName,
        phone: emptyToNull(formData.get('newPatientPhone')),
      });
      body.patientId = draft.id;
      draftPatientId = draft.id;
      draftPatientName = fullName;
    } catch (error: unknown) {
      if (error instanceof ServerApiError && error.status === 401) {
        redirect('/login?reason=expired');
      }
      if (error instanceof ServerApiError && error.status === 400) {
        return { error: 'Перевірте ім’я та номер телефону пацієнта.' };
      }
      if (error instanceof ServerApiError && error.status === 403) {
        return { error: 'Недостатньо прав, щоб створити нового пацієнта.' };
      }
      // Anything else here is about creating the patient, not about an appointment.
      return { error: 'Не вдалося створити нового пацієнта. Спробуйте ще раз або оберіть існуючого.' };
    }
  }

  if (!body.patientId || !body.practitionerId || !body.startsAt || !body.endsAt) {
    return { error: mapSchedulingErrorToMessage('VALIDATION_FAILED') };
  }

  try {
    await createAppointment(body);
  } catch (error: unknown) {
    if (error instanceof ServerApiError && error.status === 401) {
      redirect('/login?reason=expired');
    }
    return { ...errorState(error), draftPatientId, draftPatientName };
  }

  revalidateSchedulingPaths(undefined, undefined, body.patientId);
  revalidatePath('/app/patients');
  return { error: null, ok: true };
}

export async function rescheduleAppointmentAction(
  _prev: SchedulingFormState,
  formData: FormData,
): Promise<SchedulingFormState> {
  const me = await loadCurrentUser();
  if (me === 'unauthenticated') {
    redirect('/login?reason=expired');
  }
  if (me === 'denied' || !canUpdateAppointment(me)) {
    return { error: mapSchedulingErrorToMessage('FORBIDDEN') };
  }

  const id = emptyToNull(formData.get('appointmentId'));
  const versionRaw = emptyToNull(formData.get('version'));
  const version = versionRaw ? Number(versionRaw) : NaN;
  const timezone = emptyToNull(formData.get('timezone')) ?? 'Europe/Kyiv';
  if (!id || !Number.isInteger(version) || version < 1) {
    return { error: mapSchedulingErrorToMessage('VALIDATION_FAILED') };
  }

  const date = emptyToNull(formData.get('date')) ?? '';
  const startTime = emptyToNull(formData.get('startTime')) ?? '';
  const durationRaw = emptyToNull(formData.get('durationMinutes'));
  const durationMinutes = durationRaw ? Number(durationRaw) : NaN;
  const startsAt = combineDateAndTimeToIso(date, startTime, timezone);
  const endsAt = Number.isFinite(durationMinutes)
    ? addMinutesToIso(startsAt, durationMinutes)
    : combineDateAndTimeToIso(date, emptyToNull(formData.get('endTime')) ?? '00:00', timezone);

  try {
    await updateAppointment(id, {
      version,
      startsAt,
      endsAt,
      practitionerId: emptyToNull(formData.get('practitionerId')) ?? undefined,
    });
  } catch (error: unknown) {
    if (error instanceof ServerApiError && error.status === 401) {
      redirect('/login?reason=expired');
    }
    return errorState(error);
  }

  revalidateSchedulingPaths(id);
  // Land on the new date (same view) so the moved appointment is visible right away.
  const target = new URL(safeReturnTo(formData), 'http://local');
  target.searchParams.set('date', date);
  target.searchParams.delete('appointment');
  redirect(`${target.pathname}${target.search}`);
}

async function runStatusCommand(
  formData: FormData,
  command: 'confirm' | 'confirm-and-start' | 'check-in' | 'cancel' | 'no-show' | 'start-encounter',
): Promise<SchedulingFormState> {
  const me = await loadCurrentUser();
  if (me === 'unauthenticated') {
    redirect('/login?reason=expired');
  }
  if (me === 'denied') {
    return { error: mapSchedulingErrorToMessage('FORBIDDEN') };
  }

  const id = emptyToNull(formData.get('appointmentId'));
  const versionRaw = emptyToNull(formData.get('version'));
  const version = versionRaw ? Number(versionRaw) : NaN;
  if (!id || !Number.isInteger(version) || version < 1) {
    return { error: mapSchedulingErrorToMessage('VALIDATION_FAILED') };
  }

  if (command === 'confirm' || command === 'check-in' || command === 'no-show') {
    if (!canChangeAppointmentStatus(me)) {
      return { error: mapSchedulingErrorToMessage('FORBIDDEN') };
    }
  }
  if (command === 'cancel' && !canCancelAppointment(me)) {
    return { error: mapSchedulingErrorToMessage('FORBIDDEN') };
  }
  if (command === 'start-encounter' && !canStartEncounter(me)) {
    return { error: mapSchedulingErrorToMessage('FORBIDDEN') };
  }
  if (command === 'confirm-and-start' && (!canChangeAppointmentStatus(me) || !canStartEncounter(me))) {
    return { error: mapSchedulingErrorToMessage('FORBIDDEN') };
  }

  try {
    if (command === 'confirm') {
      await confirmAppointment(id, { version });
    } else if (command === 'confirm-and-start') {
      const confirmed = await confirmAppointment(id, { version });
      const encounter = await startEncounterForAppointment(id, { version: confirmed.version });
      revalidateSchedulingPaths(id, encounter.id);
      redirect(`/app/encounters/${encounter.id}`);
    } else if (command === 'check-in') {
      await checkInAppointment(id, { version });
    } else if (command === 'cancel') {
      await cancelAppointment(id, {
        version,
        cancellationReason: emptyToNull(formData.get('cancellationReason')),
      });
    } else if (command === 'no-show') {
      await markAppointmentNoShow(id, { version });
    } else {
      const encounter = await startEncounterForAppointment(id, { version });
      revalidateSchedulingPaths(id, encounter.id);
      redirect(`/app/encounters/${encounter.id}`);
    }
  } catch (error: unknown) {
    // redirect() works by throwing; let Next handle it instead of showing an error.
    if ((error as { digest?: string } | null)?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    if (error instanceof ServerApiError && error.status === 401) {
      redirect('/login?reason=expired');
    }
    return errorState(error);
  }

  revalidateSchedulingPaths(id);
  redirect(safeReturnTo(formData));
}

export async function confirmAppointmentAction(
  _prev: SchedulingFormState,
  formData: FormData,
): Promise<SchedulingFormState> {
  return runStatusCommand(formData, 'confirm');
}

export async function confirmAndStartEncounterAction(
  _prev: SchedulingFormState,
  formData: FormData,
): Promise<SchedulingFormState> {
  return runStatusCommand(formData, 'confirm-and-start');
}

export async function checkInAppointmentAction(
  _prev: SchedulingFormState,
  formData: FormData,
): Promise<SchedulingFormState> {
  return runStatusCommand(formData, 'check-in');
}

export async function cancelAppointmentAction(
  _prev: SchedulingFormState,
  formData: FormData,
): Promise<SchedulingFormState> {
  return runStatusCommand(formData, 'cancel');
}

export async function noShowAppointmentAction(
  _prev: SchedulingFormState,
  formData: FormData,
): Promise<SchedulingFormState> {
  return runStatusCommand(formData, 'no-show');
}

export async function startEncounterAction(
  _prev: SchedulingFormState,
  formData: FormData,
): Promise<SchedulingFormState> {
  return runStatusCommand(formData, 'start-encounter');
}

export async function completeEncounterAction(
  _prev: SchedulingFormState,
  formData: FormData,
): Promise<SchedulingFormState> {
  const me = await loadCurrentUser();
  if (me === 'unauthenticated') {
    redirect('/login?reason=expired');
  }
  if (me === 'denied' || !canCompleteEncounter(me)) {
    return { error: mapSchedulingErrorToMessage('FORBIDDEN') };
  }

  const id = emptyToNull(formData.get('encounterId'));
  if (!id) {
    return { error: mapSchedulingErrorToMessage('VALIDATION_FAILED') };
  }

  try {
    await completeEncounter(id);
  } catch (error: unknown) {
    if (error instanceof ServerApiError && error.status === 401) {
      redirect('/login?reason=expired');
    }
    return errorState(error);
  }

  revalidateSchedulingPaths(undefined, id);
  redirect(`/app/encounters/${id}?completed=1`);
}

function dayBounds(date: string, timezone: string): { startsAt: string; endsAt: string } {
  return {
    startsAt: combineDateAndTimeToIso(date, '00:00', timezone),
    endsAt: addMinutesToIso(combineDateAndTimeToIso(date, '00:00', timezone), 24 * 60),
  };
}

/** Close a time range (break) or whole day(s) (day off) for appointments. */
export async function createCalendarBlockAction(
  _prev: SchedulingFormState,
  formData: FormData,
): Promise<SchedulingFormState> {
  const me = await loadCurrentUser();
  if (me === 'unauthenticated') {
    redirect('/login?reason=expired');
  }
  if (me === 'denied' || !canUpdateAppointment(me)) {
    return { error: mapSchedulingErrorToMessage('FORBIDDEN') };
  }

  const timezone = emptyToNull(formData.get('timezone')) ?? 'Europe/Kyiv';
  const kind = formData.get('kind') === 'DAY_OFF' ? 'DAY_OFF' : 'BREAK';
  const date = emptyToNull(formData.get('date'));
  if (!date) {
    return { error: mapSchedulingErrorToMessage('VALIDATION_FAILED') };
  }

  let startsAt: string;
  let endsAt: string;
  if (kind === 'DAY_OFF') {
    const dateTo = emptyToNull(formData.get('dateTo')) ?? date;
    if (dateTo < date) {
      return { error: 'Дата завершення не може бути раніше початку.' };
    }
    startsAt = dayBounds(date, timezone).startsAt;
    endsAt = dayBounds(dateTo, timezone).endsAt;
  } else {
    const startTime = emptyToNull(formData.get('startTime'));
    const endTime = emptyToNull(formData.get('endTime'));
    if (!startTime || !endTime || endTime <= startTime) {
      return { error: 'Час завершення має бути пізніше за початок.' };
    }
    startsAt = combineDateAndTimeToIso(date, startTime, timezone);
    endsAt = combineDateAndTimeToIso(date, endTime, timezone);
  }

  try {
    await createCalendarBlock({ kind, startsAt, endsAt, note: emptyToNull(formData.get('note')) });
  } catch (error: unknown) {
    if (error instanceof ServerApiError && error.status === 401) {
      redirect('/login?reason=expired');
    }
    return errorState(error);
  }

  revalidatePath('/app/calendar');
  return { error: null, ok: true };
}

export async function deleteCalendarBlockAction(formData: FormData): Promise<void> {
  const me = await loadCurrentUser();
  if (me === 'unauthenticated') {
    redirect('/login?reason=expired');
  }
  if (me === 'denied' || !canUpdateAppointment(me)) {
    return;
  }
  const id = emptyToNull(formData.get('blockId'));
  if (!id) return;
  try {
    await deleteCalendarBlock(id);
  } catch {
    // Already removed or not permitted; the calendar refresh shows the real state.
  }
  revalidatePath('/app/calendar');
}
