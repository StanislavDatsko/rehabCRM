import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@repo/contracts';
import { CurrentPrincipal } from '../common/auth/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { RequirePermissions } from '../common/auth/require-permissions.decorator';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import { monitoringQuerySchema, type MonitoringQuery } from './monitoring.schemas';
import { MonitoringService } from './monitoring.service';

@ApiTags('patient-monitoring')
@ApiBearerAuth()
@Controller('patients')
export class ClinicianMonitoringController {
  constructor(private readonly service: MonitoringService) {}

  @Get(':patientId/monitoring')
  @RequirePermissions(PERMISSIONS.PATIENT_MONITORING_READ)
  monitoring(@CurrentPrincipal() principal: AuthenticatedPrincipal, @Param('patientId', ParseUUIDPipe) patientId: string, @Query(new ZodValidationPipe(monitoringQuerySchema)) query: MonitoringQuery) {
    return this.service.staffMonitoring(principal, patientId, query);
  }
}
