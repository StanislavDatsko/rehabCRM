import { describe, expect, it, vi } from 'vitest';
import { PatientMediaService } from './media.service';

const principal = { userId: 'user-a', organizationId: 'org-a' } as never;
function deps() {
  return {
    prisma: {
      patient: { findFirst: vi.fn().mockResolvedValue({ id: 'patient-a' }) },
      patientMedia: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0), create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
      encounter: { findFirst: vi.fn().mockResolvedValue({ id: 'encounter-a' }) },
      assessment: { findFirst: vi.fn().mockResolvedValue({ id: 'assessment-a' }) },
      rehabilitationPlan: { findFirst: vi.fn().mockResolvedValue({ id: 'plan-a' }) },
      auditEvent: { create: vi.fn().mockResolvedValue({}) },
    },
    storage: { signPrivateUpload: vi.fn(), headPrivateObject: vi.fn(), signPrivateMediaRead: vi.fn() },
  };
}

describe('patient media authorization and safety', () => {
  it('lists only the requested patient and organization with bounded page size', async () => {
    const d = deps();
    await new PatientMediaService(d.prisma as never, d.storage as never).list(principal, 'patient-a', { page: 1, pageSize: 50, status: 'READY' });
    expect(d.prisma.patientMedia.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: 'org-a', patientId: 'patient-a', status: 'READY' }, take: 50 }));
  });

  it('rejects an upload over the configured image limit before creating metadata', async () => {
    const d = deps();
    await expect(new PatientMediaService(d.prisma as never, d.storage as never).initiate(principal, 'patient-a', { kind: 'IMAGE', mimeType: 'image/jpeg', sizeBytes: 50_000_001, originalFileName: 'photo.jpg' }, 'req')).rejects.toMatchObject({ status: 409 });
    expect(d.prisma.patientMedia.create).not.toHaveBeenCalled();
  });

  it('uses an opaque patient media object key and signs direct upload', async () => {
    const d = deps(); d.prisma.patientMedia.create.mockResolvedValue({ id: 'media-a', status: 'PENDING_UPLOAD', objectKey: 'organizations/org-a/patients/patient-a/media/media-a/original', mimeType: 'image/jpeg', sizeBytes: BigInt(10) }); d.storage.signPrivateUpload.mockResolvedValue({ url: 'https://minio/upload', expiresAt: new Date('2026-01-01T00:00:00Z') });
    const result = await new PatientMediaService(d.prisma as never, d.storage as never).initiate(principal, 'patient-a', { kind: 'IMAGE', mimeType: 'image/jpeg', sizeBytes: 10, originalFileName: '../photo.jpg' }, 'req');
    expect(result.uploadUrl).toBe('https://minio/upload'); expect(d.prisma.patientMedia.create.mock.calls[0][0].data.objectKey).toMatch(/^organizations\/org-a\/patients\/patient-a\/media\/[^/]+\/original$/); expect(d.prisma.patientMedia.create.mock.calls[0][0].data.originalFileName).toBe('.._photo.jpg');
  });
});
