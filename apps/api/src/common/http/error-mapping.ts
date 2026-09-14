import { HttpStatus } from '@nestjs/common';
import { API_ERROR_CODES, type ApiErrorCode } from '@repo/contracts';

export function errorCodeForHttpStatus(status: number): ApiErrorCode {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return API_ERROR_CODES.VALIDATION_FAILED;
    case HttpStatus.UNAUTHORIZED:
      return API_ERROR_CODES.UNAUTHENTICATED;
    case HttpStatus.FORBIDDEN:
      return API_ERROR_CODES.FORBIDDEN;
    case HttpStatus.NOT_FOUND:
      return API_ERROR_CODES.NOT_FOUND;
    case HttpStatus.CONFLICT:
      return API_ERROR_CODES.CONFLICT;
    case HttpStatus.SERVICE_UNAVAILABLE:
      return API_ERROR_CODES.DEPENDENCY_UNAVAILABLE;
    default:
      return API_ERROR_CODES.INTERNAL_ERROR;
  }
}

export function publicMessageForError(status: number, fallback: string): string {
  if (status >= 500) {
    return 'The request could not be completed. Retry, and contact support if it continues.';
  }
  return fallback;
}
