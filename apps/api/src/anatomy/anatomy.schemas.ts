import {
  ANATOMICAL_STRUCTURE_CATEGORIES,
  BODY_ANNOTATION_STATUSES,
  BODY_ANNOTATION_TYPES,
  LATERALITIES,
} from '@repo/contracts';
import { z } from 'zod';

const nullableText = (max: number) =>
  z.union([z.string().trim().max(max), z.null()]).transform((value) => value || null);
const vec3 = z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]);

export const surfaceAnchorSchema = z
  .object({
    stableMeshKey: z.string().trim().min(1).max(1000),
    primitiveIndex: z.number().int().min(0),
    triangleIndex: z.number().int().min(0),
    barycentric: z.tuple([
      z.number().min(0).max(1),
      z.number().min(0).max(1),
      z.number().min(0).max(1),
    ]),
    localPosition: vec3,
    localNormal: vec3.nullable(),
  })
  .strict()
  .refine(
    (value) => Math.abs(value.barycentric.reduce((sum, item) => sum + item, 0) - 1) < 0.0001,
    { path: ['barycentric'], message: 'Barycentric coordinates must sum to 1' },
  );

export const annotationListQuerySchema = z
  .object({
    status: z.enum(BODY_ANNOTATION_STATUSES).optional(),
    annotationType: z.enum(BODY_ANNOTATION_TYPES).optional(),
    anatomicalStructureId: z.string().uuid().optional(),
    encounterId: z.string().uuid().optional(),
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
  })
  .strict()
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    path: ['to'],
    message: 'End must not precede start',
  });

export const structureListQuerySchema = z
  .object({
    category: z.enum(ANATOMICAL_STRUCTURE_CATEGORIES).optional(),
    region: z.string().trim().min(1).max(64).optional(),
    laterality: z.enum(LATERALITIES).optional(),
    search: z.string().trim().min(1).max(100).optional(),
  })
  .strict();

export const createAnnotationBodySchema = z
  .object({
    encounterId: z.string().uuid().nullable().optional(),
    structureId: z.string().uuid(),
    modelVersionId: z.string().uuid(),
    mappingId: z.string().uuid(),
    type: z.enum(BODY_ANNOTATION_TYPES),
    severity: z.number().int().min(0).max(10).nullable().optional(),
    title: nullableText(200).optional(),
    note: nullableText(3000).optional(),
    anchor: surfaceAnchorSchema,
  })
  .strict();

export const updateAnnotationBodySchema = z
  .object({
    version: z.number().int().positive(),
    type: z.enum(BODY_ANNOTATION_TYPES),
    severity: z.number().int().min(0).max(10).nullable(),
    title: nullableText(200),
    note: nullableText(3000),
  })
  .strict();

export const annotationStatusBodySchema = z
  .object({ version: z.number().int().positive(), reason: nullableText(1000).optional() })
  .strict();
export const voidAnnotationBodySchema = z
  .object({ version: z.number().int().positive(), reason: z.string().trim().min(3).max(1000) })
  .strict();

export type AnnotationListQuery = z.infer<typeof annotationListQuerySchema>;
export type StructureListQuery = z.infer<typeof structureListQuerySchema>;
export type CreateAnnotationBody = z.infer<typeof createAnnotationBodySchema>;
export type UpdateAnnotationBody = z.infer<typeof updateAnnotationBodySchema>;
export type AnnotationStatusBody = z.infer<typeof annotationStatusBodySchema>;
export type VoidAnnotationBody = z.infer<typeof voidAnnotationBodySchema>;
