export const ERROR_TRACKER = Symbol('ERROR_TRACKER');

export interface ErrorTrackerPort {
  capture(error: unknown, context: { requestId: string; operation: string }): void;
}

export class NoopErrorTracker implements ErrorTrackerPort {
  capture(): void {
    // A deployment adapter may forward scrubbed exceptions to the approved provider.
  }
}
