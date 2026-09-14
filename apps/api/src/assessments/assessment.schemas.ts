import {
  ANATOMICAL_REGION_CODES,
  ASSESSMENT_STATUSES,
  LATERALITIES,
  UNIT_CODES,
} from '@repo/contracts';
import { z } from 'zod';

const isoDateTime = z.string().datetime({ offset: true });
const nullableText = (max: number) =>
  z.union([z.string().trim().max(max), z.null()]).transform((value) => value || null);

export const measurementInputSchema = z
  .object({
    definitionId: z.string().uuid(),
    templateItemId: z.union([z.string().uuid(), z.null()]).optional(),
    anatomicalRegion: z.enum(ANATOMICAL_REGION_CODES).nullable().optional(),
    laterality: z.enum(LATERALITIES).nullable().optional(),
    sequenceNumber: z.number().int().min(1).max(100).default(1),
    value: z.union([z.number().finite(), z.boolean(), z.string().max(2000)]),
    unit: z.enum(UNIT_CODES).nullable().optional(),
    note: nullableText(2000).optional(),
  })
  .strict();

export const createAssessmentBodySchema = z
  .object({
    encounterId: z.union([z.string().uuid(), z.null()]).optional(),
    templateId: z.union([z.string().uuid(), z.null()]).optional(),
    title: z.string().trim().min(1).max(200).optional(),
    performedAt: isoDateTime.optional(),
  })
  .strict()
  .refine((body) => Boolean(body.templateId || body.title), {
    message: 'Template or title is required',
  })
  .superRefine((body, ctx) => {
    if (body.performedAt && new Date(body.performedAt).getTime() > Date.now() + 60_000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['performedAt'],
        message: 'performedAt cannot be in the future',
      });
    }
  });

export const updateAssessmentBodySchema = z
  .object({
    version: z.number().int().positive(),
    title: z.string().trim().min(1).max(200).optional(),
    performedAt: isoDateTime.optional(),
    summary: nullableText(5000).optional(),
    measurements: z.array(measurementInputSchema).max(200).optional(),
  })
  .strict()
  .refine(
    (body) =>
      body.title !== undefined ||
      body.performedAt !== undefined ||
      body.summary !== undefined ||
      body.measurements !== undefined,
    { message: 'At least one assessment field must be supplied' },
  )
  .superRefine((body, ctx) => {
    if (body.performedAt && new Date(body.performedAt).getTime() > Date.now() + 60_000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['performedAt'],
        message: 'performedAt cannot be in the future',
      });
    }
  });

export const assessmentVersionCommandSchema = z
  .object({ version: z.number().int().positive() })
  .strict();
export const voidAssessmentBodySchema = z
  .object({ version: z.number().int().positive(), reason: z.string().trim().min(3).max(1000) })
  .strict();

export const listAssessmentsQuerySchema = z
  .object({
    status: z.enum(ASSESSMENT_STATUSES).optional(),
    templateId: z.string().uuid().optional(),
    from: isoDateTime.optional(),
    to: isoDateTime.optional(),
  })
  .strict();

export const measurementHistoryQuerySchema = z
  .object({
    definitionCode: z.string().trim().min(1).max(100).optional(),
    region: z.enum(ANATOMICAL_REGION_CODES).optional(),
    laterality: z.enum(LATERALITIES).optional(),
    from: isoDateTime.optional(),
    to: isoDateTime.optional(),
  })
  .strict()
  .superRefine((query, ctx) => {
    if (query.from && query.to && new Date(query.to) <= new Date(query.from)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['to'], message: 'to must be after from' });
    }
  });

export type MeasurementInput = z.infer<typeof measurementInputSchema>;
export type CreateAssessmentBody = z.infer<typeof createAssessmentBodySchema>;
export type UpdateAssessmentBody = z.infer<typeof updateAssessmentBodySchema>;
export type AssessmentVersionCommand = z.infer<typeof assessmentVersionCommandSchema>;
export type VoidAssessmentBody = z.infer<typeof voidAssessmentBodySchema>;
export type ListAssessmentsQuery = z.infer<typeof listAssessmentsQuerySchema>;
export type MeasurementHistoryQuery = z.infer<typeof measurementHistoryQuerySchema>;
