import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@repo/contracts';
import { CurrentPrincipal } from '../common/auth/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { RequirePermissions } from '../common/auth/require-permissions.decorator';
import { PatientPortalService, type PatientPortalMeResponse, type PatientPortalPlanResponse, type PatientPortalProgressResponse } from './patient-portal.service';

@ApiTags('patient-portal')
@ApiBearerAuth()
@Controller('patient-portal')
export class PatientPortalController {
  constructor(private readonly portal: PatientPortalService) {}

  @Get('me')
  @RequirePermissions(PERMISSIONS.PATIENT_PORTAL_SELF_READ)
  me(@CurrentPrincipal() principal: AuthenticatedPrincipal): Promise<PatientPortalMeResponse> {
    return this.portal.me(principal);
  }

  @Get('plan')
  @RequirePermissions(PERMISSIONS.REHABILITATION_PLAN_SELF_READ)
  plan(@CurrentPrincipal() principal: AuthenticatedPrincipal): Promise<PatientPortalPlanResponse | null> { return this.portal.plan(principal); }

  @Get('progress')
  @RequirePermissions(PERMISSIONS.PROGRESS_SELF_READ)
  progress(@CurrentPrincipal() principal: AuthenticatedPrincipal): Promise<PatientPortalProgressResponse> { return this.portal.progress(principal); }
}
