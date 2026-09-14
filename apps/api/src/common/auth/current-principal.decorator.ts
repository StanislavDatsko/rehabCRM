import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedPrincipal } from './principal';

export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedPrincipal => {
    const request = context.switchToHttp().getRequest<Request & { principal?: AuthenticatedPrincipal }>();
    if (!request.principal) {
      throw new Error('Principal missing after authentication');
    }
    return request.principal;
  },
);
