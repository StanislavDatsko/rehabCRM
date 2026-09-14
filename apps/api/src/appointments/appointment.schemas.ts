import {
  APPOINTMENT_MAX_DURATION_MINUTES,
  APPOINTMENT_MIN_DURATION_MINUTES,
  APPOINTMENT_STATUSES,
  CALENDAR_MAX_RANGE_DAYS,
} from '@repo/contracts';
import { z } from 'zod';

const isoDateTime = z.string().datetime({ offset: true });

const emptyToNull = (value: string | null | undefined): string | null => {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

const optionalText = (max: number) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform(emptyToNull)
    .refine((value) => value === null || value.length <= max, {
      message: `Must be at most ${max} characters`,
    });

function validateTimeRange(startsAt: Date, endsAt: Date): boolean {
  if (endsAt <= startsAt) {
    return false;
  }
  const minutes = (endsAt.getTime() - startsAt.getTime()) / 60_000;
  return (
    minutes >= APPOINTMENT_MIN_DURATION_MINUTES &&
    minutes <= APPOINTMENT_MAX_DURATION_MINUTES
  );
}

export const createAppointmentBodySchema = z
  .object({
    patientId: z.string().uuid(),
    practitionerId: z.string().uuid(),
    appointmentTypeId: z.union([z.string().uuid(), z.null()]).optional(),
    locationId: z.union([z.string().uuid(), z.null()]).optional(),
    roomId: z.union([z.string().uuid(), z.null()]).optional(),
    startsAt: isoDateTime,
    endsAt: isoDateTime,
    reason: optionalText(500),
    administrativeNote: optionalText(2000),
  })
  .strict()
  .superRefine((body, ctx) => {
    const start = new Date(body.startsAt);
    const end = new Date(body.endsAt);
    if (!validateTimeRange(start, end)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid appointment time range or duration',
        path: ['endsAt'],
      });
    }
    const fiveMinutesAgo = Date.now() - 5 * 60_000;
    if (start.getTime() < fiveMinutesAgo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Appointment start time cannot be in the past',
        path: ['startsAt'],
      });
    }
  });

export const updateAppointmentBodySchema = z
  .object({
    version: z.number().int().positive(),
    practitionerId: z.string().uuid().optional(),
    appointmentTypeId: z.union([z.string().uuid(), z.null()]).optional(),
    locationId: z.union([z.string().uuid(), z.null()]).optional(),
    roomId: z.union([z.string().uuid(), z.null()]).optional(),
    startsAt: isoDateTime.optional(),
    endsAt: isoDateTime.optional(),
    reason: optionalText(500),
    administrativeNote: optionalText(2000),
  })
  .strict()
  .superRefine((body, ctx) => {
    if (body.startsAt && body.endsAt) {
      const start = new Date(body.startsAt);
      const end = new Date(body.endsAt);
      if (!validateTimeRange(start, end)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid appointment time range or duration',
          path: ['endsAt'],
        });
      }
    }
  });

export const versionCommandSchema = z
  .object({
    version: z.number().int().positive(),
  })
  .strict();

export const cancelAppointmentBodySchema = z
  .object({
    version: z.number().int().positive(),
    cancellationReason: optionalText(500),
  })
  .strict();

export const calendarQuerySchema = z
  .object({
    from: isoDateTime,
    to: isoDateTime,
    practitionerId: z.string().uuid().optional(),
    patientId: z.string().uuid().optional(),
    status: z.enum(APPOINTMENT_STATUSES).optional(),
    locationId: z.string().uuid().optional(),
  })
  .strict()
  .superRefine((query, ctx) => {
    const from = new Date(query.from);
    const to = new Date(query.to);
    if (to <= from) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Calendar range end must be after start',
        path: ['to'],
      });
      return;
    }
    const maxMs = CALENDAR_MAX_RANGE_DAYS * 24 * 60 * 60 * 1000;
    if (to.getTime() - from.getTime() > maxMs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Calendar range cannot exceed ${CALENDAR_MAX_RANGE_DAYS} days`,
        path: ['to'],
      });
    }
  });

export type CreateAppointmentBody = z.infer<typeof createAppointmentBodySchema>;
export type UpdateAppointmentBody = z.infer<typeof updateAppointmentBodySchema>;
export type CancelAppointmentBody = z.infer<typeof cancelAppointmentBodySchema>;
export type CalendarQuery = z.infer<typeof calendarQuerySchema>;
export type VersionCommand = z.infer<typeof versionCommandSchema>;
