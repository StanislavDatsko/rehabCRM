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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  PERMISSIONS,
  type PatientAdministrativeResponse,
  type PatientHistoryItem,
  type PatientListResponse,
  type ResponsiblePractitionerResponse,
} from '@repo/contracts';
import { CurrentPrincipal } from '../common/auth/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { RequirePermissions } from '../common/auth/require-permissions.decorator';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import {
  changePatientStatusBodySchema,
  createPatientBodySchema,
  listPatientsQuerySchema,
  updatePatientBodySchema,
  type ChangePatientStatusBody,
  type CreatePatientBody,
  type ListPatientsQuery,
  type UpdatePatientBody,
} from './patient.schemas';
import { PatientsService } from './patients.service';

@ApiTags('patients')
@ApiBearerAuth()
@Controller('patients')
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @Get('practitioners')
  @RequirePermissions(PERMISSIONS.PATIENT_READ_ADMIN)
  @ApiOperation({ summary: 'List ACTIVE practitioners in the current organization' })
  listPractitioners(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ): Promise<ResponsiblePractitionerResponse[]> {
    return this.patients.listPractitioners(principal);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.PATIENT_READ_ADMIN)
  @ApiOperation({ summary: 'List patients (org-scoped, offset pagination)' })
  list(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Query(new ZodValidationPipe(listPatientsQuerySchema)) query: ListPatientsQuery,
  ): Promise<PatientListResponse> {
    return this.patients.list(principal, query);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PATIENT_CREATE)
  @ApiOperation({ summary: 'Create patient (administrative)' })
  create(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body(new ZodValidationPipe(createPatientBodySchema)) body: CreatePatientBody,
    @Headers('x-request-id') requestId?: string,
  ): Promise<PatientAdministrativeResponse> {
    return this.patients.create(principal, body, requestId ?? 'unknown');
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PATIENT_READ_ADMIN)
  @ApiOperation({ summary: 'Get administrative patient profile' })
  getById(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PatientAdministrativeResponse> {
    return this.patients.getById(principal, id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.PATIENT_UPDATE_ADMIN)
  @ApiOperation({ summary: 'Update administrative patient fields (optimistic version)' })
  update(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updatePatientBodySchema)) body: UpdatePatientBody,
    @Headers('x-request-id') requestId?: string,
  ): Promise<PatientAdministrativeResponse> {
    return this.patients.updateAdministrative(principal, id, body, requestId ?? 'unknown');
  }

  @Patch(':id/status')
  @RequirePermissions(PERMISSIONS.PATIENT_CHANGE_STATUS)
  @ApiOperation({ summary: 'Change patient lifecycle status' })
  changeStatus(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(changePatientStatusBodySchema)) body: ChangePatientStatusBody,
    @Headers('x-request-id') requestId?: string,
  ): Promise<PatientAdministrativeResponse> {
    return this.patients.changeStatus(principal, id, body, requestId ?? 'unknown');
  }

  @Get(':id/history')
  @RequirePermissions(PERMISSIONS.PATIENT_READ_ADMIN)
  @ApiOperation({ summary: 'Administrative mutation history' })
  history(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PatientHistoryItem[]> {
    return this.patients.history(principal, id);
  }
}
