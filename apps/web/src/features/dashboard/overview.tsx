import { PERMISSIONS, hasPermission, type CurrentUserResponse } from '@repo/contracts';
import { Avatar, PageHeader, SectionHeader } from '@repo/ui/workspace';
import { Stat } from '@repo/ui/components';
import { listPatients } from '../patients/api/patients-api';
import { PatientStatusBadge } from '../patients/components/patient-status-badge';
import { listAppointments } from '../scheduling/api/scheduling-api';
import { AppointmentStatusBadge } from '../scheduling/components/appointment-status-badge';
import { calendarQueryRange, DEFAULT_TIMEZONE, formatSchedulingTime, parseCalendarDate, todayCalendarDate } from '../scheduling/timezone';

export async function Overview({ user }: { user: CurrentUserResponse }) {
  const patientsAllowed = hasPermission(user.permissions, PERMISSIONS.PATIENT_READ_ADMIN);
  const scheduleAllowed = hasPermission(user.permissions, PERMISSIONS.APPOINTMENT_READ);
  const alertsAllowed = hasPermission(user.permissions, PERMISSIONS.CLINICAL_ALERT_READ);
  const today = todayCalendarDate(DEFAULT_TIMEZONE);
  const range = calendarQueryRange('day', parseCalendarDate(today, DEFAULT_TIMEZONE), DEFAULT_TIMEZONE);
  const [patients, schedule, alerts] = await Promise.all([
    patientsAllowed ? listPatients({ page: 1, pageSize: 6, sort: 'updatedAt', sortDir: 'desc', search: '', status: 'ACTIVE', responsiblePractitionerId: '' }).catch(() => null) : null,
    scheduleAllowed ? listAppointments(range).catch(() => null) : null,
    alertsAllowed ? import('../../lib/api/server-api-client').then(({ serverApiFetch }) => serverApiFetch<Array<{ id: string; patientId: string; title: string; summary: string; severity: string; status: string; createdAt: string }>>('/api/v1/clinical-alerts').catch(() => null)) : null,
  ]);
  const appointments = [...(schedule?.items ?? [])].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return <div className="space-y-8">
    <PageHeader eyebrow={user.organization.name} title="Огляд практики" description={`Вітаємо, ${user.displayName}. Усе для наступного клінічного кроку.`} actions={scheduleAllowed ? <a href="/app/calendar" className="rc-btn rc-btn-primary">Відкрити календар ↗</a> : null} />
    <div className="overview-grid">
      <section className="overview-schedule"><SectionHeader title="Сьогодні" description={new Intl.DateTimeFormat('uk-UA', { dateStyle: 'full', timeZone: DEFAULT_TIMEZONE }).format(new Date())} action={schedule ? <span className="ui-count">{appointments.length} візитів</span> : null} />
        {!scheduleAllowed ? <p className="overview-empty">Календар недоступний для вашої ролі.</p> : !schedule ? <p role="alert" className="overview-empty">Не вдалося завантажити розклад. <a href="/app" className="text-info underline">Повторити</a></p> : !appointments.length ? <div className="overview-empty"><p className="font-medium text-text-primary">На сьогодні візитів немає</p><p className="mt-2">Перейдіть до календаря, щоб переглянути інші дати.</p></div> : <ol className="mt-6">{appointments.map(item => <li key={item.id}><a className="overview-appointment" href={`/app/calendar?appointment=${item.id}&date=${today}`}><time className="overview-time" dateTime={item.startsAt}>{formatSchedulingTime(item.startsAt, DEFAULT_TIMEZONE)}</time><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{item.patient.displayName}</p><p className="mt-1 text-xs text-text-secondary">{item.appointmentType?.name ?? 'Візит'} · {item.practitioner.displayName}</p>{item.location && <p className="mt-1 text-xs text-text-secondary">{item.location.name}</p>}</div><AppointmentStatusBadge status={item.status} /></a></li>)}</ol>}
      </section>
      <section className="overview-patients"><SectionHeader title="Активні пацієнти" description="Нещодавно оновлені картки" action={patients ? <span className="ui-count">{patients.total}</span> : null} />
        {!patientsAllowed ? <p className="overview-empty">Перегляд карток недоступний для вашої ролі.</p> : !patients ? <p role="alert" className="overview-empty">Не вдалося завантажити пацієнтів. <a href="/app" className="text-info underline">Повторити</a></p> : !patients.items.length ? <p className="overview-empty">Активних пацієнтів ще немає.</p> : <ul className="mt-5">{patients.items.map(patient => <li key={patient.id}><a href={`/app/patients/${patient.id}`} className="overview-patient"><Avatar name={patient.fullName} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{patient.fullName}</p><p className="truncate text-xs text-text-secondary">{patient.responsiblePractitioner?.displayName ?? 'Фахівця не призначено'}</p></div><PatientStatusBadge status={patient.status} /></a></li>)}</ul>}
        {patientsAllowed && <a href="/app/patients" className="mt-5 inline-flex text-sm text-info">Усі пацієнти →</a>}
      </section>
    </div>
    <section><SectionHeader title="Робочі інструменти" /><div className="overview-tools">{[
      [PERMISSIONS.ANATOMY_READ, '/app/anatomy', 'Анатомія', 'Дослідження структур і клінічна карта тіла'],
      [PERMISSIONS.REHABILITATION_PLAN_READ, '/app/rehabilitation-plans', 'Плани реабілітації', 'Цілі, призначення та редакції планів'],
      [PERMISSIONS.CLINICAL_ALERT_READ, '/app/alerts', 'Клінічні сигнали', 'Події, що потребують уваги команди'],
      [PERMISSIONS.STAFF_READ, '/app/administration/staff', 'Команда', 'Співробітники, ролі та запрошення'],
    ].filter(([permission]) => user.permissions.includes(permission as typeof user.permissions[number])).map(([,href,title,description]) => <a key={href} href={href} className="overview-tool"><h3 className="text-sm font-semibold">{title} <span aria-hidden="true">↗</span></h3><p className="mt-2 text-xs leading-5 text-text-secondary">{description}</p></a>)}</div></section>
    <div className="overview-grid overview-grid-bottom">
      <section className="overview-schedule"><SectionHeader title="Потребує уваги" description="Відкриті клінічні сигнали команди" action={alerts ? <span className="ui-count">{alerts.filter(item => item.status !== 'RESOLVED').length}</span> : null} />
        {!alertsAllowed ? <p className="overview-empty">Клінічні сигнали недоступні для вашої ролі.</p> : !alerts ? <p role="alert" className="overview-empty">Не вдалося завантажити сигнали.</p> : !alerts.length ? <p className="overview-empty"><span className="font-medium text-text-primary">Черга уваги порожня.</span><br />Усі клінічні сигнали опрацьовані.</p> : <ul className="mt-4">{alerts.filter(item => item.status !== 'RESOLVED').slice(0, 4).map(item => <li key={item.id}><a href={`/app/patients/${item.patientId}/monitoring`} className="overview-appointment"><span className={`overview-alert-dot overview-alert-${item.severity.toLowerCase()}`} aria-hidden="true" /><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 line-clamp-2 text-xs text-text-secondary">{item.summary}</p></div><span className="text-xs text-info">Відкрити →</span></a></li>)}</ul>}
        {alertsAllowed && <a href="/app/alerts" className="mt-5 inline-flex text-sm text-info">Переглянути всі сигнали →</a>}
      </section>
      <section className="overview-patients"><SectionHeader title="Клінічна активність" description="Стан робочого дня" />
        <dl className="overview-metrics"><Stat label="Заплановано сьогодні" value={schedule ? appointments.length : '—'} /><Stat label="Активні пацієнти" value={patients ? patients.total : '—'} /><Stat label="Відкриті сигнали" value={alerts ? alerts.filter(item => item.status !== 'RESOLVED').length : '—'} /></dl>
        <p className="mt-5 border-t border-border pt-4 text-xs leading-5 text-text-secondary">Показники оновлюються з актуальних клінічних даних. Використовуйте календар і чергу сигналів для наступної дії.</p>
      </section>
    </div>
  </div>;
}
