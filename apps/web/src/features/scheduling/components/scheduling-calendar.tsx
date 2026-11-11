'use client';

import type { AppointmentCalendarItem } from '@repo/contracts';
import { format, getDay, parse, startOfWeek } from 'date-fns';
import { uk } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  dateFnsLocalizer,
  type EventPropGetter,
  type ToolbarProps,
  type View,
} from 'react-big-calendar';
import { t } from '../../../i18n/messages';
import { appointmentTone } from '../appointment-tone';
import { blockSegments, isDayOff, type BlockSegment } from '../calendar-blocks';
import type { CalendarQuery } from '../calendar-query';
import { buildCalendarHref } from '../calendar-query';
import { formatPrice } from '../price';
import { parseCalendarDate } from '../timezone';

import 'react-big-calendar/lib/css/react-big-calendar.css';
import './calendar.css';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: { uk },
});

export type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: AppointmentCalendarItem | BlockSegment;
};

function isBlock(resource: CalendarEvent['resource']): resource is BlockSegment {
  return 'kind' in resource;
}

const formats = {
  timeGutterFormat: 'HH:mm',
  eventTimeRangeFormat: () => '',
  dayFormat: (date: Date) => format(date, 'EEE, d', { locale: uk }),
  weekdayFormat: (date: Date) => format(date, 'EEE', { locale: uk }),
  dayHeaderFormat: (date: Date) => format(date, 'EEEE, d MMMM', { locale: uk }),
  monthHeaderFormat: (date: Date) => format(date, 'LLLL yyyy', { locale: uk }),
  dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
    start.getMonth() === end.getMonth()
      ? `${format(start, 'd', { locale: uk })} – ${format(end, 'd MMMM yyyy', { locale: uk })}`
      : `${format(start, 'd MMM', { locale: uk })} – ${format(end, 'd MMM yyyy', { locale: uk })}`,
};

const VIEWS: { id: CalendarQuery['view']; label: string }[] = [
  { id: 'day', label: t('calendarViewDay') },
  { id: 'week', label: t('calendarViewWeek') },
  { id: 'month', label: t('calendarViewMonth') },
];

