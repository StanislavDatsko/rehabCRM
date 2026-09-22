'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ServerApiError } from '../../../lib/api/server-api-client';
import { loadCurrentUser } from '../../../lib/app/load-current-user';
import { listPatients } from '../../patients/api/patients-api';
import {
  cancelAppointment,
  checkInAppointment,
  completeEncounter,
  confirmAppointment,
  createAppointment,
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
};

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
  if (!body.patientId || !body.practitionerId || !body.startsAt || !body.endsAt) {
    return { error: mapSchedulingErrorToMessage('VALIDATION_FAILED') };
  }

  let createdId: string;
  try {
    const created = await createAppointment(body);
    createdId = created.id;
  } catch (error: unknown) {
    if (error instanceof ServerApiError && error.status === 401) {
      redirect('/login?reason=expired');
    }
    return errorState(error);
  }

  revalidateSchedulingPaths(createdId, undefined, body.patientId);
  redirect(`/app/calendar?appointment=${createdId}&created=1`);
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
      appointmentTypeId: emptyToNull(formData.get('appointmentTypeId')),
      locationId: emptyToNull(formData.get('locationId')),
      roomId: emptyToNull(formData.get('roomId')),
      administrativeNote: emptyToNull(formData.get('administrativeNote')),
    });
  } catch (error: unknown) {
    if (error instanceof ServerApiError && error.status === 401) {
      redirect('/login?reason=expired');
    }
    return errorState(error);
  }

  revalidateSchedulingPaths(id);
  redirect(`/app/calendar?appointment=${id}&updated=1`);
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
    if (error instanceof ServerApiError && error.status === 401) {
      redirect('/login?reason=expired');
    }
    return errorState(error);
  }

  revalidateSchedulingPaths(id);
  redirect(`/app/calendar?appointment=${id}&statusUpdated=1`);
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
