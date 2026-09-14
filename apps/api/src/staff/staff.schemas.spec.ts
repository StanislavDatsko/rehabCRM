import { describe, expect, it } from 'vitest';
import { createStaffBodySchema } from './staff.schemas';

describe('staff schemas', () => {
  const valid = {
    email: 'Admin@Example.com',
    firstName: 'Олена',
    lastName: 'Коваль',
    role: 'ORGANIZATION_ADMIN',
  };

  it('normalizes email and accepts assignable organization roles', () => {
    expect(createStaffBodySchema.parse(valid).email).toBe('admin@example.com');
  });

  it('rejects SYSTEM_ADMIN assignment through organization administration', () => {
    expect(createStaffBodySchema.safeParse({ ...valid, role: 'SYSTEM_ADMIN' }).success).toBe(false);
  });

  it('rejects password material in the CRM request', () => {
    expect(createStaffBodySchema.safeParse({ ...valid, password: 'NotAllowed123!' }).success).toBe(
      false,
    );
  });
});
