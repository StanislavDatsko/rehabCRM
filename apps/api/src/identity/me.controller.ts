import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { CurrentUserResponse } from '@repo/contracts';
import { CurrentPrincipal } from '../common/auth/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { IdentityService } from './identity.service';

@ApiTags('identity')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(private readonly identity: IdentityService) {}

  @Get()
  @ApiOperation({ summary: 'Current staff profile (application authorization, not raw OIDC)' })
  @ApiOkResponse({ description: 'Authenticated staff context' })
  async me(@CurrentPrincipal() principal: AuthenticatedPrincipal): Promise<CurrentUserResponse> {
    await this.identity.markLogin(principal.userId);
    return {
      id: principal.userId,
      email: principal.email,
      displayName: principal.displayName,
      organization: {
        id: principal.organizationId,
        name: principal.organizationName,
      },
      role: principal.role,
      permissions: principal.permissions,
    };
  }
}
