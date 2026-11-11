import type { CalendarBlockItem } from '@repo/contracts';
import { deleteCalendarBlockAction } from '../actions/scheduling-actions';

function formatRange(block: CalendarBlockItem, timezone: string): string {
  const day = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', timeZone: timezone });
  const time = new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit', timeZone: timezone });
  const start = new Date(block.startsAt);
  const end = new Date(block.endsAt);
  if (block.kind === 'DAY_OFF') {
    const lastDay = new Date(end.getTime() - 1);
    const from = day.format(start);
    const to = day.format(lastDay);
    return from === to ? from : `${from} – ${to}`;
  }
  return `${day.format(start)}, ${time.format(start)}–${time.format(end)}`;
}

/** Lists breaks and days off in the visible period, with a way to reopen them. */
export function CalendarClosedPeriods({
  blocks,
  timezone,
  canEdit,
  onEdit,
}: {
  blocks: CalendarBlockItem[];
  timezone: string;
  canEdit: boolean;
  onEdit?: (block: CalendarBlockItem) => void;
}) {
  if (blocks.length === 0) return null;
  return (
    <section className="cal-closed" aria-label="Закриті періоди">
      <h3>Закриті для записів</h3>
      <ul>
        {blocks.map((block) => (
          <li key={block.id}>
            <span className={`cal-chip ${block.kind === 'DAY_OFF' ? 'cal-chip-off' : 'cal-chip-break'}`}>
              {block.kind === 'DAY_OFF' ? 'Вихідний' : 'Перерва'}
            </span>
            <span className="cal-closed-range">{formatRange(block, timezone)}</span>
            {block.note ? <span className="cal-closed-note">{block.note}</span> : null}
            {canEdit && onEdit ? (
              <button type="button" className="cal-closed-edit" onClick={() => onEdit(block)}>
                Змінити
              </button>
            ) : null}
            {canEdit ? (
              <form action={deleteCalendarBlockAction} className="cal-closed-remove">
                <input type="hidden" name="blockId" value={block.id} />
                <button type="submit">Відкрити для записів</button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
