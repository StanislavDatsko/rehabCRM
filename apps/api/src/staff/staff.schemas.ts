import { ASSIGNABLE_STAFF_ROLES, STAFF_ROLES } from '@repo/contracts';
import { z } from 'zod';

const name = z.string().trim().min(1).max(100);
const title = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  })
  .refine((value) => value === null || value.length <= 150, {
    message: 'Must be at most 150 characters',
  });

export const listStaffQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().trim().max(200).optional(),
    role: z.enum(STAFF_ROLES).optional(),
    status: z.enum(['ACTIVE', 'DISABLED']).optional(),
  })
  .strict();

export const createStaffBodySchema = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((value) => value.toLowerCase()),
    firstName: name,
    lastName: name,
    role: z.enum(ASSIGNABLE_STAFF_ROLES),
    professionalTitle: title.optional(),
  })
  .strict();

export const updateStaffBodySchema = z
  .object({
    firstName: name.optional(),
    lastName: name.optional(),
    professionalTitle: title.optional(),
    version: z.number().int().positive(),
  })
  .strict()
  .refine(
    (body) =>
      body.firstName !== undefined ||
      body.lastName !== undefined ||
      body.professionalTitle !== undefined,
    { message: 'At least one editable field is required.' },
  );

export const changeStaffRoleBodySchema = z
  .object({
    role: z.enum(ASSIGNABLE_STAFF_ROLES),
    version: z.number().int().positive(),
  })
  .strict();

export const staffVersionBodySchema = z.object({ version: z.number().int().positive() }).strict();

export type ListStaffQuery = z.infer<typeof listStaffQuerySchema>;
export type CreateStaffBody = z.infer<typeof createStaffBodySchema>;
export type UpdateStaffBody = z.infer<typeof updateStaffBodySchema>;
export type ChangeStaffRoleBody = z.infer<typeof changeStaffRoleBodySchema>;
export type StaffVersionBody = z.infer<typeof staffVersionBodySchema>;
