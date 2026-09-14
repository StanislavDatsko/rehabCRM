import { PATIENT_SEX_VALUES, PATIENT_STATUSES } from '@repo/contracts';
import { z } from 'zod';

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

const dateOfBirthSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value == null) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  })
  .refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: 'dateOfBirth must be YYYY-MM-DD',
  })
  .refine(
    (value) => {
      if (value === null) {
        return true;
      }
      const [year, month, day] = value.split('-').map(Number) as [number, number, number];
      const utc = new Date(Date.UTC(year, month - 1, day));
      if (
        utc.getUTCFullYear() !== year ||
        utc.getUTCMonth() !== month - 1 ||
        utc.getUTCDate() !== day
      ) {
        return false;
      }
      const today = new Date();
      const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
      return utc.getTime() <= todayUtc;
    },
    { message: 'dateOfBirth must be a real calendar date not in the future' },
  );

const addressSchema = z
  .object({
    line1: optionalText(200),
    line2: optionalText(200),
    city: optionalText(100),
    region: optionalText(100),
    postalCode: optionalText(20),
    countryCode: optionalText(2),
  })
  .strict()
  .optional();

const emergencyContactSchema = z
  .object({
    name: optionalText(150),
    phone: optionalText(50),
    relationship: optionalText(100),
  })
  .strict()
  .nullish();

const emailSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform(emptyToNull)
  .refine((value) => value === null || z.string().email().max(254).safeParse(value).success, {
    message: 'Invalid email',
  })
  // Case-insensitive mailbox semantics: store lowercase for stable search/dedup.
  .transform((value) => (value === null ? null : value.toLowerCase()));

export const createPatientBodySchema = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    middleName: optionalText(100),
    dateOfBirth: dateOfBirthSchema,
    sex: z.enum(PATIENT_SEX_VALUES).nullish(),
    phone: optionalText(50),
    email: emailSchema,
    address: addressSchema,
    emergencyContact: emergencyContactSchema,
    responsiblePractitionerId: z.union([z.string().uuid(), z.null()]).optional(),
    internalReferenceNumber: optionalText(50),
  })
  .strict();

export const updatePatientBodySchema = createPatientBodySchema
  .partial()
  .extend({
    version: z.number().int().positive(),
  })
  .strict();

export const changePatientStatusBodySchema = z
  .object({
    status: z.enum(PATIENT_STATUSES),
    version: z.number().int().positive(),
  })
  .strict();

export const PATIENT_SORT_FIELDS = [
  'lastName',
  'createdAt',
  'updatedAt',
  'dateOfBirth',
  'status',
] as const;

export type PatientSortField = (typeof PATIENT_SORT_FIELDS)[number];

export const listPatientsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().trim().max(200).optional(),
    status: z.enum(PATIENT_STATUSES).optional(),
    responsiblePractitionerId: z.string().uuid().optional(),
    sort: z.enum(PATIENT_SORT_FIELDS).optional(),
    sortDir: z.enum(['asc', 'desc']).optional(),
  })
  .strict();

export type CreatePatientBody = z.infer<typeof createPatientBodySchema>;
export type UpdatePatientBody = z.infer<typeof updatePatientBodySchema>;
export type ChangePatientStatusBody = z.infer<typeof changePatientStatusBodySchema>;
export type ListPatientsQuery = z.infer<typeof listPatientsQuerySchema>;
