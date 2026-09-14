import { Injectable, Logger } from '@nestjs/common';
import { Optional } from '@nestjs/common';
import { MetricsService } from '../../observability/metrics.service';

export type SecurityEventReason =
  | 'anonymous'
  | 'invalid_token'
  | 'unknown_subject'
  | 'user_disabled'
  | 'membership_disabled'
  | 'no_active_membership'
  | 'missing_permission'
  | 'authenticated';

@Injectable()
export class SecurityEventLogger {
  private readonly logger = new Logger('SecurityEvent');

  constructor(@Optional() private readonly metrics?: MetricsService) {}

  accessDenied(input: {
    requestId: string;
    reason: SecurityEventReason;
    subject?: string;
    userId?: string;
    path?: string;
  }): void {
    this.metrics?.recordSecurity(input.reason);
    this.logger.warn({
      event: 'ACCESS_DENIED',
      requestId: input.requestId,
      reason: input.reason,
      subject: input.subject,
      userId: input.userId,
      path: input.path,
    });
  }

  authenticated(input: { requestId: string; userId: string; path?: string }): void {
    this.logger.debug({
      event: 'REQUEST_AUTHENTICATED',
      requestId: input.requestId,
      userId: input.userId,
      path: input.path,
    });
  }
}
