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
  type ExerciseDetailResponse,
  type ExerciseLibraryResponse,
  type RehabilitationPlanListItem,
  type RehabilitationPlanResponse,
} from '@repo/contracts';
import { CurrentPrincipal } from '../common/auth/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { RequirePermissions } from '../common/auth/require-permissions.decorator';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import {
  cancelPlanBodySchema,
  createPlanBodySchema,
  exerciseListQuerySchema,
  planVersionCommandSchema,
  updatePlanBodySchema,
  type CancelPlanBody,
  type CreatePlanBody,
  type ExerciseListQuery,
  type PlanVersionCommand,
  type UpdatePlanBody,
} from './rehabilitation.schemas';
import { RehabilitationService } from './rehabilitation.service';

@ApiTags('rehabilitation')
@ApiBearerAuth()
@Controller()
export class RehabilitationController {
  constructor(private readonly rehabilitation: RehabilitationService) {}

  @Get('exercises')
  @RequirePermissions(PERMISSIONS.EXERCISE_READ)
  listExercises(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Query(new ZodValidationPipe(exerciseListQuerySchema)) query: ExerciseListQuery,
  ): Promise<ExerciseLibraryResponse> {
    return this.rehabilitation.listExercises(principal, query);
  }

  @Get('exercises/:id')
  @RequirePermissions(PERMISSIONS.EXERCISE_READ)
  getExercise(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ExerciseDetailResponse> {
    return this.rehabilitation.getExercise(principal, id);
  }

  @Get('patients/:patientId/rehabilitation-plans')
  @RequirePermissions(PERMISSIONS.REHABILITATION_PLAN_READ)
  listPlans(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ): Promise<RehabilitationPlanListItem[]> {
    return this.rehabilitation.listPlans(principal, patientId);
  }

  @Post('patients/:patientId/rehabilitation-plans')
  @RequirePermissions(PERMISSIONS.REHABILITATION_PLAN_CREATE)
  @ApiOperation({ summary: 'Create a rehabilitation plan with its first draft revision' })
  createPlan(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body(new ZodValidationPipe(createPlanBodySchema)) body: CreatePlanBody,
    @Headers('x-request-id') requestId?: string,
  ): Promise<RehabilitationPlanResponse> {
    return this.rehabilitation.createPlan(principal, patientId, body, requestId ?? 'unknown');
  }

  @Get('rehabilitation-plans/:id')
  @RequirePermissions(
    PERMISSIONS.REHABILITATION_PLAN_READ,
    PERMISSIONS.REHABILITATION_GOAL_READ,
    PERMISSIONS.EXERCISE_PRESCRIPTION_READ,
  )
  getPlan(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RehabilitationPlanResponse> {
    return this.rehabilitation.getPlan(principal, id);
  }

  @Patch('rehabilitation-plans/:id')
  @RequirePermissions(
    PERMISSIONS.REHABILITATION_PLAN_UPDATE,
    PERMISSIONS.REHABILITATION_GOAL_WRITE,
    PERMISSIONS.EXERCISE_PRESCRIPTION_WRITE,
  )
  updatePlan(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updatePlanBodySchema)) body: UpdatePlanBody,
    @Headers('x-request-id') requestId?: string,
  ): Promise<RehabilitationPlanResponse> {
    return this.rehabilitation.updatePlan(principal, id, body, requestId ?? 'unknown');
  }

  @Post('rehabilitation-plans/:id/revisions')
  @RequirePermissions(
    PERMISSIONS.REHABILITATION_PLAN_UPDATE,
    PERMISSIONS.REHABILITATION_GOAL_WRITE,
    PERMISSIONS.EXERCISE_PRESCRIPTION_WRITE,
  )
  createRevision(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(planVersionCommandSchema)) body: PlanVersionCommand,
    @Headers('x-request-id') requestId?: string,
  ): Promise<RehabilitationPlanResponse> {
    return this.rehabilitation.createRevision(principal, id, body, requestId ?? 'unknown');
  }

  @Post('rehabilitation-plans/:id/revisions/:revisionId/publish')
  @RequirePermissions(
    PERMISSIONS.REHABILITATION_PLAN_UPDATE,
    PERMISSIONS.REHABILITATION_GOAL_WRITE,
    PERMISSIONS.EXERCISE_PRESCRIPTION_WRITE,
  )
  publishRevision(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('revisionId', ParseUUIDPipe) revisionId: string,
    @Body(new ZodValidationPipe(planVersionCommandSchema)) body: PlanVersionCommand,
    @Headers('x-request-id') requestId?: string,
  ): Promise<RehabilitationPlanResponse> {
    return this.rehabilitation.publishRevision(
      principal,
      id,
      { ...body, revisionId },
      requestId ?? 'unknown',
    );
  }

  @Post('rehabilitation-plans/:id/activate')
  @RequirePermissions(PERMISSIONS.REHABILITATION_PLAN_ACTIVATE)
  activate(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(planVersionCommandSchema)) body: PlanVersionCommand,
    @Headers('x-request-id') requestId?: string,
  ): Promise<RehabilitationPlanResponse> {
    return this.rehabilitation.activate(principal, id, body, requestId ?? 'unknown');
  }

  @Post('rehabilitation-plans/:id/pause')
  @RequirePermissions(PERMISSIONS.REHABILITATION_PLAN_PAUSE)
  pause(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(planVersionCommandSchema)) body: PlanVersionCommand,
    @Headers('x-request-id') requestId?: string,
  ): Promise<RehabilitationPlanResponse> {
    return this.rehabilitation.pause(principal, id, body, requestId ?? 'unknown');
  }

  @Post('rehabilitation-plans/:id/resume')
  @RequirePermissions(PERMISSIONS.REHABILITATION_PLAN_PAUSE)
  resume(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(planVersionCommandSchema)) body: PlanVersionCommand,
    @Headers('x-request-id') requestId?: string,
  ): Promise<RehabilitationPlanResponse> {
    return this.rehabilitation.resume(principal, id, body, requestId ?? 'unknown');
  }

  @Post('rehabilitation-plans/:id/complete')
  @RequirePermissions(PERMISSIONS.REHABILITATION_PLAN_COMPLETE)
  complete(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(planVersionCommandSchema)) body: PlanVersionCommand,
    @Headers('x-request-id') requestId?: string,
  ): Promise<RehabilitationPlanResponse> {
    return this.rehabilitation.complete(principal, id, body, requestId ?? 'unknown');
  }

  @Post('rehabilitation-plans/:id/cancel')
  @RequirePermissions(PERMISSIONS.REHABILITATION_PLAN_CANCEL)
  cancel(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(cancelPlanBodySchema)) body: CancelPlanBody,
    @Headers('x-request-id') requestId?: string,
  ): Promise<RehabilitationPlanResponse> {
    return this.rehabilitation.cancel(principal, id, body, requestId ?? 'unknown');
  }
}
