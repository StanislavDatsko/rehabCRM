import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { API_ERROR_CODES, type ApiErrorBody } from '@repo/contracts';
import { errorCodeForHttpStatus, publicMessageForError } from './error-mapping';
import type { ErrorTrackerPort } from '../../observability/error-tracker.port';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly errorTracker: ErrorTrackerPort) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = String(request.headers['x-request-id'] ?? 'unknown');

    // Express body-parser errors are not Nest HttpExceptions. Keep rejected
    // oversized bodies as a client error and never pass the raw body onward.
    if (
      typeof exception === 'object' &&
      exception !== null &&
      'type' in exception &&
      (exception as { type?: unknown }).type === 'entity.too.large'
    ) {
      response.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
        code: API_ERROR_CODES.VALIDATION_FAILED,
        message: 'The request payload is too large.',
        requestId,
      } satisfies ApiErrorBody);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      const rawObject =
        typeof raw === 'object' && raw !== null
          ? (raw as { code?: unknown; message?: unknown; details?: unknown })
          : null;
      const fallback =
        typeof raw === 'string'
          ? raw
          : typeof rawObject?.message === 'string'
            ? rawObject.message
            : exception.message;
      const body: ApiErrorBody = {
        code:
          typeof rawObject?.code === 'string'
            ? rawObject.code
            : errorCodeForHttpStatus(status),
        message: publicMessageForError(status, fallback),
        requestId,
        ...(rawObject?.details !== undefined ? { details: rawObject.details } : {}),
      };
      response.status(status).json(body);
      return;
    }

    this.logger.error(
      { requestId, err: exception instanceof Error ? exception.name : 'unknown' },
      'Unhandled exception',
    );
    this.errorTracker.capture(exception, {
      requestId,
      operation: `${request.method} ${String(request.route?.path ?? 'unmatched')}`,
    });

    const body: ApiErrorBody = {
      code: API_ERROR_CODES.INTERNAL_ERROR,
      message: publicMessageForError(HttpStatus.INTERNAL_SERVER_ERROR, ''),
      requestId,
    };
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(body);
  }
}
