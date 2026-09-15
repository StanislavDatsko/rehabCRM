import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@repo/contracts';
import { CurrentPrincipal } from '../common/auth/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { RequirePermissions } from '../common/auth/require-permissions.decorator';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import { completionSchema, completionUpdateSchema, dailyReportSchema, dailyReportUpdateSchema, monitoringQuerySchema, type CompletionBody, type CompletionUpdateBody, type DailyReportBody, type DailyReportUpdateBody, type MonitoringQuery } from './monitoring.schemas';
import { MonitoringService } from './monitoring.service';

@ApiTags('patient-monitoring')
@ApiBearerAuth()
@Controller('patient-portal')
export class MonitoringController {
  constructor(private readonly service: MonitoringService) {}
  @Get('monitoring') @RequirePermissions(PERMISSIONS.DAILY_REPORT_SELF_READ)
  monitoring(@CurrentPrincipal() p: AuthenticatedPrincipal, @Query(new ZodValidationPipe(monitoringQuerySchema)) query: MonitoringQuery) { return this.service.monitoring(p, query); }
  @Get('daily-reports') @RequirePermissions(PERMISSIONS.DAILY_REPORT_SELF_READ)
  reports(@CurrentPrincipal() p: AuthenticatedPrincipal) { return this.service.listReports(p); }
  @Get('symptoms') @RequirePermissions(PERMISSIONS.PATIENT_SYMPTOM_SELF_READ)
  symptoms(@CurrentPrincipal() p: AuthenticatedPrincipal, @Query(new ZodValidationPipe(monitoringQuerySchema)) query: MonitoringQuery) { return this.service.symptoms(p, query); }
  @Get('daily-reports/today') @RequirePermissions(PERMISSIONS.DAILY_REPORT_SELF_READ)
  today(@CurrentPrincipal() p: AuthenticatedPrincipal) { return this.service.todayReport(p); }
  @Post('daily-reports') @RequirePermissions(PERMISSIONS.DAILY_REPORT_SELF_CREATE)
  create(@CurrentPrincipal() p: AuthenticatedPrincipal, @Body(new ZodValidationPipe(dailyReportSchema)) body: DailyReportBody) { return this.service.createReport(p, body); }
  @Patch('daily-reports/:id') @RequirePermissions(PERMISSIONS.DAILY_REPORT_SELF_UPDATE)
  update(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(dailyReportUpdateSchema)) body: DailyReportUpdateBody) { return this.service.updateReport(p, id, body); }
  @Get('exercises/today') @RequirePermissions(PERMISSIONS.EXERCISE_COMPLETION_SELF_READ)
  exercises(@CurrentPrincipal() p: AuthenticatedPrincipal) { return this.service.exercisesToday(p); }
  @Get('exercise-completions') @RequirePermissions(PERMISSIONS.EXERCISE_COMPLETION_SELF_READ)
  completions(@CurrentPrincipal() p: AuthenticatedPrincipal, @Query(new ZodValidationPipe(monitoringQuerySchema)) query: MonitoringQuery) { return this.service.completions(p, query); }
  @Post('exercise-completions') @RequirePermissions(PERMISSIONS.EXERCISE_COMPLETION_SELF_CREATE)
  createCompletion(@CurrentPrincipal() p: AuthenticatedPrincipal, @Body(new ZodValidationPipe(completionSchema)) body: CompletionBody) { return this.service.createCompletion(p, body); }
  @Patch('exercise-completions/:id') @RequirePermissions(PERMISSIONS.EXERCISE_COMPLETION_SELF_UPDATE)
  updateCompletion(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(completionUpdateSchema)) body: CompletionUpdateBody) { return this.service.updateCompletion(p, id, body); }
}
