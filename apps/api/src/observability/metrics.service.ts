import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
  private readonly startedAt = Date.now();
  private requests = 0;
  private errors = 0;
  private totalDurationMs = 0;
  private readonly statusCounts = new Map<string, number>();
  private readonly securityCounts = new Map<string, number>();
  private readonly reportCounts = new Map<string, number>();
  private reportDurationMs = 0;
  private storageFailures = 0;

  recordHttp(statusCode: number, durationMs: number): void {
    this.requests += 1;
    this.totalDurationMs += durationMs;
    if (statusCode >= 500) this.errors += 1;
    const statusClass = `${Math.floor(statusCode / 100)}xx`;
    this.statusCounts.set(statusClass, (this.statusCounts.get(statusClass) ?? 0) + 1);
  }

  recordSecurity(reason: string): void {
    this.securityCounts.set(reason, (this.securityCounts.get(reason) ?? 0) + 1);
  }

  recordReport(outcome: 'completed' | 'failed', durationMs: number): void {
    this.reportCounts.set(outcome, (this.reportCounts.get(outcome) ?? 0) + 1);
    this.reportDurationMs += durationMs;
  }

  recordStorageFailure(): void {
    this.storageFailures += 1;
  }

  renderPrometheus(): string {
    const lines = [
      '# HELP rehabcrm_process_uptime_seconds Process uptime in seconds.',
      '# TYPE rehabcrm_process_uptime_seconds gauge',
      `rehabcrm_process_uptime_seconds ${Math.floor((Date.now() - this.startedAt) / 1000)}`,
      '# HELP rehabcrm_http_requests_total Completed HTTP requests.',
      '# TYPE rehabcrm_http_requests_total counter',
      `rehabcrm_http_requests_total ${this.requests}`,
      '# HELP rehabcrm_http_errors_total Completed HTTP 5xx responses.',
      '# TYPE rehabcrm_http_errors_total counter',
      `rehabcrm_http_errors_total ${this.errors}`,
      '# HELP rehabcrm_http_duration_milliseconds_total Cumulative request duration.',
      '# TYPE rehabcrm_http_duration_milliseconds_total counter',
      `rehabcrm_http_duration_milliseconds_total ${this.totalDurationMs.toFixed(3)}`,
      '# HELP rehabcrm_report_duration_milliseconds_total Cumulative clinical report generation duration.',
      '# TYPE rehabcrm_report_duration_milliseconds_total counter',
      `rehabcrm_report_duration_milliseconds_total ${this.reportDurationMs.toFixed(3)}`,
      '# HELP rehabcrm_storage_failures_total Object-storage operation failures.',
      '# TYPE rehabcrm_storage_failures_total counter',
      `rehabcrm_storage_failures_total ${this.storageFailures}`,
    ];
    for (const [statusClass, count] of this.statusCounts) {
      lines.push(`rehabcrm_http_responses_total{status_class="${statusClass}"} ${count}`);
    }
    for (const [reason, count] of this.securityCounts) {
      lines.push(`rehabcrm_security_events_total{reason="${reason}"} ${count}`);
    }
    for (const [outcome, count] of this.reportCounts) {
      lines.push(`rehabcrm_reports_total{outcome="${outcome}"} ${count}`);
    }
    return `${lines.join('\n')}\n`;
  }
}
