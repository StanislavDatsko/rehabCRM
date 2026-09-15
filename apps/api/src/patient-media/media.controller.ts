import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Post, Query, Patch } from '@nestjs/common';
import { PERMISSIONS } from '@repo/contracts';
import { CurrentPrincipal } from '../common/auth/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { RequirePermissions } from '../common/auth/require-permissions.decorator';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import { completeMediaSchema, initiateMediaSchema, listMediaSchema, voidMediaSchema, type CompleteMediaBody, type InitiateMediaBody, type ListMediaQuery, type VoidMediaBody } from './media.schemas';
import { PatientMediaService } from './media.service';

@Controller('patients/:patientId/media')
@RequirePermissions(PERMISSIONS.PATIENT_MEDIA_READ)
export class PatientMediaController {
  constructor(private readonly media: PatientMediaService) {}
  @Get() list(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('patientId', ParseUUIDPipe) patientId: string, @Query(new ZodValidationPipe(listMediaSchema)) q: ListMediaQuery) { return this.media.list(p, patientId, q); }
  @Post('uploads') @RequirePermissions(PERMISSIONS.PATIENT_MEDIA_CREATE) initiate(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('patientId', ParseUUIDPipe) patientId: string, @Body(new ZodValidationPipe(initiateMediaSchema)) body: InitiateMediaBody, @Headers('x-request-id') requestId?: string) { return this.media.initiate(p, patientId, body, requestId ?? 'unknown'); }
  @Post(':mediaId/complete') @RequirePermissions(PERMISSIONS.PATIENT_MEDIA_CREATE) complete(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('patientId', ParseUUIDPipe) patientId: string, @Param('mediaId', ParseUUIDPipe) mediaId: string, @Body(new ZodValidationPipe(completeMediaSchema)) body: CompleteMediaBody, @Headers('x-request-id') requestId?: string) { return this.media.complete(p, patientId, mediaId, body, requestId ?? 'unknown'); }
  @Get(':mediaId/access') @RequirePermissions(PERMISSIONS.PATIENT_MEDIA_DOWNLOAD) access(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('patientId', ParseUUIDPipe) patientId: string, @Param('mediaId', ParseUUIDPipe) mediaId: string) { return this.media.access(p, patientId, mediaId); }
  @Patch(':mediaId/void') @RequirePermissions(PERMISSIONS.PATIENT_MEDIA_VOID) void(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('mediaId', ParseUUIDPipe) mediaId: string, @Body(new ZodValidationPipe(voidMediaSchema)) body: VoidMediaBody, @Headers('x-request-id') requestId?: string) { return this.media.void(p, mediaId, body, requestId ?? 'unknown'); }
}
