import { BadRequestException } from '@nestjs/common';
import type { ProgressPeriodResponse } from '@repo/contracts';
import type { ProgressQuery } from './progress.schemas';

const daysAgo = (date: Date, days: number) => new Date(date.getTime() - days * 86_400_000);

export function resolveProgressPeriod(
  query: ProgressQuery,
  now: Date,
  patientCreatedAt: Date,
  currentPlanStart?: Date | null,
): ProgressPeriodResponse {
  let from: Date;
  const to = query.to ? new Date(query.to) : now;
  if (query.period === 'custom') from = new Date(query.from!);
  else if (query.period === '30d') from = daysAgo(to, 30);
  else if (query.period === 'current-plan') {
    if (!currentPlanStart) {
      throw new BadRequestException({ code: 'PROGRESS_NOT_FOUND', message: 'Current plan was not found.' });
    }
    from = currentPlanStart;
  } else if (query.period === 'all') from = patientCreatedAt;
  else from = daysAgo(to, 90);

  if (from > to) throw new BadRequestException({ code: 'PROGRESS_INVALID_DATE_RANGE', message: 'Invalid date range.' });
  if (query.period !== 'all' && to.getTime() - from.getTime() > 10 * 365 * 86_400_000) {
    throw new BadRequestException({ code: 'PROGRESS_INVALID_DATE_RANGE', message: 'Date range exceeds ten years.' });
  }
  return { key: query.period, from: from.toISOString(), to: to.toISOString(), bounded: true };
}
