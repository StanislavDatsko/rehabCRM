import { Module } from '@nestjs/common';
import { StorageModule } from '../infrastructure/storage/storage.module';
import { ClinicalReportPdfService } from './clinical-report-pdf';
import { ClinicalReportsService } from './clinical-reports.service';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';

@Module({ imports: [StorageModule], controllers: [ProgressController], providers: [ProgressService, ClinicalReportsService, ClinicalReportPdfService] })
export class ProgressModule {}
