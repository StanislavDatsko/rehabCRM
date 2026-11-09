import { PERMISSIONS, hasPermission, type CurrentUserResponse } from '@repo/contracts';
import { Avatar, PageHeader, SectionHeader } from '@repo/ui/workspace';
import { Stat } from '@repo/ui/components';
import { listPatients } from '../patients/api/patients-api';
import { PatientStatusBadge } from '../patients/components/patient-status-badge';
import { getAppointmentRevenue, listAppointments } from '../scheduling/api/scheduling-api';
import { formatPrice } from '../scheduling/price';
import { AppointmentStatusBadge } from '../scheduling/components/appointment-status-badge';
import { calendarQueryRange, DEFAULT_TIMEZONE, formatSchedulingTime, parseCalendarDate, periodRange, todayCalendarDate } from '../scheduling/timezone';

export async function Overview({ user }: { user: CurrentUserResponse }) {
  const patientsAllowed = hasPermission(user.permissions, PERMISSIONS.PATIENT_READ_ADMIN);
  const scheduleAllowed = hasPermission(user.permissions, PERMISSIONS.APPOINTMENT_READ);
  const today = todayCalendarDate(DEFAULT_TIMEZONE);
  const range = calendarQueryRange('day', parseCalendarDate(today, DEFAULT_TIMEZONE), DEFAULT_TIMEZONE);
  const anchor = parseCalendarDate(today, DEFAULT_TIMEZONE);
  const [patients, schedule, weekRevenue, monthRevenue] = await Promise.all([
    patientsAllowed ? listPatients({ tab: 'patients', page: 1, pageSize: 6, sort: 'updatedAt', sortDir: 'desc', search: '', status: 'ACTIVE', responsiblePractitionerId: '' }).catch(() => null) : null,
    scheduleAllowed ? listAppointments(range).catch(() => null) : null,
    scheduleAllowed ? getAppointmentRevenue(periodRange('week', anchor, DEFAULT_TIMEZONE)).catch(() => null) : null,
    scheduleAllowed ? getAppointmentRevenue(periodRange('month', anchor, DEFAULT_TIMEZONE)).catch(() => null) : null,
  ]);
  const appointments = [...(schedule?.items ?? [])].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return <div className="space-y-8">
    <PageHeader eyebrow={user.organization.name} title="Головна" description={`Вітаємо, ${user.displayName}. Ваша активність на сьогодні.`} actions={scheduleAllowed ? <a href="/app/calendar" className="rc-btn rc-btn-primary">Відкрити календар ↗</a> : null} />
    <div className="overview-grid">
      <section className="overview-schedule"><SectionHeader title="Сьогодні" description={new Intl.DateTimeFormat('uk-UA', { dateStyle: 'full', timeZone: DEFAULT_TIMEZONE }).format(new Date())} action={schedule ? <span className="ui-count">{appointments.length} візитів</span> : null} />
        {!scheduleAllowed ? <p className="overview-empty">Календар недоступний для вашої ролі.</p> : !schedule ? <p role="alert" className="overview-empty">Не вдалося завантажити розклад. <a href="/app" className="text-info underline">Повторити</a></p> : !appointments.length ? <div className="overview-empty"><p className="font-medium text-text-primary">На сьогодні візитів немає</p><p className="mt-2">Перейдіть до календаря, щоб переглянути інші дати.</p></div> : <ol className="mt-6">{appointments.map(item => <li key={item.id}><a className="overview-appointment" href={`/app/calendar?appointment=${item.id}&date=${today}`}><time className="overview-time" dateTime={item.startsAt}>{formatSchedulingTime(item.startsAt, DEFAULT_TIMEZONE)}</time><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{item.patient.displayName}</p><p className="mt-1 text-xs text-text-secondary">{item.appointmentType?.name ?? 'Візит'} · {item.practitioner.displayName}</p></div><AppointmentStatusBadge status={item.status} /></a></li>)}</ol>}
      </section>
      <section className="overview-patients"><SectionHeader title="Активні пацієнти" description="Нещодавно оновлені картки" action={patients ? <span className="ui-count">{patients.total}</span> : null} />
        {!patientsAllowed ? <p className="overview-empty">Перегляд карток недоступний для вашої ролі.</p> : !patients ? <p role="alert" className="overview-empty">Не вдалося завантажити пацієнтів. <a href="/app" className="text-info underline">Повторити</a></p> : !patients.items.length ? <p className="overview-empty">Активних пацієнтів ще немає.</p> : <ul className="mt-5">{patients.items.map(patient => <li key={patient.id}><a href={`/app/patients/${patient.id}`} className="overview-patient"><Avatar name={patient.fullName} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{patient.fullName}</p><p className="truncate text-xs text-text-secondary">{patient.responsiblePractitioner?.displayName ?? 'Фахівця не призначено'}</p></div><PatientStatusBadge status={patient.status} /></a></li>)}</ul>}
        {patientsAllowed && <a href="/app/patients" className="mt-5 inline-flex text-sm text-info">Усі пацієнти →</a>}
      </section>
    </div>
    <section><SectionHeader title="Робочі інструменти" /><div className="overview-tools">{[
      [PERMISSIONS.ANATOMY_READ, '/app/anatomy', 'Анатомія', 'Дослідження структур і клінічна карта тіла'],
      [PERMISSIONS.REHABILITATION_PLAN_READ, '/app/rehabilitation-plans', 'Плани реабілітації', 'Цілі, призначення та редакції планів'],
      [PERMISSIONS.STAFF_READ, '/app/administration/staff', 'Команда', 'Співробітники, ролі та запрошення'],
    ].filter(([permission]) => user.permissions.includes(permission as typeof user.permissions[number])).map(([,href,title,description]) => <a key={href} href={href} className="overview-tool"><h3 className="text-sm font-semibold">{title} <span aria-hidden="true">↗</span></h3><p className="mt-2 text-xs leading-5 text-text-secondary">{description}</p></a>)}</div></section>
    <div className="overview-grid overview-grid-bottom">
      <section className="overview-patients"><SectionHeader title="Клінічна активність" description="Стан робочого дня" />
        <dl className="overview-metrics"><Stat label="Заплановано сьогодні" value={schedule ? appointments.filter(item => item.status !== 'CANCELLED' && item.status !== 'NO_SHOW').length : '—'} />{scheduleAllowed && <Stat label="Дохід за тиждень" value={weekRevenue ? (formatPrice(weekRevenue.total) ?? '0 ₴') : '—'} />}{scheduleAllowed && <Stat label="Дохід за місяць" value={monthRevenue ? (formatPrice(monthRevenue.total) ?? '0 ₴') : '—'} />}<Stat label="Активні пацієнти" value={patients ? patients.total : '—'} /></dl>
        <p className="mt-5 border-t border-border pt-4 text-xs leading-5 text-text-secondary">Дохід рахується за вказаною вартістю записів без скасованих і неявок; безкоштовні записи дають 0 ₴. </p>
      </section>
    </div>
  </div>;
}
