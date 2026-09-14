import { randomBytes } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { MetricsService } from './metrics.service';

const traceParentPattern = /^00-[0-9a-f]{32}-[0-9a-f]{16}-0[01]$/;

export function httpObservabilityMiddleware(metrics: MetricsService) {
  return (request: Request, response: Response, next: NextFunction): void => {
    const started = process.hrtime.bigint();
    const incoming = request.header('traceparent')?.toLowerCase();
    const traceId =
      incoming && traceParentPattern.test(incoming)
        ? incoming.split('-')[1]
        : randomBytes(16).toString('hex');
    const traceParent = `00-${traceId}-${randomBytes(8).toString('hex')}-01`;
    request.headers.traceparent = traceParent;
    response.setHeader('traceparent', traceParent);
    response.once('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - started) / 1_000_000;
      metrics.recordHttp(response.statusCode, durationMs);
    });
    next();
  };
}
