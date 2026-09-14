import { CLINICAL_REPORT_SECTIONS, CLINICAL_TIMELINE_CATEGORIES, PROGRESS_PERIODS } from '@repo/contracts';
import { z } from 'zod';

const iso = z.string().datetime({ offset: true });
const periodFields = {
  period: z.enum(PROGRESS_PERIODS).default('90d'),
  from: iso.optional(),
  to: iso.optional(),
};

export const progressQuerySchema = z.object(periodFields).strict().superRefine((value, ctx) => {
  if (value.period === 'custom' && (!value.from || !value.to)) {
    ctx.addIssue({ code: 'custom', path: ['from'], message: 'Custom period requires from and to' });
  }
  if (value.from && value.to && value.from > value.to) {
    ctx.addIssue({ code: 'custom', path: ['to'], message: 'End must not precede start' });
  }
});

export const timelineQuerySchema = z
  .object({
    from: iso.optional(),
    to: iso.optional(),
    category: z.enum(CLINICAL_TIMELINE_CATEGORIES).optional(),
    encounterId: z.string().uuid().optional(),
    cursor: z.string().trim().min(1).max(500).regex(/^[A-Za-z0-9_-]+$/).optional(),
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(25),
  })
  .strict()
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    path: ['to'], message: 'End must not precede start',
  });

export const createClinicalReportSchema = z
  .object({
    period: z.object({ from: iso, to: iso }).strict(),
    sections: z.array(z.enum(CLINICAL_REPORT_SECTIONS)).min(1).max(CLINICAL_REPORT_SECTIONS.length),
    professionalSummary: z.union([z.string().trim().max(5000), z.null()]).optional().transform((v) => v || null),
  })
  .strict()
  .refine((value) => value.period.from <= value.period.to, {
    path: ['period', 'to'], message: 'End must not precede start',
  });

export const voidClinicalReportSchema = z.object({ reason: z.string().trim().min(3).max(1000) }).strict();

export type ProgressQuery = z.infer<typeof progressQuerySchema>;
export type TimelineQuery = z.infer<typeof timelineQuerySchema>;
export type CreateClinicalReportBody = z.infer<typeof createClinicalReportSchema>;
export type VoidClinicalReportBody = z.infer<typeof voidClinicalReportSchema>;
