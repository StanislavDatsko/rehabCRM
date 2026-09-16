import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { ClinicalReportsService } from './clinical-reports.service';

const principal: AuthenticatedPrincipal = {
  subject: 'sub',
  userId: 'user',
  organizationId: 'org',
  membershipId: 'membership',
  role: 'REHABILITATION_SPECIALIST',
  permissions: ['clinical_report.read'],
  email: 'specialist@example.invalid',
  displayName: 'Specialist',
  organizationName: 'Clinic',
};

function service(
  status: string,
  storageKey: string | null,
  head = { contentLength: 10, contentType: 'application/pdf' },
) {
  const prisma = {
    clinicalReport: {
      findFirst: vi
        .fn()
        .mockResolvedValue({
          id: 'report',
          patientId: 'patient',
          status,
          storageKey,
          generatedBy: { id: 'user', displayName: 'Specialist' },
        }),
    },
    $transaction: vi.fn().mockResolvedValue(undefined),
  };
  const storage = {
    headPrivateObject: vi.fn().mockResolvedValue(head),
    signDocumentRead: vi
      .fn()
      .mockResolvedValue({
        url: 'http://localhost:9000/signed.pdf',
        expiresAt: new Date('2026-09-15T12:00:00Z'),
      }),
  };
  const metrics = { recordStorageFailure: vi.fn() };
  return {
    instance: new ClinicalReportsService(
      prisma as never,
      {} as never,
      {} as never,
      storage as never,
      metrics as never,
    ),
    storage,
    metrics,
  };
}

describe('clinical report download', () => {
  it('returns a signed URL for a completed PDF object', async () => {
    const { instance, storage } = service('COMPLETED', 'reports/report.pdf');
    await expect(instance.download(principal, 'report', 'request')).resolves.toMatchObject({
      url: expect.stringContaining('signed.pdf'),
    });
    expect(storage.headPrivateObject).toHaveBeenCalledWith('reports/report.pdf');
    expect(storage.signDocumentRead).toHaveBeenCalled();
  });

  it('returns NOT_READY only when report is not completed or has no key', async () => {
    const { instance } = service('GENERATING', null);
    await expect(instance.download(principal, 'report', 'request')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'CLINICAL_REPORT_NOT_READY' }),
    });
  });

  it('returns STORAGE_ERROR when the stored object is missing or invalid', async () => {
    const { instance, metrics } = service('COMPLETED', 'reports/missing.pdf', {
      contentLength: 0,
      contentType: 'application/octet-stream',
    });
    await expect(instance.download(principal, 'report', 'request')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'STORAGE_ERROR' }),
    });
    expect(metrics.recordStorageFailure).toHaveBeenCalledOnce();
  });
});
