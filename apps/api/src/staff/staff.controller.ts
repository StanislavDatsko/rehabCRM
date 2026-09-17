import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  PERMISSIONS,
  type StaffHistoryItem,
  type StaffListResponse,
  type StaffResponse,
} from '@repo/contracts';
import { CurrentPrincipal } from '../common/auth/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { RequirePermissions } from '../common/auth/require-permissions.decorator';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import {
  changeStaffRoleBodySchema,
  createStaffBodySchema,
  listStaffQuerySchema,
  staffVersionBodySchema,
  updateStaffBodySchema,
  type ChangeStaffRoleBody,
  type CreateStaffBody,
  type ListStaffQuery,
  type StaffVersionBody,
  type UpdateStaffBody,
} from './staff.schemas';
import { StaffService, type StaffInvitationResponse, type StaffInvitationListItem } from './staff.service';

@ApiTags('staff')
@ApiBearerAuth()
@Controller('staff')
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.STAFF_READ)
  @ApiOperation({ summary: 'List organization staff' })
  list(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Query(new ZodValidationPipe(listStaffQuerySchema)) query: ListStaffQuery,
  ): Promise<StaffListResponse> {
    return this.staff.list(principal, query);
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @RequirePermissions(PERMISSIONS.STAFF_CREATE)
  @ApiOperation({ summary: 'Create a staff invitation' })
  create(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body(new ZodValidationPipe(createStaffBodySchema)) body: CreateStaffBody,
    @Headers('x-request-id') requestId?: string,
  ): Promise<StaffInvitationResponse> {
    return this.staff.create(principal, body, requestId ?? 'unknown');
  }

  @Get('invitations')
  @RequirePermissions(PERMISSIONS.STAFF_READ)
  @ApiOperation({ summary: 'List organization staff invitations' })
  listInvitations(@CurrentPrincipal() principal: AuthenticatedPrincipal): Promise<StaffInvitationListItem[]> {
    return this.staff.listInvitations(principal);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.STAFF_READ)
  @ApiOperation({ summary: 'Get organization staff profile' })
  getById(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StaffResponse> {
    return this.staff.getById(principal, id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.STAFF_UPDATE)
  @ApiOperation({ summary: 'Update staff profile' })
  update(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateStaffBodySchema)) body: UpdateStaffBody,
    @Headers('x-request-id') requestId?: string,
  ): Promise<StaffResponse> {
    return this.staff.update(principal, id, body, requestId ?? 'unknown');
  }

  @Post(':id/change-role')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @RequirePermissions(PERMISSIONS.STAFF_CHANGE_ROLE)
  @ApiOperation({ summary: 'Change an assignable organization role' })
  changeRole(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(changeStaffRoleBodySchema)) body: ChangeStaffRoleBody,
    @Headers('x-request-id') requestId?: string,
  ): Promise<StaffResponse> {
    return this.staff.changeRole(principal, id, body, requestId ?? 'unknown');
  }

  @Post(':id/disable')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @RequirePermissions(PERMISSIONS.STAFF_DISABLE)
  @ApiOperation({ summary: 'Disable organization and identity-provider access' })
  disable(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(staffVersionBodySchema)) body: StaffVersionBody,
    @Headers('x-request-id') requestId?: string,
  ): Promise<StaffResponse> {
    return this.staff.disable(principal, id, body.version, requestId ?? 'unknown');
  }

  @Post(':id/enable')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @RequirePermissions(PERMISSIONS.STAFF_ENABLE)
  @ApiOperation({ summary: 'Enable organization and identity-provider access' })
  enable(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(staffVersionBodySchema)) body: StaffVersionBody,
    @Headers('x-request-id') requestId?: string,
  ): Promise<StaffResponse> {
    return this.staff.enable(principal, id, body.version, requestId ?? 'unknown');
  }

  @Post(':id/sessions/revoke')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.STAFF_SESSION_REVOKE)
  @ApiOperation({ summary: 'Terminate all identity-provider sessions for a staff account' })
  revokeSessions(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-request-id') requestId?: string,
  ): Promise<void> {
    return this.staff.revokeSessions(principal, id, requestId ?? 'unknown');
  }

  @Post(':id/setup-actions/resend')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @RequirePermissions(PERMISSIONS.STAFF_UPDATE)
  @ApiOperation({ summary: 'Resend identity-provider account setup actions' })
  resendSetup(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-request-id') requestId?: string,
  ): Promise<StaffResponse> {
    return this.staff.resendSetupActions(principal, id, requestId ?? 'unknown');
  }

  @Post(':id/invitation/resend')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @RequirePermissions(PERMISSIONS.STAFF_UPDATE)
  @ApiOperation({ summary: 'Resend a staff invitation email' })
  resendInvitation(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-request-id') requestId?: string,
  ): Promise<StaffInvitationResponse> {
    return this.staff.resendInvitation(principal, id, requestId ?? 'unknown');
  }

  @Get(':id/history')
  @RequirePermissions(PERMISSIONS.STAFF_READ)
  @ApiOperation({ summary: 'List staff access and administration history' })
  history(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StaffHistoryItem[]> {
    return this.staff.history(principal, id);
  }
}
