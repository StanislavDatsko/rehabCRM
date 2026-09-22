'use client';

import type { AppointmentCalendarItem } from '@repo/contracts';
import { cloneElement, isValidElement, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Calendar, dateFnsLocalizer, type View } from 'react-big-calendar';
import { format, getDay, parse, startOfWeek } from 'date-fns';
import { uk } from 'date-fns/locale';
import { t } from '../../../i18n/messages';
import type { CalendarQuery } from '../calendar-query';
import { buildCalendarHref } from '../calendar-query';
import { parseCalendarDate } from '../timezone';
import { AppointmentStatusBadge } from './appointment-status-badge';

import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { uk };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: AppointmentCalendarItem;
};

function FullWidthEventWrapper(props: object) {
  const children = 'children' in props ? (props as { children?: ReactNode }).children : undefined;
  if (!isValidElement<{ style?: CSSProperties }>(children)) return <>{children}</>;
  return cloneElement(children, {
    style: {
      ...children.props.style,
      left: '3px',
      right: '3px',
      width: 'auto',
    },
  });
}

export function SchedulingCalendar({
  view,
  date,
  timezone,
  events,
  query,
  onSelectSlot,
}: {
  view: 'day' | 'week';
  date: string;
  timezone: string;
  events: CalendarEvent[];
  query: CalendarQuery;
  onSelectSlot: (slot: { start: Date; end: Date }) => void;
}) {
  const currentDate = useMemo(() => parseCalendarDate(date, timezone), [date, timezone]);
  const calendarView: View = view === 'day' ? 'day' : 'week';
  const calendarContainer = useRef<HTMLDivElement>(null);
  const [a11yReady, setA11yReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mediaQuery.matches);
    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  // Keep the week overview on mobile too; the responsive layout below turns it
  // into a horizontally scrollable week board instead of collapsing to a day.
  const effectiveView: View = calendarView;

  useLayoutEffect(() => {
    // react-big-calendar emits an incomplete ARIA grid hierarchy in time views.
    // Keep its native interactive controls, but remove the invalid structural
    // roles so assistive technology does not receive a misleading table model.
    const container = calendarContainer.current;
    if (!container) return;
    container.querySelectorAll('[role="columnheader"]').forEach((element) => {
      element.removeAttribute('role');
      element.removeAttribute('aria-sort');
    });
    container
      .querySelectorAll('.rbc-allday-cell[role="rowgroup"], .rbc-row-content[role="row"]')
      .forEach((element) => element.removeAttribute('role'));
    setA11yReady(true);
  }, [calendarView, currentDate, events]);

  const messages = useMemo(
    () => ({
      today: t('calendarToday'),
      previous: t('calendarPrevious'),
      next: t('calendarNext'),
      day: t('calendarViewDay'),
      week: t('calendarViewWeek'),
      date: t('calendarFieldDate'),
      time: t('calendarFieldTime'),
      event: t('calendarFieldEvent'),
      noEventsInRange: t('calendarNoEvents'),
    }),
    [],
  );

  return (
    <div
      ref={calendarContainer}
      data-a11y-ready={a11yReady ? 'true' : 'false'}
      className={`rc-scheduling-calendar rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-md${isMobile ? ' calendar-mobile' : ''}`}
    >
      {/*
        react-big-calendar: chosen for MIT license, mature day/week views, date-fns
        localizer (matches our stack), and accessible toolbar navigation without
        building a custom grid. FullCalendar was heavier; native grid would cost more
        to maintain for drag-resize and timezone display.
      */}
      <Calendar
        localizer={localizer}
        culture="uk"
        events={events}
        view={effectiveView}
        date={currentDate}
        onNavigate={(nextDate) => {
          const y = nextDate.getFullYear();
          const m = String(nextDate.getMonth() + 1).padStart(2, '0');
          const d = String(nextDate.getDate()).padStart(2, '0');
          window.location.href = buildCalendarHref(query, { date: `${y}-${m}-${d}` });
        }}
        onView={(nextView) => {
          const mapped = nextView === 'day' ? 'day' : 'week';
          window.location.href = buildCalendarHref(query, { view: mapped });
        }}
        views={['day', 'week']}
        step={60}
        timeslots={1}
        min={new Date(1970, 0, 1, 7, 0, 0)}
        max={new Date(1970, 0, 1, 21, 0, 0)}
        messages={messages}
        popup
        selectable
        onSelectSlot={onSelectSlot}
        onSelectEvent={(event) => {
          window.location.href = buildCalendarHref(query, { appointmentId: event.id });
        }}
        components={{
          eventWrapper: FullWidthEventWrapper,
          event: ({ event }) => {
            const item = event.resource as AppointmentCalendarItem;
            return (
              <div className="calendar-event-card">
                <span className="calendar-event-time">{format(event.start, 'HH:mm')}</span>
                <span className="calendar-event-patient">{item.patient.displayName}</span>
                {item.appointmentType ? <span className="calendar-event-type">{item.appointmentType.name}</span> : null}
                <span className="calendar-event-status"><AppointmentStatusBadge status={item.status} /></span>
              </div>
            );
          },
        }}
        style={{ minHeight: isMobile ? '600px' : '680px' }}
      />
    </div>
  );
}
