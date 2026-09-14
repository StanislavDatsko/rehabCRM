import type {
  PatientAdministrativeResponse,
  PatientHistoryItem,
  PatientStatus,
  ResponsiblePractitionerResponse,
} from '@repo/contracts';
import type {
  Patient,
  AuditEvent,
  Practitioner,
  PractitionerStatus,
  User,
} from '@prisma/client';

export type PatientWithPractitioner = Patient & {
  responsiblePractitioner:
    | (Practitioner & {
        user: Pick<User, 'displayName'>;
      })
    | null;
};

export type AuditEventWithActor = AuditEvent & {
  actor: Pick<User, 'id' | 'displayName'>;
};

export function formatDateOnly(value: Date | null): string | null {
  if (!value) {
    return null;
  }
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildFullName(
  lastName: string,
  firstName: string,
  middleName: string | null,
): string {
  return [lastName, firstName, middleName].filter((part) => part && part.length > 0).join(' ');
}

export function mapResponsiblePractitioner(
  practitioner:
    | (Pick<Practitioner, 'id' | 'status'> & { user: Pick<User, 'displayName'> })
    | null,
): ResponsiblePractitionerResponse | null {
  if (!practitioner) {
    return null;
  }
  return {
    id: practitioner.id,
    displayName: practitioner.user.displayName,
    status: practitioner.status as Extract<PractitionerStatus, 'ACTIVE' | 'DISABLED'>,
  };
}

/**
 * Explicit administrative projection. Never spread Prisma rows.
 */
export function toPatientAdministrativeResponse(
  patient: PatientWithPractitioner,
): PatientAdministrativeResponse {
  const emergencyHasValue =
    patient.emergencyContactName != null ||
    patient.emergencyContactPhoneDisplay != null ||
    patient.emergencyContactRelationship != null;

  return {
    id: patient.id,
    firstName: patient.firstName,
    lastName: patient.lastName,
    middleName: patient.middleName,
    fullName: buildFullName(patient.lastName, patient.firstName, patient.middleName),
    dateOfBirth: formatDateOnly(patient.dateOfBirth),
    sex: patient.sex,
    phone: patient.phoneDisplay,
    email: patient.email,
    address: {
      line1: patient.addressLine1,
      line2: patient.addressLine2,
      city: patient.city,
      region: patient.region,
      postalCode: patient.postalCode,
      countryCode: patient.countryCode,
    },
    emergencyContact: emergencyHasValue
      ? {
          name: patient.emergencyContactName,
          phone: patient.emergencyContactPhoneDisplay,
          relationship: patient.emergencyContactRelationship,
        }
      : null,
    responsiblePractitioner: mapResponsiblePractitioner(patient.responsiblePractitioner),
    status: patient.status,
    internalReferenceNumber: patient.internalReferenceNumber,
    version: patient.version,
    createdAt: patient.createdAt.toISOString(),
    updatedAt: patient.updatedAt.toISOString(),
  };
}

type AuditMetadata = {
  changedFields?: string[];
  statusChange?: { from: PatientStatus; to: PatientStatus };
};

export function toPatientHistoryItem(event: AuditEventWithActor): PatientHistoryItem {
  const metadata =
    event.metadata && typeof event.metadata === 'object' && !Array.isArray(event.metadata)
      ? (event.metadata as AuditMetadata)
      : {};

  const item: PatientHistoryItem = {
    id: event.id,
    action: event.action as PatientHistoryItem['action'],
    occurredAt: event.occurredAt.toISOString(),
    actor: {
      id: event.actor.id,
      displayName: event.actor.displayName,
    },
    changedFields: Array.isArray(metadata.changedFields) ? metadata.changedFields : [],
  };

  if (metadata.statusChange) {
    item.statusChange = metadata.statusChange;
  }

  return item;
}

export function parseDateOfBirthInput(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const [year, month, day] = value.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day));
}

export const PATIENT_INCLUDE = {
  responsiblePractitioner: {
    include: {
      user: {
        select: { displayName: true },
      },
    },
  },
} as const;

