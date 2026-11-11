'use client';

import type {
  AppointmentCalendarItem,
  AppointmentDetailResponse,
  CalendarBlockItem,
  CurrentUserResponse,
  ResponsiblePractitionerResponse,
  SchedulingCatalogResponse,
} from '@repo/contracts';
import { Button } from '@repo/ui/button';
import { PageHeader } from '@repo/ui/workspace';
import { format } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import { t } from '../../../i18n/messages';
import { appointmentTone } from '../appointment-tone';
import { blockSegments } from '../calendar-blocks';
import type { CalendarQuery } from '../calendar-query';
import { buildCalendarHref } from '../calendar-query';
import { canCreateAppointment, canUpdateAppointment } from '../permissions';
import { apiInstantToCalendarDate } from '../timezone';
import { AppointmentCreateForm } from './appointment-create-form';
import { AppointmentDetailPanel } from './appointment-detail-panel';
import { CalendarBlockDialog } from './calendar-block-dialog';
import { CalendarClosedPeriods } from './calendar-closed-periods';
import { SchedulingCalendar, type CalendarEvent } from './scheduling-calendar';

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
  blocks: CalendarBlockItem[];
  timezone: string;
  selectedAppointment: AppointmentDetailResponse | null;
  flashMessage: string | null;
  prefillPatientId: string;
}) {
  const [showCreate, setShowCreate] = useState(query.create);
  const [createSlot, setCreateSlot] = useState<{ date: string; startTime: string } | null>(null);
  const [blockKind, setBlockKind] = useState<'BREAK' | 'DAY_OFF' | null>(null);
  const closeCreate = useCallback(() => {
    setShowCreate(false);
    setCreateSlot(null);
  }, []);
  const [editingBlock, setEditingBlock] = useState<CalendarBlockItem | null>(null);
  const closeBlock = useCallback(() => {
    setBlockKind(null);
    setEditingBlock(null);
  }, []);

  const events: CalendarEvent[] = useMemo(
    () =>
      items.map((item) => ({
        id: item.id,
        title: `${item.patient.displayName}${item.appointmentType ? ` · ${item.appointmentType.name}` : ''}`,
        start: apiInstantToCalendarDate(item.startsAt, timezone),
        end: apiInstantToCalendarDate(item.endsAt, timezone),
        resource: item,
      })),
    [items, timezone],
  );
  const segments = useMemo(() => blockSegments(blocks, timezone), [blocks, timezone]);
  const activeCount = items.filter((item) => appointmentTone(item) !== 'cancelled').length;
  const activePractitioners = practitioners.filter((p) => p.status === 'ACTIVE');
  const canBook = canCreateAppointment(user);
  const canEditBlocks = canUpdateAppointment(user);

  return (
    <div className="space-y-5">
      {flashMessage ? (
        <div role="status" className="cal-flash">
          {flashMessage}
        </div>
      ) : null}

      <PageHeader
        eyebrow="Розклад команди"
        title={t('calendarTitle')}
        description={t('calendarSubtitle')}
        metadata={<span className="ui-count">{activeCount} активних записів</span>}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canEditBlocks ? (
              <>
                <Button variant="secondary" onClick={() => setBlockKind('BREAK')}>
                  Перерва
                </Button>
                <Button variant="secondary" onClick={() => setBlockKind('DAY_OFF')}>
                  Вихідний
                </Button>
              </>
            ) : null}
            {canBook ? <Button onClick={() => setShowCreate(true)}>+ {t('calendarNewAppointment')}</Button> : null}
          </div>
        }
      />

      <ul className="cal-legend" aria-label="Умовні позначення">
        <li><i className="cal-dot cal-dot-ok" />Запис</li>
        <li><i className="cal-dot cal-dot-moved" />Перенесено</li>
        <li><i className="cal-dot cal-dot-cancelled" />Скасовано</li>
        <li><i className="cal-dot cal-dot-block" />Перерва / вихідний</li>
      </ul>

      <SchedulingCalendar
        view={query.view}
        date={query.date}
        timezone={timezone}
        events={events}
        blocks={segments}
        query={query}
        canBook={canBook}
        onSelectSlot={(slot) => {
          setCreateSlot({ date: format(slot.start, 'yyyy-MM-dd'), startTime: format(slot.start, 'HH:mm') });
          setShowCreate(true);
        }}
        onSelectBlock={
          canEditBlocks
            ? (blockId) => setEditingBlock(blocks.find((item) => item.id === blockId) ?? null)
            : undefined
        }
      />

      <CalendarClosedPeriods blocks={blocks} timezone={timezone} canEdit={canEditBlocks} onEdit={setEditingBlock} />

      {selectedAppointment ? (
        <AppointmentDetailPanel
          user={user}
          appointment={selectedAppointment}
          practitionerId={selectedAppointment.practitioner.id}
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
          initialDate={createSlot?.date ?? query.date}
          initialStartTime={createSlot?.startTime}
          onClose={closeCreate}
        />
      ) : null}

      {blockKind || editingBlock ? (
        <CalendarBlockDialog
          key={editingBlock?.id ?? 'new'}
          kind={editingBlock?.kind ?? blockKind ?? 'BREAK'}
          block={editingBlock ?? undefined}
          timezone={timezone}
          initialDate={query.date}
          onClose={closeBlock}
        />
      ) : null}
    </div>
  );
}
