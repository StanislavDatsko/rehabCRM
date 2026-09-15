import { describe, expect, it, vi } from 'vitest';
import { NotificationsService } from './notifications.service';

const principal = { userId: 'user-a', organizationId: 'org-a' } as never;
function db() { return { notification: { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(2), update: vi.fn().mockResolvedValue({ id: 'n', status: 'READ' }) }, clinicalAlert: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn(), create: vi.fn().mockResolvedValue({ id: 'a' }), update: vi.fn().mockResolvedValue({ id: 'a', status: 'RESOLVED', version: 2 }) }, auditEvent: { create: vi.fn().mockResolvedValue({}) } }; }
type EvaluatorDb = ReturnType<typeof db> & {
  patient: { findFirst: ReturnType<typeof vi.fn> };
  dailyReport: { findMany: ReturnType<typeof vi.fn> };
  exerciseCompletion: { findMany: ReturnType<typeof vi.fn> };
};
describe('notification recipient isolation', () => {
  it('lists only the authenticated recipient in the organization', async () => { const p = db(); await new NotificationsService(p as never).list(principal); expect(p.notification.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: 'org-a', recipientUserId: 'user-a' } })); });
  it('rejects marking another recipient notification read', async () => { const p = db(); p.notification.findFirst.mockResolvedValue(null); await expect(new NotificationsService(p as never).markRead(principal, 'foreign')).rejects.toMatchObject({ status: 404 }); expect(p.notification.update).not.toHaveBeenCalled(); });
  it('audits notification state changes without message content', async () => { const p = db(); p.notification.findFirst.mockResolvedValue({ id: 'n' }); await new NotificationsService(p as never).markRead(principal, 'n'); expect(p.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'NOTIFICATION_READ', metadata: { channel: 'IN_APP' } }) })); });
  it('rejects alert access when the clinician is not responsible for the patient', async () => { const p = db(); p.clinicalAlert.findFirst.mockResolvedValue(null); await expect(new NotificationsService(p as never).alert(principal, 'foreign')).rejects.toMatchObject({ status: 404 }); });

  it('creates both deterministic attention alerts at the three-day absence thresholds', async () => {
    const p = db() as EvaluatorDb;
    p.patient = { findFirst: vi.fn().mockResolvedValue({ id: 'patient-a', rehabilitationPlans: [{ id: 'plan-a' }] }) };
    p.dailyReport = { findMany: vi.fn().mockResolvedValue([]) };
    p.exerciseCompletion = { findMany: vi.fn().mockResolvedValue([]) };
    p.clinicalAlert.findFirst.mockResolvedValue(null);
    p.clinicalAlert.create.mockResolvedValue({ id: 'created-alert' });
    const result = await new NotificationsService(p as never).evaluatePatient({ ...principal, userId: 'clinician-a' }, 'patient-a');
    expect(result.missingReportDays).toBe(3);
    expect(result.daysWithoutExercise).toBe(3);
    expect(p.clinicalAlert.create).toHaveBeenCalledTimes(2);
  });

  it('does not duplicate an existing open or acknowledged absence alert', async () => {
    const p = db() as EvaluatorDb;
    p.patient = { findFirst: vi.fn().mockResolvedValue({ id: 'patient-a', rehabilitationPlans: [{ id: 'plan-a' }] }) };
    p.dailyReport = { findMany: vi.fn().mockResolvedValue([]) };
    p.exerciseCompletion = { findMany: vi.fn().mockResolvedValue([]) };
    p.clinicalAlert.findFirst.mockResolvedValue({ id: 'existing-alert' });
    const result = await new NotificationsService(p as never).evaluatePatient({ ...principal, userId: 'clinician-a' }, 'patient-a');
    expect(result.createdAlertIds).toEqual([]);
    expect(p.clinicalAlert.create).not.toHaveBeenCalled();
  });
});
