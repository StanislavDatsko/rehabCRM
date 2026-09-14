'use client';

import type { AppointmentCalendarItem } from '@repo/contracts';
import { useEffect, useMemo, useRef } from 'react';
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

export function SchedulingCalendar({
  view,
  date,
  timezone,
  events,
  query,
}: {
  view: 'day' | 'week';
  date: string;
  timezone: string;
  events: CalendarEvent[];
  query: CalendarQuery;
}) {
  const currentDate = useMemo(() => parseCalendarDate(date, timezone), [date, timezone]);
  const calendarView: View = view === 'day' ? 'day' : 'week';
  const calendarContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
      className="rc-scheduling-calendar rounded-md border border-border bg-surface p-3"
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
        view={calendarView}
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
        step={15}
        timeslots={4}
        min={new Date(1970, 0, 1, 7, 0, 0)}
        max={new Date(1970, 0, 1, 21, 0, 0)}
        messages={messages}
        popup
        selectable={false}
        onSelectEvent={(event) => {
          window.location.href = buildCalendarHref(query, { appointmentId: event.id });
        }}
        components={{
          event: ({ event }) => {
            const item = event.resource as AppointmentCalendarItem;
            return (
              <div className="space-y-0.5 text-xs leading-tight">
                <div className="font-semibold">{item.patient.displayName}</div>
                {item.appointmentType ? <div>{item.appointmentType.name}</div> : null}
                <AppointmentStatusBadge status={item.status} />
              </div>
            );
          },
        }}
        style={{ minHeight: '640px' }}
      />
    </div>
  );
}
