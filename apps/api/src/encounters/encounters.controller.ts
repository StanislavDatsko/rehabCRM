import { Controller, Get, Headers, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS, type EncounterResponse } from '@repo/contracts';
import { CurrentPrincipal } from '../common/auth/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { RequirePermissions } from '../common/auth/require-permissions.decorator';
import { EncountersService } from './encounters.service';

@ApiTags('encounters')
@ApiBearerAuth()
@Controller('encounters')
export class EncountersController {
  constructor(private readonly encounters: EncountersService) {}

  @Get(':id')
  @RequirePermissions(PERMISSIONS.ENCOUNTER_READ)
  @ApiOperation({ summary: 'Get encounter detail' })
  getById(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EncounterResponse> {
    return this.encounters.getById(principal, id);
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
