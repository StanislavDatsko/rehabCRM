import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  const loggerRequestId = (req as Request & { id?: string }).id;
  const requestId =
    incoming && /^[A-Za-z0-9._:-]{1,100}$/.test(incoming)
      ? incoming
      : loggerRequestId && /^[A-Za-z0-9._:-]{1,100}$/.test(loggerRequestId)
        ? loggerRequestId
        : randomUUID();
  req.headers['x-request-id'] = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}