function CalendarToolbar({
  label,
  view,
  onNavigate,
  onView,
}: ToolbarProps<CalendarEvent>) {
  return (
    <div className="cal-toolbar">
      <div className="cal-toolbar-nav">
        <button type="button" className="cal-nav-btn" onClick={() => onNavigate('PREV')} aria-label={t('calendarPrevious')}>
          ‹
        </button>
        <button type="button" className="cal-nav-btn cal-nav-today" onClick={() => onNavigate('TODAY')}>
          {t('calendarToday')}
        </button>
        <button type="button" className="cal-nav-btn" onClick={() => onNavigate('NEXT')} aria-label={t('calendarNext')}>
          ›
        </button>
      </div>
      <h2 className="cal-toolbar-title" aria-live="polite">
        {label}
      </h2>
      <div className="cal-segmented" role="group" aria-label="Вигляд календаря">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={view === item.id}
            onClick={() => onView(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function EventCard({ event }: { event: CalendarEvent }) {
  const resource = event.resource;
  if (isBlock(resource)) {
    return (
      <span className="cal-block-label">
        {resource.kind === 'DAY_OFF' ? 'Вихідний' : 'Перерва'}
        {resource.note ? ` · ${resource.note}` : ''}
      </span>
    );
  }
  const tone = appointmentTone(resource);
  const price = formatPrice(resource.priceAmount);
  return (
    <div className="cal-event">
      <span className="cal-event-time">{format(event.start, 'HH:mm')}</span>
      <span className="cal-event-patient">{resource.patient.displayName}</span>
      {resource.appointmentType ? <span className="cal-event-meta">{resource.appointmentType.name}</span> : null}
      {price ? <span className="cal-event-meta cal-event-price">{price}</span> : null}
      {tone === 'cancelled' ? <span className="cal-event-tag">Скасовано</span> : null}
      {tone === 'moved' ? <span className="cal-event-tag">Перенесено</span> : null}
    </div>
  );
}

export function SchedulingCalendar({
  view,
  date,
  timezone,
  events,
  blocks,
  query,
  canBook,
  onSelectSlot,
  onSelectBlock,
}: {
  view: CalendarQuery['view'];
  date: string;
  timezone: string;
  events: CalendarEvent[];
  blocks: ReturnType<typeof blockSegments>;
  query: CalendarQuery;
  canBook: boolean;
  onSelectSlot: (slot: { start: Date; end: Date }) => void;
  /** Click on a break / day off; omitted when the user cannot edit them. */
  onSelectBlock?: (blockId: string) => void;
}) {
  const router = useRouter();
  const currentDate = useMemo(() => parseCalendarDate(date, timezone), [date, timezone]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mediaQuery.matches);
    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  const go = (overrides: Partial<CalendarQuery>) => router.push(buildCalendarHref(query, overrides));
  const ymd = (value: Date) => format(value, 'yyyy-MM-dd');

  const blockEvents: CalendarEvent[] = useMemo(
    () =>
      blocks.map((segment) => ({
        id: segment.id,
        title: segment.kind === 'DAY_OFF' ? 'Вихідний' : 'Перерва',
        start: segment.start,
        end: segment.end,
        resource: segment,
      })),
    [blocks],
  );

  const eventPropGetter: EventPropGetter<CalendarEvent> = (event) => {
    if (isBlock(event.resource)) {
      return { className: `cal-block cal-block-${event.resource.kind.toLowerCase()}` };
    }
    return { className: `cal-appt cal-tone-${appointmentTone(event.resource)}` };
  };

  const messages = useMemo(
    () => ({
      today: t('calendarToday'),
      previous: t('calendarPrevious'),
      next: t('calendarNext'),
      day: t('calendarViewDay'),
      week: t('calendarViewWeek'),
      month: t('calendarViewMonth'),
      date: t('calendarFieldDate'),
      time: t('calendarFieldTime'),
      event: t('calendarFieldEvent'),
      noEventsInRange: t('calendarNoEvents'),
      showMore: (total: number) => `+${total} ще`,
    }),
    [],
  );

  return (
    <div className={`rc-cal rc-cal-${view}${isMobile ? ' rc-cal-mobile' : ''}`}>
      <Calendar<CalendarEvent>
        localizer={localizer}
        culture="uk"
        formats={formats}
        events={events.filter((event) => !isBlock(event.resource))}
        backgroundEvents={blockEvents}
        view={view as View}
        views={['day', 'week', 'month']}
        date={currentDate}
        onNavigate={(next) => go({ date: ymd(next), appointmentId: '' })}
        onView={(next) => go({ view: next as CalendarQuery['view'] })}
        onDrillDown={(next) => go({ date: ymd(next), view: 'day' })}
        step={30}
        timeslots={2}
        min={new Date(1970, 0, 1, 7, 0, 0)}
        max={new Date(1970, 0, 1, 21, 0, 0)}
        scrollToTime={new Date(1970, 0, 1, 8, 0, 0)}
        messages={messages}
        popup
        selectable={canBook ? 'ignoreEvents' : false}
        onSelectSlot={(slot) => {
          if (view === 'month') {
            go({ date: ymd(slot.start), view: 'day' });
            return;
          }
          const hit = blocks.find((segment) => segment.start < slot.end && segment.end > slot.start);
          if (hit) {
            onSelectBlock?.(hit.blockId);
            return;
          }
          onSelectSlot(slot);
        }}
        onSelectEvent={(event) => {
          if (!isBlock(event.resource)) go({ appointmentId: event.id });
        }}
        eventPropGetter={eventPropGetter}
        dayPropGetter={(day) => (isDayOff(day, blocks) ? { className: 'cal-day-off' } : {})}
        components={{ toolbar: CalendarToolbar, event: EventCard }}
        style={{ minHeight: isMobile ? 560 : 700 }}
      />
    </div>
  );
}
