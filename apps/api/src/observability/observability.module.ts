import { Global, Module } from '@nestjs/common';
import { ERROR_TRACKER, NoopErrorTracker } from './error-tracker.port';
import { MetricsService } from './metrics.service';

@Global()
@Module({
  providers: [MetricsService, { provide: ERROR_TRACKER, useClass: NoopErrorTracker }],
  exports: [MetricsService, ERROR_TRACKER],
})
export class ObservabilityModule {}
