import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  PERMISSIONS,
  type AssessmentListItem,
  type AssessmentResponse,
  type AssessmentTemplateResponse,
  type MeasurementHistoryPoint,
} from '@repo/contracts';
import { CurrentPrincipal } from '../common/auth/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { RequirePermissions } from '../common/auth/require-permissions.decorator';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import {
  assessmentVersionCommandSchema,
  createAssessmentBodySchema,
  listAssessmentsQuerySchema,
  measurementHistoryQuerySchema,
  updateAssessmentBodySchema,
  voidAssessmentBodySchema,
  type AssessmentVersionCommand,
  type CreateAssessmentBody,
  type ListAssessmentsQuery,
  type MeasurementHistoryQuery,
  type UpdateAssessmentBody,
  type VoidAssessmentBody,
} from './assessment.schemas';
import { AssessmentsService } from './assessments.service';

@ApiTags('assessments')
@ApiBearerAuth()
@Controller()
export class AssessmentsController {
  constructor(private readonly assessments: AssessmentsService) {}

  @Get('assessment-templates')
  @RequirePermissions(PERMISSIONS.ASSESSMENT_TEMPLATE_READ)
  listTemplates(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ): Promise<AssessmentTemplateResponse[]> {
    return this.assessments.listTemplates(principal);
  }

  @Get('assessment-templates/:id')
  @RequirePermissions(PERMISSIONS.ASSESSMENT_TEMPLATE_READ)
  getTemplate(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AssessmentTemplateResponse> {
    return this.assessments.getTemplate(principal, id);
  }

  @Get('patients/:patientId/assessments')
  @RequirePermissions(PERMISSIONS.ASSESSMENT_READ)
  listForPatient(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query(new ZodValidationPipe(listAssessmentsQuerySchema)) query: ListAssessmentsQuery,
  ): Promise<AssessmentListItem[]> {
    return this.assessments.listForPatient(principal, patientId, query);
  }

  @Post('patients/:patientId/assessments')
  @RequirePermissions(PERMISSIONS.ASSESSMENT_CREATE)
  @ApiOperation({ summary: 'Create a draft assessment as the current practitioner' })
  create(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body(new ZodValidationPipe(createAssessmentBodySchema)) body: CreateAssessmentBody,
    @Headers('x-request-id') requestId?: string,
  ): Promise<AssessmentResponse> {
    return this.assessments.create(principal, patientId, body, requestId ?? 'unknown');
  }

  @Get('assessments/:id')
  @RequirePermissions(PERMISSIONS.ASSESSMENT_READ, PERMISSIONS.MEASUREMENT_READ)
  getById(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AssessmentResponse> {
    return this.assessments.getById(principal, id);
  }

  @Patch('assessments/:id')
  @RequirePermissions(PERMISSIONS.ASSESSMENT_UPDATE, PERMISSIONS.MEASUREMENT_WRITE)
  update(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateAssessmentBodySchema)) body: UpdateAssessmentBody,
    @Headers('x-request-id') requestId?: string,
  ): Promise<AssessmentResponse> {
    return this.assessments.update(principal, id, body, requestId ?? 'unknown');
  }

  @Post('assessments/:id/complete')
  @RequirePermissions(PERMISSIONS.ASSESSMENT_COMPLETE)
  complete(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(assessmentVersionCommandSchema)) body: AssessmentVersionCommand,
    @Headers('x-request-id') requestId?: string,
  ): Promise<AssessmentResponse> {
    return this.assessments.complete(principal, id, body, requestId ?? 'unknown');
  }

  @Post('assessments/:id/void')
  @RequirePermissions(PERMISSIONS.ASSESSMENT_VOID)
  void(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(voidAssessmentBodySchema)) body: VoidAssessmentBody,
    @Headers('x-request-id') requestId?: string,
  ): Promise<AssessmentResponse> {
    return this.assessments.void(principal, id, body, requestId ?? 'unknown');
  }

  @Get('patients/:patientId/measurements/history')
  @RequirePermissions(PERMISSIONS.MEASUREMENT_READ)
  history(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query(new ZodValidationPipe(measurementHistoryQuerySchema)) query: MeasurementHistoryQuery,
  ): Promise<MeasurementHistoryPoint[]> {
    return this.assessments.history(principal, patientId, query);
  }
}
