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
  type AppointmentCalendarResponse,
  type AppointmentDetailResponse,
  type EncounterResponse,
  type PatientAppointmentSummary,
  type SchedulingCatalogResponse,
} from '@repo/contracts';
import { CurrentPrincipal } from '../common/auth/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { RequirePermissions } from '../common/auth/require-permissions.decorator';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import {
  calendarQuerySchema,
  cancelAppointmentBodySchema,
  createAppointmentBodySchema,
  updateAppointmentBodySchema,
  versionCommandSchema,
  type CalendarQuery,
  type CancelAppointmentBody,
  type CreateAppointmentBody,
  type UpdateAppointmentBody,
  type VersionCommand,
} from './appointment.schemas';
import { AppointmentsService } from './appointments.service';

@ApiTags('appointments')
@ApiBearerAuth()
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Get('catalog')
  @RequirePermissions(PERMISSIONS.APPOINTMENT_READ)
  @ApiOperation({ summary: 'Scheduling catalog (types, locations, rooms)' })
  getCatalog(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ): Promise<SchedulingCatalogResponse> {
    return this.appointments.getCatalog(principal);
  }

  @Get('patients/:patientId/summary')
  @RequirePermissions(PERMISSIONS.APPOINTMENT_READ)
  @ApiOperation({ summary: 'Upcoming and recent appointments for a patient' })
  getPatientSummary(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ): Promise<PatientAppointmentSummary> {
    return this.appointments.getPatientSummary(principal, patientId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.APPOINTMENT_READ)
  @ApiOperation({ summary: 'Calendar range query (bounded date window)' })
  calendar(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Query(new ZodValidationPipe(calendarQuerySchema)) query: CalendarQuery,
  ): Promise<AppointmentCalendarResponse> {
    return this.appointments.calendar(principal, query);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.APPOINTMENT_CREATE)
  @ApiOperation({ summary: 'Create appointment' })
  create(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body(new ZodValidationPipe(createAppointmentBodySchema)) body: CreateAppointmentBody,
    @Headers('x-request-id') requestId?: string,
  ): Promise<AppointmentDetailResponse> {
    return this.appointments.create(principal, body, requestId ?? 'unknown');
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.APPOINTMENT_READ)
  @ApiOperation({ summary: 'Get appointment detail' })
  getById(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AppointmentDetailResponse> {
    return this.appointments.getById(principal, id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.APPOINTMENT_UPDATE)
  @ApiOperation({ summary: 'Update or reschedule appointment (optimistic version)' })
  update(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateAppointmentBodySchema)) body: UpdateAppointmentBody,
    @Headers('x-request-id') requestId?: string,
  ): Promise<AppointmentDetailResponse> {
    return this.appointments.update(principal, id, body, requestId ?? 'unknown');
  }

  @Post(':id/cancel')
  @RequirePermissions(PERMISSIONS.APPOINTMENT_CANCEL)
  @ApiOperation({ summary: 'Cancel appointment' })
  cancel(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(cancelAppointmentBodySchema)) body: CancelAppointmentBody,
    @Headers('x-request-id') requestId?: string,
  ): Promise<AppointmentDetailResponse> {
    return this.appointments.cancel(principal, id, body, requestId ?? 'unknown');
  }

  @Post(':id/confirm')
  @RequirePermissions(PERMISSIONS.APPOINTMENT_CHANGE_STATUS)
  @ApiOperation({ summary: 'Confirm appointment' })
  confirm(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(versionCommandSchema)) body: VersionCommand,
    @Headers('x-request-id') requestId?: string,
  ): Promise<AppointmentDetailResponse> {
    return this.appointments.confirm(principal, id, body, requestId ?? 'unknown');
  }

  @Post(':id/check-in')
  @RequirePermissions(PERMISSIONS.APPOINTMENT_CHANGE_STATUS)
  @ApiOperation({ summary: 'Check in patient for appointment' })
  checkIn(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(versionCommandSchema)) body: VersionCommand,
    @Headers('x-request-id') requestId?: string,
  ): Promise<AppointmentDetailResponse> {
    return this.appointments.checkIn(principal, id, body, requestId ?? 'unknown');
  }

  @Post(':id/no-show')
  @RequirePermissions(PERMISSIONS.APPOINTMENT_CHANGE_STATUS)
  @ApiOperation({ summary: 'Mark appointment as no-show' })
  noShow(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(versionCommandSchema)) body: VersionCommand,
    @Headers('x-request-id') requestId?: string,
  ): Promise<AppointmentDetailResponse> {
    return this.appointments.markNoShow(principal, id, body, requestId ?? 'unknown');
  }

  @Post(':id/start-encounter')
  @RequirePermissions(PERMISSIONS.ENCOUNTER_START)
  @ApiOperation({ summary: 'Start encounter from checked-in appointment' })
  startEncounter(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(versionCommandSchema)) body: VersionCommand,
    @Headers('x-request-id') requestId?: string,
  ): Promise<EncounterResponse> {
    return this.appointments.startEncounter(principal, id, body, requestId ?? 'unknown');
  }
}
