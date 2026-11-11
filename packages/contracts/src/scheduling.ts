export const APPOINTMENT_STATUSES = [
  'SCHEDULED',
  'CONFIRMED',
  'CHECKED_IN',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const ENCOUNTER_STATUSES = ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;

export type EncounterStatus = (typeof ENCOUNTER_STATUSES)[number];

export type SchedulingPersonRef = {
  id: string;
  displayName: string;
};

export type SchedulingLocationRef = {
  id: string;
  name: string;
  timezone: string;
};

export type SchedulingRoomRef = {
  id: string;
  name: string;
};

export type AppointmentTypeRef = {
  id: string;
  name: string;
  defaultDurationMinutes: number;
};

export type AppointmentCalendarItem = {
  id: string;
  patient: SchedulingPersonRef;
  practitioner: SchedulingPersonRef;
  appointmentType: AppointmentTypeRef | null;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  location: SchedulingLocationRef | null;
  room: SchedulingRoomRef | null;
  /** Price in UAH. null = not set, 0 = free. */
  priceAmount: number | null;
  /** Original start when the appointment was moved to another time. */
  rescheduledFromAt: string | null;
  version: number;
};

export type AppointmentDetailResponse = AppointmentCalendarItem & {
  reason: string | null;
  administrativeNote: string | null;
  cancellationReason: string | null;
  encounterId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AppointmentCalendarResponse = {
  items: AppointmentCalendarItem[];
  from: string;
  to: string;
};

/** Every visit of one patient, newest first, with outcome counters. */
export type PatientAppointmentHistory = {
  items: AppointmentCalendarItem[];
  counts: {
    /** Client came: checked in, in progress or completed. */
    attended: number;
    cancelled: number;
    noShow: number;
    /** Still ahead and not cancelled. */
    upcoming: number;
  };
  total: number;
  truncated: boolean;
};

export type PatientAppointmentSummary = {
  upcoming: AppointmentCalendarItem | null;
  recent: AppointmentCalendarItem[];
};

export type EncounterResponse = {
  id: string;
  patient: SchedulingPersonRef;
  practitioner: SchedulingPersonRef;
  appointment: {
    id: string;
    startsAt: string;
    endsAt: string;
    appointmentType: AppointmentTypeRef | null;
  } | null;
  startedAt: string;
  endedAt: string | null;
  status: EncounterStatus;
  createdAt: string;
  updatedAt: string;
};

export type SchedulingCatalogResponse = {
  appointmentTypes: AppointmentTypeRef[];
  locations: (SchedulingLocationRef & { rooms: SchedulingRoomRef[] })[];
};

/** Maximum calendar query window in days. */
export const CALENDAR_MAX_RANGE_DAYS = 90;

/** Minimum appointment duration in minutes. */
export const APPOINTMENT_MIN_DURATION_MINUTES = 10;

/** Maximum appointment duration in minutes (8 hours). */
export const APPOINTMENT_MAX_DURATION_MINUTES = 480;

export const CALENDAR_BLOCK_KINDS = ['BREAK', 'DAY_OFF'] as const;
export type CalendarBlockKind = (typeof CALENDAR_BLOCK_KINDS)[number];

export type CalendarBlockItem = {
  id: string;
  kind: CalendarBlockKind;
  startsAt: string;
  endsAt: string;
  note: string | null;
};

export type CalendarBlocksResponse = {
  items: CalendarBlockItem[];
};

export type AppointmentRevenueResponse = {
  /** Sum of prices in UAH, excluding cancelled and no-show appointments. */
  total: number;
  count: number;
  from: string;
  to: string;
};

/** Suggested prices (UAH) offered in the appointment form. */
export const APPOINTMENT_PRICE_PRESETS = [300, 500] as const;
