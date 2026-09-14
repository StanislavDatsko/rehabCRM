import 'server-only';

import type {
  PatientAdministrativeResponse,
  PatientHistoryItem,
  PatientListResponse,
  PatientSex,
  PatientStatus,
  ResponsiblePractitionerResponse,
} from '@repo/contracts';
import { serverApiFetch } from '../../../lib/api/server-api-client';
import type { PatientListQuery } from '../list-query';

export type PatientAddressInput = {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
};

export type PatientEmergencyContactInput = {
  name?: string | null;
  phone?: string | null;
  relationship?: string | null;
};

export type CreatePatientBody = {
  firstName: string;
  lastName: string;
  middleName?: string | null;
  dateOfBirth?: string | null;
  sex?: PatientSex | null;
  phone?: string | null;
  email?: string | null;
  address?: PatientAddressInput;
  emergencyContact?: PatientEmergencyContactInput | null;
  responsiblePractitionerId?: string | null;
};

export type UpdatePatientBody = CreatePatientBody & {
  version: number;
};

export type ChangePatientStatusBody = {
  status: PatientStatus;
  version: number;
};

function jsonInit(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export async function listPatients(query: PatientListQuery): Promise<PatientListResponse> {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
    sort: query.sort,
    sortDir: query.sortDir,
  });
  if (query.search) {
    params.set('search', query.search);
  }
  if (query.status) {
    params.set('status', query.status);
  }
  if (query.responsiblePractitionerId) {
    params.set('responsiblePractitionerId', query.responsiblePractitionerId);
  }
  return serverApiFetch<PatientListResponse>(`/api/v1/patients?${params.toString()}`);
}

export async function getPatient(id: string): Promise<PatientAdministrativeResponse> {
  return serverApiFetch<PatientAdministrativeResponse>(`/api/v1/patients/${id}`);
}

export async function createPatient(
  body: CreatePatientBody,
): Promise<PatientAdministrativeResponse> {
  return serverApiFetch<PatientAdministrativeResponse>(
    '/api/v1/patients',
    jsonInit('POST', body),
  );
}

export async function updatePatient(
  id: string,
  body: UpdatePatientBody,
): Promise<PatientAdministrativeResponse> {
  return serverApiFetch<PatientAdministrativeResponse>(
    `/api/v1/patients/${id}`,
    jsonInit('PATCH', body),
  );
}

export async function changePatientStatus(
  id: string,
  body: ChangePatientStatusBody,
): Promise<PatientAdministrativeResponse> {
  return serverApiFetch<PatientAdministrativeResponse>(
    `/api/v1/patients/${id}/status`,
    jsonInit('PATCH', body),
  );
}

export async function getPatientHistory(id: string): Promise<PatientHistoryItem[]> {
  return serverApiFetch<PatientHistoryItem[]>(`/api/v1/patients/${id}/history`);
}

export async function listResponsiblePractitioners(): Promise<ResponsiblePractitionerResponse[]> {
  return serverApiFetch<ResponsiblePractitionerResponse[]>('/api/v1/patients/practitioners');
}
