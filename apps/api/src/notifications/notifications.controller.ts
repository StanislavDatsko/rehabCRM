import { Controller, Get, Param, ParseUUIDPipe, Patch, Body, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@repo/contracts';
import { CurrentPrincipal } from '../common/auth/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { RequirePermissions } from '../common/auth/require-permissions.decorator';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications') @ApiBearerAuth() @Controller()
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}
  @Get('patient-portal/notifications') @RequirePermissions(PERMISSIONS.NOTIFICATION_SELF_READ) listPatient(@CurrentPrincipal() p: AuthenticatedPrincipal) { return this.service.list(p); }
  @Get('patient-portal/notifications/unread-count') @RequirePermissions(PERMISSIONS.NOTIFICATION_SELF_READ) countPatient(@CurrentPrincipal() p: AuthenticatedPrincipal) { return this.service.unreadCount(p); }
  @Patch('patient-portal/notifications/:id/read') @RequirePermissions(PERMISSIONS.NOTIFICATION_SELF_UPDATE) readPatient(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseUUIDPipe) id: string) { return this.service.markRead(p, id); }
  @Patch('patient-portal/notifications/:id/dismiss') @RequirePermissions(PERMISSIONS.NOTIFICATION_SELF_UPDATE) dismissPatient(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseUUIDPipe) id: string) { return this.service.dismiss(p, id); }
  @Get('notifications') @RequirePermissions(PERMISSIONS.CLINICAL_ALERT_READ) listStaff(@CurrentPrincipal() p: AuthenticatedPrincipal) { return this.service.list(p); }
  @Get('notifications/unread-count') @RequirePermissions(PERMISSIONS.CLINICAL_ALERT_READ) countStaff(@CurrentPrincipal() p: AuthenticatedPrincipal) { return this.service.unreadCount(p); }
  @Patch('notifications/:id/read') @RequirePermissions(PERMISSIONS.CLINICAL_ALERT_READ) readStaff(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseUUIDPipe) id: string) { return this.service.markRead(p, id); }
  @Get('clinical-alerts') @RequirePermissions(PERMISSIONS.CLINICAL_ALERT_READ) alerts(@CurrentPrincipal() p: AuthenticatedPrincipal) { return this.service.alerts(p); }
  @Post('patients/:patientId/clinical-alerts/evaluate') @RequirePermissions(PERMISSIONS.CLINICAL_ALERT_READ) evaluate(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('patientId', ParseUUIDPipe) patientId: string) { return this.service.evaluatePatient(p, patientId); }
  @Patch('clinical-alerts/:id/acknowledge') @RequirePermissions(PERMISSIONS.CLINICAL_ALERT_ACKNOWLEDGE) acknowledge(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseUUIDPipe) id: string, @Body('version') version: number) { return this.service.transitionAlert(p, id, 'ACKNOWLEDGED', version); }
  @Patch('clinical-alerts/:id/resolve') @RequirePermissions(PERMISSIONS.CLINICAL_ALERT_RESOLVE) resolve(@CurrentPrincipal() p: AuthenticatedPrincipal, @Param('id', ParseUUIDPipe) id: string, @Body('version') version: number) { return this.service.transitionAlert(p, id, 'RESOLVED', version); }
}
