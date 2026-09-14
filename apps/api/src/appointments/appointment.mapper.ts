import type {
  AppointmentCalendarItem,
  AppointmentDetailResponse,
  AppointmentTypeRef,
  EncounterResponse,
  SchedulingCatalogResponse,
} from '@repo/contracts';
import type {
  Appointment,
  AppointmentType,
  Encounter,
  Location,
  Patient,
  Practitioner,
  Room,
  User,
} from '@prisma/client';

export type AppointmentWithRelations = Appointment & {
  patient: Pick<Patient, 'id' | 'firstName' | 'lastName' | 'middleName'>;
  practitioner: Practitioner & { user: Pick<User, 'displayName'> };
  location: Pick<Location, 'id' | 'name' | 'timezone'> | null;
  room: Pick<Room, 'id' | 'name'> | null;
  appointmentType: Pick<AppointmentType, 'id' | 'name' | 'defaultDurationMinutes'> | null;
  encounter: Pick<Encounter, 'id'> | null;
};

export const APPOINTMENT_INCLUDE = {
  patient: {
    select: { id: true, firstName: true, lastName: true, middleName: true },
  },
  practitioner: {
    include: { user: { select: { displayName: true } } },
  },
  location: { select: { id: true, name: true, timezone: true } },
  room: { select: { id: true, name: true } },
  appointmentType: { select: { id: true, name: true, defaultDurationMinutes: true } },
  encounter: { select: { id: true } },
} as const;

export type EncounterWithRelations = Encounter & {
  patient: Pick<Patient, 'id' | 'firstName' | 'lastName' | 'middleName'>;
  practitioner: Practitioner & { user: Pick<User, 'displayName'> };
  appointment:
    | (Pick<Appointment, 'id' | 'startsAt' | 'endsAt'> & {
        appointmentType: Pick<AppointmentType, 'id' | 'name' | 'defaultDurationMinutes'> | null;
      })
    | null;
};

export const ENCOUNTER_INCLUDE = {
  patient: {
    select: { id: true, firstName: true, lastName: true, middleName: true },
  },
  practitioner: {
    include: { user: { select: { displayName: true } } },
  },
  appointment: {
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      appointmentType: { select: { id: true, name: true, defaultDurationMinutes: true } },
    },
  },
} as const;

function patientDisplayName(
  patient: Pick<Patient, 'firstName' | 'lastName' | 'middleName'>,
): string {
  return [patient.lastName, patient.firstName, patient.middleName]
    .filter((part) => part && part.length > 0)
    .join(' ');
}

function mapAppointmentType(
  type: Pick<AppointmentType, 'id' | 'name' | 'defaultDurationMinutes'> | null,
): AppointmentTypeRef | null {
  if (!type) {
    return null;
  }
  return {
    id: type.id,
    name: type.name,
    defaultDurationMinutes: type.defaultDurationMinutes,
  };
}

export function toAppointmentCalendarItem(
  row: AppointmentWithRelations,
): AppointmentCalendarItem {
  return {
    id: row.id,
    patient: { id: row.patient.id, displayName: patientDisplayName(row.patient) },
    practitioner: {
      id: row.practitioner.id,
      displayName: row.practitioner.user.displayName,
    },
    appointmentType: mapAppointmentType(row.appointmentType),
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    status: row.status,
    location: row.location
      ? { id: row.location.id, name: row.location.name, timezone: row.location.timezone }
      : null,
    room: row.room ? { id: row.room.id, name: row.room.name } : null,
    version: row.version,
  };
}

export function toAppointmentDetail(row: AppointmentWithRelations): AppointmentDetailResponse {
  return {
    ...toAppointmentCalendarItem(row),
    reason: row.reason,
    administrativeNote: row.administrativeNote,
    cancellationReason: row.cancellationReason,
    encounterId: row.encounter?.id ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toEncounterResponse(row: EncounterWithRelations): EncounterResponse {
  return {
    id: row.id,
    patient: { id: row.patient.id, displayName: patientDisplayName(row.patient) },
    practitioner: {
      id: row.practitioner.id,
      displayName: row.practitioner.user.displayName,
    },
    appointment: row.appointment
      ? {
          id: row.appointment.id,
          startsAt: row.appointment.startsAt.toISOString(),
          endsAt: row.appointment.endsAt.toISOString(),
          appointmentType: mapAppointmentType(row.appointment.appointmentType),
        }
      : null,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt?.toISOString() ?? null,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toSchedulingCatalog(
  types: Pick<AppointmentType, 'id' | 'name' | 'defaultDurationMinutes'>[],
  locations: (Pick<Location, 'id' | 'name' | 'timezone'> & {
    rooms: Pick<Room, 'id' | 'name'>[];
  })[],
): SchedulingCatalogResponse {
  return {
    appointmentTypes: types.map((t) => ({
      id: t.id,
      name: t.name,
      defaultDurationMinutes: t.defaultDurationMinutes,
    })),
    locations: locations.map((loc) => ({
      id: loc.id,
      name: loc.name,
      timezone: loc.timezone,
      rooms: loc.rooms.map((room) => ({ id: room.id, name: room.name })),
    })),
  };
}
