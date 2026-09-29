'use client';

import type {
  AppointmentCalendarItem,
  AppointmentDetailResponse,
  ResponsiblePractitionerResponse,
  SchedulingCatalogResponse,
  CalendarBlockResponse,
} from '@repo/contracts';
import type { CurrentUserResponse } from '@repo/contracts';
import { Button } from '@repo/ui/button';
import { PageHeader } from '@repo/ui/workspace';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { t } from '../../../i18n/messages';
import type { CalendarQuery } from '../calendar-query';
import { buildCalendarHref } from '../calendar-query';
import { canCreateAppointment } from '../permissions';
import { apiInstantToCalendarDate } from '../timezone';
import { AppointmentCreateForm } from './appointment-create-form';
import { AppointmentDetailPanel } from './appointment-detail-panel';
import { SchedulingCalendar } from './scheduling-calendar';
import { CalendarBlockCreateForm } from './calendar-block-create-form';
import { CalendarBlockDetailModal } from './calendar-block-detail-modal';

export function CalendarPageClient({
  user,
  query,
  catalog,
  practitioners,
  items,
  blocks,
  timezone,
  selectedAppointment,
  flashMessage,
  prefillPatientId,
}: {
  user: CurrentUserResponse;
  query: CalendarQuery;
  catalog: SchedulingCatalogResponse;
  practitioners: ResponsiblePractitionerResponse[];
  items: AppointmentCalendarItem[];
  blocks: CalendarBlockResponse[];
  timezone: string;
  selectedAppointment: AppointmentDetailResponse | null;
  flashMessage: string | null;
  prefillPatientId: string;
}) {
  const [showCreate, setShowCreate] = useState(query.create);
  const [showBlockCreate, setShowBlockCreate] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<CalendarBlockResponse | null>(null);
  const [createSlot, setCreateSlot] = useState<{ date: string; startTime: string } | null>(null);

  const events = useMemo(
    () =>
      [...items.map((item) => ({
        kind: 'appointment' as const,
        id: item.id,
        title: `${item.patient.displayName}${item.appointmentType ? ` · ${item.appointmentType.name}` : ''}`,
        start: apiInstantToCalendarDate(item.startsAt, timezone),
        end: apiInstantToCalendarDate(item.endsAt, timezone),
        resource: item,
      })), ...blocks.map((block) => ({ kind: 'block' as const, id: block.id, title: block.type, start: apiInstantToCalendarDate(block.startsAt, timezone), end: apiInstantToCalendarDate(block.endsAt, timezone), resource: block }))],
    [blocks, items, timezone],
  );

  const activePractitioners = practitioners.filter((p) => p.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      {flashMessage ? (
        <div
          role="status"
          className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success shadow-sm"
        >
          {flashMessage}
        </div>
      ) : null}

      <PageHeader eyebrow="Розклад команди" title={t('calendarTitle')} description={t('calendarSubtitle')} metadata={<span className="ui-count">{items.length} візитів · {blocks.length} блоків</span>} actions={canCreateAppointment(user) ? <div className="flex gap-2"><Button variant="secondary" onClick={() => setShowBlockCreate(true)}>Недоступність</Button><Button onClick={() => setShowCreate(true)}>+ {t('calendarNewAppointment')}</Button></div> : null} />

      <div className="ui-filter-bar flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <nav className="ui-segmented" aria-label="Вигляд календаря"><a aria-current={query.view === 'day' ? 'page' : undefined} href={buildCalendarHref(query, { date: query.date, view: 'day' })}>{t('calendarViewDay')}</a><a aria-current={query.view === 'week' ? 'page' : undefined} href={buildCalendarHref(query, { date: query.date, view: 'week' })}>{t('calendarViewWeek')}</a><a aria-current={query.view === 'month' ? 'page' : undefined} href={buildCalendarHref(query, { date: query.date, view: 'month' })}>{t('calendarViewMonth')}</a></nav>
      </div>

      <SchedulingCalendar
        view={query.view}
        date={query.date}
        timezone={timezone}
        events={events}
        query={query}
        onSelectSlot={(slot) => {
          setCreateSlot({ date: format(slot.start, 'yyyy-MM-dd'), startTime: format(slot.start, 'HH:mm') });
          setShowCreate(true);
        }}
        onSelectBlock={(item) => { if ('type' in item) setSelectedBlock(item); }}
      />

      {selectedAppointment ? (
        <AppointmentDetailPanel
          user={user}
          appointment={selectedAppointment}
          practitioners={activePractitioners}
          timezone={timezone}
          closeHref={buildCalendarHref(query, { appointmentId: '' })}
        />
      ) : null}

      {showCreate ? (
        <AppointmentCreateForm
          catalog={catalog}
          practitioners={activePractitioners}
          timezone={timezone}
          prefillPatientId={prefillPatientId}
          initialDate={createSlot?.date}
          initialStartTime={createSlot?.startTime}
          onClose={() => setShowCreate(false)}
        />
      ) : null}
      {showBlockCreate ? <CalendarBlockCreateForm practitioners={activePractitioners} timezone={timezone} onClose={() => setShowBlockCreate(false)} /> : null}
      {selectedBlock ? <CalendarBlockDetailModal block={selectedBlock} timezone={timezone} practitioners={activePractitioners} onClose={() => setSelectedBlock(null)} /> : null}
    </div>
  );
}
