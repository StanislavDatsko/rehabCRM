import 'server-only';

import type {
  AppointmentCalendarResponse,
  AppointmentDetailResponse,
  EncounterResponse,
  PatientAppointmentSummary,
  SchedulingCatalogResponse,
} from '@repo/contracts';
import { serverApiFetch } from '../../../lib/api/server-api-client';
import type { EncounterExerciseLog } from '../types';

export type CalendarListQuery = {
  from: string;
  to: string;
  practitionerId?: string;
  locationId?: string;
  patientId?: string;
  status?: string;
};

export type CreateAppointmentBody = {
  patientId: string;
  practitionerId: string;
  appointmentTypeId?: string | null;
  locationId?: string | null;
  roomId?: string | null;
  startsAt: string;
  endsAt: string;
  reason?: string | null;
  administrativeNote?: string | null;
};

export type UpdateAppointmentBody = {
  version: number;
  practitionerId?: string;
  appointmentTypeId?: string | null;
  locationId?: string | null;
  roomId?: string | null;
  startsAt?: string;
  endsAt?: string;
  reason?: string | null;
  administrativeNote?: string | null;
};

export type VersionCommandBody = {
  version: number;
};

export type CancelAppointmentBody = {
  version: number;
  cancellationReason?: string | null;
};

function jsonInit(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export async function getSchedulingCatalog(): Promise<SchedulingCatalogResponse> {
  return serverApiFetch<SchedulingCatalogResponse>('/api/v1/appointments/catalog');
}

export async function listAppointments(
  query: CalendarListQuery,
): Promise<AppointmentCalendarResponse> {
  const params = new URLSearchParams({
    from: query.from,
    to: query.to,
  });
  if (query.practitionerId) {
    params.set('practitionerId', query.practitionerId);
  }
  if (query.locationId) {
    params.set('locationId', query.locationId);
  }
  if (query.patientId) {
    params.set('patientId', query.patientId);
  }
  if (query.status) {
    params.set('status', query.status);
  }
  return serverApiFetch<AppointmentCalendarResponse>(`/api/v1/appointments?${params.toString()}`);
}

export async function getAppointment(id: string): Promise<AppointmentDetailResponse> {
  return serverApiFetch<AppointmentDetailResponse>(`/api/v1/appointments/${id}`);
}

export async function createAppointment(
  body: CreateAppointmentBody,
): Promise<AppointmentDetailResponse> {
  return serverApiFetch<AppointmentDetailResponse>(
    '/api/v1/appointments',
    jsonInit('POST', body),
  );
}

export async function updateAppointment(
  id: string,
  body: UpdateAppointmentBody,
): Promise<AppointmentDetailResponse> {
  return serverApiFetch<AppointmentDetailResponse>(
    `/api/v1/appointments/${id}`,
    jsonInit('PATCH', body),
  );
}

export async function confirmAppointment(
  id: string,
  body: VersionCommandBody,
): Promise<AppointmentDetailResponse> {
  return serverApiFetch<AppointmentDetailResponse>(
    `/api/v1/appointments/${id}/confirm`,
    jsonInit('POST', body),
  );
}

export async function checkInAppointment(
  id: string,
  body: VersionCommandBody,
): Promise<AppointmentDetailResponse> {
  return serverApiFetch<AppointmentDetailResponse>(
    `/api/v1/appointments/${id}/check-in`,
    jsonInit('POST', body),
  );
}

export async function cancelAppointment(
  id: string,
  body: CancelAppointmentBody,
): Promise<AppointmentDetailResponse> {
  return serverApiFetch<AppointmentDetailResponse>(
    `/api/v1/appointments/${id}/cancel`,
    jsonInit('POST', body),
  );
}

export async function markAppointmentNoShow(
  id: string,
  body: VersionCommandBody,
): Promise<AppointmentDetailResponse> {
  return serverApiFetch<AppointmentDetailResponse>(
    `/api/v1/appointments/${id}/no-show`,
    jsonInit('POST', body),
  );
}

export async function startEncounterForAppointment(
  id: string,
  body: VersionCommandBody,
): Promise<EncounterResponse> {
  return serverApiFetch<EncounterResponse>(
    `/api/v1/appointments/${id}/start-encounter`,
    jsonInit('POST', body),
  );
}

export async function getEncounter(id: string): Promise<EncounterResponse> {
  return serverApiFetch<EncounterResponse>(`/api/v1/encounters/${id}`);
}

export async function listEncounterExerciseLogs(id: string): Promise<EncounterExerciseLog[]> {
  return serverApiFetch<EncounterExerciseLog[]>(`/api/v1/encounters/${id}/exercise-logs`);
}
export async function listPatientExerciseLogs(id: string): Promise<EncounterExerciseLog[]> {
  return serverApiFetch<EncounterExerciseLog[]>(`/api/v1/encounters/patient/${id}/exercise-logs`);
}

export async function completeEncounter(id: string): Promise<EncounterResponse> {
  return serverApiFetch<EncounterResponse>(
    `/api/v1/encounters/${id}/complete`,
    jsonInit('POST', {}),
  );
}

export async function getPatientAppointments(
  patientId: string,
): Promise<PatientAppointmentSummary> {
  return serverApiFetch<PatientAppointmentSummary>(
    `/api/v1/patients/${patientId}/appointments`,
  );
}
