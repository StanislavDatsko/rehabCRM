import type { AppointmentCalendarItem, PatientAppointmentHistory } from '@repo/contracts';
import { buildPatientCalendarHref } from '../calendar-query';
import { formatPrice } from '../price';
import { VisitMonthSelect } from './visit-month-select';

type Outcome = 'attended' | 'cancelled' | 'noShow' | 'upcoming' | 'unmarked';

const OUTCOME_LABEL: Record<Outcome, string> = {
  attended: 'Клієнт прийшов',
  cancelled: 'Візит скасовано',
  noShow: 'Клієнт не з’явився',
  upcoming: 'Заплановано',
  unmarked: 'Без відмітки',
};

const OUTCOME_CLASS: Record<Outcome, string> = {
  attended: 'text-success',
  cancelled: 'text-danger',
  noShow: 'text-danger',
  upcoming: 'text-info',
  unmarked: 'text-text-secondary',
};

const OUTCOME_ICON: Record<Outcome, string> = { attended: '✓', cancelled: '✕', noShow: '✕', upcoming: '◷', unmarked: '•' };

function outcomeOf(item: AppointmentCalendarItem, now: number): Outcome {
  if (item.status === 'CANCELLED') return 'cancelled';
  if (item.status === 'NO_SHOW') return 'noShow';
  if (['CHECKED_IN', 'IN_PROGRESS', 'COMPLETED'].includes(item.status)) return 'attended';
  return new Date(item.startsAt).getTime() >= now ? 'upcoming' : 'unmarked';
}

