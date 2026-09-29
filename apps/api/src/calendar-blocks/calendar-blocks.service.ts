import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CalendarBlockListResponse, CalendarBlockResponse } from '@repo/contracts';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { writeAuditEvent } from '../common/audit/write-audit';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import type { BlockQuery, CreateBlock, UpdateBlock } from './calendar-blocks.schemas';
import { acquireSchedulingLock } from '../appointments/scheduling-lock';

@Injectable()
export class CalendarBlocksService {
  constructor(private readonly prisma: PrismaService) {}
  async list(p: AuthenticatedPrincipal, q: BlockQuery): Promise<CalendarBlockListResponse> {
    const items = await this.prisma.calendarBlock.findMany({ where: { organizationId: p.organizationId, practitionerId: q.practitionerId, startsAt: { lt: new Date(q.to) }, endsAt: { gt: new Date(q.from) } }, orderBy: { startsAt: 'asc' } });
    return { from: q.from, to: q.to, items: items.map(this.map) };
  }
  async create(p: AuthenticatedPrincipal, b: CreateBlock, requestId: string): Promise<CalendarBlockResponse> {
    await this.assertPractitioner(p.organizationId, b.practitionerId);
    const startsAt = new Date(b.startsAt); const endsAt = new Date(b.endsAt);
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        await acquireSchedulingLock(tx, p.organizationId, b.practitionerId);
        const appointment = await tx.appointment.findFirst({ where: { organizationId: p.organizationId, practitionerId: b.practitionerId, status: { in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'] }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } }, select: { id: true } });
        if (appointment) throw new ConflictException({ code: 'CALENDAR_BLOCK_APPOINTMENT_CONFLICT', message: 'У вибраному проміжку вже є записи. Спочатку перенесіть або скасуйте їх.' });
        const block = await tx.calendarBlock.create({ data: { organizationId: p.organizationId, practitionerId: b.practitionerId, type: b.type, startsAt, endsAt, title: b.title ?? null, note: b.note ?? null, createdByUserId: p.userId, updatedByUserId: p.userId } });
        await writeAuditEvent(tx, { organizationId: p.organizationId, actorUserId: p.userId, action: 'CALENDAR_BLOCK_CREATED', entityType: 'CalendarBlock', entityId: block.id, requestId, metadata: { practitionerId: b.practitionerId, type: b.type, startsAt: b.startsAt, endsAt: b.endsAt } });
        return block;
      }); return this.map(row);
    } catch (e) { if (this.isConflict(e)) throw new ConflictException({ code: 'CALENDAR_BLOCK_CONFLICT', message: 'Цей час вже позначений як недоступний для фізичного терапевта.' }); throw e; }
  }
  async update(p: AuthenticatedPrincipal, id: string, b: UpdateBlock, requestId: string): Promise<CalendarBlockResponse> {
    await this.assertPractitioner(p.organizationId, b.practitionerId); const existing = await this.prisma.calendarBlock.findFirst({ where: { id, organizationId: p.organizationId } }); if (!existing) throw new NotFoundException('Calendar block was not found.');
    try { const row = await this.prisma.$transaction(async (tx) => { await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${p.organizationId + ':' + b.practitionerId}, 0))`; const updated = await tx.calendarBlock.updateMany({ where: { id, organizationId: p.organizationId, version: b.version }, data: { practitionerId: b.practitionerId, type: b.type, startsAt: new Date(b.startsAt), endsAt: new Date(b.endsAt), title: b.title ?? null, note: b.note ?? null, updatedByUserId: p.userId, version: { increment: 1 } } }); if (updated.count !== 1) throw new ConflictException({ code: 'CALENDAR_BLOCK_UPDATE_CONFLICT', message: 'Calendar block was modified by another user.' }); const result = await tx.calendarBlock.findUniqueOrThrow({ where: { id } }); await writeAuditEvent(tx, { organizationId: p.organizationId, actorUserId: p.userId, action: 'CALENDAR_BLOCK_UPDATED', entityType: 'CalendarBlock', entityId: id, requestId, metadata: { changedFields: ['practitionerId', 'type', 'startsAt', 'endsAt', 'title', 'note'] } }); return result; }); return this.map(row); } catch (e) { if (this.isConflict(e)) throw new ConflictException({ code: 'CALENDAR_BLOCK_CONFLICT', message: 'Цей час вже позначений як недоступний для фізичного терапевта.' }); throw e; }
  }
  async remove(p: AuthenticatedPrincipal, id: string, requestId: string): Promise<void> { await this.prisma.$transaction(async (tx) => { const row = await tx.calendarBlock.findFirst({ where: { id, organizationId: p.organizationId } }); if (!row) throw new NotFoundException('Calendar block was not found.'); await tx.calendarBlock.delete({ where: { id } }); await writeAuditEvent(tx, { organizationId: p.organizationId, actorUserId: p.userId, action: 'CALENDAR_BLOCK_DELETED', entityType: 'CalendarBlock', entityId: id, requestId, metadata: { practitionerId: row.practitionerId, type: row.type } }); }); }
  private async assertPractitioner(organizationId: string, id: string) { const row = await this.prisma.practitioner.findFirst({ where: { id, organizationId, status: 'ACTIVE' }, select: { id: true } }); if (!row) throw new NotFoundException('Practitioner was not found.'); }
  private isConflict(e: unknown) { return typeof e === 'object' && e !== null && ('code' in e && (e as { code?: string }).code === '23P01'); }
  private map(row: { id: string; practitionerId: string; type: 'BREAK' | 'UNAVAILABLE' | 'DAY_OFF'; startsAt: Date; endsAt: Date; title: string | null; note: string | null; version: number }): CalendarBlockResponse { return { id: row.id, practitionerId: row.practitionerId, type: row.type, startsAt: row.startsAt.toISOString(), endsAt: row.endsAt.toISOString(), title: row.title, note: row.note, version: row.version }; }
}
