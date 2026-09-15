import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { parseApiEnv } from '@repo/config/api-env';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { writeAuditEvent } from '../common/audit/write-audit';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { StorageService } from '../infrastructure/storage/storage.service';
import type { CompleteMediaBody, InitiateMediaBody, ListMediaQuery, VoidMediaBody } from './media.schemas';

const env = parseApiEnv();
const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'video/mp4', 'video/quicktime', 'video/webm']);
const safeName = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 255);

@Injectable()
export class PatientMediaService {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}

  private async patient(principal: AuthenticatedPrincipal, patientId: string) {
    const row = await this.prisma.patient.findFirst({ where: { id: patientId, organizationId: principal.organizationId }, select: { id: true } });
    if (!row) throw new NotFoundException({ code: 'PATIENT_MEDIA_NOT_FOUND', message: 'Patient was not found.' });
    return row;
  }

  async list(principal: AuthenticatedPrincipal, patientId: string, query: ListMediaQuery) {
    await this.patient(principal, patientId);
    const where = { organizationId: principal.organizationId, patientId, status: query.status, ...(query.kind ? { kind: query.kind } : {}) };
    const [items, total] = await Promise.all([this.prisma.patientMedia.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize, select: { id: true, patientId: true, kind: true, status: true, originalFileName: true, mimeType: true, sizeBytes: true, title: true, description: true, capturedAt: true, createdAt: true, uploadedBy: { select: { displayName: true } }, encounterId: true, assessmentId: true, rehabilitationPlanId: true, version: true } }), this.prisma.patientMedia.count({ where })]);
    return { items: items.map((item) => ({ ...item, sizeBytes: item.sizeBytes.toString(), uploadedBy: item.uploadedBy.displayName })), page: query.page, pageSize: query.pageSize, total, hasNextPage: query.page * query.pageSize < total };
  }

  async initiate(principal: AuthenticatedPrincipal, patientId: string, body: InitiateMediaBody, requestId: string) {
    await this.patient(principal, patientId);
    if (body.encounterId && !(await this.prisma.encounter.findFirst({ where: { id: body.encounterId, patientId, organizationId: principal.organizationId }, select: { id: true } }))) throw new NotFoundException({ code: 'PATIENT_MEDIA_CONTEXT_NOT_FOUND', message: 'Encounter was not found.' });
    if (body.assessmentId && !(await this.prisma.assessment.findFirst({ where: { id: body.assessmentId, patientId, organizationId: principal.organizationId }, select: { id: true } }))) throw new NotFoundException({ code: 'PATIENT_MEDIA_CONTEXT_NOT_FOUND', message: 'Assessment was not found.' });
    if (body.rehabilitationPlanId && !(await this.prisma.rehabilitationPlan.findFirst({ where: { id: body.rehabilitationPlanId, patientId, organizationId: principal.organizationId }, select: { id: true } }))) throw new NotFoundException({ code: 'PATIENT_MEDIA_CONTEXT_NOT_FOUND', message: 'Rehabilitation plan was not found.' });
    if (!allowed.has(body.mimeType)) throw new ConflictException({ code: 'PATIENT_MEDIA_MIME_UNSUPPORTED', message: 'Unsupported media type.' });
    const max = body.kind === 'IMAGE' ? env.PATIENT_MEDIA_MAX_IMAGE_BYTES : env.PATIENT_MEDIA_MAX_VIDEO_BYTES;
    if (body.sizeBytes > max) throw new ConflictException({ code: 'PATIENT_MEDIA_SIZE_EXCEEDED', message: 'Media file exceeds the configured limit.' });
    const id = randomUUID(); const objectKey = `organizations/${principal.organizationId}/patients/${patientId}/media/${id}/original`;
    const row = await this.prisma.patientMedia.create({ data: { id, organizationId: principal.organizationId, patientId, kind: body.kind, mimeType: body.mimeType, sizeBytes: BigInt(body.sizeBytes), originalFileName: safeName(body.originalFileName), objectKey, bucket: env.S3_BUCKET_DOCUMENTS, title: body.title, description: body.description, capturedAt: body.capturedAt ? new Date(body.capturedAt) : undefined, encounterId: body.encounterId, assessmentId: body.assessmentId, rehabilitationPlanId: body.rehabilitationPlanId, uploadedByUserId: principal.userId }, select: { id: true, status: true, objectKey: true, mimeType: true, sizeBytes: true } });
    await writeAuditEvent(this.prisma, { organizationId: principal.organizationId, actorUserId: principal.userId, action: 'PATIENT_MEDIA_UPLOAD_INITIATED', entityType: 'PatientMedia', entityId: row.id, requestId, metadata: { patientId, kind: body.kind, sizeBytes: body.sizeBytes } });
    const signed = await this.storage.signPrivateUpload(row.objectKey, row.mimeType, env.PATIENT_MEDIA_UPLOAD_URL_TTL_SECONDS);
    return { mediaId: row.id, status: row.status, uploadUrl: signed.url, uploadUrlExpiresAt: signed.expiresAt.toISOString(), requiredHeaders: { 'Content-Type': row.mimeType } };
  }

  async complete(principal: AuthenticatedPrincipal, patientId: string, mediaId: string, body: CompleteMediaBody, requestId: string) {
    const row = await this.prisma.patientMedia.findFirst({ where: { id: mediaId, patientId, organizationId: principal.organizationId, uploadedByUserId: principal.userId, status: 'PENDING_UPLOAD' } });
    if (!row) throw new NotFoundException({ code: 'PATIENT_MEDIA_NOT_FOUND', message: 'Media upload was not found.' });
    const head = await this.storage.headPrivateObject(row.objectKey);
    if (head.contentLength !== Number(row.sizeBytes) || head.contentType !== row.mimeType) throw new ConflictException({ code: 'PATIENT_MEDIA_OBJECT_MISMATCH', message: 'Uploaded object metadata does not match the upload intent.' });
    const updated = await this.prisma.patientMedia.update({ where: { id: row.id }, data: { status: 'READY', checksumSha256: body.checksumSha256 }, select: { id: true, status: true, version: true } });
    await writeAuditEvent(this.prisma, { organizationId: principal.organizationId, actorUserId: principal.userId, action: 'PATIENT_MEDIA_READY', entityType: 'PatientMedia', entityId: row.id, requestId, metadata: { patientId, kind: row.kind, sizeBytes: row.sizeBytes.toString() } });
    return updated;
  }

  async access(principal: AuthenticatedPrincipal, patientId: string, mediaId: string) {
    const row = await this.prisma.patientMedia.findFirst({ where: { id: mediaId, patientId, organizationId: principal.organizationId, status: 'READY' }, select: { objectKey: true, mimeType: true, originalFileName: true } });
    if (!row) throw new NotFoundException({ code: 'PATIENT_MEDIA_NOT_FOUND', message: 'Media was not found.' });
    const signed = await this.storage.signPrivateMediaRead(row.objectKey, row.mimeType);
    return { url: signed.url, expiresAt: signed.expiresAt.toISOString(), mimeType: row.mimeType };
  }

  async void(principal: AuthenticatedPrincipal, mediaId: string, body: VoidMediaBody, requestId: string) {
    const row = await this.prisma.patientMedia.findFirst({ where: { id: mediaId, organizationId: principal.organizationId, status: { in: ['READY', 'PENDING_UPLOAD'] } } });
    if (!row) throw new NotFoundException({ code: 'PATIENT_MEDIA_NOT_FOUND', message: 'Media was not found.' });
    if (row.version !== body.version) throw new ConflictException({ code: 'PATIENT_MEDIA_UPDATE_CONFLICT', message: 'Media was changed by another request.' });
    const updated = await this.prisma.patientMedia.update({ where: { id: row.id }, data: { status: 'VOIDED', voidedAt: new Date(), voidedByUserId: principal.userId, voidReason: body.reason, version: { increment: 1 } }, select: { id: true, status: true, version: true } });
    await writeAuditEvent(this.prisma, { organizationId: principal.organizationId, actorUserId: principal.userId, action: 'PATIENT_MEDIA_VOIDED', entityType: 'PatientMedia', entityId: row.id, requestId, metadata: { patientId: row.patientId } });
    return updated;
  }
}
