import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { lowExerciseAttention, missedReportAttention } from './alert-rules';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private async notification(principal: AuthenticatedPrincipal, id: string) {
    const row = await this.prisma.notification.findFirst({ where: { id, organizationId: principal.organizationId, recipientUserId: principal.userId } });
    if (!row) throw new NotFoundException('Notification was not found.');
    return row;
  }

  async list(principal: AuthenticatedPrincipal) {
    return this.prisma.notification.findMany({ where: { organizationId: principal.organizationId, recipientUserId: principal.userId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 50, select: { id: true, type: true, category: true, title: true, message: true, status: true, relatedPatientId: true, createdAt: true, readAt: true, dismissedAt: true } });
  }
  async unreadCount(principal: AuthenticatedPrincipal) { return { count: await this.prisma.notification.count({ where: { organizationId: principal.organizationId, recipientUserId: principal.userId, status: 'UNREAD' } }) }; }
  async markRead(principal: AuthenticatedPrincipal, id: string) { await this.notification(principal, id); const result = await this.prisma.notification.update({ where: { id }, data: { status: 'READ', readAt: new Date() }, select: { id: true, status: true, readAt: true } }); await this.audit(principal, id, 'NOTIFICATION_READ'); return result; }
  async dismiss(principal: AuthenticatedPrincipal, id: string) { await this.notification(principal, id); const result = await this.prisma.notification.update({ where: { id }, data: { status: 'DISMISSED', dismissedAt: new Date() }, select: { id: true, status: true, dismissedAt: true } }); await this.audit(principal, id, 'NOTIFICATION_DISMISSED'); return result; }

  async alerts(principal: AuthenticatedPrincipal) { return this.prisma.clinicalAlert.findMany({ where: { organizationId: principal.organizationId, patient: { responsiblePractitioner: { userId: principal.userId } } }, orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, patientId: true, type: true, severity: true, status: true, title: true, summary: true, sourceDailyReportId: true, sourceExerciseCompletionId: true, version: true, createdAt: true, acknowledgedAt: true, resolvedAt: true } }); }
  async alert(principal: AuthenticatedPrincipal, id: string) { const row = await this.prisma.clinicalAlert.findFirst({ where: { id, organizationId: principal.organizationId, patient: { responsiblePractitioner: { userId: principal.userId } } } }); if (!row) throw new NotFoundException('Clinical alert was not found.'); return row; }
  async transitionAlert(principal: AuthenticatedPrincipal, id: string, action: 'ACKNOWLEDGED' | 'RESOLVED', version: number) { const row = await this.alert(principal, id); if (row.version !== version) throw new ConflictException({ code: 'CLINICAL_ALERT_UPDATE_CONFLICT', message: 'Alert was changed. Refresh and try again.' }); const result = await this.prisma.clinicalAlert.update({ where: { id }, data: action === 'ACKNOWLEDGED' ? { status: action, acknowledgedAt: new Date(), version: { increment: 1 } } : { status: action, resolvedAt: new Date(), resolvedByUserId: principal.userId, version: { increment: 1 } }, select: { id: true, status: true, version: true, acknowledgedAt: true, resolvedAt: true } }); await this.audit(principal, id, action === 'ACKNOWLEDGED' ? 'CLINICAL_ALERT_ACKNOWLEDGED' : 'CLINICAL_ALERT_RESOLVED'); return result; }
  async evaluatePatient(principal: AuthenticatedPrincipal, patientId: string) {
    const patient = await this.prisma.patient.findFirst({ where: { id: patientId, organizationId: principal.organizationId, responsiblePractitioner: { userId: principal.userId } }, select: { id: true, rehabilitationPlans: { where: { status: 'ACTIVE' }, select: { id: true }, take: 1 } } });
    if (!patient || !patient.rehabilitationPlans.length) throw new NotFoundException('Patient monitoring was not found.');
    const from = new Date(Date.now() - 3 * 86_400_000);
    const [reports, completions] = await Promise.all([
      this.prisma.dailyReport.findMany({ where: { organizationId: principal.organizationId, patientId, reportDate: { gte: from } }, select: { reportDate: true } }),
      this.prisma.exerciseCompletion.findMany({ where: { organizationId: principal.organizationId, patientId, executionDate: { gte: from }, status: 'COMPLETED' }, select: { executionDate: true } }),
    ]);
    const missing = 3 - new Set(reports.map((r) => r.reportDate.toISOString().slice(0, 10))).size;
    const daysWithoutExercise = 3 - new Set(completions.map((r) => r.executionDate.toISOString().slice(0, 10))).size;
    const created: string[] = [];
    if (missedReportAttention(missing)) { const existing = await this.prisma.clinicalAlert.findFirst({ where: { organizationId: principal.organizationId, patientId, type: 'MISSED_DAILY_REPORT', status: { in: ['OPEN', 'ACKNOWLEDGED'] } }, select: { id: true } }); if (!existing) { const row = await this.prisma.clinicalAlert.create({ data: { id: randomUUID(), organizationId: principal.organizationId, patientId, type: 'MISSED_DAILY_REPORT', severity: 'ATTENTION', title: 'Відсутній щоденний звіт', summary: 'За визначений період відсутні очікувані щоденні звіти пацієнта.', createdByUserId: principal.userId } }); created.push(row.id); } }
    if (lowExerciseAttention(daysWithoutExercise)) { const existing = await this.prisma.clinicalAlert.findFirst({ where: { organizationId: principal.organizationId, patientId, type: 'LOW_EXERCISE_ADHERENCE', status: { in: ['OPEN', 'ACKNOWLEDGED'] } }, select: { id: true } }); if (!existing) { const row = await this.prisma.clinicalAlert.create({ data: { id: randomUUID(), organizationId: principal.organizationId, patientId, type: 'LOW_EXERCISE_ADHERENCE', severity: 'ATTENTION', title: 'Знижене виконання вправ', summary: 'За визначений період не зафіксовано виконання призначених вправ.', createdByUserId: principal.userId } }); created.push(row.id); } }
    return { patientId, createdAlertIds: created, missingReportDays: missing, daysWithoutExercise };
  }

  async createClinicianReportNotification(principal: AuthenticatedPrincipal, patientId: string, reportId: string, recipientUserId: string) { return this.prisma.notification.create({ data: { id: randomUUID(), organizationId: principal.organizationId, recipientUserId, type: 'NEW_PATIENT_REPORT', category: 'CLINICAL', title: 'Новий звіт пацієнта', message: 'Новий звіт пацієнта потребує перегляду.', relatedPatientId: patientId, relatedDailyReportId: reportId }, select: { id: true, type: true, status: true } }); }
  private async audit(principal: AuthenticatedPrincipal, entityId: string, action: string) { const delegate = (this.prisma as unknown as { auditEvent?: { create: (args: unknown) => Promise<unknown> } }).auditEvent; if (delegate) await delegate.create({ data: { id: randomUUID(), organizationId: principal.organizationId, actorUserId: principal.userId, action, entityType: action.startsWith('NOTIFICATION') ? 'Notification' : 'ClinicalAlert', entityId, requestId: 'notifications', metadata: { channel: 'IN_APP' } } }); }
}
