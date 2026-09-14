'use server';

import {
  PATIENT_SEX_VALUES,
  PATIENT_STATUSES,
  type PatientSex,
  type PatientStatus,
} from '@repo/contracts';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ServerApiError } from '../../../lib/api/server-api-client';
import { loadCurrentUser } from '../../../lib/app/load-current-user';
import {
  changePatientStatus,
  createPatient,
  updatePatient,
  type CreatePatientBody,
} from '../api/patients-api';
import { mapApiErrorToMessage } from '../labels';
import {
  canChangePatientStatus,
  canCreatePatient,
  canUpdatePatient,
} from '../permissions';

export type PatientFormState = {
  error: string | null;
};

function emptyToNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseSex(value: string | null): PatientSex | null {
  if (!value) {
    return null;
  }
  return (PATIENT_SEX_VALUES as readonly string[]).includes(value)
    ? (value as PatientSex)
    : null;
}

function parseStatus(value: string | null): PatientStatus | null {
  if (!value) {
    return null;
  }
  return (PATIENT_STATUSES as readonly string[]).includes(value)
    ? (value as PatientStatus)
    : null;
}

function bodyFromFormData(formData: FormData): CreatePatientBody {
  const firstName = emptyToNull(formData.get('firstName')) ?? '';
  const lastName = emptyToNull(formData.get('lastName')) ?? '';
  const address = {
    line1: emptyToNull(formData.get('addressLine1')),
    line2: emptyToNull(formData.get('addressLine2')),
    city: emptyToNull(formData.get('city')),
    region: emptyToNull(formData.get('region')),
    postalCode: emptyToNull(formData.get('postalCode')),
    countryCode: emptyToNull(formData.get('countryCode')),
  };
  const emergencyName = emptyToNull(formData.get('emergencyContactName'));
  const emergencyPhone = emptyToNull(formData.get('emergencyContactPhone'));
  const emergencyRelationship = emptyToNull(formData.get('emergencyContactRelationship'));
  const hasEmergency = Boolean(emergencyName || emergencyPhone || emergencyRelationship);

  return {
    firstName,
    lastName,
    middleName: emptyToNull(formData.get('middleName')),
    dateOfBirth: emptyToNull(formData.get('dateOfBirth')),
    sex: parseSex(emptyToNull(formData.get('sex'))),
    phone: emptyToNull(formData.get('phone')),
    email: emptyToNull(formData.get('email')),
    address,
    emergencyContact: hasEmergency
      ? {
          name: emergencyName,
          phone: emergencyPhone,
          relationship: emergencyRelationship,
        }
      : null,
    responsiblePractitionerId: emptyToNull(formData.get('responsiblePractitionerId')),
  };
}

function errorState(error: unknown): PatientFormState {
  if (error instanceof ServerApiError) {
    return { error: mapApiErrorToMessage(error.body?.code) };
  }
  return { error: mapApiErrorToMessage(undefined) };
}

export async function createPatientAction(
  _prev: PatientFormState,
  formData: FormData,
): Promise<PatientFormState> {
  const me = await loadCurrentUser();
  if (me === 'unauthenticated') {
    redirect('/login?reason=expired');
  }
  if (me === 'denied' || !canCreatePatient(me)) {
    return { error: mapApiErrorToMessage('FORBIDDEN') };
  }

  const body = bodyFromFormData(formData);
  if (!body.firstName || !body.lastName) {
    return { error: mapApiErrorToMessage('VALIDATION_FAILED') };
  }

  let createdId: string;
  try {
    const created = await createPatient(body);
    createdId = created.id;
  } catch (error: unknown) {
    if (error instanceof ServerApiError && error.status === 401) {
      redirect('/login?reason=expired');
    }
    return errorState(error);
  }

  revalidatePath('/app/patients');
  redirect(`/app/patients/${createdId}?created=1`);
}

export async function updatePatientAction(
  _prev: PatientFormState,
  formData: FormData,
): Promise<PatientFormState> {
  const me = await loadCurrentUser();
  if (me === 'unauthenticated') {
    redirect('/login?reason=expired');
  }
  if (me === 'denied' || !canUpdatePatient(me)) {
    return { error: mapApiErrorToMessage('FORBIDDEN') };
  }

  const id = emptyToNull(formData.get('patientId'));
  const versionRaw = emptyToNull(formData.get('version'));
  const version = versionRaw ? Number(versionRaw) : NaN;
  if (!id || !Number.isInteger(version) || version < 1) {
    return { error: mapApiErrorToMessage('VALIDATION_FAILED') };
  }

  const body = bodyFromFormData(formData);
  if (!body.firstName || !body.lastName) {
    return { error: mapApiErrorToMessage('VALIDATION_FAILED') };
  }

  try {
    await updatePatient(id, { ...body, version });
  } catch (error: unknown) {
    if (error instanceof ServerApiError && error.status === 401) {
      redirect('/login?reason=expired');
    }
    return errorState(error);
  }

  revalidatePath('/app/patients');
  revalidatePath(`/app/patients/${id}`);
  redirect(`/app/patients/${id}?updated=1`);
}

export async function changePatientStatusAction(
  _prev: PatientFormState,
  formData: FormData,
): Promise<PatientFormState> {
  const me = await loadCurrentUser();
  if (me === 'unauthenticated') {
    redirect('/login?reason=expired');
  }
  if (me === 'denied' || !canChangePatientStatus(me)) {
    return { error: mapApiErrorToMessage('FORBIDDEN') };
  }

  const id = emptyToNull(formData.get('patientId'));
  const versionRaw = emptyToNull(formData.get('version'));
  const version = versionRaw ? Number(versionRaw) : NaN;
  const status = parseStatus(emptyToNull(formData.get('status')));
  if (!id || !status || !Number.isInteger(version) || version < 1) {
    return { error: mapApiErrorToMessage('VALIDATION_FAILED') };
  }

  try {
    await changePatientStatus(id, { status, version });
  } catch (error: unknown) {
    if (error instanceof ServerApiError && error.status === 401) {
      redirect('/login?reason=expired');
    }
    return errorState(error);
  }

  revalidatePath('/app/patients');
  revalidatePath(`/app/patients/${id}`);
  redirect(`/app/patients/${id}?statusUpdated=1`);
}
