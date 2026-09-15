import { Module } from '@nestjs/common';
import { ProgressModule } from '../progress/progress.module';
import { PatientPortalController } from './patient-portal.controller';
import { PatientPortalService } from './patient-portal.service';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';
import { ClinicianMonitoringController } from './clinician-monitoring.controller';

@Module({ imports: [ProgressModule], controllers: [PatientPortalController, MonitoringController, ClinicianMonitoringController], providers: [PatientPortalService, MonitoringService] })
export class PatientPortalModule {}
