import { describe, expect, it } from 'vitest';
import { HttpStatus } from '@nestjs/common';
import { API_ERROR_CODES } from '@repo/contracts';
import { errorCodeForHttpStatus, publicMessageForError } from './error-mapping';

describe('error mapping', () => {
  it('maps authorization failures without leaking internals', () => {
    expect(errorCodeForHttpStatus(HttpStatus.FORBIDDEN)).toBe(API_ERROR_CODES.FORBIDDEN);
    expect(publicMessageForError(500, 'secret stack')).toContain('could not be completed');
  });
});
