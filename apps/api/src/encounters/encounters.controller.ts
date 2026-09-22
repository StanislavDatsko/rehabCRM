import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS, type EncounterResponse } from '@repo/contracts';
import { CurrentPrincipal } from '../common/auth/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { RequirePermissions } from '../common/auth/require-permissions.decorator';
import { EncountersService } from './encounters.service';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import { createEncounterExerciseLogBodySchema, type CreateEncounterExerciseLogBody } from './encounter.schemas';

@ApiTags('encounters')
@ApiBearerAuth()
@Controller('encounters')
export class EncountersController {
  constructor(private readonly encounters: EncountersService) {}

  @Get('patient/:patientId/exercise-logs')
  @RequirePermissions(PERMISSIONS.ENCOUNTER_READ)
  listPatientExerciseLogs(@CurrentPrincipal() principal: AuthenticatedPrincipal, @Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.encounters.listPatientExerciseLogs(principal, patientId);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.ENCOUNTER_READ)
  @ApiOperation({ summary: 'Get encounter detail' })
  getById(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EncounterResponse> {
    return this.encounters.getById(principal, id);
  }

  @Get(':id/exercise-logs')
  @RequirePermissions(PERMISSIONS.ENCOUNTER_READ)
  listExerciseLogs(@CurrentPrincipal() principal: AuthenticatedPrincipal, @Param('id', ParseUUIDPipe) id: string) {
    return this.encounters.listExerciseLogs(principal, id);
  }

  @Post(':id/exercise-logs')
  @RequirePermissions(PERMISSIONS.EXERCISE_PRESCRIPTION_WRITE)
  createExerciseLog(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(createEncounterExerciseLogBodySchema)) body: CreateEncounterExerciseLogBody,
  ) {
    return this.encounters.createExerciseLog(principal, id, body);
  }

  @Post(':id/complete')
  @RequirePermissions(PERMISSIONS.ENCOUNTER_COMPLETE)
  @ApiOperation({ summary: 'Complete in-progress encounter' })
  complete(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-request-id') requestId?: string,
  ): Promise<EncounterResponse> {
    return this.encounters.complete(principal, id, requestId ?? 'unknown');
  }
}
