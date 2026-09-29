import { describe, expect, it, vi } from 'vitest';
import { CalendarBlocksService } from './calendar-blocks.service';
const principal = { organizationId: 'org-a', userId: 'user-a' } as never;
describe('CalendarBlocksService', () => {
  it('lists only overlapping blocks for the current organization', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const service = new CalendarBlocksService({ calendarBlock: { findMany } } as never);
    const result = await service.list(principal, { from: '2026-09-29T00:00:00.000Z', to: '2026-09-30T00:00:00.000Z' });
    expect(result.items).toEqual([]);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: 'org-a', startsAt: { lt: new Date('2026-09-30T00:00:00.000Z') }, endsAt: { gt: new Date('2026-09-29T00:00:00.000Z') } }) }));
  });
  it('maps a block response without exposing organization data', async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: 'b1', practitionerId: 'p1', type: 'BREAK', startsAt: new Date('2026-09-29T10:00:00Z'), endsAt: new Date('2026-09-29T11:00:00Z'), title: null, note: null, version: 1 }]);
    const result = await new CalendarBlocksService({ calendarBlock: { findMany } } as never).list(principal, { from: '2026-09-29T00:00:00.000Z', to: '2026-09-30T00:00:00.000Z' });
    expect(result.items[0]).toEqual(expect.objectContaining({ id: 'b1', type: 'BREAK' }));
    expect(result.items[0]).not.toHaveProperty('organizationId');
  });
  it('creates a block, audits it, and acquires the transaction lock', async () => {
    const block = { id: 'b1', practitionerId: 'p1', type: 'BREAK' as const, startsAt: new Date('2026-09-29T10:00:00Z'), endsAt: new Date('2026-09-29T11:00:00Z'), title: null, note: null, version: 1 };
    const tx = { $executeRaw: vi.fn().mockResolvedValue(1), appointment: { findFirst: vi.fn().mockResolvedValue(null) }, calendarBlock: { create: vi.fn().mockResolvedValue(block) }, auditEvent: { create: vi.fn().mockResolvedValue({}) } };
    const prisma = { practitioner: { findFirst: vi.fn().mockResolvedValue({ id: 'p1' }) }, $transaction: vi.fn(async (callback: (value: typeof tx) => unknown) => callback(tx)) };
    const result = await new CalendarBlocksService(prisma as never).create(principal, { practitionerId: 'p1', type: 'BREAK', startsAt: block.startsAt.toISOString(), endsAt: block.endsAt.toISOString(), title: null, note: null }, 'req-1');
    expect(result.id).toBe('b1'); expect(tx.$executeRaw).toHaveBeenCalledTimes(1); expect(tx.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'CALENDAR_BLOCK_CREATED' }) }));
  });
  it('rejects a block over an active appointment', async () => {
    const tx = { $executeRaw: vi.fn(), appointment: { findFirst: vi.fn().mockResolvedValue({ id: 'a1' }) }, calendarBlock: { create: vi.fn() }, auditEvent: { create: vi.fn() } };
    const prisma = { practitioner: { findFirst: vi.fn().mockResolvedValue({ id: 'p1' }) }, $transaction: vi.fn(async (callback: (value: typeof tx) => unknown) => callback(tx)) };
    await expect(new CalendarBlocksService(prisma as never).create(principal, { practitionerId: 'p1', type: 'BREAK', startsAt: '2026-09-29T10:00:00Z', endsAt: '2026-09-29T11:00:00Z', title: null, note: null }, 'req-1')).rejects.toMatchObject({ response: expect.objectContaining({ code: 'CALENDAR_BLOCK_APPOINTMENT_CONFLICT' }) });
  });
});
