import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentPrincipal } from '../common/auth/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import type { WorkAnalyticsSummary } from '@repo/contracts';
import { WorkAnalyticsService } from './work-analytics.service';

@ApiTags('work-analytics')
@ApiBearerAuth()
@Controller('work-analytics')
export class WorkAnalyticsController {
  constructor(private readonly analytics: WorkAnalyticsService) {}

  @Get('summary')
  summary(@CurrentPrincipal() principal: AuthenticatedPrincipal): Promise<WorkAnalyticsSummary> {
    return this.analytics.summary(principal);
  }
}
