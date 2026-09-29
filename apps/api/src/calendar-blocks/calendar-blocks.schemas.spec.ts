import { describe, expect, it } from 'vitest';
import { createBlockSchema, updateBlockSchema } from './calendar-blocks.schemas';
const base = { practitionerId: '00000000-0000-0000-0000-000000000001', type: 'BREAK' as const, startsAt: '2026-09-29T10:00:00.000Z', endsAt: '2026-09-29T11:00:00.000Z', title: null, note: null };
describe('calendar block schemas', () => {
  it('accepts valid break', () => expect(createBlockSchema.safeParse(base).success).toBe(true));
  it('rejects reversed range', () => expect(createBlockSchema.safeParse({ ...base, endsAt: base.startsAt }).success).toBe(false));
  it('accepts adjacent ranges independently', () => expect(createBlockSchema.safeParse({ ...base, startsAt: base.endsAt, endsAt: '2026-09-29T12:00:00.000Z' }).success).toBe(true));
  it.each(['BREAK', 'UNAVAILABLE', 'DAY_OFF'] as const)('accepts %s', (type) => expect(createBlockSchema.safeParse({ ...base, type }).success).toBe(true));
  it('rejects missing practitioner identity', () => expect(createBlockSchema.safeParse({ ...base, practitionerId: 'not-an-id' }).success).toBe(false));
  it('rejects overlong note', () => expect(createBlockSchema.safeParse({ ...base, note: 'x'.repeat(1001) }).success).toBe(false));
  it('requires a positive version for updates', () => expect(updateBlockSchema.safeParse({ ...base, version: 0 }).success).toBe(false));
});