function parts(iso: string, timezone: string) {
  const formatted = new Intl.DateTimeFormat('uk-UA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const get = (type: string) => formatted.find((part) => part.type === type)?.value ?? '';
  return { year: get('year'), month: get('month'), day: get('day'), time: `${get('hour')}:${get('minute')}` };
}

const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const MONTHS = ['січень', 'лютий', 'березень', 'квітень', 'травень', 'червень', 'липень', 'серпень', 'вересень', 'жовтень', 'листопад', 'грудень'];

function duration(item: AppointmentCalendarItem): string {
  const minutes = Math.round((new Date(item.endsAt).getTime() - new Date(item.startsAt).getTime()) / 60000);
  if (minutes < 60) return `${minutes} хв.`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} год. ${rest} хв.` : `${hours} год.`;
}

const GROUP_ORDER: Outcome[] = ['attended', 'cancelled', 'noShow', 'upcoming', 'unmarked'];
const GROUP_LABEL: Record<Outcome, string> = {
  attended: 'був',
  cancelled: 'скасовано',
  noShow: 'не з’явився',
  upcoming: 'попереду',
  unmarked: 'без відмітки',
};

/** Complete visit log of one patient: counters, per-month overview and every visit with its outcome. */
export function PatientVisitHistory({
  patientId,
  history,
  timezone,
  canCreate,
  selectedMonth,
}: {
  patientId: string;
  history: PatientAppointmentHistory;
  timezone: string;
  canCreate: boolean;
  /** "YYYY-MM" to show a single month; anything else shows every visit. */
  selectedMonth?: string;
}) {
  const now = Date.now();
  const allRows = history.items.map((item) => ({ item, outcome: outcomeOf(item, now), at: parts(item.startsAt, timezone) }));

  // Months that have visits, newest first, for the month picker.
  const monthOptions: { key: string; label: string; count: number }[] = [];
  for (const { at } of allRows) {
    const key = `${at.year}-${at.month}`;
    const existing = monthOptions.find((option) => option.key === key);
    if (existing) existing.count += 1;
    else monthOptions.push({ key, label: `${cap(MONTHS[Number(at.month) - 1] ?? at.month)} ${at.year}`, count: 1 });
  }
  const activeMonth = monthOptions.some((option) => option.key === selectedMonth) ? selectedMonth : undefined;
  const rows = activeMonth ? allRows.filter(({ at }) => `${at.year}-${at.month}` === activeMonth) : allRows;

  // Days of the selected month by outcome: "був: 12, 14, 16 · скасовано: 18".
  const selectedMonthDays: Record<Outcome, string[]> | null = activeMonth
    ? { attended: [], cancelled: [], noShow: [], upcoming: [], unmarked: [] }
    : null;
  if (selectedMonthDays) {
    for (const { outcome, at } of [...rows].reverse()) selectedMonthDays[outcome].push(String(Number(at.day)));
  }

  const tally = (outcome: Outcome) => rows.filter((row) => row.outcome === outcome).length;
  const counters: { label: string; value: number; className: string }[] = [
    { label: 'Був', value: tally('attended'), className: 'text-success' },
    { label: 'Скасовано', value: tally('cancelled'), className: 'text-danger' },
    { label: 'Не з’явився', value: tally('noShow'), className: 'text-danger' },
    { label: 'Попереду', value: tally('upcoming'), className: 'text-info' },
  ];

  return (
    <section className="ui-surface space-y-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-sans text-lg text-text-primary">Історія візитів</h2>
          <p className="mt-1 text-sm text-text-secondary">Усі записи пацієнта: коли був і коли запис скасовано.</p>
        </div>
        {canCreate ? (
          <a className="rc-btn rc-btn-primary" href={buildPatientCalendarHref(patientId)}>
            + Новий запис
          </a>
        ) : null}
      </div>

      {monthOptions.length > 1 ? (
        <VisitMonthSelect patientId={patientId} value={activeMonth ?? ''} options={monthOptions} total={allRows.length} />
      ) : null}

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {counters.map((counter) => (
          <div key={counter.label} className="rounded-md border border-border bg-surface-muted px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-text-secondary">{counter.label}</dt>
            <dd className={`mt-1 text-2xl font-semibold tabular-nums ${counter.className}`}>{counter.value}</dd>
          </div>
        ))}
      </dl>

      {activeMonth && selectedMonthDays ? (
        <p className="flex flex-wrap gap-x-4 gap-y-1 rounded-md border border-border px-4 py-3 text-sm">
          {GROUP_ORDER.filter((outcome) => selectedMonthDays[outcome].length).map((outcome) => (
            <span key={outcome} className={OUTCOME_CLASS[outcome]}>
              {GROUP_LABEL[outcome]}: <strong>{selectedMonthDays[outcome].join(', ')}</strong> числа
            </span>
          ))}
        </p>
      ) : null}

      {rows.length ? (
        <ol className="space-y-3">
          {rows.map(({ item, outcome, at }) => {
            const price = formatPrice(item.priceAmount);
            return (
              <li key={item.id}>
                <a
                  href={`/app/calendar?appointment=${item.id}`}
                  className="block rounded-lg border border-border bg-surface p-4 transition-colors hover:bg-surface-muted"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-text-primary">{item.appointmentType?.name ?? 'Візит'}</p>
                      <p className="mt-1 text-sm text-text-secondary">{item.practitioner.displayName}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold tabular-nums text-text-primary">{`${at.day}.${at.month}.${at.year.slice(-2)}`}</p>
                      <p className="text-sm tabular-nums text-text-secondary">{at.time}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3 text-sm">
                    <span className={`inline-flex items-center gap-2 font-medium ${OUTCOME_CLASS[outcome]}`}>
                      <span aria-hidden="true">{OUTCOME_ICON[outcome]}</span>
                      {OUTCOME_LABEL[outcome]}
                    </span>
                    <span className="text-text-secondary">
                      {price ? `${price} · ` : ''}
                      {duration(item)}
                    </span>
                  </div>
                </a>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="rounded-md border border-dashed border-border p-5 text-sm text-text-secondary">{activeMonth ? 'У цьому місяці візитів не було.' : 'Візитів ще не було.'}</p>
      )}
      {history.truncated ? (
        <p className="text-xs text-warning">Показано {history.total} найновіших записів. Старіші можна знайти в календарі.</p>
      ) : null}
    </section>
  );
}
