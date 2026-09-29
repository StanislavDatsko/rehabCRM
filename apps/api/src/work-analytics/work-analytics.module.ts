import { Module } from '@nestjs/common';
import { WorkAnalyticsController } from './work-analytics.controller';
import { WorkAnalyticsService } from './work-analytics.service';

@Module({ controllers: [WorkAnalyticsController], providers: [WorkAnalyticsService] })
export class WorkAnalyticsModule {}
