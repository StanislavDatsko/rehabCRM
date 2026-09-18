import { BadRequestException, PipeTransform } from '@nestjs/common';
import type { ZodTypeAny } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(
    private readonly schema: ZodTypeAny,
    private readonly code = 'VALIDATION_FAILED',
  ) {}

  transform(value: unknown): unknown {
    const parsed = this.schema.safeParse(value ?? {});
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.');
        if (path && !fields[path]) fields[path] = issue.message;
      }
      throw new BadRequestException({ code: this.code, message: 'Validation failed.', fields });
    }
    return parsed.data;
  }
}
