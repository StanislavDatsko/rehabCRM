import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  it('returns safe first errors keyed by field path', () => {
    const pipe = new ZodValidationPipe(z.object({ email: z.string().email(), address: z.object({ countryCode: z.string().max(2) }), dateOfBirth: z.string().refine(value => value <= '2026-09-18', 'future date') }));
    try { pipe.transform({ email: 'not-an-email', address: { countryCode: 'UKR' }, dateOfBirth: '2099-01-01', secret: 'must-not-leak' }); expect.fail('expected exception'); } catch (error) {
      const response = (error as BadRequestException).getResponse() as { fields: Record<string, string> };
      expect(response.fields.email).toBeTruthy();
      expect(response.fields['address.countryCode']).toBeTruthy();
      expect(response.fields.dateOfBirth).toBe('future date');
      expect(JSON.stringify(response)).not.toContain('not-an-email');
      expect(JSON.stringify(response)).not.toContain('must-not-leak');
    }
  });
});
