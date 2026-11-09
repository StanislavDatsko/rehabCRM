import type { CalendarBlockItem } from '@repo/contracts';
import { addDays, endOfDay, startOfDay } from 'date-fns';
import { apiInstantToCalendarDate } from './timezone';

export type BlockSegment = {
  id: string;
  kind: CalendarBlockItem['kind'];
  note: string | null;
  start: Date;
  end: Date;
};

/**
 * Splits blocks into one segment per local day, because the time grid renders
 * background events per day column and multi-day items would land in the all-day row.
 */
export function blockSegments(blocks: CalendarBlockItem[], timezone: string): BlockSegment[] {
  const segments: BlockSegment[] = [];
  for (const block of blocks) {
    const start = apiInstantToCalendarDate(block.startsAt, timezone);
    const end = apiInstantToCalendarDate(block.endsAt, timezone);
    let day = startOfDay(start);
    let guard = 0;
    while (day < end && guard < 62) {
      const dayEnd = addDays(day, 1);
      const segStart = start > day ? start : day;
      const segEnd = end < dayEnd ? end : dayEnd;
      if (segEnd > segStart) {
        segments.push({ id: `${block.id}:${guard}`, kind: block.kind, note: block.note, start: segStart, end: segEnd });
      }
      day = dayEnd;
      guard += 1;
    }
  }
  return segments;
}

/** True if the local calendar day lies fully inside a DAY_OFF block. */
export function isDayOff(day: Date, blocks: BlockSegment[]): boolean {
  const from = startOfDay(day).getTime();
  const to = endOfDay(day).getTime();
  return blocks.some(
    (segment) =>
      segment.kind === 'DAY_OFF' && segment.start.getTime() <= from && segment.end.getTime() >= to - 1000,
  );
}

export function overlapsBlock(start: Date, end: Date, blocks: BlockSegment[]): boolean {
  return blocks.some((segment) => segment.start < end && segment.end > start);
}
