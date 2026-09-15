import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { MonitoringService } from './monitoring.service';

const patient: AuthenticatedPrincipal = { subject: 'sub', userId: 'user-a', organizationId: 'org-a', membershipId: 'membership-a', role: 'PATIENT', permissions: [], email: 'a@example.invalid', displayName: 'A', organizationName: 'A', patientId: 'patient-a', portalAccountId: 'portal-a' };
const account = { patientId: 'patient-a', organizationId: 'org-a', organization: { timezone: 'Europe/Kyiv' } };
function prisma() { return { patientPortalAccount: { findFirst: vi.fn().mockResolvedValue(account) }, patient: { findFirst: vi.fn().mockResolvedValue({ id: 'patient-a', responsiblePractitioner: { userId: 'clinician-a' } }) }, notification: { create: vi.fn().mockResolvedValue({}) }, clinicalAlert: { create: vi.fn().mockResolvedValue({}) }, dailyReport: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(null), create: vi.fn(), findFirst: vi.fn(), update: vi.fn() }, exercisePrescription: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn() }, exerciseCompletion: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn(), findFirst: vi.fn(), update: vi.fn() }, auditEvent: { create: vi.fn().mockResolvedValue({}) } }; }

describe('patient monitoring ownership and validation', () => {
  it('rejects non-patient principals before querying monitoring data', async () => {
    const db = prisma();
    await expect(new MonitoringService(db as never).listReports({ ...patient, role: 'REHABILITATION_SPECIALIST' })).rejects.toMatchObject({ status: 404 });
    expect(db.dailyReport.findMany).not.toHaveBeenCalled();
  });

  it('rejects arbitrary patient ownership and retains patient provenance', async () => {
    const db = prisma();
    db.dailyReport.create.mockResolvedValue({ id: 'report', reportDate: new Date('2026-09-15'), overallWellbeing: 8, fatigueLevel: 3, painScore: 2, comment: null, source: 'PATIENT_REPORTED', version: 1 });
    const result = await new MonitoringService(db as never).createReport(patient, { overallWellbeing: 8, fatigueLevel: 3, painScore: 2 });
    expect(result.source).toBe('PATIENT_REPORTED');
    expect(db.dailyReport.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ patientId: 'patient-a', organizationId: 'org-a', painScore: 2 }) }));
    expect(JSON.stringify(result)).not.toContain('patientId');
  });

  it('does not accept out-of-window report dates', async () => {
    const db = prisma();
    await expect(new MonitoringService(db as never).createReport(patient, { reportDate: '2020-01-01', overallWellbeing: 5, fatigueLevel: 5, painScore: 5 })).rejects.toMatchObject({ response: expect.objectContaining({ code: 'MONITORING_DATE_OUT_OF_RANGE' }) });
    expect(db.dailyReport.create).not.toHaveBeenCalled();
  });

  it('rejects a prescription belonging to another patient or organization', async () => {
    const db = prisma();
    db.exercisePrescription.findFirst.mockResolvedValue(null);
    await expect(new MonitoringService(db as never).createCompletion(patient, { exercisePrescriptionId: '00000000-0000-4000-8000-000000000001', status: 'COMPLETED' })).rejects.toMatchObject({ status: 404 });
    expect(db.exerciseCompletion.create).not.toHaveBeenCalled();
  });

  it('uses optimistic concurrency for report updates', async () => {
    const db = prisma();
    db.dailyReport.findFirst.mockResolvedValue({ id: 'report', version: 2, reportDate: new Date('2026-09-15') });
    await expect(new MonitoringService(db as never).updateReport(patient, 'report', { version: 1, overallWellbeing: 5, fatigueLevel: 5, painScore: 5 })).rejects.toMatchObject({ response: expect.objectContaining({ code: 'DAILY_REPORT_UPDATE_CONFLICT' }) });
    expect(db.dailyReport.update).not.toHaveBeenCalled();
  });

  it('cannot update a report owned by another patient', async () => {
    const db = prisma();
    db.dailyReport.findFirst.mockResolvedValue(null);
    await expect(new MonitoringService(db as never).updateReport(patient, 'foreign-report', { version: 1, overallWellbeing: 5, fatigueLevel: 5, painScore: 5 })).rejects.toMatchObject({ status: 404 });
    expect(db.dailyReport.update).not.toHaveBeenCalled();
  });

  it('generates a neutral deterministic attention alert at the configured pain threshold', async () => {
    const db = prisma();
    db.dailyReport.create.mockResolvedValue({ id: 'qualifying-report', reportDate: new Date(), overallWellbeing: 5, fatigueLevel: 5, painScore: 8, comment: null, source: 'PATIENT_REPORTED', version: 1 });
    await new MonitoringService(db as never).createReport(patient, { overallWellbeing: 5, fatigueLevel: 5, painScore: 8 });
    expect(db.clinicalAlert.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: 'SYMPTOM_CHANGE', severity: 'ATTENTION', sourceDailyReportId: 'qualifying-report' }) }));
    expect(db.clinicalAlert.create.mock.calls[0][0].data.summary).not.toMatch(/діагноз|небезпек|невідклад/i);
  });

  it('does not generate a clinical alert below the configured threshold', async () => {
    const db = prisma();
    db.dailyReport.create.mockResolvedValue({ id: 'ordinary-report', reportDate: new Date(), overallWellbeing: 8, fatigueLevel: 2, painScore: 6, comment: null, source: 'PATIENT_REPORTED', version: 1 });
    await new MonitoringService(db as never).createReport(patient, { overallWellbeing: 8, fatigueLevel: 2, painScore: 6 });
    expect(db.clinicalAlert.create).not.toHaveBeenCalled();
  });

  it('generates an alert when pain rises by three points from the prior report', async () => {
    const db = prisma();
    db.dailyReport.create.mockResolvedValue({ id: 'change-report', reportDate: new Date('2026-09-15'), overallWellbeing: 8, fatigueLevel: 2, painScore: 5, comment: null, source: 'PATIENT_REPORTED', version: 1 });
    db.dailyReport.findFirst.mockResolvedValue({ painScore: 2 });
    await new MonitoringService(db as never).createReport(patient, { overallWellbeing: 8, fatigueLevel: 2, painScore: 5 });
    expect(db.clinicalAlert.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ sourceDailyReportId: 'change-report', type: 'SYMPTOM_CHANGE' }) }));
  });

  it('projects permitted symptoms with retained patient provenance', async () => {
    const db = prisma();
    db.dailyReport.findMany.mockResolvedValue([{ id: 'r', reportDate: new Date('2026-09-15'), overallWellbeing: 8, fatigueLevel: 3, painScore: 2, comment: null, source: 'PATIENT_REPORTED' }]);
    await expect(new MonitoringService(db as never).symptoms(patient, { days: 30 })).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'pain.nrs', value: 2, source: 'PATIENT_REPORTED' }),
      expect.objectContaining({ type: 'fatigue', value: 3, source: 'PATIENT_REPORTED' }),
    ]));
  });

  it('conceals staff monitoring across organizations', async () => {
    const db = prisma();
    db.patient.findFirst.mockResolvedValue(null);
    await expect(new MonitoringService(db as never).staffMonitoring({ ...patient, role: 'REHABILITATION_SPECIALIST' }, 'foreign-patient', { days: 30 })).rejects.toMatchObject({ status: 404 });
    expect(db.dailyReport.findMany).not.toHaveBeenCalled();
    expect(db.exerciseCompletion.findMany).not.toHaveBeenCalled();
  });
});
