import { describe, expect, it } from 'vitest';
import { blockSegments, isDayOff, overlapsBlock } from './calendar-blocks';

const TZ = 'UTC';

describe('calendar blocks', () => {
  it('splits a multi-day day-off into one segment per day', () => {
    const segments = blockSegments(
      [{ id: 'b1', kind: 'DAY_OFF', startsAt: '2026-11-10T00:00:00.000Z', endsAt: '2026-11-12T00:00:00.000Z', note: null }],
      TZ,
    );
    expect(segments).toHaveLength(2);
    expect(isDayOff(segments[0]!.start, segments)).toBe(true);
    expect(isDayOff(new Date('2026-11-12T12:00:00.000Z'), segments)).toBe(false);
  });

  it('does not treat a break as a day off but still blocks booking', () => {
    const segments = blockSegments(
      [{ id: 'b2', kind: 'BREAK', startsAt: '2026-11-10T12:00:00.000Z', endsAt: '2026-11-10T13:00:00.000Z', note: 'Обід' }],
      TZ,
    );
    expect(isDayOff(segments[0]!.start, segments)).toBe(false);
    const { start, end } = segments[0]!;
    const minute = 60_000;
    expect(overlapsBlock(new Date(start.getTime() + 30 * minute), new Date(end.getTime() + 30 * minute), segments)).toBe(true);
    expect(overlapsBlock(end, new Date(end.getTime() + 60 * minute), segments)).toBe(false);
  });
});
