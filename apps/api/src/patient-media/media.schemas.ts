import { z } from 'zod';

const mimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'video/mp4', 'video/quicktime', 'video/webm'] as const;
export const initiateMediaSchema = z.object({
  kind: z.enum(['IMAGE', 'VIDEO']), mimeType: z.enum(mimeTypes), sizeBytes: z.number().int().positive(),
  originalFileName: z.string().trim().min(1).max(255), title: z.string().trim().max(200).optional(),
  description: z.string().trim().max(2000).optional(), capturedAt: z.string().datetime().optional(),
  encounterId: z.string().uuid().optional(), assessmentId: z.string().uuid().optional(), rehabilitationPlanId: z.string().uuid().optional(),
}).superRefine((value, ctx) => { if (value.kind === 'IMAGE' && !value.mimeType.startsWith('image/')) ctx.addIssue({ code: 'custom', path: ['mimeType'], message: 'Image kind requires an image MIME type.' }); if (value.kind === 'VIDEO' && !value.mimeType.startsWith('video/')) ctx.addIssue({ code: 'custom', path: ['mimeType'], message: 'Video kind requires a video MIME type.' }); });
export type InitiateMediaBody = z.infer<typeof initiateMediaSchema>;
export const listMediaSchema = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(50).default(25), kind: z.enum(['IMAGE', 'VIDEO']).optional(), status: z.enum(['READY', 'VOIDED']).default('READY') });
export type ListMediaQuery = z.infer<typeof listMediaSchema>;
export const completeMediaSchema = z.object({ checksumSha256: z.string().regex(/^[a-f0-9]{64}$/i).optional() });
export type CompleteMediaBody = z.infer<typeof completeMediaSchema>;
export const voidMediaSchema = z.object({ version: z.number().int().positive(), reason: z.string().trim().min(1).max(1000) });
export type VoidMediaBody = z.infer<typeof voidMediaSchema>;
