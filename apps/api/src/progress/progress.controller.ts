import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PERMISSIONS, type BodyAnnotationProgressResponse, type ClinicalReportDownloadResponse, type ClinicalReportListResponse, type ClinicalReportResponse, type ClinicalTimelineResponse, type GoalProgressResponse, type MeasurementTrendsResponse, type PlanHistoryItem, type ProgressSummaryResponse } from '@repo/contracts';
import { CurrentPrincipal } from '../common/auth/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { RequirePermissions } from '../common/auth/require-permissions.decorator';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import { ClinicalReportsService } from './clinical-reports.service';
import { ProgressService } from './progress.service';
import { createClinicalReportSchema, progressQuerySchema, timelineQuerySchema, voidClinicalReportSchema, type CreateClinicalReportBody, type ProgressQuery, type TimelineQuery, type VoidClinicalReportBody } from './progress.schemas';

@ApiTags('progress')
@ApiBearerAuth()
@Controller()
export class ProgressController {
  constructor(private readonly progress: ProgressService, private readonly reports: ClinicalReportsService) {}

  @Get('patients/:patientId/clinical-timeline')
  @RequirePermissions(PERMISSIONS.CLINICAL_TIMELINE_READ)
  timeline(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('patientId', ParseUUIDPipe) patientId: string, @Query(new ZodValidationPipe(timelineQuerySchema, 'CLINICAL_TIMELINE_INVALID_FILTER')) query: TimelineQuery): Promise<ClinicalTimelineResponse> { return this.progress.timeline(p, patientId, query); }

  @Get('patients/:patientId/progress/summary')
  @RequirePermissions(PERMISSIONS.PROGRESS_READ)
  summary(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('patientId', ParseUUIDPipe) patientId: string, @Query(new ZodValidationPipe(progressQuerySchema, 'PROGRESS_INVALID_DATE_RANGE')) query: ProgressQuery): Promise<ProgressSummaryResponse> { return this.progress.summary(p, patientId, query); }

  @Get('patients/:patientId/progress/measurements')
  @RequirePermissions(PERMISSIONS.PROGRESS_READ)
  measurements(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('patientId', ParseUUIDPipe) patientId: string, @Query(new ZodValidationPipe(progressQuerySchema, 'PROGRESS_INVALID_DATE_RANGE')) query: ProgressQuery): Promise<MeasurementTrendsResponse> { return this.progress.measurements(p, patientId, query); }

  @Get('patients/:patientId/progress/goals')
  @RequirePermissions(PERMISSIONS.PROGRESS_READ)
  goals(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('patientId', ParseUUIDPipe) patientId: string, @Query(new ZodValidationPipe(progressQuerySchema, 'PROGRESS_INVALID_DATE_RANGE')) query: ProgressQuery): Promise<GoalProgressResponse> { return this.progress.goals(p, patientId, query); }

  @Get('patients/:patientId/progress/plan-history')
  @RequirePermissions(PERMISSIONS.PROGRESS_READ)
  planHistory(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('patientId', ParseUUIDPipe) patientId: string, @Query(new ZodValidationPipe(progressQuerySchema, 'PROGRESS_INVALID_DATE_RANGE')) query: ProgressQuery): Promise<PlanHistoryItem[]> { return this.progress.planHistory(p, patientId, query); }

  @Get('patients/:patientId/progress/body-annotations')
  @RequirePermissions(PERMISSIONS.PROGRESS_READ)
  annotations(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('patientId', ParseUUIDPipe) patientId: string, @Query(new ZodValidationPipe(progressQuerySchema, 'PROGRESS_INVALID_DATE_RANGE')) query: ProgressQuery): Promise<BodyAnnotationProgressResponse> { return this.progress.bodyAnnotations(p, patientId, query); }

  @Get('patients/:patientId/reports')
  @RequirePermissions(PERMISSIONS.CLINICAL_REPORT_READ)
  listReports(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('patientId', ParseUUIDPipe) patientId: string): Promise<ClinicalReportListResponse> { return this.reports.list(p, patientId); }

  @Post('patients/:patientId/reports')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @RequirePermissions(PERMISSIONS.CLINICAL_REPORT_CREATE)
  @ApiOperation({ summary: 'Generate an immutable progress report PDF' })
  createReport(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('patientId', ParseUUIDPipe) patientId: string, @Body(new ZodValidationPipe(createClinicalReportSchema, 'CLINICAL_REPORT_INVALID_PERIOD')) body: CreateClinicalReportBody, @Headers('x-request-id') requestId?: string): Promise<ClinicalReportResponse> { return this.reports.create(p, patientId, body, requestId ?? 'unknown'); }

  @Get('clinical-reports/:id')
  @RequirePermissions(PERMISSIONS.CLINICAL_REPORT_READ)
  getReport(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseUUIDPipe) id: string): Promise<ClinicalReportResponse> { return this.reports.get(p, id); }

  @Post('clinical-reports/:id/download')
  @RequirePermissions(PERMISSIONS.CLINICAL_REPORT_READ)
  downloadReport(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseUUIDPipe) id: string, @Headers('x-request-id') requestId?: string): Promise<ClinicalReportDownloadResponse> { return this.reports.download(p, id, requestId ?? 'unknown'); }

  @Post('clinical-reports/:id/void')
  @RequirePermissions(PERMISSIONS.CLINICAL_REPORT_VOID)
  voidReport(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(voidClinicalReportSchema)) body: VoidClinicalReportBody, @Headers('x-request-id') requestId?: string): Promise<ClinicalReportResponse> { return this.reports.void(p, id, body, requestId ?? 'unknown'); }
}
